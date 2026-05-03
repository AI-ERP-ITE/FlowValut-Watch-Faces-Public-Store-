"use strict";

const DEFAULTS = {
	sidesCount: 6,
	sides: [0.2, 0.2, 0.2, 0.2, 0.2, 0.2],
	fill: "#74839f",
	stroke: "#f5f7fa",
	thickness: 0.008,
	strokeWidth: 0.008,
	rotation: -90,
};

function clamp(value, min, max, fallback) {
	const n = Number(value);
	if (!Number.isFinite(n)) return fallback;
	return Math.max(min, Math.min(max, n));
}

function clamp01(value, fallback) {
	return clamp(value, 0, 1, fallback);
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

function buildSideArray(params) {
	const count = clamp(params.sidesCount, 3, 12, DEFAULTS.sidesCount);
	const raw = Array.isArray(params.sides) ? params.sides : DEFAULTS.sides;
	const out = [];
	for (let i = 0; i < count; i += 1) {
		out.push(clamp01(raw[i], 0.2));
	}
	return out;
}

function buildPoints(sides, rotationDeg, baseRadius, scale) {
	const count = sides.length;
	const angleStep = (Math.PI * 2) / count;
	const start = (Number(rotationDeg) * Math.PI) / 180;

	return sides
		.map((side, i) => {
			const r = side * baseRadius * scale;
			const a = start + i * angleStep;
			const x = Math.cos(a) * r;
			const y = Math.sin(a) * r;
			return `${x},${y}`;
		})
		.join(" ");
}

export function renderFreePolygon(params = {}, position = {}, context = {}) {
	const p = { ...DEFAULTS, ...params };
	const baseRadius = getBaseRadius(context);
	const scale = getScale(context);
	const rawStroke = p.strokeWidth ?? p.thickness;
	const strokeWidth = Math.max(0, clamp01(rawStroke, DEFAULTS.strokeWidth) * baseRadius * scale);
	const rawFill = typeof p.fill === "string" ? p.fill.trim() : "";
	const fill = rawFill.toLowerCase() === "none" ? "none" : rawFill || DEFAULTS.fill;
	const rawStrokeColor = typeof p.stroke === "string" ? p.stroke.trim() : "";
	const stroke = strokeWidth > 0 && rawStrokeColor.toLowerCase() !== "none" ? (rawStrokeColor || DEFAULTS.stroke) : "none";
	const sides = buildSideArray(p);
	const points = buildPoints(sides, p.rotation, baseRadius, scale);

	return `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
}

export const freePolygonElement = {
	id: "free_polygon",
	geometry: { type: "rect" },
	defaultParams: { ...DEFAULTS },
	render: renderFreePolygon,
};
