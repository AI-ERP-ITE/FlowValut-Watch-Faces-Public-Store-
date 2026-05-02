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

function normalizeBlendMode(value, fallback = "normal") {
	const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
	if (!raw) return fallback;
	const canonical = raw.replace(/[\s_]+/g, "-");
	const resolved = BLEND_MODE_ALIASES[canonical] || canonical;
	if (SUPPORTED_BLEND_MODES.has(resolved)) return resolved;
	const normalizedFallback = typeof fallback === "string" ? fallback : "normal";
	return SUPPORTED_BLEND_MODES.has(normalizedFallback) ? normalizedFallback : "normal";
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
	const intensity = clamp(effect.intensity, 0, 1, 0.46);
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
		intensity,
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

	return {
		enabled: src.enabled !== false && (src.enabled === true || fallback.enabled === true),
		opacity: clamp(src.opacity, 0, 1, fallback.opacity ?? 0.22),
		blendMode: normalizeBlendMode(src.blendMode, normalizeBlendMode(fallback.blendMode, "overlay")),
		gradient: {
			from: [clamp(from[0], -100, 200, 0), clamp(from[1], -100, 200, 0)],
			to: [clamp(to[0], -100, 200, 100), clamp(to[1], -100, 200, 100)],
			stops,
		},
		noise: {
			amount: clamp(noise.amount, 0, 3, fallbackNoise.amount ?? fallbackLegacyAmount ?? legacyAmount ?? 0),
			radius: clamp(noise.radius, 0.1, 320, fallbackNoise.radius ?? fallbackLegacyRadius ?? legacyRadius ?? 24),
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
		from: [clamp(from[0], -100, 200, 0), clamp(from[1], -100, 200, 0)],
		to: [clamp(to[0], -100, 200, 100), clamp(to[1], -100, 200, 100)],
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
	const base = fallback || { enabled: false, intensity: 0, dx: 0, dy: 0, falloff: 1, whiteBalance: 0, spread: 0 };
	const enabled = src.enabled !== false && base.enabled;
	const intensity = clamp(src.intensity, 0, 1, base.intensity);
	const angleDeg = Number.isFinite(Number(src.angle)) ? Number(src.angle) : null;
	const distance = clamp(src.distance, 0, 6, Math.sqrt(base.dx * base.dx + base.dy * base.dy));
	const falloff = clamp(src.falloff, 0.2, 3, base.falloff ?? 1);
	const whiteBalance = clamp(src.whiteBalance, -1, 1, base.whiteBalance ?? 0);
	const spread = clamp(src.spread, 0, 1, base.spread ?? 0);

	if (angleDeg === null) {
		return { enabled, intensity, dx: base.dx, dy: base.dy, falloff, whiteBalance, spread };
	}

	const radians = (angleDeg * Math.PI) / 180;
	return {
		enabled,
		intensity,
		dx: Math.cos(radians) * distance,
		dy: Math.sin(radians) * distance,
		falloff,
		whiteBalance,
		spread,
	};
}

function buildLayerFilterDef(filterId, styleAdjust, depthEffect) {
	if (!styleAdjust.enabled && !depthEffect.enabled) return "";

	const toneShift = (styleAdjust.highlight * 0.35) - (styleAdjust.shadows * 0.35);
	const sharp = styleAdjust.sharpness;
	const sharpenKernel = [
		0,
		-1 * sharp,
		0,
		-1 * sharp,
		1 + 4 * sharp,
		-1 * sharp,
		0,
		-1 * sharp,
		0,
	].map((v) => Number(v).toFixed(4)).join(" ");

	let chain = "tone";
	const parts = [
		`<filter id=\"${filterId}\" x=\"-25%\" y=\"-25%\" width=\"150%\" height=\"150%\">`,
		`<feColorMatrix in=\"SourceGraphic\" type=\"hueRotate\" values=\"${styleAdjust.hue.toFixed(3)}\" result=\"hue\" />`,
		`<feComponentTransfer in=\"hue\" result=\"tone\">`,
		`<feFuncR type=\"linear\" slope=\"${styleAdjust.contrast.toFixed(4)}\" intercept=\"${toneShift.toFixed(4)}\" />`,
		`<feFuncG type=\"linear\" slope=\"${styleAdjust.contrast.toFixed(4)}\" intercept=\"${toneShift.toFixed(4)}\" />`,
		`<feFuncB type=\"linear\" slope=\"${styleAdjust.contrast.toFixed(4)}\" intercept=\"${toneShift.toFixed(4)}\" />`,
		"</feComponentTransfer>",
	];

	if (sharp > 0.001) {
		parts.push(`<feConvolveMatrix in=\"tone\" order=\"3\" kernelMatrix=\"${sharpenKernel}\" divisor=\"1\" result=\"sharp\" />`);
		chain = "sharp";
	}

	if (depthEffect.enabled && depthEffect.intensity > 0) {
		const falloff = clamp(depthEffect.falloff, 0.2, 3, 1);
		const spread = clamp(depthEffect.spread, 0, 1, 0);
		const wb = clamp(depthEffect.whiteBalance, -1, 1, 0);
		const shadowOpacity = clamp(0.42 * depthEffect.intensity * Math.min(2, falloff), 0, 1, 0.42).toFixed(3);
		const lightOpacity = clamp(0.3 * depthEffect.intensity * Math.min(2, falloff), 0, 1, 0.3).toFixed(3);
		const blur = Math.max(0.05, (0.6 + depthEffect.intensity * 0.9) / falloff).toFixed(3);
		const spreadRadius = (spread * 2.25).toFixed(3);
		const lightColor = wb >= 0 ? `rgb(255,${Math.round(255 - wb * 28)},${Math.round(255 - wb * 72)})` : `rgb(${Math.round(255 + wb * 72)},${Math.round(255 + wb * 18)},255)`;
		const shadowColor = wb >= 0 ? `rgb(${Math.round(18 + wb * 30)},${Math.round(20 + wb * 24)},${Math.round(28 + wb * 16)})` : `rgb(${Math.round(10 - wb * 12)},${Math.round(14 - wb * 10)},${Math.round(34 - wb * 26)})`;

		if (spread > 0.0001) {
			parts.push(`<feMorphology in="${chain}" operator="dilate" radius="${spreadRadius}" result="spreadBase" />`);
			chain = "spreadBase";
		}

		parts.push(`<feDropShadow in="${chain}" dx="${depthEffect.dx.toFixed(3)}" dy="${depthEffect.dy.toFixed(3)}" stdDeviation="${blur}" flood-color="${shadowColor}" flood-opacity="${shadowOpacity}" result="depthA" />`);
		parts.push(`<feDropShadow in="depthA" dx="${(-depthEffect.dx).toFixed(3)}" dy="${(-depthEffect.dy).toFixed(3)}" stdDeviation="${blur}" flood-color="${lightColor}" flood-opacity="${lightOpacity}" result="depthB" />`);
		chain = "depthB";
	}

	if (styleAdjust.color && styleAdjust.colorOpacity > 0) {
		parts.push(`<feFlood flood-color=\"${styleAdjust.color}\" flood-opacity=\"${styleAdjust.colorOpacity.toFixed(3)}\" result=\"tintFill\" />`);
		parts.push("<feComposite in=\"tintFill\" in2=\"SourceAlpha\" operator=\"in\" result=\"tintMask\" />");
		parts.push(`<feBlend in=\"${chain}\" in2=\"tintMask\" mode=\"multiply\" result=\"tinted\" />`);
		chain = "tinted";
	}

	parts.push(`<feComposite in=\"${chain}\" in2=\"SourceAlpha\" operator=\"in\" result=\"final\" />`);
	parts.push("<feMerge><feMergeNode in=\"final\" /></feMerge>");
	parts.push("</filter>");

	return parts.join("");
}

function buildTextureDefs(localId, texture) {
	if (!texture.enabled || texture.opacity <= 0) {
		return { defs: "", gradientId: null, filterId: null };
	}

	const gradientId = `grad-${localId}`;
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

	const gradientDef = `<linearGradient id=\"${gradientId}\" x1=\"${texture.gradient.from[0]}%\" y1=\"${texture.gradient.from[1]}%\" x2=\"${texture.gradient.to[0]}%\" y2=\"${texture.gradient.to[1]}%\">${stops}</linearGradient>`;

	let chain = "SourceGraphic";
	const filterParts = [];
	if (texture.noise.amount > 0) {
		const frequency = (1 / texture.noise.radius).toFixed(4);
		const alpha = clamp(texture.noise.amount, 0, 1, 0).toFixed(3);
		filterParts.push(`<feTurbulence type=\"fractalNoise\" baseFrequency=\"${frequency}\" numOctaves=\"2\" seed=\"7\" result=\"grain\" />`);
		filterParts.push(`<feColorMatrix in=\"grain\" type=\"matrix\" values=\"1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${alpha} 0\" result=\"grainAlpha\" />`);
		filterParts.push(`<feBlend in=\"${chain}\" in2=\"grainAlpha\" mode=\"overlay\" result=\"texture-noise\" />`);
		chain = "texture-noise";
	}

	const blurPass = buildBlurPrimitives(chain, `texture-${localId}`, texture.blur || {});
	filterParts.push(...blurPass.parts);
	chain = blurPass.result;

	if (filterParts.length === 0) {
		return { defs: gradientDef, gradientId, filterId: null };
	}

	const filterDef = [`<filter id=\"${textureFilterId}\" x=\"-25%\" y=\"-25%\" width=\"150%\" height=\"150%\">`, ...filterParts, `<feMerge><feMergeNode in=\"${chain}\" /></feMerge>`, "</filter>"].join("");
	return {
		defs: `${gradientDef}${filterDef}`,
		gradientId,
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
	const defs = `<linearGradient id="${gradientId}" x1="${gradient.from[0]}%" y1="${gradient.from[1]}%" x2="${gradient.to[0]}%" y2="${gradient.to[1]}%">${stops}</linearGradient>${filterDef}`;
	return { defs, gradientId, filterId };
}

function resolveClipMaskBody(clipConfig, context, fallbackBody) {
	if (!clipConfig || clipConfig.enabled !== true) return fallbackBody;

	const explicitTarget = typeof clipConfig.targetName === "string" ? clipConfig.targetName.trim() : "";
	const inheritedTarget = clipConfig.inheritPrevious === true && typeof context.previousElementName === "string"
		? context.previousElementName.trim()
		: "";
	const resolvedTarget = explicitTarget || inheritedTarget;
	if (!resolvedTarget) return fallbackBody;

	const registry = context.layerMaskRegistry && typeof context.layerMaskRegistry === "object" ? context.layerMaskRegistry : {};
	const targetBody = registry[resolvedTarget];
	if (typeof targetBody === "string" && targetBody.length > 0) {
		return targetBody;
	}

	return fallbackBody;
}

function renderLayer(localId, body, x, y, rotation, layerStyle, layerTextures, layerGradients, layerMaterials, depthEffect, layoutMetrics, context = {}) {
	const filterId = `layerFx-${localId}`;
	const maskId = `layerMask-${localId}`;
	const filterDef = buildLayerFilterDef(filterId, layerStyle, depthEffect);
	const textureDefs = Array.isArray(layerTextures)
		? layerTextures.map((layerTexture, index) => ({
			layerTexture,
			def: buildTextureDefs(`${localId}-texture-${index}`, layerTexture),
			maskId: `${maskId}-texture-${index}`,
			maskBody: resolveClipMaskBody(layerTexture.clip, context, body),
		}))
		: [];
	const gradientDefs = Array.isArray(layerGradients)
		? layerGradients.map((layerGradient, index) => ({
			layerGradient,
			def: buildGradientOverlayDefs(`${localId}-gradient-${index}`, layerGradient),
			maskId: `${maskId}-gradient-${index}`,
			maskBody: resolveClipMaskBody(layerGradient.clip, context, body),
		}))
		: [];
	const materialDefs = Array.isArray(layerMaterials)
		? layerMaterials.map((layerMaterial, index) => ({
			layerMaterial,
			maskId: `${maskId}-material-${index}`,
			maskBody: resolveClipMaskBody(layerMaterial.clip, context, body),
		}))
		: [];
	const textureDefsMarkup = textureDefs.map((entry) => entry.def.defs).join("");
	const textureMasksMarkup = textureDefs.map((entry) => `<mask id=\"${entry.maskId}\" maskContentUnits=\"userSpaceOnUse\" style=\"mask-type:alpha\">${entry.maskBody}</mask>`).join("");
	const gradientDefsMarkup = gradientDefs.map((entry) => entry.def.defs).join("");
	const gradientMasksMarkup = gradientDefs.map((entry) => `<mask id=\"${entry.maskId}\" maskContentUnits=\"userSpaceOnUse\" style=\"mask-type:alpha\">${entry.maskBody}</mask>`).join("");
	const materialMasksMarkup = materialDefs.map((entry) => `<mask id=\"${entry.maskId}\" maskContentUnits=\"userSpaceOnUse\" style=\"mask-type:alpha\">${entry.maskBody}</mask>`).join("");
	const defs = `<defs>${filterDef}${textureDefsMarkup}${gradientDefsMarkup}${textureMasksMarkup}${gradientMasksMarkup}${materialMasksMarkup}</defs>`;
	const filterAttr = filterDef.length > 0 ? ` filter=\"url(#${filterId})\"` : "";

	const textureOverlay = textureDefs
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

	const gradientOverlay = gradientDefs
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

	const materialOverlay = materialDefs
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

	return `<g transform=\"translate(${x} ${y}) rotate(${rotation})\">${defs}<g${filterAttr}>${body}</g>${textureOverlay}${gradientOverlay}${materialOverlay}</g>`;
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
			const body = definition.render(renderParams, position, context);
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
			const depth = context.globalDepthEnabled
				? { enabled: false, intensity: 0, dx: 0, dy: 0, falloff: 1, whiteBalance: 0, spread: 0 }
				: normalizeDepthEffect(
					{
						...(safeElement.effect3d && typeof safeElement.effect3d === "object" ? safeElement.effect3d : {}),
						...(renderParams.effect3d && typeof renderParams.effect3d === "object" ? renderParams.effect3d : {}),
					},
					context.depthEffect,
				);
			const localId = `el-${elementIndex}-${positionIndex}`;
			return renderLayer(localId, body, x, y, rotation, styleAdjust, textureLayers, gradientLayers, materialLayers, depth, context.layoutMetrics, context);
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
	if (globalDepthDef.length > 0) {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layoutMetrics.width} ${layoutMetrics.height}"><defs>${globalDepthDef}</defs><g filter="url(#${globalDepthId})">${content}</g></svg>`;
	}
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layoutMetrics.width} ${layoutMetrics.height}">${content}</svg>`;
}
