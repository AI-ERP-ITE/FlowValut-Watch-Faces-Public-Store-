"use strict";

import { getElement } from "../elements/elementRegistry.js";
import { validateElementModel } from "../elements/elementRegistry.js";
import { analyzeGradient, processColor } from "../color/colorController.js";
import { resolvePlacement } from "./placement.js";
import { applySymmetry } from "./symmetry.js";

const COLOR_KEYS = new Set(["fill", "stroke", "color", "stopColor", "shadowColor", "highlightColor"]);
const GRADIENT_KEYS = new Set(["gradientStops", "stops"]);
const BLUR_TYPES = new Set(["gaussian", "directional", "radial", "zoom", "soften"]);
const SUPPORTED_BLEND_MODES = new Set([
	"normal",
	"multiply",
	"screen",
	"overlay",
	"darken",
	"lighten",
	"color-dodge",
	"color-burn",
	"hard-light",
	"soft-light",
	"difference",
	"exclusion",
	"hue",
	"saturation",
	"color",
	"luminosity",
	"plus-darker",
	"plus-lighter",
]);

const BLEND_MODE_ALIASES = {
	"colour-dodge": "color-dodge",
	"colour-burn": "color-burn",
	"darker-color": "darken",
	"lighter-color": "lighten",
	"linear-dodge": "plus-lighter",
	"add": "plus-lighter",
	"linear-burn": "plus-darker",
	"subtract": "plus-darker",
	"divide": "screen",
	"dissolve": "normal",
	"vivid-light": "hard-light",
	"linear-light": "overlay",
	"pin-light": "hard-light",
	"hard-mix": "difference",
	"pass-through": "normal",
};

const LAYER_PASS_CACHE = new Map();

function requireObject(value, label) {
	if (!value || typeof value !== "object") {
		throw new Error(`${label} must be an object.`);
	}
	return value;
}

function clamp(value, min, max, fallback) {
	const n = Number(value);
	if (!Number.isFinite(n)) return fallback;
	return Math.max(min, Math.min(max, n));
}

function toSignature(value) {
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

const RECT_LAYOUT_ADAPTIVE_TYPES = new Set([
	"ring",
	"bezel",
	"ticks_radial",
	"radialTicks",
	"circle",
	"outline_ring",
	"outline_rect",
	"free_rect",
	"rect",
]);

function resolveRectLayoutReshape(element, context = {}) {
	const layout = context?.layoutMetrics || {};
	const shape = typeof layout.shape === "string" ? layout.shape : "circle";
	if (shape !== "rectangle" && shape !== "rect") {
		return { enabled: false, sx: 1, sy: 1 };
	}

	const width = Number(layout.width);
	const height = Number(layout.height);
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
		return { enabled: false, sx: 1, sy: 1 };
	}

	const safeElement = element && typeof element === "object" ? element : {};
	const elementType = typeof safeElement.type === "string" ? safeElement.type : "";
	const params = safeElement.params && typeof safeElement.params === "object" ? safeElement.params : {};
	const modeRaw = typeof params.layoutShapeMode === "string" ? params.layoutShapeMode.trim().toLowerCase() : "";
	const shapeMode = modeRaw === "circle" || modeRaw === "rect" || modeRaw === "auto" ? modeRaw : "auto";
	if (shapeMode === "circle") {
		return { enabled: false, sx: 1, sy: 1 };
	}
	const userShapeLink = params.layoutShapeLink;
	const shouldAutoLink = shapeMode === "rect"
		? true
		: (typeof userShapeLink === "boolean" ? userShapeLink : RECT_LAYOUT_ADAPTIVE_TYPES.has(elementType));
	if (!shouldAutoLink) {
		return { enabled: false, sx: 1, sy: 1 };
	}

	const minAxis = Math.max(1, Math.min(width, height));
	const targetSx = width / minAxis;
	const targetSy = height / minAxis;
	const reshapeStrength = clamp(params.layoutShapeStrength, 0, 1, 1);
	const manualSx = clamp(params.layoutShapeScaleX, 0.25, 4, 1);
	const manualSy = clamp(params.layoutShapeScaleY, 0.25, 4, 1);
	const sx = (1 + ((targetSx - 1) * reshapeStrength)) * manualSx;
	const sy = (1 + ((targetSy - 1) * reshapeStrength)) * manualSy;

	if (Math.abs(sx - 1) < 0.0001 && Math.abs(sy - 1) < 0.0001) {
		return { enabled: false, sx: 1, sy: 1 };
	}

	return { enabled: true, sx, sy };
}

function normalizeBlendMode(value, fallback = "normal") {
	const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
	if (!raw) return fallback;
	const canonical = raw.replace(/[\s_]+/g, "-");
	const resolved = BLEND_MODE_ALIASES[canonical] || canonical;
	if (SUPPORTED_BLEND_MODES.has(resolved)) return resolved;
	const normalizedFallback = typeof fallback === "string" ? fallback : "normal";
	return SUPPORTED_BLEND_MODES.has(normalizedFallback) ? normalizedFallback : "normal";
}

function normalizeGradientKind(value, fallback = "linear") {
	const next = typeof value === "string" ? value.trim().toLowerCase() : "";
	if (next === "radial" || next === "conic" || next === "linear") return next;
	return fallback === "radial" || fallback === "conic" ? fallback : "linear";
}

function normalizeTextureKind(value, fallback = "grain") {
	const next = typeof value === "string" ? value.trim() : "";
	if (next === "noise" || next === "grain" || next === "brushed" || next === "fabric" || next === "paper" || next === "image" || next === "proceduralMap") {
		return next;
	}
	if (fallback === "noise" || fallback === "brushed" || fallback === "fabric" || fallback === "paper" || fallback === "image" || fallback === "proceduralMap") {
		return fallback;
	}
	return "grain";
}

function normalizeImageTextureFit(value, fallback = "cover") {
	const next = typeof value === "string" ? value.trim().toLowerCase() : "";
	if (next === "contain" || next === "stretch") return next;
	if (next === "cover") return next;
	return fallback === "contain" || fallback === "stretch" ? fallback : "cover";
}

function normalizeBlur(source = {}, fallback = {}) {
	const src = source && typeof source === "object" ? source : {};
	const nextType = typeof src.type === "string" && BLUR_TYPES.has(src.type)
		? src.type
		: (typeof fallback.type === "string" && BLUR_TYPES.has(fallback.type) ? fallback.type : "gaussian");
	const amount = clamp(src.amount, 0, 72, fallback.amount ?? 0);
	const samples = Math.round(clamp(src.samples, 3, 24, fallback.samples ?? 8));
	const angle = clamp(src.angle, -180, 180, fallback.angle ?? 0);
	const strength = clamp(src.strength, 0, 1, fallback.strength ?? 0.5);

	return {
		enabled: src.enabled === true || (fallback.enabled === true && amount > 0),
		type: nextType,
		amount,
		samples,
		angle,
		strength,
	};
}

function buildBlurPrimitives(inputRef, resultPrefix, blur) {
	if (!blur.enabled || blur.amount <= 0) {
		return { parts: [], result: inputRef };
	}

	const parts = [];
	if (blur.type === "directional") {
		const rad = (blur.angle * Math.PI) / 180;
		const sigmaX = Math.max(0.001, Math.abs(Math.cos(rad)) * blur.amount);
		const sigmaY = Math.max(0.001, Math.abs(Math.sin(rad)) * blur.amount);
		const result = `${resultPrefix}-dir`;
		parts.push(`<feGaussianBlur in="${inputRef}" stdDeviation="${sigmaX.toFixed(3)} ${sigmaY.toFixed(3)}" result="${result}" />`);
		return { parts, result };
	}

	if (blur.type === "radial") {
		const radius = blur.amount * (0.35 + blur.strength * 0.85);
		const sampleCount = Math.max(3, blur.samples);
		for (let i = 0; i < sampleCount; i += 1) {
			const theta = (Math.PI * 2 * i) / sampleCount;
			const dx = Math.cos(theta) * radius;
			const dy = Math.sin(theta) * radius;
			parts.push(`<feOffset in="${inputRef}" dx="${dx.toFixed(3)}" dy="${dy.toFixed(3)}" result="${resultPrefix}-rad-${i}" />`);
		}
		const mergeNodes = Array.from({ length: sampleCount }, (_, i) => `<feMergeNode in="${resultPrefix}-rad-${i}" />`).join("");
		parts.push(`<feMerge result="${resultPrefix}-rad-merge">${mergeNodes}<feMergeNode in="${inputRef}" /></feMerge>`);
		parts.push(`<feGaussianBlur in="${resultPrefix}-rad-merge" stdDeviation="${Math.max(0.001, blur.amount * 0.22).toFixed(3)}" result="${resultPrefix}-rad-final" />`);
		return { parts, result: `${resultPrefix}-rad-final` };
	}

	if (blur.type === "zoom") {
		const nearSigma = Math.max(0.001, blur.amount * 0.45);
		const farSigma = Math.max(0.001, blur.amount * (0.9 + blur.strength * 0.8));
		parts.push(`<feGaussianBlur in="${inputRef}" stdDeviation="${nearSigma.toFixed(3)}" result="${resultPrefix}-zoom-near" />`);
		parts.push(`<feGaussianBlur in="${inputRef}" stdDeviation="${farSigma.toFixed(3)}" result="${resultPrefix}-zoom-far" />`);
		parts.push(`<feBlend in="${resultPrefix}-zoom-near" in2="${resultPrefix}-zoom-far" mode="screen" result="${resultPrefix}-zoom-blend" />`);
		parts.push(`<feBlend in="${resultPrefix}-zoom-blend" in2="${inputRef}" mode="screen" result="${resultPrefix}-zoom-final" />`);
		return { parts, result: `${resultPrefix}-zoom-final` };
	}

	if (blur.type === "soften") {
		const sigma = Math.max(0.001, blur.amount * (0.18 + blur.strength * 0.3));
		const result = `${resultPrefix}-soft`;
		parts.push(`<feGaussianBlur in="${inputRef}" stdDeviation="${sigma.toFixed(3)}" result="${result}" />`);
		return { parts, result };
	}

	const sigma = Math.max(0.001, blur.amount);
	const result = `${resultPrefix}-gauss`;
	parts.push(`<feGaussianBlur in="${inputRef}" stdDeviation="${sigma.toFixed(3)}" result="${result}" />`);
	return { parts, result };
}

function buildLayoutMetrics(composition) {
	const layout = composition.layout && typeof composition.layout === "object" ? composition.layout : {};
	const scale = composition.scale && typeof composition.scale === "object" ? composition.scale : {};

	const width = Math.max(1, Number.isFinite(Number(layout.width)) ? Number(layout.width) : 100);
	const height = Math.max(1, Number.isFinite(Number(layout.height)) ? Number(layout.height) : 100);
	const shape = typeof layout.shape === "string" ? layout.shape : "circle";
	const padding = clamp(layout.padding, 0, 0.49, 0);
	const requestedBaseRadius = clamp(layout.baseRadius, 0, 0.5, 0.5);
	const safeBaseRadius = Math.min(requestedBaseRadius, 0.5 - padding);
	const baseRadius = safeBaseRadius * Math.min(width, height);
	const globalScale = clamp(scale.global, 0.1, 5, 1);

	return {
		shape,
		width,
		height,
		padding,
		baseRadius,
		globalScale,
	};
}

function buildDepthEffect(composition) {
	const effect = composition.effects3d && typeof composition.effects3d === "object" ? composition.effects3d : {};
	const enabled = effect.enabled === true;
	const mode = effect.mode === "inner" ? "inner" : "outer";
	const intensity = clamp(effect.intensity, 0, 1, 0.46);
	const opacity = clamp(effect.opacity, 0, 1, 0.8);
	const angleDeg = Number.isFinite(Number(effect.angle)) ? Number(effect.angle) : -35;
	const distance = clamp(effect.distance, 0, 6, 1.2);
	const falloff = clamp(effect.falloff, 0.2, 3, 1);
	const whiteBalance = clamp(effect.whiteBalance, -1, 1, 0);
	const spread = clamp(effect.spread, 0, 1, 0);
	const radians = (angleDeg * Math.PI) / 180;
	const dx = Math.cos(radians) * distance;
	const dy = Math.sin(radians) * distance;

	return {
		enabled,
		mode,
		intensity,
		opacity,
		dx,
		dy,
		falloff,
		whiteBalance,
		spread,
	};
}

function normalizeStyleAdjust(source = {}, fallback = {}) {
	const src = source && typeof source === "object" ? source : {};
	return {
		enabled: src.enabled !== false,
		highlight: clamp(src.highlight, -1, 1, fallback.highlight ?? 0),
		shadows: clamp(src.shadows, -1, 1, fallback.shadows ?? 0),
		contrast: clamp(src.contrast, 0, 3, fallback.contrast ?? 1),
		sharpness: clamp(src.sharpness, 0, 1, fallback.sharpness ?? 0),
		hue: clamp(src.hue, -180, 180, fallback.hue ?? 0),
		color: typeof src.color === "string" ? src.color : (typeof fallback.color === "string" ? fallback.color : null),
		colorOpacity: clamp(src.colorOpacity, 0, 1, fallback.colorOpacity ?? 0),
	};
}

function normalizeTexture(source = {}, fallback = {}) {
	const src = source && typeof source === "object" ? source : {};
	const grad = src.gradient && typeof src.gradient === "object" ? src.gradient : {};
	const fallbackGrad = fallback.gradient && typeof fallback.gradient === "object" ? fallback.gradient : {};
	const from = Array.isArray(grad.from) ? grad.from : (Array.isArray(fallbackGrad.from) ? fallbackGrad.from : [0, 0]);
	const to = Array.isArray(grad.to) ? grad.to : (Array.isArray(fallbackGrad.to) ? fallbackGrad.to : [100, 100]);
	const stops = Array.isArray(grad.stops)
		? grad.stops
		: (Array.isArray(fallbackGrad.stops)
			? fallbackGrad.stops
			: [{ offset: 0, color: "#ffffff", opacity: 0.22 }, { offset: 1, color: "#000000", opacity: 0.18 }]);
	const noise = src.noise && typeof src.noise === "object" ? src.noise : {};
	const fallbackNoise = fallback.noise && typeof fallback.noise === "object" ? fallback.noise : {};
	const legacyAmount = Number.isFinite(Number(noise.density)) ? Number(noise.density) : null;
	const legacyRadius = Number.isFinite(Number(noise.effectRadius)) ? Number(noise.effectRadius) : null;
	const fallbackLegacyAmount = Number.isFinite(Number(fallbackNoise.density)) ? Number(fallbackNoise.density) : null;
	const fallbackLegacyRadius = Number.isFinite(Number(fallbackNoise.effectRadius)) ? Number(fallbackNoise.effectRadius) : null;
	const clip = src.clip && typeof src.clip === "object" ? src.clip : {};
	const fallbackClip = fallback.clip && typeof fallback.clip === "object" ? fallback.clip : {};
	const blur = src.blur && typeof src.blur === "object" ? src.blur : {};
	const fallbackBlur = fallback.blur && typeof fallback.blur === "object" ? fallback.blur : {};
	const kind = normalizeTextureKind(src.kind, normalizeTextureKind(fallback.kind, "grain"));
	const image = src.image && typeof src.image === "object" ? src.image : {};
	const fallbackImage = fallback.image && typeof fallback.image === "object" ? fallback.image : {};
	const direction = clamp(src.direction, -180, 180, clamp(fallback.direction, -180, 180, 0));
	const density = clamp(src.density, 0, 1, clamp(fallback.density, 0, 1, 0.5));
	const fiber = clamp(src.fiber, 0, 1, clamp(fallback.fiber, 0, 1, 0.5));
	const seedRaw = Number.isFinite(Number(src.seed)) ? Number(src.seed) : (Number.isFinite(Number(fallback.seed)) ? Number(fallback.seed) : 1);
	const seed = Math.round(seedRaw);

	return {
		kind,
		enabled: src.enabled !== false && (src.enabled === true || fallback.enabled === true),
		opacity: clamp(src.opacity, 0, 1, fallback.opacity ?? 0.22),
		blendMode: normalizeBlendMode(src.blendMode, normalizeBlendMode(fallback.blendMode, "overlay")),
		gradient: {
			kind: normalizeGradientKind(grad.kind, normalizeGradientKind(fallbackGrad.kind, "linear")),
			from: [clamp(from[0], -100, 200, 0), clamp(from[1], -100, 200, 0)],
			to: [clamp(to[0], -100, 200, 100), clamp(to[1], -100, 200, 100)],
			center: [clamp(grad.center?.[0], -100, 200, clamp(fallbackGrad.center?.[0], -100, 200, 50)), clamp(grad.center?.[1], -100, 200, clamp(fallbackGrad.center?.[1], -100, 200, 50))],
			focal: [clamp(grad.focal?.[0], -100, 200, clamp(fallbackGrad.focal?.[0], -100, 200, 50)), clamp(grad.focal?.[1], -100, 200, clamp(fallbackGrad.focal?.[1], -100, 200, 50))],
			radius: clamp(grad.radius, 0, 200, clamp(fallbackGrad.radius, 0, 200, 50)),
			angleStart: clamp(grad.angleStart, -360, 360, clamp(fallbackGrad.angleStart, -360, 360, 0)),
			angleSpan: clamp(grad.angleSpan, 0, 360, clamp(fallbackGrad.angleSpan, 0, 360, 360)),
			stops,
		},
		noise: {
			amount: clamp(noise.amount, 0, 3, fallbackNoise.amount ?? fallbackLegacyAmount ?? legacyAmount ?? 0),
			radius: clamp(noise.radius, 0.1, 320, fallbackNoise.radius ?? fallbackLegacyRadius ?? legacyRadius ?? 24),
		},
		direction,
		density,
		fiber,
		seed,
		image: {
			src: typeof image.src === "string"
				? image.src
				: (typeof fallbackImage.src === "string" ? fallbackImage.src : ""),
			offsetX: clamp(image.offsetX, -100, 100, clamp(fallbackImage.offsetX, -100, 100, 0)),
			offsetY: clamp(image.offsetY, -100, 100, clamp(fallbackImage.offsetY, -100, 100, 0)),
			scale: clamp(image.scale, 0.1, 5, clamp(fallbackImage.scale, 0.1, 5, 1)),
			rotation: clamp(image.rotation, -180, 180, clamp(fallbackImage.rotation, -180, 180, 0)),
			radius: clamp(image.radius, 0, 120, clamp(fallbackImage.radius, 0, 120, 0)),
			fit: normalizeImageTextureFit(image.fit, normalizeImageTextureFit(fallbackImage.fit, "cover")),
			naturalWidth: clamp(image.naturalWidth, 1, 8192, clamp(fallbackImage.naturalWidth, 1, 8192, 1024)),
			naturalHeight: clamp(image.naturalHeight, 1, 8192, clamp(fallbackImage.naturalHeight, 1, 8192, 1024)),
		},
		blur: normalizeBlur(blur, fallbackBlur),
		clip: {
			enabled: clip.enabled === true || fallbackClip.enabled === true,
			inheritPrevious: clip.inheritPrevious === true || fallbackClip.inheritPrevious === true,
			targetName: typeof clip.targetName === "string"
				? clip.targetName
				: (typeof fallbackClip.targetName === "string" ? fallbackClip.targetName : ""),
		},
	};
}

function normalizeGradientOverlay(source = {}, fallback = {}) {
	const src = source && typeof source === "object" ? source : {};
	const from = Array.isArray(src.from) ? src.from : (Array.isArray(fallback.from) ? fallback.from : [0, 0]);
	const to = Array.isArray(src.to) ? src.to : (Array.isArray(fallback.to) ? fallback.to : [100, 100]);
	const stops = Array.isArray(src.stops)
		? src.stops
		: (Array.isArray(fallback.stops)
			? fallback.stops
			: [{ offset: 0, color: "#ffffff", opacity: 0.24 }, { offset: 1, color: "#000000", opacity: 0.18 }]);
	const clip = src.clip && typeof src.clip === "object" ? src.clip : {};
	const fallbackClip = fallback.clip && typeof fallback.clip === "object" ? fallback.clip : {};
	const blur = src.blur && typeof src.blur === "object" ? src.blur : {};
	const fallbackBlur = fallback.blur && typeof fallback.blur === "object" ? fallback.blur : {};

	return {
		enabled: src.enabled !== false && (src.enabled === true || fallback.enabled === true),
		opacity: clamp(src.opacity, 0, 1, fallback.opacity ?? 0.24),
		blendMode: normalizeBlendMode(src.blendMode, normalizeBlendMode(fallback.blendMode, "overlay")),
		kind: normalizeGradientKind(src.kind, normalizeGradientKind(fallback.kind, "linear")),
		from: [clamp(from[0], -100, 200, 0), clamp(from[1], -100, 200, 0)],
		to: [clamp(to[0], -100, 200, 100), clamp(to[1], -100, 200, 100)],
		center: [clamp(src.center?.[0], -100, 200, clamp(fallback.center?.[0], -100, 200, 50)), clamp(src.center?.[1], -100, 200, clamp(fallback.center?.[1], -100, 200, 50))],
		focal: [clamp(src.focal?.[0], -100, 200, clamp(fallback.focal?.[0], -100, 200, 50)), clamp(src.focal?.[1], -100, 200, clamp(fallback.focal?.[1], -100, 200, 50))],
		radius: clamp(src.radius, 0, 200, clamp(fallback.radius, 0, 200, 50)),
		angleStart: clamp(src.angleStart, -360, 360, clamp(fallback.angleStart, -360, 360, 0)),
		angleSpan: clamp(src.angleSpan, 0, 360, clamp(fallback.angleSpan, 0, 360, 360)),
		stops,
		blur: normalizeBlur(blur, fallbackBlur),
		clip: {
			enabled: clip.enabled === true || fallbackClip.enabled === true,
			inheritPrevious: clip.inheritPrevious === true || fallbackClip.inheritPrevious === true,
			targetName: typeof clip.targetName === "string"
				? clip.targetName
				: (typeof fallbackClip.targetName === "string" ? fallbackClip.targetName : ""),
		},
	};
}

function normalizeMaterialOverlay(source = {}, fallback = {}) {
	const src = source && typeof source === "object" ? source : {};
	const clip = src.clip && typeof src.clip === "object" ? src.clip : {};
	const fallbackClip = fallback.clip && typeof fallback.clip === "object" ? fallback.clip : {};

	return {
		enabled: src.enabled !== false && (src.enabled === true || fallback.enabled === true),
		color: typeof src.color === "string"
			? src.color
			: (typeof fallback.color === "string" ? fallback.color : "#ffffff"),
		opacity: clamp(src.opacity, 0, 1, fallback.opacity ?? 0.18),
		blendMode: normalizeBlendMode(src.blendMode, normalizeBlendMode(fallback.blendMode, "multiply")),
		clip: {
			enabled: clip.enabled === true || fallbackClip.enabled === true,
			inheritPrevious: clip.inheritPrevious === true || fallbackClip.inheritPrevious === true,
			targetName: typeof clip.targetName === "string"
				? clip.targetName
				: (typeof fallbackClip.targetName === "string" ? fallbackClip.targetName : ""),
		},
	};
}

function normalizeDepthEffect(source = {}, fallback = null) {
	const src = source && typeof source === "object" ? source : {};
	const defaultAngleDeg = -35;
	const defaultDistance = 1.2;
	const defaultRadians = (defaultAngleDeg * Math.PI) / 180;
	const defaultBase = {
		enabled: false,
		mode: "outer",
		intensity: 0.46,
		opacity: 0.8,
		dx: Math.cos(defaultRadians) * defaultDistance,
		dy: Math.sin(defaultRadians) * defaultDistance,
		falloff: 1,
		whiteBalance: 0,
		spread: 0,
	};
	const base = fallback && typeof fallback === "object" ? { ...defaultBase, ...fallback } : defaultBase;
	const hasExplicitEnabled = Object.prototype.hasOwnProperty.call(src, "enabled");
	const enabled = hasExplicitEnabled ? src.enabled === true : base.enabled;
	const mode = src.mode === "inner"
		? "inner"
		: (src.mode === "front"
			? "front"
			: (base.mode === "inner" ? "inner" : (base.mode === "front" ? "front" : "outer")));
	const intensity = clamp(src.intensity, 0, 1, base.intensity);
	const opacity = clamp(src.opacity, 0, 1, base.opacity ?? 0.8);
	const angleDeg = Number.isFinite(Number(src.angle)) ? Number(src.angle) : null;
	const distance = clamp(src.distance, 0, 6, Math.sqrt(base.dx * base.dx + base.dy * base.dy));
	const falloff = clamp(src.falloff, 0.2, 3, base.falloff ?? 1);
	const whiteBalance = clamp(src.whiteBalance, -1, 1, base.whiteBalance ?? 0);
	const spread = clamp(src.spread, 0, 1, base.spread ?? 0);
	const light = src.light && typeof src.light === "object" ? src.light : {};
	const lightX = Number(light.x);
	const lightY = Number(light.y);
	const lightZ = Number(light.z);
	const hasManualLightVector = Number.isFinite(lightX) && Number.isFinite(lightY);

	if (hasManualLightVector) {
		const safeZ = Number.isFinite(lightZ) ? lightZ : 1;
		const len = Math.hypot(lightX, lightY, safeZ);
		if (len > 0.0001) {
			return { enabled, mode, intensity, opacity, dx: (lightX / len) * distance, dy: (lightY / len) * distance, falloff, whiteBalance, spread };
		}
	}

	if (angleDeg === null) {
		return { enabled, mode, intensity, opacity, dx: base.dx, dy: base.dy, falloff, whiteBalance, spread };
	}

	const radians = (angleDeg * Math.PI) / 180;
	return {
		enabled,
		mode,
		intensity,
		opacity,
		dx: Math.cos(radians) * distance,
		dy: Math.sin(radians) * distance,
		falloff,
		whiteBalance,
		spread,
	};
}

function normalizeDropShadowEffect(source = {}) {
	const src = source && typeof source === "object" ? source : {};
	const hasMeaningfulField =
		src.mode === "inner" ||
		typeof src.color === "string" ||
		Number.isFinite(Number(src.opacity)) ||
		Number.isFinite(Number(src.blur)) ||
		Number.isFinite(Number(src.spread)) ||
		Number.isFinite(Number(src.offsetX)) ||
		Number.isFinite(Number(src.offsetY));

	if (!hasMeaningfulField) {
		return {
			enabled: false,
			mode: "outer",
			color: "#000000",
			opacity: 0,
			blur: 0,
			spread: 0,
			offsetX: 0,
			offsetY: 0,
		};
	}

	return {
		enabled: true,
		mode: src.mode === "inner" ? "inner" : "outer",
		color: typeof src.color === "string" ? src.color : "#000000",
		opacity: clamp(src.opacity, 0, 1, 0.45),
		blur: clamp(src.blur, 0, 40, 8),
		spread: clamp(src.spread, 0, 20, 0),
		offsetX: clamp(src.offsetX, -30, 30, 2),
		offsetY: clamp(src.offsetY, -30, 30, 2),
	};
}

function buildLayerFilterDef(filterId, styleAdjust, depthEffect, dropShadowEffect = { enabled: false, mode: "outer", opacity: 0 }, silhouette = { masked: false }) {
	if (!styleAdjust.enabled && !depthEffect.enabled && !dropShadowEffect.enabled) return "";

	// Keep tone and sharpening responsive but avoid tiny slider movement causing heavy clipping.
	const toneShift = (styleAdjust.highlight - styleAdjust.shadows) * 0.12;
	const sharp = clamp(styleAdjust.sharpness, 0, 1, 0);
	const sharpenStrength = Math.pow(sharp, 1.35) * 0.45;
	const sharpenKernel = [
		0,
		-1 * sharpenStrength,
		0,
		-1 * sharpenStrength,
		1 + 4 * sharpenStrength,
		-1 * sharpenStrength,
		0,
		-1 * sharpenStrength,
		0,
	].map((v) => Number(v).toFixed(4)).join(" ");

	let chain = "tone";
	const alphaRef = silhouette && silhouette.masked ? "silhouetteAlpha" : "SourceAlpha";
	const edgeRadius = silhouette && silhouette.masked ? clamp(silhouette.edgeRadius, 0.08, 2.2, 0.36) : 0;
	const edgeOpacity = silhouette && silhouette.masked ? clamp(silhouette.edgeOpacity, 0, 1, 0.26) : 0;
	const edgeColor = silhouette && silhouette.masked && typeof silhouette.edgeColor === "string"
		? silhouette.edgeColor
		: (dropShadowEffect && typeof dropShadowEffect.color === "string" ? dropShadowEffect.color : "#000000");
	const parts = [
		`<filter id=\"${filterId}\" x=\"-25%\" y=\"-25%\" width=\"150%\" height=\"150%\">`,
		`<feColorMatrix in=\"SourceGraphic\" type=\"hueRotate\" values=\"${styleAdjust.hue.toFixed(3)}\" result=\"hue\" />`,
		`<feComponentTransfer in=\"hue\" result=\"tone\">`,
		`<feFuncR type=\"linear\" slope=\"${styleAdjust.contrast.toFixed(4)}\" intercept=\"${toneShift.toFixed(4)}\" />`,
		`<feFuncG type=\"linear\" slope=\"${styleAdjust.contrast.toFixed(4)}\" intercept=\"${toneShift.toFixed(4)}\" />`,
		`<feFuncB type=\"linear\" slope=\"${styleAdjust.contrast.toFixed(4)}\" intercept=\"${toneShift.toFixed(4)}\" />`,
		"</feComponentTransfer>",
	];

	if (alphaRef !== "SourceAlpha") {
		parts.push(`<feColorMatrix in=\"SourceAlpha\" type=\"matrix\" values=\"1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0\" result=\"${alphaRef}\" />`);
		if (edgeOpacity > 0.0001) {
			parts.push(`<feMorphology in=\"${alphaRef}\" operator=\"dilate\" radius=\"${edgeRadius.toFixed(3)}\" result=\"edgeDilate\" />`);
			parts.push(`<feMorphology in=\"${alphaRef}\" operator=\"erode\" radius=\"${Math.max(0.01, edgeRadius * 0.7).toFixed(3)}\" result=\"edgeErode\" />`);
			parts.push('<feComposite in="edgeDilate" in2="edgeErode" operator="out" result="silhouetteEdge" />');
		}
	}

	if (sharpenStrength > 0.001) {
		parts.push(`<feConvolveMatrix in=\"tone\" order=\"3\" kernelMatrix=\"${sharpenKernel}\" divisor=\"1\" result=\"sharp\" />`);
		chain = "sharp";
	}

	if (depthEffect.enabled && depthEffect.intensity > 0) {
		const mode = depthEffect.mode === "inner" ? "inner" : (depthEffect.mode === "front" ? "front" : "outer");
		const falloff = clamp(depthEffect.falloff, 0.2, 3, 1);
		const spread = clamp(depthEffect.spread, 0, 1, 0);
		const wb = clamp(depthEffect.whiteBalance, -1, 1, 0);
		const baseOpacity = clamp(depthEffect.opacity, 0, 1, 0.8);
		const depthCurve = mode === "inner"
			? Math.pow(clamp(depthEffect.intensity, 0, 1, 0), 0.75)
			: clamp(depthEffect.intensity, 0, 1, 0);
		const shadowOpacity = clamp(0.42 * depthCurve * baseOpacity * Math.min(2, falloff), 0, 1, 0.42).toFixed(3);
		const lightOpacity = clamp(0.3 * depthCurve * baseOpacity * Math.min(2, falloff), 0, 1, 0.3).toFixed(3);
		const blurBase = mode === "inner"
			? (0.34 + depthCurve * 0.66)
			: (0.6 + depthCurve * 0.9);
		const blur = Math.max(0.05, blurBase / falloff).toFixed(3);
		const spreadRadius = (spread * 2.25).toFixed(3);
		const lightColor = wb >= 0 ? `rgb(255,${Math.round(255 - wb * 28)},${Math.round(255 - wb * 72)})` : `rgb(${Math.round(255 + wb * 72)},${Math.round(255 + wb * 18)},255)`;
		const shadowColor = wb >= 0 ? `rgb(${Math.round(18 + wb * 30)},${Math.round(20 + wb * 24)},${Math.round(28 + wb * 16)})` : `rgb(${Math.round(10 - wb * 12)},${Math.round(14 - wb * 10)},${Math.round(34 - wb * 26)})`;

		if (spread > 0.0001) {
			parts.push(`<feMorphology in="${chain}" operator="dilate" radius="${spreadRadius}" result="spreadBase" />`);
			chain = "spreadBase";
		}

		if (mode === "front") {
			const frontOpacity = clamp(0.46 * depthCurve * baseOpacity * Math.min(2, falloff), 0, 1, 0.4).toFixed(3);
			const frontBlur = Math.max(0.08, (0.4 + depthCurve * 0.7) / falloff).toFixed(3);
			const frontRadius = (Math.max(0.1, spread * 2.25 + (Math.hypot(depthEffect.dx, depthEffect.dy) * 0.35))).toFixed(3);
			parts.push(`<feMorphology in="${alphaRef}" operator="dilate" radius="${frontRadius}" result="frontAlpha" />`);
			parts.push(`<feGaussianBlur in="frontAlpha" stdDeviation="${frontBlur}" result="frontBlur" />`);
			parts.push(`<feComposite in="frontBlur" in2="${alphaRef}" operator="out" result="frontRim" />`);
			parts.push(`<feFlood flood-color="${lightColor}" flood-opacity="${frontOpacity}" result="frontFlood" />`);
			parts.push('<feComposite in="frontFlood" in2="frontRim" operator="in" result="frontGlow" />');
			parts.push(`<feBlend in="${chain}" in2="frontGlow" mode="screen" result="depthFront" />`);
			chain = "depthFront";
		} else if (mode === "inner") {
			parts.push(`<feGaussianBlur in="${alphaRef}" stdDeviation="${blur}" result="depthInnerBlurA" />`);
			parts.push(`<feOffset in="depthInnerBlurA" dx="${depthEffect.dx.toFixed(3)}" dy="${depthEffect.dy.toFixed(3)}" result="depthInnerOffsetA" />`);
			parts.push(`<feComposite in="depthInnerOffsetA" in2="${alphaRef}" operator="arithmetic" k2="-1" k3="1" result="depthInnerMaskA" />`);
			parts.push(`<feFlood flood-color="${shadowColor}" flood-opacity="${shadowOpacity}" result="depthInnerFloodA" />`);
			parts.push('<feComposite in="depthInnerFloodA" in2="depthInnerMaskA" operator="in" result="depthInnerShadeA" />');

			parts.push(`<feGaussianBlur in="${alphaRef}" stdDeviation="${blur}" result="depthInnerBlurB" />`);
			parts.push(`<feOffset in="depthInnerBlurB" dx="${(-depthEffect.dx).toFixed(3)}" dy="${(-depthEffect.dy).toFixed(3)}" result="depthInnerOffsetB" />`);
			parts.push(`<feComposite in="depthInnerOffsetB" in2="${alphaRef}" operator="arithmetic" k2="-1" k3="1" result="depthInnerMaskB" />`);
			parts.push(`<feFlood flood-color="${lightColor}" flood-opacity="${lightOpacity}" result="depthInnerFloodB" />`);
			parts.push('<feComposite in="depthInnerFloodB" in2="depthInnerMaskB" operator="in" result="depthInnerShadeB" />');

			parts.push(`<feBlend in="${chain}" in2="depthInnerShadeA" mode="multiply" result="depthA" />`);
			parts.push('<feBlend in="depthA" in2="depthInnerShadeB" mode="screen" result="depthB" />');
			chain = "depthB";
		} else {
			parts.push(`<feDropShadow in="${chain}" dx="${depthEffect.dx.toFixed(3)}" dy="${depthEffect.dy.toFixed(3)}" stdDeviation="${blur}" flood-color="${shadowColor}" flood-opacity="${shadowOpacity}" result="depthA" />`);
			parts.push(`<feDropShadow in="depthA" dx="${(-depthEffect.dx).toFixed(3)}" dy="${(-depthEffect.dy).toFixed(3)}" stdDeviation="${blur}" flood-color="${lightColor}" flood-opacity="${lightOpacity}" result="depthB" />`);
			chain = "depthB";
		}
	}

	if (dropShadowEffect.enabled && dropShadowEffect.opacity > 0) {
		const mode = dropShadowEffect.mode === "inner" ? "inner" : "outer";
		const shadowBlur = Math.max(0, Number(dropShadowEffect.blur) / 2);
		const shadowSpread = clamp(dropShadowEffect.spread, 0, 20, 0);
		const shadowBaseRef = shadowSpread > 0.001 ? "dsSpreadAlpha" : alphaRef;

		if (shadowSpread > 0.001) {
			parts.push(`<feMorphology in="${alphaRef}" operator="dilate" radius="${shadowSpread.toFixed(3)}" result="dsSpreadAlpha" />`);
		}

		if (mode === "inner") {
			parts.push(`<feGaussianBlur in="${shadowBaseRef}" stdDeviation="${shadowBlur.toFixed(3)}" result="dsInnerBlur" />`);
			parts.push(`<feOffset in="dsInnerBlur" dx="${Number(dropShadowEffect.offsetX).toFixed(3)}" dy="${Number(dropShadowEffect.offsetY).toFixed(3)}" result="dsInnerOffset" />`);
			parts.push(`<feComposite in="dsInnerOffset" in2="${alphaRef}" operator="arithmetic" k2="-1" k3="1" result="dsInnerMask" />`);
			parts.push(`<feFlood flood-color="${dropShadowEffect.color}" flood-opacity="${Number(dropShadowEffect.opacity).toFixed(3)}" result="dsInnerFlood" />`);
			parts.push('<feComposite in="dsInnerFlood" in2="dsInnerMask" operator="in" result="dsInnerShade" />');
			parts.push(`<feBlend in="${chain}" in2="dsInnerShade" mode="multiply" result="dropShadow" />`);
			chain = "dropShadow";
		} else {
			parts.push(`<feGaussianBlur in="${shadowBaseRef}" stdDeviation="${shadowBlur.toFixed(3)}" result="dsOuterBlur" />`);
			parts.push(`<feOffset in="dsOuterBlur" dx="${Number(dropShadowEffect.offsetX).toFixed(3)}" dy="${Number(dropShadowEffect.offsetY).toFixed(3)}" result="dsOuterOffset" />`);
			parts.push(`<feFlood flood-color="${dropShadowEffect.color}" flood-opacity="${Number(dropShadowEffect.opacity).toFixed(3)}" result="dsOuterFlood" />`);
			parts.push('<feComposite in="dsOuterFlood" in2="dsOuterOffset" operator="in" result="dsOuterShade" />');
			parts.push(`<feBlend in="${chain}" in2="dsOuterShade" mode="normal" result="dropShadow" />`);
			chain = "dropShadow";
		}
	}

	if (alphaRef !== "SourceAlpha" && edgeOpacity > 0.0001) {
		parts.push(`<feFlood flood-color="${edgeColor}" flood-opacity="${edgeOpacity.toFixed(3)}" result="edgeFlood" />`);
		parts.push('<feComposite in="edgeFlood" in2="silhouetteEdge" operator="in" result="edgeTint" />');
		parts.push(`<feBlend in="${chain}" in2="edgeTint" mode="multiply" result="maskedEdge" />`);
		chain = "maskedEdge";
	}

	if (styleAdjust.color && styleAdjust.colorOpacity > 0) {
		parts.push(`<feFlood flood-color=\"${styleAdjust.color}\" flood-opacity=\"${styleAdjust.colorOpacity.toFixed(3)}\" result=\"tintFill\" />`);
		parts.push(`<feComposite in=\"tintFill\" in2=\"${alphaRef}\" operator=\"in\" result=\"tintMask\" />`);
		parts.push(`<feBlend in=\"${chain}\" in2=\"tintMask\" mode=\"multiply\" result=\"tinted\" />`);
		chain = "tinted";
	}

	const hasExternalDepth = depthEffect.enabled && depthEffect.intensity > 0 && depthEffect.mode !== "inner";
	const hasExternalDropShadow = dropShadowEffect.enabled && dropShadowEffect.opacity > 0 && dropShadowEffect.mode !== "inner";
	const hasExternalShadow = hasExternalDepth || hasExternalDropShadow;
	if (hasExternalShadow) {
		// Preserve outer shadow pixels. SourceAlpha clipping removes visible depth/drop shadows.
		parts.push(`<feMerge><feMergeNode in=\"${chain}\" /></feMerge>`);
	} else {
		parts.push(`<feComposite in=\"${chain}\" in2=\"${alphaRef}\" operator=\"in\" result=\"final\" />`);
		parts.push("<feMerge><feMergeNode in=\"final\" /></feMerge>");
	}
	parts.push("</filter>");

	return parts.join("");
}

function asGradientPoint(value, fallbackX, fallbackY) {
	if (!Array.isArray(value)) return [fallbackX, fallbackY];
	return [
		clamp(value[0], -100, 200, fallbackX),
		clamp(value[1], -100, 200, fallbackY),
	];
}

function buildGradientDefinition(gradientId, gradientModel, stopsMarkup) {
	const model = gradientModel && typeof gradientModel === "object" ? gradientModel : {};
	const kind = normalizeGradientKind(model.kind, "linear");
	const from = asGradientPoint(model.from, 0, 0);
	const to = asGradientPoint(model.to, 100, 100);
	const center = asGradientPoint(model.center, 50, 50);
	const focal = asGradientPoint(model.focal, center[0], center[1]);
	const radius = clamp(model.radius, 0, 200, 50);
	const angleStart = clamp(model.angleStart, -360, 360, 0);
	const angleSpan = clamp(model.angleSpan, 0, 360, 360);

	if (kind === "radial") {
		return `<radialGradient id="${gradientId}" cx="${center[0]}%" cy="${center[1]}%" r="${radius}%" fx="${focal[0]}%" fy="${focal[1]}%">${stopsMarkup}</radialGradient>`;
	}

	if (kind === "conic") {
		// SVG has no native conic gradient; map conic controls onto a deterministic linear adapter.
		const spanFactor = Math.max(0.05, angleSpan / 360);
		const radians = (angleStart * Math.PI) / 180;
		const dx = Math.cos(radians) * 50 * spanFactor;
		const dy = Math.sin(radians) * 50 * spanFactor;
		const x1 = clamp(center[0] - dx, -100, 200, 0);
		const y1 = clamp(center[1] - dy, -100, 200, 0);
		const x2 = clamp(center[0] + dx, -100, 200, 100);
		const y2 = clamp(center[1] + dy, -100, 200, 100);
		return `<linearGradient id="${gradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">${stopsMarkup}</linearGradient>`;
	}

	return `<linearGradient id="${gradientId}" x1="${from[0]}%" y1="${from[1]}%" x2="${to[0]}%" y2="${to[1]}%">${stopsMarkup}</linearGradient>`;
}

function applyGradientTransform(definition, transform) {
	if (typeof definition !== "string" || definition.length === 0) return definition;
	return definition.replace(/<(linearGradient|radialGradient)\s+id="([^"]+)"/, `<$1 id="$2" gradientTransform="${transform}"`);
}

function buildTextureGradientDefinition(gradientId, texture, stopsMarkup) {
	const model = texture && typeof texture === "object" ? texture : {};
	const gradient = model.gradient && typeof model.gradient === "object" ? model.gradient : {};
	const kind = normalizeTextureKind(model.kind, "grain");

	if (kind === "brushed") {
		const direction = clamp(model.direction, -180, 180, 0);
		const radians = (direction * Math.PI) / 180;
		const dx = Math.cos(radians) * 50;
		const dy = Math.sin(radians) * 50;
		const brushedGradient = {
			...gradient,
			kind: "linear",
			from: [50 - dx, 50 - dy],
			to: [50 + dx, 50 + dy],
		};
		return buildGradientDefinition(gradientId, brushedGradient, stopsMarkup);
	}

	const baseDefinition = buildGradientDefinition(gradientId, gradient, stopsMarkup);
	if (kind !== "image") return baseDefinition;

	const image = model.image && typeof model.image === "object" ? model.image : {};
	const offsetX = clamp(image.offsetX, -100, 100, 0);
	const offsetY = clamp(image.offsetY, -100, 100, 0);
	const scale = clamp(image.scale, 0.1, 5, 1);
	const rotation = clamp(image.rotation, -180, 180, 0);
	const transform = `translate(${offsetX} ${offsetY}) rotate(${rotation} 50 50) scale(${scale})`;
	return applyGradientTransform(baseDefinition, transform);
}

function buildTextureKindPrimitives(texture, inputRef) {
	const kind = normalizeTextureKind(texture.kind, "grain");
	const noiseAmount = clamp(texture.noise?.amount, 0, 3, 0);
	const noiseRadius = clamp(texture.noise?.radius, 0.1, 320, 24);
	const parts = [];
	let chain = inputRef;

	if (kind === "noise" || kind === "grain") {
		if (noiseAmount > 0) {
			const frequency = (1 / noiseRadius).toFixed(4);
			const alpha = clamp(noiseAmount, 0, 1, 0).toFixed(3);
			parts.push(`<feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="2" seed="7" result="grain" />`);
			parts.push(`<feColorMatrix in="grain" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${alpha} 0" result="grainAlpha" />`);
			parts.push(`<feBlend in="${chain}" in2="grainAlpha" mode="overlay" result="texture-grain" />`);
			chain = "texture-grain";
		}
		return { parts, result: chain };
	}

	if (kind === "brushed") {
		const frequency = (1 / Math.max(8, noiseRadius * 1.8)).toFixed(4);
		const alpha = clamp(noiseAmount, 0, 1, 0.24).toFixed(3);
		parts.push(`<feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="3" seed="11" result="brushedNoise" />`);
		parts.push(`<feColorMatrix in="brushedNoise" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${alpha} 0" result="brushedAlpha" />`);
		parts.push(`<feBlend in="${chain}" in2="brushedAlpha" mode="overlay" result="texture-brushed" />`);
		chain = "texture-brushed";
		return { parts, result: chain };
	}

	if (kind === "fabric") {
		const frequencyA = (1 / Math.max(10, noiseRadius * 2.1)).toFixed(4);
		const frequencyB = (1 / Math.max(14, noiseRadius * 2.8)).toFixed(4);
		const alpha = clamp(noiseAmount, 0, 1, 0.22).toFixed(3);
		parts.push(`<feTurbulence type="fractalNoise" baseFrequency="${frequencyA}" numOctaves="2" seed="17" result="fabricA" />`);
		parts.push(`<feTurbulence type="fractalNoise" baseFrequency="${frequencyB}" numOctaves="2" seed="23" result="fabricB" />`);
		parts.push(`<feBlend in="fabricA" in2="fabricB" mode="multiply" result="fabricMix" />`);
		parts.push(`<feColorMatrix in="fabricMix" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${alpha} 0" result="fabricAlpha" />`);
		parts.push(`<feBlend in="${chain}" in2="fabricAlpha" mode="soft-light" result="texture-fabric" />`);
		chain = "texture-fabric";
		return { parts, result: chain };
	}

	if (kind === "paper") {
		const frequency = (1 / Math.max(20, noiseRadius * 3.6)).toFixed(4);
		const alpha = clamp(noiseAmount, 0, 0.8, 0.16).toFixed(3);
		parts.push(`<feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="1" seed="31" result="paperNoise" />`);
		parts.push(`<feGaussianBlur in="paperNoise" stdDeviation="0.6" result="paperSoft" />`);
		parts.push(`<feColorMatrix in="paperSoft" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${alpha} 0" result="paperAlpha" />`);
		parts.push(`<feBlend in="${chain}" in2="paperAlpha" mode="multiply" result="texture-paper" />`);
		chain = "texture-paper";
		return { parts, result: chain };
	}

	if (kind === "proceduralMap") {
		const seed = Math.round(Number.isFinite(Number(texture.seed)) ? Number(texture.seed) : 1);
		const frequency = (1 / Math.max(6, noiseRadius * 1.5)).toFixed(4);
		const alpha = clamp(noiseAmount, 0, 1, 0.28).toFixed(3);
		parts.push(`<feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="4" seed="${seed}" result="procNoise" />`);
		parts.push(`<feColorMatrix in="procNoise" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${alpha} 0" result="procAlpha" />`);
		parts.push(`<feBlend in="${chain}" in2="procAlpha" mode="hard-light" result="texture-proc" />`);
		chain = "texture-proc";
		return { parts, result: chain };
	}

	if (kind === "image") {
		if (noiseAmount > 0) {
			const frequency = (1 / Math.max(10, noiseRadius * 2.4)).toFixed(4);
			const alpha = clamp(noiseAmount * 0.45, 0, 0.75, 0.2).toFixed(3);
			parts.push(`<feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="2" seed="19" result="imgNoise" />`);
			parts.push(`<feColorMatrix in="imgNoise" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${alpha} 0" result="imgNoiseAlpha" />`);
			parts.push(`<feBlend in="${chain}" in2="imgNoiseAlpha" mode="soft-light" result="texture-image-noise" />`);
			chain = "texture-image-noise";
		}

		const softness = clamp(texture.image?.radius, 0, 120, 0);
		if (softness > 0) {
			const sigma = Math.max(0.001, softness / 18);
			parts.push(`<feGaussianBlur in="${chain}" stdDeviation="${sigma.toFixed(3)}" result="texture-image-soft" />`);
			chain = "texture-image-soft";
		}

		return { parts, result: chain };
	}

	return { parts, result: chain };
}

function buildTextureImagePatternDefinition(patternId, texture, layoutMetrics) {
	const image = texture.image && typeof texture.image === "object" ? texture.image : {};
	const src = typeof image.src === "string" ? image.src.trim() : "";
	if (!src) return "";

	const widthBase = Math.max(1, Number(layoutMetrics?.width) * 2 || 960);
	const heightBase = Math.max(1, Number(layoutMetrics?.height) * 2 || 960);
	const scale = clamp(image.scale, 0.1, 5, 1);
	const tileWidth = Math.max(1, widthBase / scale);
	const tileHeight = Math.max(1, heightBase / scale);
	const offsetX = clamp(image.offsetX, -100, 100, 0);
	const offsetY = clamp(image.offsetY, -100, 100, 0);
	const patternX = (-widthBase / 2) + ((offsetX / 100) * (widthBase / 2));
	const patternY = (-heightBase / 2) + ((offsetY / 100) * (heightBase / 2));
	const rotation = clamp(image.rotation, -180, 180, 0);
	const centerX = patternX + (tileWidth / 2);
	const centerY = patternY + (tileHeight / 2);
	const fit = normalizeImageTextureFit(image.fit, "cover");
	const preserveAspectRatio = fit === "contain" ? "xMidYMid meet" : fit === "stretch" ? "none" : "xMidYMid slice";
	const safeHref = src.replace(/"/g, "%22");

	return `<pattern id="${patternId}" patternUnits="userSpaceOnUse" x="${patternX.toFixed(3)}" y="${patternY.toFixed(3)}" width="${tileWidth.toFixed(3)}" height="${tileHeight.toFixed(3)}" patternTransform="rotate(${rotation.toFixed(3)} ${centerX.toFixed(3)} ${centerY.toFixed(3)})"><image href="${safeHref}" x="0" y="0" width="${tileWidth.toFixed(3)}" height="${tileHeight.toFixed(3)}" preserveAspectRatio="${preserveAspectRatio}"/></pattern>`;
}

function buildTextureDefs(localId, texture, layoutMetrics) {
	if (!texture.enabled || texture.opacity <= 0) {
		return { defs: "", gradientId: null, filterId: null };
	}

	const gradientId = `grad-${localId}`;
	const patternId = `teximg-${localId}`;
	const textureFilterId = `textureFx-${localId}`;
	const stops = texture.gradient.stops
		.map((stop, index) => {
			const src = stop && typeof stop === "object" ? stop : {};
			const offset = clamp(src.offset, 0, 1, index === 0 ? 0 : 1);
			const color = typeof src.color === "string" ? src.color : "#ffffff";
			const opacity = clamp(src.opacity, 0, 1, 1);
			return `<stop offset=\"${(offset * 100).toFixed(2)}%\" stop-color=\"${color}\" stop-opacity=\"${opacity.toFixed(3)}\" />`;
		})
		.join("");

	const kind = normalizeTextureKind(texture.kind, "grain");
	const imagePatternDef = kind === "image" ? buildTextureImagePatternDefinition(patternId, texture, layoutMetrics) : "";
	const gradientDef = imagePatternDef || buildTextureGradientDefinition(gradientId, texture, stops);

	let chain = "SourceGraphic";
	const filterParts = [];
	const kindPass = buildTextureKindPrimitives(texture, chain);
	filterParts.push(...kindPass.parts);
	chain = kindPass.result;

	const blurPass = buildBlurPrimitives(chain, `texture-${localId}`, texture.blur || {});
	filterParts.push(...blurPass.parts);
	chain = blurPass.result;

	if (filterParts.length === 0) {
		return { defs: gradientDef, gradientId: imagePatternDef ? patternId : gradientId, filterId: null };
	}

	const filterDef = [`<filter id=\"${textureFilterId}\" x=\"-25%\" y=\"-25%\" width=\"150%\" height=\"150%\">`, ...filterParts, `<feMerge><feMergeNode in=\"${chain}\" /></feMerge>`, "</filter>"].join("");
	return {
		defs: `${gradientDef}${filterDef}`,
		gradientId: imagePatternDef ? patternId : gradientId,
		filterId: textureFilterId,
	};
}

function buildGradientOverlayDefs(localId, gradient) {
	if (!gradient.enabled || gradient.opacity <= 0) {
		return { defs: "", gradientId: null, filterId: null };
	}

	const gradientId = `overlay-grad-${localId}`;
	const stops = gradient.stops
		.map((stop, index) => {
			const src = stop && typeof stop === "object" ? stop : {};
			const offset = clamp(src.offset, 0, 1, index === 0 ? 0 : 1);
			const color = typeof src.color === "string" ? src.color : "#ffffff";
			const opacity = clamp(src.opacity, 0, 1, 1);
			return `<stop offset="${(offset * 100).toFixed(2)}%" stop-color="${color}" stop-opacity="${opacity.toFixed(3)}" />`;
		})
		.join("");

	const blurPass = buildBlurPrimitives("SourceGraphic", `gradient-${localId}`, gradient.blur || {});
	const filterId = blurPass.parts.length > 0 ? `gradientFx-${localId}` : null;
	const filterDef = filterId
		? [`<filter id="${filterId}" x="-25%" y="-25%" width="150%" height="150%">`, ...blurPass.parts, `<feMerge><feMergeNode in="${blurPass.result}" /></feMerge>`, "</filter>"].join("")
		: "";
	const defs = `${buildGradientDefinition(gradientId, gradient, stops)}${filterDef}`;
	return { defs, gradientId, filterId };
}

function resolveClipMaskBody(clipConfig, context, fallbackBody, currentElementName = "") {
	const entry = resolveClipMaskEntry(clipConfig, context, fallbackBody, currentElementName);
	return entry.body;
}

function resolveClipMaskEntry(clipConfig, context, fallbackBody, currentElementName = "") {
	if (!clipConfig || clipConfig.enabled !== true) {
		return {
			body: fallbackBody,
			signature: `none:${fallbackBody}`,
		};
	}

	const explicitTarget = typeof clipConfig.targetName === "string" ? clipConfig.targetName.trim() : "";
	const inheritedTarget = clipConfig.inheritPrevious === true && typeof context.previousElementName === "string"
		? context.previousElementName.trim()
		: "";
	const resolvedTarget = explicitTarget || inheritedTarget;
	if (!resolvedTarget) {
		return {
			body: fallbackBody,
			signature: `unresolved:${fallbackBody}`,
		};
	}
	if (typeof currentElementName === "string" && currentElementName.trim().length > 0 && resolvedTarget === currentElementName.trim()) {
		return {
			body: fallbackBody,
			signature: `self:${resolvedTarget}`,
		};
	}

	const registry = context.layerMaskRegistry && typeof context.layerMaskRegistry === "object" ? context.layerMaskRegistry : {};
	const targetBody = registry[resolvedTarget];
	if (typeof targetBody === "string" && targetBody.length > 0) {
		return {
			body: targetBody,
			signature: `target:${resolvedTarget}:${targetBody}`,
		};
	}

	return {
		body: fallbackBody,
		signature: `fallback:${resolvedTarget}`,
	};
}

function buildElementMaskPrimitives(mask = {}, layoutMetrics) {
	const width = Math.max(1, Number(layoutMetrics?.width) || 100);
	const height = Math.max(1, Number(layoutMetrics?.height) || 100);
	const toMaskX = (value) => (clamp(value, 0, 100, 0) / 100) * width;
	const toMaskY = (value) => (clamp(value, 0, 100, 0) / 100) * height;
	const scale = Math.max(0.0001, Math.min(width, height) / 100);
	const strokes = Array.isArray(mask.strokes) ? mask.strokes : [];

	return strokes
		.map((entry) => {
			if (!entry || typeof entry !== "object") return "";
			const stroke = entry;
			const action = stroke.action === "reveal" ? "reveal" : "hide";
			const tone = action === "hide" ? "black" : "white";
			const opacity = clamp(stroke.opacity, 0.04, 1, 1);

			if (stroke.tool === "selection") {
				const shape = typeof stroke.shape === "string" ? stroke.shape : "rect";
				if (shape === "free") {
					const points = Array.isArray(stroke.points) ? stroke.points : [];
					if (points.length >= 3) {
						const pointsString = points
							.map((point) => {
								return `${toMaskX(point.x)},${toMaskY(point.y)}`;
							})
							.join(" ");
						return `<polygon points="${pointsString}" fill="${tone}" fill-opacity="${opacity}" />`;
					}
				}

					const sx = toMaskX(stroke.x);
					const sy = toMaskY(stroke.y);
					const sw = (clamp(stroke.width, 0, 100, 0) / 100) * width;
					const sh = (clamp(stroke.height, 0, 100, 0) / 100) * height;
				if (shape === "circle") {
						return `<circle cx="${sx + sw / 2}" cy="${sy + sh / 2}" r="${Math.max(0, Math.min(sw, sh) / 2)}" fill="${tone}" fill-opacity="${opacity}" />`;
				}
				if (shape === "oval") {
						return `<ellipse cx="${sx + sw / 2}" cy="${sy + sh / 2}" rx="${Math.max(0, sw / 2)}" ry="${Math.max(0, sh / 2)}" fill="${tone}" fill-opacity="${opacity}" />`;
				}
					return `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="${tone}" fill-opacity="${opacity}" />`;
			}

			const points = Array.isArray(stroke.points) ? stroke.points : [];
			if (points.length > 0) {
				const size = Math.max(0.2, (clamp(stroke.size, 0, 9999, 16) / 5.2)) * scale;
				const pointsString = points
					.map((point) => {
						return `${toMaskX(point.x)},${toMaskY(point.y)}`;
					})
					.join(" ");
				return `<polyline points="${pointsString}" fill="none" stroke="${tone}" stroke-opacity="${opacity}" stroke-width="${size}" stroke-linecap="round" stroke-linejoin="round" />`;
			}

			return "";
		})
		.join("");
}

function buildElementMaskDef(maskId, mask = {}, layoutMetrics) {
	if (!mask || typeof mask !== "object" || mask.enabled !== true) {
		return { defs: "", active: false };
	}

	const width = Math.max(1, Number(layoutMetrics?.width) || 100);
	const height = Math.max(1, Number(layoutMetrics?.height) || 100);
	const baseFill = mask.invert === true ? "black" : "white";
	const primitives = buildElementMaskPrimitives(mask, layoutMetrics);
	const defs = `<mask id="${maskId}" maskUnits="userSpaceOnUse" x="${-width}" y="${-height}" width="${width * 2}" height="${height * 2}"><rect x="${-width}" y="${-height}" width="${width * 2}" height="${height * 2}" fill="${baseFill}" />${primitives}</mask>`;

	return { defs, active: true };
}

function renderLayer(localId, body, x, y, rotation, layerStyle, layerTextures, layerGradients, layerMaterials, depthEffect, dropShadowEffect, layoutMetrics, context = {}, currentElementName = "", elementMask = null) {
	const frameKey = typeof context.cacheFrameKey === "string" ? context.cacheFrameKey : "default";
	const cacheKey = `${frameKey}::${localId}`;
	if (context.activeLayerCacheKeys && typeof context.activeLayerCacheKeys.add === "function") {
		context.activeLayerCacheKeys.add(cacheKey);
	}
	const cached = LAYER_PASS_CACHE.get(cacheKey) || {
		silhouetteSignature: "",
		materialSignature: "",
		effectsSignature: "",
		silhouetteBody: body,
		silhouetteDefs: "",
		elementMaskActive: false,
		materialDefsMarkup: "",
		textureOverlay: "",
		gradientOverlay: "",
		materialOverlay: "",
		filterDef: "",
		filterAttr: "",
	};

	const filterId = `layerFx-${localId}`;
	const maskId = `layerMask-${localId}`;
	const elementMaskId = `${maskId}-element`;
	const sourceWorldBody = `<g transform="translate(${x} ${y}) rotate(${rotation})">${body}</g>`;
	const silhouetteSignature = toSignature({
		sourceWorldBody,
		elementMask,
		layoutWidth: layoutMetrics.width,
		layoutHeight: layoutMetrics.height,
	});
	if (silhouetteSignature !== cached.silhouetteSignature) {
		const elementMaskDef = buildElementMaskDef(elementMaskId, elementMask, layoutMetrics);
		cached.silhouetteDefs = elementMaskDef.defs;
		cached.elementMaskActive = elementMaskDef.active;
		cached.silhouetteBody = elementMaskDef.active ? `<g mask="url(#${elementMaskId})">${sourceWorldBody}</g>` : sourceWorldBody;
		cached.silhouetteSignature = silhouetteSignature;
	}

	const sourceSilhouetteBody = cached.silhouetteBody;
	const filterInputBody = sourceSilhouetteBody;
	const textureDefs = Array.isArray(layerTextures)
		? layerTextures.map((layerTexture, index) => ({
			layerTexture,
			def: buildTextureDefs(`${localId}-texture-${index}`, layerTexture, layoutMetrics),
			maskId: `${maskId}-texture-${index}`,
			maskEntry: resolveClipMaskEntry(layerTexture.clip, context, filterInputBody, currentElementName),
		}))
		: [];
	const gradientDefs = Array.isArray(layerGradients)
		? layerGradients.map((layerGradient, index) => ({
			layerGradient,
			def: buildGradientOverlayDefs(`${localId}-gradient-${index}`, layerGradient),
			maskId: `${maskId}-gradient-${index}`,
			maskEntry: resolveClipMaskEntry(layerGradient.clip, context, filterInputBody, currentElementName),
		}))
		: [];
	const materialDefs = Array.isArray(layerMaterials)
		? layerMaterials.map((layerMaterial, index) => ({
			layerMaterial,
			maskId: `${maskId}-material-${index}`,
			maskEntry: resolveClipMaskEntry(layerMaterial.clip, context, filterInputBody, currentElementName),
		}))
		: [];
	const materialSignature = toSignature({
		textures: layerTextures,
		gradients: layerGradients,
		materials: layerMaterials,
		textureClips: textureDefs.map((entry) => entry.maskEntry.signature),
		gradientClips: gradientDefs.map((entry) => entry.maskEntry.signature),
		materialClips: materialDefs.map((entry) => entry.maskEntry.signature),
		layoutWidth: layoutMetrics.width,
		layoutHeight: layoutMetrics.height,
	});
	if (materialSignature !== cached.materialSignature) {
		const textureDefsMarkup = textureDefs.map((entry) => entry.def.defs).join("");
		const textureMasksMarkup = textureDefs.map((entry) => `<mask id=\"${entry.maskId}\" maskContentUnits=\"userSpaceOnUse\" style=\"mask-type:alpha\">${entry.maskEntry.body}</mask>`).join("");
		const gradientDefsMarkup = gradientDefs.map((entry) => entry.def.defs).join("");
		const gradientMasksMarkup = gradientDefs.map((entry) => `<mask id=\"${entry.maskId}\" maskContentUnits=\"userSpaceOnUse\" style=\"mask-type:alpha\">${entry.maskEntry.body}</mask>`).join("");
		const materialMasksMarkup = materialDefs.map((entry) => `<mask id=\"${entry.maskId}\" maskContentUnits=\"userSpaceOnUse\" style=\"mask-type:alpha\">${entry.maskEntry.body}</mask>`).join("");
		cached.materialDefsMarkup = `${textureDefsMarkup}${gradientDefsMarkup}${textureMasksMarkup}${gradientMasksMarkup}${materialMasksMarkup}`;

		cached.textureOverlay = textureDefs
			.map((entry) => {
				const { layerTexture, def, maskId: textureMaskId } = entry;
				if (!def.gradientId || !layerTexture.enabled || layerTexture.opacity <= 0) return "";
				const textureFilterAttr = def.filterId ? ` filter=\"url(#${def.filterId})\"` : "";
				const tx = -layoutMetrics.width;
				const ty = -layoutMetrics.height;
				const tw = layoutMetrics.width * 2;
				const th = layoutMetrics.height * 2;
				return `<rect x=\"${tx}\" y=\"${ty}\" width=\"${tw}\" height=\"${th}\" fill=\"url(#${def.gradientId})\" opacity=\"${layerTexture.opacity.toFixed(3)}\" mask=\"url(#${textureMaskId})\" style=\"mix-blend-mode:${layerTexture.blendMode};\"${textureFilterAttr} />`;
			})
			.join("");

		cached.gradientOverlay = gradientDefs
			.map((entry) => {
				const { layerGradient, def, maskId: gradientMaskId } = entry;
				if (!def.gradientId || !layerGradient.enabled || layerGradient.opacity <= 0) return "";
				const gradientFilterAttr = def.filterId ? ` filter=\"url(#${def.filterId})\"` : "";
				const tx = -layoutMetrics.width;
				const ty = -layoutMetrics.height;
				const tw = layoutMetrics.width * 2;
				const th = layoutMetrics.height * 2;
				return `<rect x=\"${tx}\" y=\"${ty}\" width=\"${tw}\" height=\"${th}\" fill=\"url(#${def.gradientId})\" opacity=\"${layerGradient.opacity.toFixed(3)}\" mask=\"url(#${gradientMaskId})\" style=\"mix-blend-mode:${layerGradient.blendMode};\"${gradientFilterAttr} />`;
			})
			.join("");

		cached.materialOverlay = materialDefs
			.map((entry) => {
				const { layerMaterial, maskId: materialMaskId } = entry;
				if (!layerMaterial.enabled || layerMaterial.opacity <= 0) return "";
				const tx = -layoutMetrics.width;
				const ty = -layoutMetrics.height;
				const tw = layoutMetrics.width * 2;
				const th = layoutMetrics.height * 2;
				return `<rect x=\"${tx}\" y=\"${ty}\" width=\"${tw}\" height=\"${th}\" fill=\"${layerMaterial.color}\" opacity=\"${layerMaterial.opacity.toFixed(3)}\" mask=\"url(#${materialMaskId})\" style=\"mix-blend-mode:${layerMaterial.blendMode};\" />`;
			})
			.join("");
		cached.materialSignature = materialSignature;
	}

	const effectsSignature = toSignature({
		style: layerStyle,
		depthEffect,
		dropShadowEffect,
		silhouetteSignature,
	});
	if (effectsSignature !== cached.effectsSignature) {
		cached.filterDef = buildLayerFilterDef(filterId, layerStyle, depthEffect, dropShadowEffect, {
			masked: cached.elementMaskActive,
			edgeRadius: 0.34,
			edgeOpacity: 0.24,
			edgeColor: typeof dropShadowEffect?.color === "string" ? dropShadowEffect.color : "#000000",
		});
		cached.filterAttr = cached.filterDef.length > 0 ? ` filter=\"url(#${filterId})\"` : "";
		cached.effectsSignature = effectsSignature;
	}

	const defs = `<defs>${cached.filterDef}${cached.silhouetteDefs}${cached.materialDefsMarkup}</defs>`;

	const worldLayer = `<g>${defs}<g${cached.filterAttr}>${cached.silhouetteBody}</g>${cached.textureOverlay}${cached.gradientOverlay}${cached.materialOverlay}</g>`;
	LAYER_PASS_CACHE.set(cacheKey, cached);
	return worldLayer;
}

function renderLayoutBase(composition, context) {
	return "";
}

function processGradientStops(stops, context) {
	if (!Array.isArray(stops)) return stops;

	const originalColors = [];
	const processed = stops.map((entry) => {
		if (typeof entry === "string") {
			originalColors.push(entry);
			return processColor(entry, context.colorControlConfig);
		}

		if (entry && typeof entry === "object") {
			const copy = { ...entry };
			if (typeof copy.color === "string") {
				originalColors.push(copy.color);
				copy.color = processColor(copy.color, context.colorControlConfig);
			}
			if (typeof copy.stopColor === "string") {
				originalColors.push(copy.stopColor);
				copy.stopColor = processColor(copy.stopColor, context.colorControlConfig);
			}
			return copy;
		}

		return entry;
	});

	if (originalColors.length > 0) {
		analyzeGradient(originalColors, context.colorControlConfig);
	}

	return processed;
}

function applyColorControlToParams(params, context, path = "") {
	if (Array.isArray(params)) {
		return params.map((entry, index) => applyColorControlToParams(entry, context, `${path}[${index}]`));
	}

	if (!params || typeof params !== "object") {
		return params;
	}

	const out = {};
	for (const [key, value] of Object.entries(params)) {
		const nextPath = path ? `${path}.${key}` : key;
		if (GRADIENT_KEYS.has(key) && Array.isArray(value)) {
			out[key] = processGradientStops(value, context);
			continue;
		}

		if (COLOR_KEYS.has(key) && typeof value === "string") {
			out[key] = processColor(value, context.colorControlConfig, { keyPath: nextPath });
			continue;
		}

		out[key] = applyColorControlToParams(value, context, nextPath);
	}

	return out;
}

export function renderElement(element, context = {}, elementIndex = 0) {
	const safeElement = requireObject(element, "element");
	if (typeof safeElement.type !== "string" || safeElement.type.trim().length === 0) {
		throw new Error("element.type must be a non-empty string.");
	}
	validateElementModel(safeElement.type, safeElement);

	const basePosition = resolvePlacement(safeElement, context);
	const positions = applySymmetry(safeElement, basePosition, context);

	const definition = getElement(safeElement.type);
	const mergedParams = {
		...(definition.defaultParams || {}),
		...(safeElement.params || {}),
	};
	const renderParams = applyColorControlToParams(mergedParams, context);

	return positions
		.map((position, positionIndex) => {
			const width = Number(context?.layoutMetrics?.width) || 100;
			const height = Number(context?.layoutMetrics?.height) || 100;
			const x = (Number(position.x) / 100) * width;
			const y = (Number(position.y) / 100) * height;
			const rotation = Number.isFinite(Number(position.rotation)) ? Number(position.rotation) : 0;
			const bodyRaw = definition.render(renderParams, position, context);
			const reshape = resolveRectLayoutReshape(safeElement, context);
			const body = reshape.enabled
				? `<g transform=\"scale(${reshape.sx.toFixed(6)} ${reshape.sy.toFixed(6)})\">${bodyRaw}</g>`
				: bodyRaw;
			const worldBody = `<g transform=\"translate(${x} ${y}) rotate(${rotation})\">${body}</g>`;
			if (typeof safeElement.name === "string" && safeElement.name.trim().length > 0 && context.layerMaskRegistry && typeof context.layerMaskRegistry === "object") {
				context.layerMaskRegistry[safeElement.name.trim()] = worldBody;
			}

			const styleAdjust = normalizeStyleAdjust(
				{
					...(safeElement.styleAdjust && typeof safeElement.styleAdjust === "object" ? safeElement.styleAdjust : {}),
					...(renderParams.styleAdjust && typeof renderParams.styleAdjust === "object" ? renderParams.styleAdjust : {}),
				},
				{ enabled: true, contrast: 1, highlight: 0, shadows: 0, sharpness: 0, hue: 0, colorOpacity: 0 },
			);
			const textureLayersFromElement = Array.isArray(safeElement.textureLayers)
				? safeElement.textureLayers.filter((entry) => entry && typeof entry === "object")
				: [];
			const textureLayersFromParams = Array.isArray(renderParams.textureLayers)
				? renderParams.textureLayers.filter((entry) => entry && typeof entry === "object")
				: [];
			const textureLayerSources = textureLayersFromElement.length > 0 || textureLayersFromParams.length > 0
				? [...textureLayersFromElement, ...textureLayersFromParams]
				: [{
					...(safeElement.texture && typeof safeElement.texture === "object" ? safeElement.texture : {}),
					...(renderParams.texture && typeof renderParams.texture === "object" ? renderParams.texture : {}),
				}];
			const textureLayers = textureLayerSources.map((entry) =>
				normalizeTexture(entry, { enabled: false, opacity: 0.22, blendMode: "overlay" }),
			);
			const gradientLayersFromElement = Array.isArray(safeElement.gradientLayers)
				? safeElement.gradientLayers.filter((entry) => entry && typeof entry === "object")
				: [];
			const gradientLayersFromParams = Array.isArray(renderParams.gradientLayers)
				? renderParams.gradientLayers.filter((entry) => entry && typeof entry === "object")
				: [];
			const gradientLayerSources = gradientLayersFromElement.length > 0 || gradientLayersFromParams.length > 0
				? [...gradientLayersFromElement, ...gradientLayersFromParams]
				: [{
					...(safeElement.gradient && typeof safeElement.gradient === "object" ? safeElement.gradient : {}),
					...(renderParams.gradientOverlay && typeof renderParams.gradientOverlay === "object" ? renderParams.gradientOverlay : {}),
				}];
			const gradientLayers = gradientLayerSources.map((entry) =>
				normalizeGradientOverlay(entry, { enabled: false, opacity: 0.24, blendMode: "overlay" }),
			);
			const materialLayersFromElement = Array.isArray(safeElement.materialLayers)
				? safeElement.materialLayers.filter((entry) => entry && typeof entry === "object")
				: [];
			const materialLayersFromParams = Array.isArray(renderParams.materialLayers)
				? renderParams.materialLayers.filter((entry) => entry && typeof entry === "object")
				: [];
			const materialLayerSources = materialLayersFromElement.length > 0 || materialLayersFromParams.length > 0
				? [...materialLayersFromElement, ...materialLayersFromParams]
				: [{
					...(safeElement.material && typeof safeElement.material === "object" ? safeElement.material : {}),
					...(renderParams.material && typeof renderParams.material === "object" ? renderParams.material : {}),
				}];
			const materialLayers = materialLayerSources.map((entry) =>
				normalizeMaterialOverlay(entry, { enabled: false, color: "#ffffff", opacity: 0.18, blendMode: "multiply" }),
			);
			const depth = normalizeDepthEffect(
				{
					...(safeElement.effect3d && typeof safeElement.effect3d === "object" ? safeElement.effect3d : {}),
					...(renderParams.effect3d && typeof renderParams.effect3d === "object" ? renderParams.effect3d : {}),
				},
				null,
			);
			const dropShadow = normalizeDropShadowEffect(
				{
					...(safeElement.dropShadow && typeof safeElement.dropShadow === "object" ? safeElement.dropShadow : {}),
					...(renderParams.dropShadow && typeof renderParams.dropShadow === "object" ? renderParams.dropShadow : {}),
				},
			);
			const localId = `el-${elementIndex}-${positionIndex}`;
			const currentElementName = typeof safeElement.name === "string" ? safeElement.name.trim() : "";
			const elementMask = safeElement.mask && typeof safeElement.mask === "object" ? safeElement.mask : null;
			return renderLayer(localId, body, x, y, rotation, styleAdjust, textureLayers, gradientLayers, materialLayers, depth, dropShadow, context.layoutMetrics, context, currentElementName, elementMask);
		})
		.join("");
}

export function renderSvg(resolvedComposition, context = {}) {
	const composition = requireObject(resolvedComposition, "resolvedComposition");
	const layoutMetrics = buildLayoutMetrics(composition);
	const depthEffect = buildDepthEffect(composition);
	const elements = Array.isArray(composition.elements) ? composition.elements : [];
	let uid = 0;
	const renderContext = {
		...context,
		layoutMetrics,
		depthEffect,
		globalDepthEnabled: depthEffect.enabled && depthEffect.intensity > 0,
		cacheFrameKey: `${layoutMetrics.width}x${layoutMetrics.height}`,
		activeLayerCacheKeys: new Set(),
		composition,
		layerMaskRegistry: {},
		previousElementName: "",
		allocId(prefix = "id") {
			uid += 1;
			return `${prefix}-${uid}`;
		},
	};
	const baseLayer = renderLayoutBase(composition, renderContext);
	const body = elements
		.map((element, index) => {
			const chunk = renderElement(element, renderContext, index);
			if (typeof element?.name === "string" && element.name.trim().length > 0) {
				renderContext.previousElementName = element.name.trim();
			}
			return chunk;
		})
		.join("");
	const globalDepthId = "globalDepthFx";
	const globalDepthDef = renderContext.globalDepthEnabled
		? buildLayerFilterDef(globalDepthId, { enabled: false, contrast: 1, highlight: 0, shadows: 0, sharpness: 0, hue: 0, colorOpacity: 0, color: null }, depthEffect)
		: "";
	const content = `${baseLayer}${body}`;
	if (renderContext.activeLayerCacheKeys && renderContext.activeLayerCacheKeys.size > 0) {
		const active = renderContext.activeLayerCacheKeys;
		for (const key of LAYER_PASS_CACHE.keys()) {
			if (key.startsWith(`${renderContext.cacheFrameKey}::`) && !active.has(key)) {
				LAYER_PASS_CACHE.delete(key);
			}
		}
	}
	if (LAYER_PASS_CACHE.size > 1200) {
		LAYER_PASS_CACHE.clear();
	}
	if (globalDepthDef.length > 0) {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layoutMetrics.width} ${layoutMetrics.height}"><defs>${globalDepthDef}</defs><g filter="url(#${globalDepthId})">${content}</g></svg>`;
	}
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layoutMetrics.width} ${layoutMetrics.height}">${content}</svg>`;
}
