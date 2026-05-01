"use strict";

const DEFAULTS = {
	width: 0.24,
	height: 0.14,
	cornerRadius: 0.02,
	fill: "#8c939f",
	stroke: "#f2f4f7",
	thickness: 0.008,
	strokeWidth: 0.008,
};

function clamp01(value, fallback) {
	const n = Number(value);
	if (!Number.isFinite(n)) return fallback;
	return Math.max(0, Math.min(1, n));
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

export function renderFreeRect(params = {}, position = {}, context = {}) {
	const p = { ...DEFAULTS, ...params };
	const baseRadius = getBaseRadius(context);
	const scale = getScale(context);
	const width = clamp01(p.width, DEFAULTS.width) * baseRadius * 2 * scale;
	const height = clamp01(p.height, DEFAULTS.height) * baseRadius * 2 * scale;
	const cornerRadius = clamp01(p.cornerRadius, DEFAULTS.cornerRadius) * baseRadius * scale;
	const rawStroke = p.strokeWidth ?? p.thickness;
	const strokeWidth = Math.max(0, clamp01(rawStroke, DEFAULTS.strokeWidth) * baseRadius * scale);
	const x = -width / 2;
	const y = -height / 2;

	return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${cornerRadius}" ry="${cornerRadius}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${strokeWidth}" />`;
}

export const freeRectElement = {
	id: "free_rect",
	geometry: { type: "rect" },
	defaultParams: { ...DEFAULTS },
	render: renderFreeRect,
};
