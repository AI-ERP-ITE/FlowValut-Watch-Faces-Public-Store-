"use strict";

const DEFAULTS = {
	radius: 0.48,
	thickness: 0.02,
	stroke: "#ffffff",
	fill: "none",
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

export function renderBezel(params = {}, position = {}, context = {}) {
	const p = { ...DEFAULTS, ...params };
	const baseRadius = getBaseRadius(context);
	const scale = getScale(context);
	const radiusRatio = clamp01(p.radius, DEFAULTS.radius);
	const thicknessRatio = clamp01(p.thickness, DEFAULTS.thickness);

	const radius = radiusRatio * baseRadius * scale;
	const width = Math.max(0.1, thicknessRatio * baseRadius * scale);

	return `<circle cx="0" cy="0" r="${radius}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${width}" />`;
}

export const bezelElement = {
	id: "bezel",
	geometry: { type: "circle" },
	defaultParams: { ...DEFAULTS },
	render: renderBezel,
};
