"use strict";

const DEFAULTS = {
	shape: "circle",
	radius: 0.5,
	width: 1,
	height: 1,
	cornerRadius: 0.06,
	fill: "#0f1118",
	stroke: "none",
	thickness: 0.01,
};

function clamp(value, min, max, fallback) {
	const n = Number(value);
	if (!Number.isFinite(n)) return fallback;
	return Math.max(min, Math.min(max, n));
}

function getLayoutMetrics(context) {
	const width = Number(context?.layoutMetrics?.width);
	const height = Number(context?.layoutMetrics?.height);
	const baseRadius = Number(context?.layoutMetrics?.baseRadius);
	const scale = Number(context?.layoutMetrics?.globalScale);
	const padding = Number(context?.layoutMetrics?.padding);
	return {
		width: Number.isFinite(width) && width > 0 ? width : 100,
		height: Number.isFinite(height) && height > 0 ? height : 100,
		baseRadius: Number.isFinite(baseRadius) && baseRadius > 0 ? baseRadius : 50,
		scale: Number.isFinite(scale) && scale > 0 ? scale : 1,
		padding: Number.isFinite(padding) ? Math.max(0, Math.min(0.49, padding)) : 0,
	};
}

function resolveFill(params) {
	if (typeof params.fill === "string") return params.fill;
	if (typeof params.baseColor === "string") return params.baseColor;
	if (params.material && typeof params.material === "object" && typeof params.material.baseColor === "string") {
		return params.material.baseColor;
	}
	return DEFAULTS.fill;
}

export function renderBase(params = {}, position = {}, context = {}) {
	const p = { ...DEFAULTS, ...params };
	const { width, height, baseRadius, scale, padding } = getLayoutMetrics(context);
	const drawableDiameter = Math.max(1, baseRadius * 2);
	const drawableWidth = Math.max(1, width * (1 - padding * 2) * scale);
	const drawableHeight = Math.max(1, height * (1 - padding * 2) * scale);
	const fill = resolveFill(p);
	const stroke = typeof p.stroke === "string" ? p.stroke : DEFAULTS.stroke;
	const strokeWidth = Math.max(0, clamp(p.thickness, 0, 1, DEFAULTS.thickness) * baseRadius * scale);
	const shape = typeof p.shape === "string" ? p.shape : DEFAULTS.shape;
	const edgeInsetPx = Math.max(0.5, strokeWidth * 0.5 + 0.25);

	if (shape === "rectangle" || shape === "rect") {
		const rectWidthRaw = clamp(p.width, 0, 1, DEFAULTS.width) * drawableWidth;
		const rectHeightRaw = clamp(p.height, 0, 1, DEFAULTS.height) * drawableHeight;
		const rectWidth = Math.max(0, rectWidthRaw - edgeInsetPx * 2);
		const rectHeight = Math.max(0, rectHeightRaw - edgeInsetPx * 2);
		const cornerRadius = clamp(p.cornerRadius, 0, 1, DEFAULTS.cornerRadius) * Math.min(rectWidth, rectHeight);
		return `<rect x="${-rectWidth / 2}" y="${-rectHeight / 2}" width="${rectWidth}" height="${rectHeight}" rx="${cornerRadius}" ry="${cornerRadius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
	}

	const targetRadius = clamp(p.radius, 0, 1, DEFAULTS.radius) * drawableDiameter * scale;
	const maxRadius = Math.max(0, (drawableDiameter * scale) / 2 - edgeInsetPx);
	const radius = Math.max(0, Math.min(targetRadius, maxRadius));
	return `<circle cx="0" cy="0" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
}

export const baseElement = {
	id: "base",
	geometry: { type: "rect" },
	defaultParams: { ...DEFAULTS },
	render: renderBase,
};
