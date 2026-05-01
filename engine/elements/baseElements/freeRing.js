"use strict";

const DEFAULTS = {
	radius: 0.2,
	thickness: 0.015,
	strokeWidth: 0.015,
	stroke: "#d6dde8",
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

export function renderFreeRing(params = {}, position = {}, context = {}) {
	const p = { ...DEFAULTS, ...params };
	const baseRadius = getBaseRadius(context);
	const scale = getScale(context);
	const radius = clamp01(p.radius, DEFAULTS.radius) * baseRadius * scale;
	const rawStroke = p.strokeWidth ?? p.thickness;
	const thickness = Math.max(0, clamp01(rawStroke, DEFAULTS.strokeWidth) * baseRadius * scale);

	return `<circle cx="0" cy="0" r="${radius}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${thickness}" />`;
}

export const freeRingElement = {
	id: "free_ring",
	geometry: { type: "circle" },
	defaultParams: { ...DEFAULTS },
	render: renderFreeRing,
};
