"use strict";

import { getElement } from "../elements/elementRegistry.js";
import { validateElementModel } from "../elements/elementRegistry.js";
import { analyzeGradient, processColor } from "../color/colorController.js";
import { resolvePlacement } from "./placement.js";
import { applySymmetry } from "./symmetry.js";

const COLOR_KEYS = new Set(["fill", "stroke", "color", "stopColor", "shadowColor", "highlightColor"]);
const GRADIENT_KEYS = new Set(["gradientStops", "stops"]);

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
	const enabled = effect.enabled !== false;
	const intensity = clamp(effect.intensity, 0, 1, 0.46);
	const angleDeg = Number.isFinite(Number(effect.angle)) ? Number(effect.angle) : -35;
	const distance = clamp(effect.distance, 0, 6, 1.2);
	const radians = (angleDeg * Math.PI) / 180;
	const dx = Math.cos(radians) * distance;
	const dy = Math.sin(radians) * distance;

	return {
		enabled,
		intensity,
		dx,
		dy,
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
	const clip = src.clip && typeof src.clip === "object" ? src.clip : {};
	const fallbackClip = fallback.clip && typeof fallback.clip === "object" ? fallback.clip : {};

	return {
		enabled: src.enabled !== false && (src.enabled === true || fallback.enabled === true),
		opacity: clamp(src.opacity, 0, 1, fallback.opacity ?? 0.22),
		gradient: {
			from: [clamp(from[0], -100, 200, 0), clamp(from[1], -100, 200, 0)],
			to: [clamp(to[0], -100, 200, 100), clamp(to[1], -100, 200, 100)],
			stops,
		},
		noise: {
			amount: clamp(noise.amount, 0, 1, fallbackNoise.amount ?? 0),
			radius: clamp(noise.radius, 0.1, 120, fallbackNoise.radius ?? 24),
		},
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
		blendMode: typeof src.blendMode === "string"
			? src.blendMode
			: (typeof fallback.blendMode === "string" ? fallback.blendMode : "multiply"),
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
	const base = fallback || { enabled: false, intensity: 0, dx: 0, dy: 0 };
	const enabled = src.enabled !== false && base.enabled;
	const intensity = clamp(src.intensity, 0, 1, base.intensity);
	const angleDeg = Number.isFinite(Number(src.angle)) ? Number(src.angle) : null;
	const distance = clamp(src.distance, 0, 6, Math.sqrt(base.dx * base.dx + base.dy * base.dy));

	if (angleDeg === null) {
		return { enabled, intensity, dx: base.dx, dy: base.dy };
	}

	const radians = (angleDeg * Math.PI) / 180;
	return {
		enabled,
		intensity,
		dx: Math.cos(radians) * distance,
		dy: Math.sin(radians) * distance,
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
		const shadowOpacity = (0.42 * depthEffect.intensity).toFixed(3);
		const lightOpacity = (0.3 * depthEffect.intensity).toFixed(3);
		const blur = (0.6 + depthEffect.intensity * 0.9).toFixed(3);
		parts.push(`<feDropShadow in=\"${chain}\" dx=\"${depthEffect.dx.toFixed(3)}\" dy=\"${depthEffect.dy.toFixed(3)}\" stdDeviation=\"${blur}\" flood-color=\"#000000\" flood-opacity=\"${shadowOpacity}\" result=\"depthA\" />`);
		parts.push(`<feDropShadow in=\"depthA\" dx=\"${(-depthEffect.dx).toFixed(3)}\" dy=\"${(-depthEffect.dy).toFixed(3)}\" stdDeviation=\"${blur}\" flood-color=\"#ffffff\" flood-opacity=\"${lightOpacity}\" result=\"depthB\" />`);
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
		return { defs: "", gradientId: null, noiseId: null };
	}

	const gradientId = `grad-${localId}`;
	const noiseId = texture.noise.amount > 0 ? `noise-${localId}` : null;
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

	if (!noiseId) {
		return { defs: gradientDef, gradientId, noiseId: null };
	}

	const frequency = (1 / texture.noise.radius).toFixed(4);
	const alpha = clamp(texture.noise.amount, 0, 1, 0).toFixed(3);
	const noiseDef = [
		`<filter id=\"${noiseId}\" x=\"-25%\" y=\"-25%\" width=\"150%\" height=\"150%\">`,
		`<feTurbulence type=\"fractalNoise\" baseFrequency=\"${frequency}\" numOctaves=\"2\" seed=\"7\" result=\"grain\" />`,
		`<feColorMatrix in=\"grain\" type=\"matrix\" values=\"1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${alpha} 0\" result=\"grainAlpha\" />`,
		"<feBlend in=\"SourceGraphic\" in2=\"grainAlpha\" mode=\"overlay\" result=\"textured\" />",
		"<feMerge><feMergeNode in=\"textured\" /></feMerge>",
		"</filter>",
	].join("");

	return {
		defs: `${gradientDef}${noiseDef}`,
		gradientId,
		noiseId,
	};
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

function renderLayer(localId, body, x, y, rotation, layerStyle, layerTexture, layerMaterial, depthEffect, layoutMetrics, context = {}) {
	const filterId = `layerFx-${localId}`;
	const maskId = `layerMask-${localId}`;
	const filterDef = buildLayerFilterDef(filterId, layerStyle, depthEffect);
	const textureDef = buildTextureDefs(localId, layerTexture);
	const textureMaskBody = resolveClipMaskBody(layerTexture.clip, context, body);
	const materialMaskBody = resolveClipMaskBody(layerMaterial.clip, context, body);
	const defs = `<defs>${filterDef}${textureDef.defs}<mask id=\"${maskId}\" maskContentUnits=\"userSpaceOnUse\" style=\"mask-type:alpha\">${textureMaskBody}</mask><mask id=\"${maskId}-material\" maskContentUnits=\"userSpaceOnUse\" style=\"mask-type:alpha\">${materialMaskBody}</mask></defs>`;
	const filterAttr = filterDef.length > 0 ? ` filter=\"url(#${filterId})\"` : "";

	let textureOverlay = "";
	if (textureDef.gradientId && layerTexture.enabled && layerTexture.opacity > 0) {
		const textureFilterAttr = textureDef.noiseId ? ` filter=\"url(#${textureDef.noiseId})\"` : "";
		const tx = -layoutMetrics.width;
		const ty = -layoutMetrics.height;
		const tw = layoutMetrics.width * 2;
		const th = layoutMetrics.height * 2;
		textureOverlay = `<rect x=\"${tx}\" y=\"${ty}\" width=\"${tw}\" height=\"${th}\" fill=\"url(#${textureDef.gradientId})\" opacity=\"${layerTexture.opacity.toFixed(3)}\" mask=\"url(#${maskId})\"${textureFilterAttr} />`;
	}

	let materialOverlay = "";
	if (layerMaterial.enabled && layerMaterial.opacity > 0) {
		const tx = -layoutMetrics.width;
		const ty = -layoutMetrics.height;
		const tw = layoutMetrics.width * 2;
		const th = layoutMetrics.height * 2;
		materialOverlay = `<rect x=\"${tx}\" y=\"${ty}\" width=\"${tw}\" height=\"${th}\" fill=\"${layerMaterial.color}\" opacity=\"${layerMaterial.opacity.toFixed(3)}\" mask=\"url(#${maskId}-material)\" style=\"mix-blend-mode:${layerMaterial.blendMode};\" />`;
	}

	return `<g transform=\"translate(${x} ${y}) rotate(${rotation})\">${defs}<g${filterAttr}>${body}</g>${textureOverlay}${materialOverlay}</g>`;
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
					...(context?.composition?.styleAdjust && typeof context.composition.styleAdjust === "object" ? context.composition.styleAdjust : {}),
					...(safeElement.styleAdjust && typeof safeElement.styleAdjust === "object" ? safeElement.styleAdjust : {}),
					...(renderParams.styleAdjust && typeof renderParams.styleAdjust === "object" ? renderParams.styleAdjust : {}),
				},
				{ enabled: true, contrast: 1, highlight: 0, shadows: 0, sharpness: 0, hue: 0, colorOpacity: 0 },
			);
			const texture = normalizeTexture(
				{
					...(context?.composition?.texture && typeof context.composition.texture === "object" ? context.composition.texture : {}),
					...(safeElement.texture && typeof safeElement.texture === "object" ? safeElement.texture : {}),
					...(renderParams.texture && typeof renderParams.texture === "object" ? renderParams.texture : {}),
				},
				{ enabled: false, opacity: 0.22 },
			);
			const material = normalizeMaterialOverlay(
				{
					...(safeElement.material && typeof safeElement.material === "object" ? safeElement.material : {}),
					...(renderParams.material && typeof renderParams.material === "object" ? renderParams.material : {}),
				},
				{ enabled: false, color: "#ffffff", opacity: 0.18, blendMode: "multiply" },
			);
			const depth = normalizeDepthEffect(
				{
					...(context?.composition?.effects3d && typeof context.composition.effects3d === "object" ? context.composition.effects3d : {}),
					...(safeElement.effect3d && typeof safeElement.effect3d === "object" ? safeElement.effect3d : {}),
					...(renderParams.effect3d && typeof renderParams.effect3d === "object" ? renderParams.effect3d : {}),
				},
				context.depthEffect,
			);
			const localId = `el-${elementIndex}-${positionIndex}`;
			return renderLayer(localId, body, x, y, rotation, styleAdjust, texture, material, depth, context.layoutMetrics, context);
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
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layoutMetrics.width} ${layoutMetrics.height}">${baseLayer}${body}</svg>`;
}
