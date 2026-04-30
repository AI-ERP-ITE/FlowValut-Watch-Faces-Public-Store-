"use strict";

const DEFAULTS = {
	radius: 0.45,
	thickness: 0.015,
	stroke: "#ffffff",
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

export function renderOutlineRing(params = {}, position = {}, context = {}) {
	const p = { ...DEFAULTS, ...params };
	const baseRadius = getBaseRadius(context);
	const scale = getScale(context);
	const radius = clamp01(p.radius, DEFAULTS.radius) * baseRadius * scale;
	const strokeWidth = Math.max(0.1, clamp01(p.thickness, DEFAULTS.thickness) * baseRadius * scale);

	return `<circle cx="0" cy="0" r="${radius}" fill="none" stroke="${p.stroke}" stroke-width="${strokeWidth}" />`;
}

export const outlineRingElement = {
	id: "outline_ring",
	geometry: { type: "circle" },
	defaultParams: { ...DEFAULTS },
	render: renderOutlineRing,
};
