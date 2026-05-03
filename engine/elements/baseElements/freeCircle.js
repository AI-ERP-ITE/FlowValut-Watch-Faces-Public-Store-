"use strict";

const DEFAULTS = {
	radius: 0.08,
	fill: "#b8bec8",
	stroke: "#f5f7fa",
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

export function renderFreeCircle(params = {}, position = {}, context = {}) {
	const p = { ...DEFAULTS, ...params };
	const baseRadius = getBaseRadius(context);
	const scale = getScale(context);
	const radius = clamp01(p.radius, DEFAULTS.radius) * baseRadius * scale;
	const rawStroke = p.thickness ?? p.strokeWidth;
	const strokeWidth = Math.max(0, clamp01(rawStroke, DEFAULTS.strokeWidth) * baseRadius * scale);
	const rawFill = typeof p.fill === "string" ? p.fill.trim() : "";
	const fill = rawFill.toLowerCase() === "none" ? "none" : rawFill || DEFAULTS.fill;
	const rawStrokeColor = typeof p.stroke === "string" ? p.stroke.trim() : "";
	const stroke = strokeWidth > 0 && rawStrokeColor.toLowerCase() !== "none" ? (rawStrokeColor || DEFAULTS.stroke) : "none";

	return `<circle cx="0" cy="0" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
}

export const freeCircleElement = {
	id: "free_circle",
	geometry: { type: "circle" },
	defaultParams: { ...DEFAULTS },
	render: renderFreeCircle,
};
