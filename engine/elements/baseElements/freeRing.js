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
	const rawStroke = p.thickness ?? p.strokeWidth;
	const thickness = Math.max(0, clamp01(rawStroke, DEFAULTS.strokeWidth) * baseRadius * scale);
	const rawFill = typeof p.fill === "string" ? p.fill.trim() : "";
	const fill = rawFill.toLowerCase() === "none" ? "none" : rawFill || DEFAULTS.fill;
	const rawStrokeColor = typeof p.stroke === "string" ? p.stroke.trim() : "";
	const stroke = thickness > 0 && rawStrokeColor.toLowerCase() !== "none" ? (rawStrokeColor || DEFAULTS.stroke) : "none";

	return `<circle cx="0" cy="0" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${thickness}" />`;
}

export const freeRingElement = {
	id: "free_ring",
	geometry: { type: "circle" },
	defaultParams: { ...DEFAULTS },
	render: renderFreeRing,
};
