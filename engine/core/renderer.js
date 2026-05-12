"use strict";

import { getElement } from "../elements/elementRegistry.js";
import { validateElementModel } from "../elements/elementRegistry.js";
import { analyzeGradient, processColor } from "../color/colorController.js";
import { resolvePlacement } from "./placement.js";
import { applySymmetry } from "./symmetry.js";
import { getMaskFrame, mapLocalPointToFrame } from "./maskFrame.js";
import { resolveSurfaceSource } from "./sourceResolver.js";

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
	return normalizeDepthEffect(effect, {
		enabled: false,
		mode: "outer",
		intensity: 0.46,
		opacity: 0.8,
		dx: Math.cos((-35 * Math.PI) / 180) * 1.2,
		dy: Math.sin((-35 * Math.PI) / 180) * 1.2,
		falloff: 1,
		whiteBalance: 0,
		spread: 0,
	});
}

function normalizeStyleAdjust(source = {}, fallback = {}) {
	const src = source && typeof source === "object" ? source : {};
	return {
		enabled: src.enabled !== false,
		highlight: clamp(src.highlight, -1, 1, fallback.highlight ?? 0),
		shadows: clamp(src.shadows, -1, 1, fallback.shadows ?? 0),
		// Spec 075 T1: contrast remapped to -1..+1 with 0=neutral (matches
		// highlight/shadows/sharpness convention). Renderer converts to slope
		// via slope = 1 + contrast. Old saves with contrast=0 are now harmless.
		contrast: clamp(src.contrast, -1, 1, fallback.contrast ?? 0),
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
	const lightingMode = typeof src.lightingMode === "string" ? src.lightingMode : null;
	const lightX = Number(light.x);
	const lightY = Number(light.y);
	const lightZ = Number(light.z);
	// Only use manual light vector in 3D mode AND when lateral direction is non-zero.
	// 2D mode must always use angle path. Zero x/y (default slider state) falls through to angle too.
	const hasManualLightVector = lightingMode !== "2d"
		&& Number.isFinite(lightX) && Number.isFinite(lightY)
		&& (lightX !== 0 || lightY !== 0);

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
		opacity: clamp(src.opacity, 0, 1, 0.75),
		blur: clamp(src.blur, 0, 20, 8),
		spread: clamp(src.spread, 0, 20, 0),
		offsetX: clamp(src.offsetX, -20, 20, 4),
		offsetY: clamp(src.offsetY, -20, 20, 4),
	};
}

function buildLayerFilterDef(filterId, styleAdjust, depthEffect, dropShadowEffect = { enabled: false, mode: "outer", opacity: 0 }, renderOptions = {}) {
	if (!styleAdjust.enabled && !depthEffect.enabled && !dropShadowEffect.enabled) return "";
	const effectSilhouetteSource = typeof renderOptions?.effectSilhouetteSource === "string"
		? renderOptions.effectSilhouetteSource
		: "source-alpha";
	const useSnapshotImageSilhouette = effectSilhouetteSource === "snapshot-image-alpha"
		&& typeof renderOptions.snapshotImageDataUrl === "string"
		&& renderOptions.snapshotImageDataUrl.trim().length > 0;
	const alphaRef = useSnapshotImageSilhouette ? "silhouetteAlpha" : "SourceAlpha";
	// Snapshot image geometry in filter coordinate space (same coords as the <image> body element).
	const silhouetteX = Number.isFinite(Number(renderOptions.snapshotSilhouetteX)) ? Number(renderOptions.snapshotSilhouetteX) : 0;
	const silhouetteY = Number.isFinite(Number(renderOptions.snapshotSilhouetteY)) ? Number(renderOptions.snapshotSilhouetteY) : 0;
	const silhouetteW = Number.isFinite(Number(renderOptions.snapshotSilhouetteW)) && Number(renderOptions.snapshotSilhouetteW) > 0 ? Number(renderOptions.snapshotSilhouetteW) : null;
	const silhouetteH = Number.isFinite(Number(renderOptions.snapshotSilhouetteH)) && Number(renderOptions.snapshotSilhouetteH) > 0 ? Number(renderOptions.snapshotSilhouetteH) : null;

	// Keep tone and sharpening responsive but avoid tiny slider movement causing heavy clipping.
	const toneShift = (styleAdjust.highlight - styleAdjust.shadows) * 0.12;
	// Spec 075 T1: contrast stored as -1..+1 (0=neutral). Convert to SVG
	// slope. -1 = mute (slope 0), 0 = identity (slope 1), +1 = double (slope 2).
	const contrastSlope = 1 + clamp(styleAdjust.contrast, -1, 1, 0);
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
	const parts = [
		`<filter id=\"${filterId}\" x=\"-200%\" y=\"-200%\" width=\"500%\" height=\"500%\">`,
		...(useSnapshotImageSilhouette
			? [
				`<feImage href="${escapeAttribute(renderOptions.snapshotImageDataUrl.trim())}"${silhouetteW !== null && silhouetteH !== null ? ` x="${silhouetteX}" y="${silhouetteY}" width="${silhouetteW}" height="${silhouetteH}" preserveAspectRatio="none"` : ""} result="snapshotSurface" />`,
				`<feColorMatrix in="snapshotSurface" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="silhouetteAlpha" />`,
			]
			: []),
		`<feColorMatrix in=\"SourceGraphic\" type=\"hueRotate\" values=\"${styleAdjust.hue.toFixed(3)}\" result=\"hue\" />`,
		`<feComponentTransfer in=\"hue\" result=\"tone\">`,
		`<feFuncR type=\"linear\" slope=\"${contrastSlope.toFixed(4)}\" intercept=\"${toneShift.toFixed(4)}\" />`,
		`<feFuncG type=\"linear\" slope=\"${contrastSlope.toFixed(4)}\" intercept=\"${toneShift.toFixed(4)}\" />`,
		`<feFuncB type=\"linear\" slope=\"${contrastSlope.toFixed(4)}\" intercept=\"${toneShift.toFixed(4)}\" />`,
		"</feComponentTransfer>",
	];

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
		const shadowBlur = Math.max(0, Number(dropShadowEffect.blur));
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

	if (styleAdjust.color && styleAdjust.colorOpacity > 0) {
		parts.push(`<feFlood flood-color=\"${styleAdjust.color}\" flood-opacity=\"${styleAdjust.colorOpacity.toFixed(3)}\" result=\"tintFill\" />`);
		parts.push(`<feComposite in="tintFill" in2="${alphaRef}" operator="in" result="tintMask" />`);
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
	if (!clipConfig || clipConfig.enabled !== true) return fallbackBody;

	const registry = context.layerMaskRegistry && typeof context.layerMaskRegistry === "object" ? context.layerMaskRegistry : {};
	const currentName = typeof currentElementName === "string" ? currentElementName.trim() : "";
	const explicitTarget = typeof clipConfig.targetName === "string" ? clipConfig.targetName.trim() : "";
	const inheritedTarget = clipConfig.inheritPrevious === true && typeof context.previousElementName === "string"
		? context.previousElementName.trim()
		: "";
	const candidates = [];
	if (explicitTarget.length > 0) candidates.push(explicitTarget);
	if (inheritedTarget.length > 0 && inheritedTarget !== explicitTarget) candidates.push(inheritedTarget);

	for (const candidate of candidates) {
		if (currentName.length > 0 && candidate === currentName) continue;
		const targetBody = registry[candidate];
		if (typeof targetBody === "string" && targetBody.length > 0) {
			return targetBody;
		}
	}

	return fallbackBody;
}

function resolveMaskCoordinateSpace(mask = {}) {
	if (!mask || typeof mask !== "object") return "global";
	const space = typeof mask.coordinateSpace === "string" ? mask.coordinateSpace.trim().toLowerCase() : "";
	return space === "local" ? "local" : "global";
}

function buildElementMaskPrimitives(mask = {}, layoutMetrics) {
	const width = Math.max(1, Number(layoutMetrics?.width) || 100);
	const height = Math.max(1, Number(layoutMetrics?.height) || 100);
	const coordinateSpace = resolveMaskCoordinateSpace(mask);
	// Spec 074 T3 / E.06�E.08 / L.04: NaN-safe mapping. Returns null when the
	// input coord is non-finite OR null/undefined � caller MUST drop the
	// primitive (do not silently coerce to 0/50, that produces phantom marks
	// at the origin). Note: Number(null) === 0, so the explicit null check is
	// required even though isFinite(0) is true.
	const finite = (value) => {
		if (value === null || value === undefined) return null;
		const n = Number(value);
		return Number.isFinite(n) ? n : null;
	};
	// Spec 074 T4: shared origin-centered frame for the local path; legacy
	// 'global' path is kept inline (top-left frame) until migration retires it.
	const frame = getMaskFrame({ width, height });
	const mapPoint = coordinateSpace === "local"
		? (xVal, yVal) => {
			const mapped = mapLocalPointToFrame({ x: finite(xVal), y: finite(yVal) }, frame);
			return mapped === null ? null : { px: mapped.px, py: mapped.py };
		}
		: (xVal, yVal) => {
			const fx = finite(xVal);
			const fy = finite(yVal);
			if (fx === null || fy === null) return null;
			return { px: (fx / 100) * width, py: (fy / 100) * height };
		};
	const scale = Math.max(0.0001, Math.min(width, height) / 100);
	const strokes = Array.isArray(mask.strokes) ? mask.strokes : [];

	// Spec 074 L.11: hard cap on points per stroke (10000) to bound work.
	const POINT_HARD_CAP = 10000;
	const POINT_WARN_CAP = 5000;

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
					const rawPoints = Array.isArray(stroke.points)
						? stroke.points.filter((point) => point && typeof point === "object")
						: [];
					const mapped = rawPoints
						.map((point) => {
							const m = mapPoint(point.x, point.y);
							return m === null ? null : `${m.px},${m.py}`;
						})
						.filter((entry) => entry !== null);
					if (mapped.length >= 3) {
						return `<polygon points="${mapped.join(" ")}" fill="${tone}" fill-opacity="${opacity}" />`;
					}
					return "";
				}

				const corner = mapPoint(stroke.x, stroke.y);
				const wRaw = finite(stroke.width);
				const hRaw = finite(stroke.height);
				if (corner === null || wRaw === null || hRaw === null) return "";
				const x = corner.px;
				const y = corner.py;
				const w = (Math.max(0, Math.min(100, wRaw)) / 100) * width;
				const h = (Math.max(0, Math.min(100, hRaw)) / 100) * height;
				if (!(w > 0) || !(h > 0)) return "";
				if (shape === "circle") {
					return `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${Math.max(0, Math.min(w, h) / 2)}" fill="${tone}" fill-opacity="${opacity}" />`;
				}
				if (shape === "oval") {
					return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${Math.max(0, w / 2)}" ry="${Math.max(0, h / 2)}" fill="${tone}" fill-opacity="${opacity}" />`;
				}
				return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${tone}" fill-opacity="${opacity}" />`;
			}

			const rawPoints = Array.isArray(stroke.points)
				? stroke.points.filter((point) => point && typeof point === "object")
				: [];
			if (rawPoints.length > POINT_WARN_CAP && typeof console !== "undefined" && console.warn) {
				console.warn(`[mask] stroke has ${rawPoints.length} points (warn cap ${POINT_WARN_CAP}); will truncate at ${POINT_HARD_CAP}.`);
			}
			const limited = rawPoints.length > POINT_HARD_CAP ? rawPoints.slice(0, POINT_HARD_CAP) : rawPoints;
			const mappedPairs = limited
				.map((point) => mapPoint(point.x, point.y))
				.filter((entry) => entry !== null);
			if (mappedPairs.length > 0) {
				const size = Math.max(0.2, (clamp(stroke.size, 0, 9999, 16) / 5.2)) * scale;
				// Spec 075: single-point strokes (a click without drag) render as
				// a degenerate <polyline points="x,y" /> which browsers handle
				// inconsistently � Chrome paints nothing, others may fall back
				// to filling the entire mask region (causing the "whole element
				// masked" symptom). Emit an explicit <circle> instead so a click
				// always produces a visible round dab matching stroke-linecap.
				if (mappedPairs.length === 1) {
					const { px, py } = mappedPairs[0];
					return `<circle cx="${px}" cy="${py}" r="${size / 2}" fill="${tone}" fill-opacity="${opacity}" />`;
				}
				const points = mappedPairs.map(({ px, py }) => `${px},${py}`).join(" ");
				return `<polyline points="${points}" fill="none" stroke="${tone}" stroke-opacity="${opacity}" stroke-width="${size}" stroke-linecap="round" stroke-linejoin="round" />`;
			}

			return "";
		})
		.join("");
}

function buildElementMaskDef(maskId, mask = {}, layoutMetrics) {
	if (!mask || typeof mask !== "object" || mask.enabled !== true) {
		return { defs: "", active: false, primitives: "" };
	}

	const width = Math.max(1, Number(layoutMetrics?.width) || 100);
	const height = Math.max(1, Number(layoutMetrics?.height) || 100);
	const field = mask.field && typeof mask.field === "object" ? mask.field : null;
	const fieldImageDataUrl = typeof field?.imageDataUrl === "string" ? field.imageDataUrl.trim() : "";
	const fieldWidth = Math.max(1, Number(field?.width) || width);
	const fieldHeight = Math.max(1, Number(field?.height) || height);
	const fieldIsUsable = fieldImageDataUrl.length > 0;
	if (fieldIsUsable) {
		const regionX = -fieldWidth / 2;
		const regionY = -fieldHeight / 2;
		if (mask.invert === true) {
			// Invert the field image: feComponentTransfer flips alpha (255→0 hidden, 0→255 shown).
			// NO background rect — SVG mask default background is transparent (alpha=0=hidden),
			// so filtered-to-transparent pixels correctly hide and there's no bleed-through.
			const filterId = `${maskId}_inv`;
			const filterDef = `<filter id="${filterId}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncA type="linear" slope="-1" intercept="1"/></feComponentTransfer></filter>`;
			const defs = `${filterDef}<mask id="${maskId}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="${regionX}" y="${regionY}" width="${fieldWidth}" height="${fieldHeight}" style="mask-type:alpha"><image x="${regionX}" y="${regionY}" width="${fieldWidth}" height="${fieldHeight}" preserveAspectRatio="none" href="${escapeAttribute(fieldImageDataUrl)}" filter="url(#${filterId})"/></mask>`;
			return {
				defs,
				active: true,
				primitives: "",
				region: { x: regionX, y: regionY, width: fieldWidth, height: fieldHeight },
				coordinateSpace: "local",
				source: "field-inverted",
			};
		}
		const defs = `<mask id="${maskId}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="${regionX}" y="${regionY}" width="${fieldWidth}" height="${fieldHeight}" style="mask-type:alpha"><image x="${regionX}" y="${regionY}" width="${fieldWidth}" height="${fieldHeight}" preserveAspectRatio="none" href="${escapeAttribute(fieldImageDataUrl)}" /></mask>`;
		return {
			defs,
			active: true,
			primitives: "",
			region: { x: regionX, y: regionY, width: fieldWidth, height: fieldHeight },
			coordinateSpace: "local",
			source: "field",
		};
	}
	const baseFill = mask.invert === true ? "black" : "white";
	const primitives = buildElementMaskPrimitives(mask, layoutMetrics);
	const hasPrimitives = typeof primitives === "string" && primitives.trim().length > 0;
	if (!hasPrimitives && mask.invert !== true) {
		return { defs: "", active: false, primitives: "" };
	}
	// Spec 074 D.13/D.14/E.04/E.05: region MUST cover the body's frame.
	// Element bodies live around the origin (origin-centered local frame), so when
	// mask primitives are mapped in local space the region is (-W/2,-H/2)..(W,H).
	// Legacy 'global' coordinateSpace still uses (0,0)..(W,H) until migration.
	const coordinateSpace = resolveMaskCoordinateSpace(mask);
	const regionX = coordinateSpace === "local" ? -width / 2 : 0;
	const regionY = coordinateSpace === "local" ? -height / 2 : 0;
	const defs = `<mask id="${maskId}" maskUnits="userSpaceOnUse" x="${regionX}" y="${regionY}" width="${width}" height="${height}"><rect x="${regionX}" y="${regionY}" width="${width}" height="${height}" fill="${baseFill}" />${primitives}</mask>`;

	return { defs, active: true, primitives, region: { x: regionX, y: regionY, width, height }, coordinateSpace };
}

function buildSilhouetteCacheSignature(body, elementMask, layoutMetrics) {
	const width = Math.max(1, Number(layoutMetrics?.width) || 100);
	const height = Math.max(1, Number(layoutMetrics?.height) || 100);
	let maskSignature = "null";
	if (elementMask && typeof elementMask === "object") {
		try {
			maskSignature = JSON.stringify(elementMask);
		} catch (_error) {
			maskSignature = "unserializable-mask";
		}
	}

	return `${width}x${height}|${body}|${maskSignature}`;
}

function computeLocalSilhouetteSources(localId, body, maskId, elementMask, layoutMetrics, context = {}) {
	const signature = buildSilhouetteCacheSignature(body, elementMask, layoutMetrics);
	if (context && typeof context === "object") {
		if (!context.silhouetteSurfaceCacheByLayer || typeof context.silhouetteSurfaceCacheByLayer !== "object") {
			context.silhouetteSurfaceCacheByLayer = {};
		}
		const cached = context.silhouetteSurfaceCacheByLayer[localId];
		if (cached && cached.signature === signature && cached.value && typeof cached.value === "object") {
			return {
				...cached.value,
				cacheHit: true,
				cacheSignature: signature,
			};
		}
	}

	const elementMaskDef = buildElementMaskDef(maskId, elementMask, layoutMetrics);
	const geometryPath = body;
	const silhouettePath = elementMaskDef.active ? `<g mask="url(#${maskId})">${body}</g>` : body;
	const silhouetteAlpha = elementMaskDef.active ? elementMaskDef.primitives : null;
	const value = {
		geometryPath,
		silhouettePath,
		silhouetteAlpha,
		elementMaskDef,
	};
	if (context && typeof context === "object") {
		context.silhouetteSurfaceCacheByLayer[localId] = {
			signature,
			value,
		};
	}

	return {
		...value,
		cacheHit: false,
		cacheSignature: signature,
	};
}

function sanitizeSvgIdToken(value) {
	const raw = typeof value === "string" ? value : "";
	const token = raw.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
	return token.length > 0 ? token : "layer";
}

function buildLayerMaskBaseId(localId, context = {}) {
	const safeLocalId = sanitizeSvgIdToken(localId);
	if (context && typeof context.allocId === "function") {
		const uniqueToken = sanitizeSvgIdToken(context.allocId("mask"));
		return `layerMask-${safeLocalId}-${uniqueToken}`;
	}
	return `layerMask-${safeLocalId}`;
}

function resolveLayerControllerSources(surfaceSources) {
	const sources = surfaceSources && typeof surfaceSources === "object" ? surfaceSources : {};
	const geometryBody = typeof sources.geometryPath === "string" ? sources.geometryPath : "";
	const silhouetteBody = typeof sources.silhouettePath === "string" && sources.silhouettePath.length > 0
		? sources.silhouettePath
		: geometryBody;
	return {
		styleFx: {
			source: "silhouettePath",
			body: silhouetteBody,
		},
		depthFx: {
			source: "silhouettePath",
			body: silhouetteBody,
		},
		dropShadow: {
			source: "silhouettePath",
			body: silhouetteBody,
		},
		globalLight: {
			source: "silhouettePath",
			body: silhouetteBody,
		},
		uvLocal: {
			source: "geometryPath",
			body: geometryBody,
		},
	};
}

function resolveGlobalControllerSources() {
	return {
		postCompositeGrading: {
			source: "postComposite",
		},
	};
}

function resolveRenderQualityMode(context = {}) {
	if (!context || typeof context !== "object") return "final";
	return context.renderQualityMode === "preview" ? "preview" : "final";
}

function simplifyOverlayLayerForPreview(layer = {}) {
	const safeLayer = layer && typeof layer === "object" ? layer : {};
	const blur = safeLayer.blur && typeof safeLayer.blur === "object" ? safeLayer.blur : {};
	return {
		...safeLayer,
		blur: {
			...blur,
			enabled: false,
			amount: 0,
			strength: 0,
			samples: 3,
		},
	};
}

function renderLayer(localId, body, x, y, rotation, layerStyle, layerTextures, layerGradients, layerMaterials, depthEffect, dropShadowEffect, layoutMetrics, context = {}, currentElementName = "", elementMask = null, maskFrameMetrics = null, renderOptions = {}) {
	const filterId = `layerFx-${localId}`;
	const maskId = buildLayerMaskBaseId(localId, context);
	const elementMaskId = `${maskId}-element`;
	const elementTransform = `translate(${x} ${y}) rotate(${rotation})`;
	const resolvedMaskFrame = maskFrameMetrics && typeof maskFrameMetrics === "object" ? maskFrameMetrics : layoutMetrics;
	const localSilhouette = computeLocalSilhouetteSources(localId, body, elementMaskId, elementMask, resolvedMaskFrame, context);
	const layerControllerSources = resolveLayerControllerSources(localSilhouette);
	const filterInputBody = typeof layerControllerSources.globalLight?.body === "string" && layerControllerSources.globalLight.body.length > 0
		? layerControllerSources.globalLight.body
		: (typeof layerControllerSources.depthFx?.body === "string" && layerControllerSources.depthFx.body.length > 0
			? layerControllerSources.depthFx.body
			: layerControllerSources.styleFx.body);
	const localUvInputBody = typeof layerControllerSources.uvLocal?.body === "string" && layerControllerSources.uvLocal.body.length > 0
		? layerControllerSources.uvLocal.body
		: filterInputBody;
	const filterDef = buildLayerFilterDef(filterId, layerStyle, depthEffect, dropShadowEffect, renderOptions);
	const elementMaskDef = localSilhouette.elementMaskDef;
	if (context && context.maskDebug === true && elementMaskDef.active) {
		console.log({
			elementId: localId,
			elementTransform,
			coordinateSpace: resolveMaskCoordinateSpace(elementMask || {}),
			maskId: elementMaskId,
			region: elementMaskDef.region,
			silhouettePathLength: typeof localSilhouette.silhouettePath === "string" ? localSilhouette.silhouettePath.length : 0,
		});
	}
	if (context && typeof context === "object") {
		if (!context.localSilhouetteRegistry || typeof context.localSilhouetteRegistry !== "object") {
			context.localSilhouetteRegistry = {};
		}
		const surfaceSources = {
			geometryPath: localSilhouette.geometryPath,
			silhouettePath: localSilhouette.silhouettePath,
			silhouetteAlpha: localSilhouette.silhouetteAlpha,
		};
		context.localSilhouetteRegistry[localId] = surfaceSources;
		if (!context.renderSurfaceSourcesByLayer || typeof context.renderSurfaceSourcesByLayer !== "object") {
			context.renderSurfaceSourcesByLayer = {};
		}
		context.renderSurfaceSourcesByLayer[localId] = surfaceSources;
		if (!context.renderSurfaceSourceDebugByLayer || typeof context.renderSurfaceSourceDebugByLayer !== "object") {
			context.renderSurfaceSourceDebugByLayer = {};
		}
		context.renderSurfaceSourceDebugByLayer[localId] = {
			cacheHit: localSilhouette.cacheHit === true,
			cacheSignature: localSilhouette.cacheSignature,
			controllerSources: {
				styleFx: layerControllerSources.styleFx.source,
				depthFx: layerControllerSources.depthFx.source,
				dropShadow: layerControllerSources.dropShadow.source,
				globalLight: layerControllerSources.globalLight.source,
				uvLocal: layerControllerSources.uvLocal.source,
			},
		};
		if (typeof currentElementName === "string" && currentElementName.trim().length > 0) {
			if (!context.renderSurfaceSourcesByName || typeof context.renderSurfaceSourcesByName !== "object") {
				context.renderSurfaceSourcesByName = {};
			}
			context.renderSurfaceSourcesByName[currentElementName.trim()] = surfaceSources;
		};
	}
	const overlayMaskFallbackBody = renderOptions
		&& renderOptions.useSnapshotSource === true
		&& renderOptions.snapshotRenderMode === "editable"
		&& typeof renderOptions.snapshotMaskBody === "string"
		&& renderOptions.snapshotMaskBody.length > 0
		? renderOptions.snapshotMaskBody
		: localUvInputBody;

	const textureDefs = Array.isArray(layerTextures)
		? layerTextures.map((layerTexture, index) => ({
			layerTexture,
			def: buildTextureDefs(`${localId}-texture-${index}`, layerTexture, layoutMetrics),
			maskId: `${maskId}-texture-${index}`,
			maskBody: resolveClipMaskBody(layerTexture.clip, context, overlayMaskFallbackBody, currentElementName),
		}))
		: [];
	const gradientDefs = Array.isArray(layerGradients)
		? layerGradients.map((layerGradient, index) => ({
			layerGradient,
			def: buildGradientOverlayDefs(`${localId}-gradient-${index}`, layerGradient),
			maskId: `${maskId}-gradient-${index}`,
			maskBody: resolveClipMaskBody(layerGradient.clip, context, overlayMaskFallbackBody, currentElementName),
		}))
		: [];
	const materialDefs = Array.isArray(layerMaterials)
		? layerMaterials.map((layerMaterial, index) => ({
			layerMaterial,
			maskId: `${maskId}-material-${index}`,
			maskBody: resolveClipMaskBody(layerMaterial.clip, context, overlayMaskFallbackBody, currentElementName),
		}))
		: [];
	const maskFrameWidth = Math.max(1, Number(resolvedMaskFrame?.width) || Number(layoutMetrics?.width) || 100);
	const maskFrameHeight = Math.max(1, Number(resolvedMaskFrame?.height) || Number(layoutMetrics?.height) || 100);
	const maskRegionX = -maskFrameWidth;
	const maskRegionY = -maskFrameHeight;
	const maskRegionWidth = maskFrameWidth * 2;
	const maskRegionHeight = maskFrameHeight * 2;
	const textureDefsMarkup = textureDefs.map((entry) => entry.def.defs).join("");
	const textureMasksMarkup = textureDefs.map((entry) => `<mask id=\"${entry.maskId}\" maskUnits=\"userSpaceOnUse\" maskContentUnits=\"userSpaceOnUse\" x=\"${maskRegionX}\" y=\"${maskRegionY}\" width=\"${maskRegionWidth}\" height=\"${maskRegionHeight}\" style=\"mask-type:alpha\">${entry.maskBody}</mask>`).join("");
	const gradientDefsMarkup = gradientDefs.map((entry) => entry.def.defs).join("");
	const gradientMasksMarkup = gradientDefs.map((entry) => `<mask id=\"${entry.maskId}\" maskUnits=\"userSpaceOnUse\" maskContentUnits=\"userSpaceOnUse\" x=\"${maskRegionX}\" y=\"${maskRegionY}\" width=\"${maskRegionWidth}\" height=\"${maskRegionHeight}\" style=\"mask-type:alpha\">${entry.maskBody}</mask>`).join("");
	const materialMasksMarkup = materialDefs.map((entry) => `<mask id=\"${entry.maskId}\" maskUnits=\"userSpaceOnUse\" maskContentUnits=\"userSpaceOnUse\" x=\"${maskRegionX}\" y=\"${maskRegionY}\" width=\"${maskRegionWidth}\" height=\"${maskRegionHeight}\" style=\"mask-type:alpha\">${entry.maskBody}</mask>`).join("");
	const defs = `<defs>${filterDef}${elementMaskDef.defs}${textureDefsMarkup}${gradientDefsMarkup}${textureMasksMarkup}${gradientMasksMarkup}${materialMasksMarkup}</defs>`;
	const filterAttr = filterDef.length > 0 ? ` filter=\"url(#${filterId})\"` : "";

	const textureOverlay = textureDefs
		.map((entry) => {
			const { layerTexture, def, maskId: textureMaskId } = entry;
			if (!def.gradientId || !layerTexture.enabled || layerTexture.opacity <= 0) return "";
			const textureFilterAttr = def.filterId ? ` filter=\"url(#${def.filterId})\"` : "";
			const tx = -maskFrameWidth;
			const ty = -maskFrameHeight;
			const tw = maskFrameWidth * 2;
			const th = maskFrameHeight * 2;
			return `<rect x=\"${tx}\" y=\"${ty}\" width=\"${tw}\" height=\"${th}\" fill=\"url(#${def.gradientId})\" opacity=\"${layerTexture.opacity.toFixed(3)}\" mask=\"url(#${textureMaskId})\" style=\"mix-blend-mode:${layerTexture.blendMode};\"${textureFilterAttr} />`;
		})
		.join("");

	const gradientOverlay = gradientDefs
		.map((entry) => {
			const { layerGradient, def, maskId: gradientMaskId } = entry;
			if (!def.gradientId || !layerGradient.enabled || layerGradient.opacity <= 0) return "";
			const gradientFilterAttr = def.filterId ? ` filter=\"url(#${def.filterId})\"` : "";
			const tx = -maskFrameWidth;
			const ty = -maskFrameHeight;
			const tw = maskFrameWidth * 2;
			const th = maskFrameHeight * 2;
			return `<rect x=\"${tx}\" y=\"${ty}\" width=\"${tw}\" height=\"${th}\" fill=\"url(#${def.gradientId})\" opacity=\"${layerGradient.opacity.toFixed(3)}\" mask=\"url(#${gradientMaskId})\" style=\"mix-blend-mode:${layerGradient.blendMode};\"${gradientFilterAttr} />`;
		})
		.join("");

	const materialOverlay = materialDefs
		.map((entry) => {
			const { layerMaterial, maskId: materialMaskId } = entry;
			if (!layerMaterial.enabled || layerMaterial.opacity <= 0) return "";
			const tx = -maskFrameWidth;
			const ty = -maskFrameHeight;
			const tw = maskFrameWidth * 2;
			const th = maskFrameHeight * 2;
			return `<rect x=\"${tx}\" y=\"${ty}\" width=\"${tw}\" height=\"${th}\" fill=\"${layerMaterial.color}\" opacity=\"${layerMaterial.opacity.toFixed(3)}\" mask=\"url(#${materialMaskId})\" style=\"mix-blend-mode:${layerMaterial.blendMode};\" />`;
		})
		.join("");
	const overlayMarkup = `${textureOverlay}${gradientOverlay}${materialOverlay}`;
	const visibleOverlayMarkup = elementMaskDef.active && overlayMarkup.length > 0
		? `<g mask=\"url(#${elementMaskId})\">${overlayMarkup}</g>`
		: overlayMarkup;

	return `<g transform=\"translate(${x} ${y}) rotate(${rotation})\">${defs}<g${filterAttr}>${filterInputBody}</g>${visibleOverlayMarkup}</g>`;
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

function resolveElementRenderSourceMode(element = {}) {
	if (!element || typeof element !== "object") return "live";
	const renderState = element.renderState && typeof element.renderState === "object" ? element.renderState : {};
	return renderState.sourceMode === "snapshot" ? "snapshot" : "live";
}

function resolveSnapshotRenderMode(element = {}) {
	if (!element || typeof element !== "object") return "frozen";
	const renderState = element.renderState && typeof element.renderState === "object" ? element.renderState : {};
	return renderState.snapshotRenderMode === "editable" ? "editable" : "frozen";
}

function escapeAttribute(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function resolveSnapshotRenderSource(element = {}, layoutMetrics = {}) {
	if (!element || typeof element !== "object") return null;
	const renderState = element.renderState && typeof element.renderState === "object" ? element.renderState : {};
	const snapshot = renderState.snapshot && typeof renderState.snapshot === "object" ? renderState.snapshot : null;
	if (!snapshot) return null;

	const imageDataUrl = typeof snapshot.imageDataUrl === "string" ? snapshot.imageDataUrl.trim() : "";
	if (!imageDataUrl) return null;

	const fallbackWidth = Number(layoutMetrics?.width) || 100;
	const fallbackHeight = Number(layoutMetrics?.height) || 100;
	const width = Math.max(1, Number(snapshot.width) || fallbackWidth);
	const height = Math.max(1, Number(snapshot.height) || fallbackHeight);
	const opacity = clamp(
		element.opacity,
		0,
		1,
		clamp(element?.params?.opacity, 0, 1, 1),
	);

	return {
		imageDataUrl,
		width,
		height,
		opacity,
	};
}

function resolveSnapshotMaskFrameMetrics(element = {}, layoutMetrics = {}) {
	if (!element || typeof element !== "object") return null;
	const renderState = element.renderState && typeof element.renderState === "object" ? element.renderState : {};
	const snapshot = renderState.snapshot && typeof renderState.snapshot === "object" ? renderState.snapshot : null;
	const lastSnapshotFrame = renderState.lastSnapshotFrame && typeof renderState.lastSnapshotFrame === "object"
		? renderState.lastSnapshotFrame
		: null;
	const width = Number(snapshot?.width ?? lastSnapshotFrame?.width);
	const height = Number(snapshot?.height ?? lastSnapshotFrame?.height);
	if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
		return null;
	}

	return {
		...layoutMetrics,
		width: Math.max(1, width),
		height: Math.max(1, height),
	};
}

function resolveElementMaskFrameMetrics(element = {}, layoutMetrics = {}) {
	const fallbackWidth = Math.max(1, Number(layoutMetrics?.width) || 100);
	const fallbackHeight = Math.max(1, Number(layoutMetrics?.height) || 100);
	const renderState = element && typeof element === "object" && element.renderState && typeof element.renderState === "object"
		? element.renderState
		: {};
	const snapshot = renderState.snapshot && typeof renderState.snapshot === "object" ? renderState.snapshot : null;
	const snapshotWidth = Number(snapshot?.width);
	const snapshotHeight = Number(snapshot?.height);
	const hasSnapshotFrame = Number.isFinite(snapshotWidth) && snapshotWidth > 0 && Number.isFinite(snapshotHeight) && snapshotHeight > 0;

	if (hasSnapshotFrame) {
		return {
			...layoutMetrics,
			width: Math.max(1, snapshotWidth),
			height: Math.max(1, snapshotHeight),
		};
	}

	return {
		...layoutMetrics,
		width: fallbackWidth,
		height: fallbackHeight,
	};
}

function resolveElementRenderSourceDecision(element = {}, layoutMetrics = {}) {
	const requestedMode = resolveElementRenderSourceMode(element);
	const fallbackMaskFrameMetrics = resolveSnapshotMaskFrameMetrics(element, layoutMetrics);

	// Read the spec-085 canonical render source mode.
	// Baked elements (baked-live-mask / baked-baked-mask) use the snapshot as their body;
	// the live mask is meant to clip that snapshot body, not revert the element to live rendering.
	// Only force live when the element is truly procedural: a painted mask field on a procedural
	// element that was snapshotted could otherwise leave fill-color changes invisible because
	// the mask field is excluded from the snapshot hash (NON_VISUAL_KEYS).
	const rs = element && typeof element === "object" && element.renderState && typeof element.renderState === "object"
		? element.renderState
		: {};
	const canonicalRenderSourceMode = typeof rs.renderSourceMode === "string" ? rs.renderSourceMode : "procedural";
	const isBaked = canonicalRenderSourceMode === "baked-live-mask" || canonicalRenderSourceMode === "baked-baked-mask";

	const elementMask = element && typeof element === "object" ? element.mask : null;
	const hasMaskField = !isBaked && !!(elementMask
		&& typeof elementMask === "object"
		&& elementMask.enabled === true
		&& elementMask.field
		&& typeof elementMask.field === "object"
		&& typeof elementMask.field.imageDataUrl === "string"
		&& elementMask.field.imageDataUrl.trim().length > 0);
	if (hasMaskField) {
		return {
			requestedMode,
			effectiveMode: "live",
			snapshotSource: null,
			maskFrameMetrics: fallbackMaskFrameMetrics,
		};
	}

	if (requestedMode !== "snapshot") {
		return {
			requestedMode,
			effectiveMode: "live",
			snapshotSource: null,
			maskFrameMetrics: fallbackMaskFrameMetrics,
		};
	}

	const renderState = element && typeof element === "object" && element.renderState && typeof element.renderState === "object"
		? element.renderState
		: {};
	const snapshotStatus = renderState.snapshotStatus;
	if (snapshotStatus !== "fresh") {
		return {
			requestedMode,
			effectiveMode: "live-fallback",
			snapshotSource: null,
			maskFrameMetrics: fallbackMaskFrameMetrics,
		};
	}

	const snapshot = renderState.snapshot && typeof renderState.snapshot === "object"
		? renderState.snapshot
		: null;
	const expectedRevisionHash = typeof renderState.snapshotRevisionHash === "string"
		? renderState.snapshotRevisionHash.trim()
		: "";
	const actualRevisionHash = snapshot && typeof snapshot.snapshotRevisionHash === "string"
		? snapshot.snapshotRevisionHash.trim()
		: "";
	if (expectedRevisionHash && (!actualRevisionHash || actualRevisionHash !== expectedRevisionHash)) {
		return {
			requestedMode,
			effectiveMode: "live-fallback",
			snapshotSource: null,
			maskFrameMetrics: fallbackMaskFrameMetrics,
		};
	}

	const snapshotSource = resolveSnapshotRenderSource(element, layoutMetrics);
	if (!snapshotSource) {
		return {
			requestedMode,
			effectiveMode: "live-fallback",
			snapshotSource: null,
			maskFrameMetrics: fallbackMaskFrameMetrics,
		};
	}

	return {
		requestedMode,
		effectiveMode: "snapshot",
		snapshotSource,
		maskFrameMetrics: fallbackMaskFrameMetrics,
	};
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
	const requestedRenderSourceMode = resolveElementRenderSourceMode(safeElement);
	const renderQualityMode = resolveRenderQualityMode(context);
	const isPreviewQuality = renderQualityMode === "preview";

	return positions
		.map((position, positionIndex) => {
			if (safeElement.visible === false) return "";
			const width = Number(context?.layoutMetrics?.width) || 100;
			const height = Number(context?.layoutMetrics?.height) || 100;
			const x = (Number(position.x) / 100) * width;
			const y = (Number(position.y) / 100) * height;
			const W = Math.max(1, Number(context?.layoutMetrics?.width) || width);
			const H = Math.max(1, Number(context?.layoutMetrics?.height) || height);
			const rotation = Number.isFinite(Number(position.rotation)) ? Number(position.rotation) : 0;
			const renderSourceDecision = resolveElementRenderSourceDecision(safeElement, context.layoutMetrics);
			const snapshotSource = renderSourceDecision.snapshotSource;
			const useSnapshotSource = renderSourceDecision.effectiveMode === "snapshot" && snapshotSource !== null;
			const snapshotRenderMode = useSnapshotSource ? resolveSnapshotRenderMode(safeElement) : "editable";
			const isFrozenSnapshot = useSnapshotSource && snapshotRenderMode === "frozen";
			const snapshotImageX = -x;
			const snapshotImageY = -y;
			const snapshotPlacementMatchesTemplate = !useSnapshotSource
				|| (
					Number.isFinite(snapshotImageX)
					&& Number.isFinite(snapshotImageY)
					&& Number.isFinite(W)
					&& Number.isFinite(H)
					&& Math.abs((x + snapshotImageX)) < 1e-9
					&& Math.abs((y + snapshotImageY)) < 1e-9
					&& W > 0
					&& H > 0
				);
			console.assert(
				snapshotPlacementMatchesTemplate === true,
			);
			const bodyRaw = useSnapshotSource
				? `<image x="${snapshotImageX}" y="${snapshotImageY}" width="${W}" height="${H}" preserveAspectRatio="none" href="${escapeAttribute(snapshotSource.imageDataUrl)}" opacity="${snapshotSource.opacity.toFixed(3)}" />`
				: definition.render(renderParams, position, context);
			const snapshotMaskBody = useSnapshotSource
				? `<image x="${snapshotImageX}" y="${snapshotImageY}" width="${W}" height="${H}" preserveAspectRatio="none" href="${escapeAttribute(snapshotSource.imageDataUrl)}" />`
				: "";
			const reshape = resolveRectLayoutReshape(safeElement, context);
			const body = reshape.enabled
				? `<g transform=\"scale(${reshape.sx.toFixed(6)} ${reshape.sy.toFixed(6)})\">${bodyRaw}</g>`
				: bodyRaw;
			const worldBody = `<g transform=\"translate(${x} ${y}) rotate(${rotation})\">${body}</g>`;
			if (typeof safeElement.name === "string" && safeElement.name.trim().length > 0 && context.layerMaskRegistry && typeof context.layerMaskRegistry === "object") {
				context.layerMaskRegistry[safeElement.name.trim()] = worldBody;
			}

			const styleAdjust = isFrozenSnapshot
				? normalizeStyleAdjust(
					{ enabled: false },
					{ enabled: true, contrast: 0, highlight: 0, shadows: 0, sharpness: 0, hue: 0, colorOpacity: 0 },
				)
				: normalizeStyleAdjust(
					{
						...(safeElement.styleAdjust && typeof safeElement.styleAdjust === "object" ? safeElement.styleAdjust : {}),
						...(renderParams.styleAdjust && typeof renderParams.styleAdjust === "object" ? renderParams.styleAdjust : {}),
					},
					{ enabled: true, contrast: 0, highlight: 0, shadows: 0, sharpness: 0, hue: 0, colorOpacity: 0 },
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
			const textureLayers = isFrozenSnapshot
				? []
				: textureLayerSources.map((entry) =>
					normalizeTexture(entry, { enabled: false, opacity: 0.22, blendMode: "overlay" }),
				);
			const resolvedTextureLayers = isPreviewQuality
				? textureLayers.map((entry) => simplifyOverlayLayerForPreview(entry))
				: textureLayers;
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
			const gradientLayers = isFrozenSnapshot
				? []
				: gradientLayerSources.map((entry) =>
					normalizeGradientOverlay(entry, { enabled: false, opacity: 0.24, blendMode: "overlay" }),
				);
			const resolvedGradientLayers = isPreviewQuality
				? gradientLayers.map((entry) => simplifyOverlayLayerForPreview(entry))
				: gradientLayers;
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
			const materialLayers = isFrozenSnapshot
				? []
				: materialLayerSources.map((entry) =>
					normalizeMaterialOverlay(entry, { enabled: false, color: "#ffffff", opacity: 0.18, blendMode: "multiply" }),
				);
			const depth = isPreviewQuality
				? normalizeDepthEffect({ enabled: false }, null)
				: (context.globalDepthEnabled
				? { enabled: false, mode: "outer", intensity: 0, opacity: 0.8, dx: 0, dy: 0, falloff: 1, whiteBalance: 0, spread: 0 }
				: (isFrozenSnapshot
					? normalizeDepthEffect({ enabled: false }, null)
					: normalizeDepthEffect(
					{
						...(safeElement.effect3d && typeof safeElement.effect3d === "object" ? safeElement.effect3d : {}),
						...(renderParams.effect3d && typeof renderParams.effect3d === "object" ? renderParams.effect3d : {}),
					},
					null,
				)));
			// Spec 085 Phase 2 (T11) hotfix: always render drop shadow regardless of
			// preview/interaction mode. Previous preview gate caused shadow to never
			// reappear because no React subscriber re-rendered on idle transition.
			const dropShadow = normalizeDropShadowEffect(
					{
						...(safeElement.dropShadow && typeof safeElement.dropShadow === "object" ? safeElement.dropShadow : {}),
						...(renderParams.dropShadow && typeof renderParams.dropShadow === "object" ? renderParams.dropShadow : {}),
					},
				);
			const localId = `el-${elementIndex}-${positionIndex}`;
			if (context && typeof context === "object") {
				if (!context.renderSourceModeByLayer || typeof context.renderSourceModeByLayer !== "object") {
					context.renderSourceModeByLayer = {};
				}
				context.renderSourceModeByLayer[localId] = renderSourceDecision.effectiveMode;
				if (!context.snapshotRenderModeByLayer || typeof context.snapshotRenderModeByLayer !== "object") {
					context.snapshotRenderModeByLayer = {};
				}
				context.snapshotRenderModeByLayer[localId] = snapshotRenderMode;
				if (!context.renderSourceRequestedModeByLayer || typeof context.renderSourceRequestedModeByLayer !== "object") {
					context.renderSourceRequestedModeByLayer = {};
				}
				context.renderSourceRequestedModeByLayer[localId] = requestedRenderSourceMode;
			}
			const currentElementName = typeof safeElement.name === "string" ? safeElement.name.trim() : "";
			const elementMask = safeElement.mask && typeof safeElement.mask === "object" ? safeElement.mask : null;
			const maskFrameMetrics = renderSourceDecision.maskFrameMetrics && typeof renderSourceDecision.maskFrameMetrics === "object"
				? renderSourceDecision.maskFrameMetrics
				: resolveElementMaskFrameMetrics(safeElement, context.layoutMetrics);
			return renderLayer(
				localId,
				body,
				x,
				y,
				rotation,
				styleAdjust,
				resolvedTextureLayers,
				resolvedGradientLayers,
				materialLayers,
				depth,
				dropShadow,
				context.layoutMetrics,
				context,
				currentElementName,
				elementMask,
				maskFrameMetrics,
				{
					useSnapshotSource,
					snapshotRenderMode,
					// Always use SourceAlpha — even for baked elements.
					// The feImage silhouette path placed the baked PNG at world (-x,-y) inside
					// the filter, landing the silhouette at (0,0) while SourceAlpha sits at (x,y).
					// Shadow primitives computed from (0,0) cast off-screen for non-origin elements.
					// SourceAlpha is always correct: the baked PNG has transparent bg so alpha is identical.
					effectSilhouetteSource: "source-alpha",
					snapshotImageDataUrl: snapshotSource?.imageDataUrl || "",
					snapshotSilhouetteX: snapshotImageX,
					snapshotSilhouetteY: snapshotImageY,
					snapshotSilhouetteW: W,
					snapshotSilhouetteH: H,
					snapshotMaskBody,
				},
			);
		})
		.join("");
}

export function renderSvg(resolvedComposition, context = {}) {
	const composition = requireObject(resolvedComposition, "resolvedComposition");
	const layoutMetrics = buildLayoutMetrics(composition);
	const depthEffect = buildDepthEffect(composition);
	const renderQualityMode = resolveRenderQualityMode(context);
	const isPreviewQuality = renderQualityMode === "preview";
	const elements = Array.isArray(composition.elements) ? composition.elements : [];
	let uid = 0;
	const renderContext = {
		...context,
		layoutMetrics,
		depthEffect,
		renderQualityMode,
		globalControllerSources: resolveGlobalControllerSources(),
		globalDepthEnabled: !isPreviewQuality && depthEffect.enabled && depthEffect.intensity > 0,
		composition,
		layerMaskRegistry: {},
		silhouetteSurfaceCacheByLayer: context && typeof context === "object" && context.silhouetteSurfaceCacheByLayer && typeof context.silhouetteSurfaceCacheByLayer === "object"
			? context.silhouetteSurfaceCacheByLayer
			: {},
		renderSurfaceSourcesByLayer: {},
		renderSurfaceSourcesByName: {},
		renderSurfaceSourceDebugByLayer: {},
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
		? buildLayerFilterDef(globalDepthId, { enabled: false, contrast: 0, highlight: 0, shadows: 0, sharpness: 0, hue: 0, colorOpacity: 0, color: null }, depthEffect)
		: "";
	if (context && typeof context === "object") {
		context.silhouetteSurfaceCacheByLayer = renderContext.silhouetteSurfaceCacheByLayer;
		context.renderSurfaceSourcesByLayer = renderContext.renderSurfaceSourcesByLayer;
		context.renderSurfaceSourcesByName = renderContext.renderSurfaceSourcesByName;
		context.renderSurfaceSourceDebugByLayer = renderContext.renderSurfaceSourceDebugByLayer;
		context.renderPipelineSourceDebug = {
			globalControllerSources: renderContext.globalControllerSources,
		};
	}
	const content = `${baseLayer}${body}`;
	if (globalDepthDef.length > 0) {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layoutMetrics.width} ${layoutMetrics.height}"><defs>${globalDepthDef}</defs><g filter="url(#${globalDepthId})">${content}</g></svg>`;
	}
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layoutMetrics.width} ${layoutMetrics.height}">${content}</svg>`;
}

// Spec 074 T8: expose internals for the regression test harness only.
// Not part of the public API; treat as testing-private.
export const __maskInternalsForTest = {
	buildElementMaskPrimitives,
	buildElementMaskDef,
	resolveMaskCoordinateSpace,
};
