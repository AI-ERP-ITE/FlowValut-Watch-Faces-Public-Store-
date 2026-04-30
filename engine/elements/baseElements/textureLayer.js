"use strict";

const DEFAULTS = {
	shape: "circle",
	radius: 0.4,
	width: 0.5,
	height: 0.3,
	cornerRadius: 0.03,
	thickness: 0.02,
	opacity: 0.28,
	blendMode: "overlay",
	gradient: {
		from: [0, 0],
		to: [100, 100],
		stops: [
			{ offset: 0, color: "#ffffff", opacity: 0.22 },
			{ offset: 0.5, color: "#8899aa", opacity: 0.2 },
			{ offset: 1, color: "#111111", opacity: 0.26 },
		],
	},
	noise: {
		density: 0.35,
		effectRadius: 22,
	},
};

function clamp(value, min, max, fallback) {
	const n = Number(value);
	if (!Number.isFinite(n)) return fallback;
	return Math.max(min, Math.min(max, n));
}

function getBaseRadius(context) {
	const r = Number(context?.layoutMetrics?.baseRadius);
	if (!Number.isFinite(r) || r <= 0) return 50;
	return r;
}

function getScale(context) {
	const s = Number(context?.layoutMetrics?.globalScale);
	if (!Number.isFinite(s) || s <= 0) return 1;
	return s;
}

function allocId(context, prefix) {
	if (context && typeof context.allocId === "function") {
		return context.allocId(prefix);
	}
	return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function renderStops(stops) {
	const list = Array.isArray(stops) ? stops : DEFAULTS.gradient.stops;
	return list
		.map((stop, index) => {
			const safe = stop && typeof stop === "object" ? stop : {};
			const offset = clamp(safe.offset, 0, 1, index === 0 ? 0 : 1);
			const color = typeof safe.color === "string" ? safe.color : "#ffffff";
			const opacity = clamp(safe.opacity, 0, 1, 1);
			return `<stop offset=\"${(offset * 100).toFixed(2)}%\" stop-color=\"${color}\" stop-opacity=\"${opacity.toFixed(3)}\" />`;
		})
		.join("");
}

function renderShapeMask(params, baseRadius, scale) {
	const shape = typeof params.shape === "string" ? params.shape : DEFAULTS.shape;
	if (shape === "rect") {
		const width = clamp(params.width, 0, 1, DEFAULTS.width) * baseRadius * 2 * scale;
		const height = clamp(params.height, 0, 1, DEFAULTS.height) * baseRadius * 2 * scale;
		const cornerRadius = clamp(params.cornerRadius, 0, 1, DEFAULTS.cornerRadius) * baseRadius * scale;
		return `<rect x=\"${-width / 2}\" y=\"${-height / 2}\" width=\"${width}\" height=\"${height}\" rx=\"${cornerRadius}\" ry=\"${cornerRadius}\" fill=\"#ffffff\" />`;
	}

	if (shape === "ring") {
		const radius = clamp(params.radius, 0, 1, DEFAULTS.radius) * baseRadius * scale;
		const thickness = Math.max(0.1, clamp(params.thickness, 0, 1, DEFAULTS.thickness) * baseRadius * scale);
		return `<circle cx=\"0\" cy=\"0\" r=\"${radius}\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"${thickness}\" />`;
	}

	const radius = clamp(params.radius, 0, 1, DEFAULTS.radius) * baseRadius * scale;
	return `<circle cx=\"0\" cy=\"0\" r=\"${radius}\" fill=\"#ffffff\" />`;
}

export function renderTextureLayer(params = {}, position = {}, context = {}) {
	const p = { ...DEFAULTS, ...params };
	const gradient = p.gradient && typeof p.gradient === "object" ? { ...DEFAULTS.gradient, ...p.gradient } : DEFAULTS.gradient;
	const noise = p.noise && typeof p.noise === "object" ? { ...DEFAULTS.noise, ...p.noise } : DEFAULTS.noise;
	const baseRadius = getBaseRadius(context);
	const scale = getScale(context);

	const gradientId = allocId(context, "textureGrad");
	const noiseId = allocId(context, "textureNoise");
	const maskId = allocId(context, "textureMask");
	const from = Array.isArray(gradient.from) ? gradient.from : DEFAULTS.gradient.from;
	const to = Array.isArray(gradient.to) ? gradient.to : DEFAULTS.gradient.to;
	const density = clamp(noise.density, 0, 1, DEFAULTS.noise.density);
	const effectRadius = clamp(noise.effectRadius, 0.1, 120, DEFAULTS.noise.effectRadius);
	const baseFrequency = (1 / effectRadius).toFixed(4);
	const opacity = clamp(p.opacity, 0, 1, DEFAULTS.opacity);
	const blendMode = typeof p.blendMode === "string" ? p.blendMode : DEFAULTS.blendMode;

	const maskShape = renderShapeMask(p, baseRadius, scale);
	const textureRect = `<rect x=\"${-baseRadius * 2}\" y=\"${-baseRadius * 2}\" width=\"${baseRadius * 4}\" height=\"${baseRadius * 4}\" fill=\"url(#${gradientId})\" />`;

	return [
		"<defs>",
		`<linearGradient id=\"${gradientId}\" x1=\"${clamp(from[0], -100, 200, 0)}%\" y1=\"${clamp(from[1], -100, 200, 0)}%\" x2=\"${clamp(to[0], -100, 200, 100)}%\" y2=\"${clamp(to[1], -100, 200, 100)}%\">${renderStops(gradient.stops)}</linearGradient>`,
		`<filter id=\"${noiseId}\" x=\"-25%\" y=\"-25%\" width=\"150%\" height=\"150%\">`,
		`<feTurbulence type=\"fractalNoise\" baseFrequency=\"${baseFrequency}\" numOctaves=\"2\" seed=\"11\" result=\"grain\" />`,
		`<feColorMatrix in=\"grain\" type=\"matrix\" values=\"1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${density.toFixed(3)} 0\" result=\"grainAlpha\" />`,
		"<feBlend in=\"SourceGraphic\" in2=\"grainAlpha\" mode=\"overlay\" result=\"textured\" />",
		"<feMerge><feMergeNode in=\"textured\" /></feMerge>",
		"</filter>",
		`<mask id=\"${maskId}\" maskContentUnits=\"userSpaceOnUse\" style=\"mask-type:alpha\">${maskShape}</mask>`,
		"</defs>",
		`<g mask=\"url(#${maskId})\" opacity=\"${opacity.toFixed(3)}\" style=\"mix-blend-mode:${blendMode};\" filter=\"url(#${noiseId})\">${textureRect}</g>`,
	].join("");
}

export const textureLayerElement = {
	id: "texture_layer",
	geometry: { type: "rect" },
	defaultParams: { ...DEFAULTS },
	render: renderTextureLayer,
};
