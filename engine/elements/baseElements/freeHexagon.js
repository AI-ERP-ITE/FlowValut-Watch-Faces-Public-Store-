"use strict";

const DEFAULTS = {
	side1: 0.2,
	side2: 0.2,
	side3: 0.2,
	side4: 0.2,
	side5: 0.2,
	side6: 0.2,
	fill: "#7e8aa1",
	stroke: "#f5f7fa",
	thickness: 0.008,
	strokeWidth: 0.008,
	rotation: -90,
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

function buildPoints(sides, rotationDeg, baseRadius, scale) {
	const count = sides.length;
	const angleStep = (Math.PI * 2) / count;
	const start = (Number(rotationDeg) * Math.PI) / 180;

	return sides
		.map((side, i) => {
			const r = clamp01(side, 0.2) * baseRadius * scale;
			const a = start + i * angleStep;
			const x = Math.cos(a) * r;
			const y = Math.sin(a) * r;
			return `${x},${y}`;
		})
		.join(" ");
}

export function renderFreeHexagon(params = {}, position = {}, context = {}) {
	const p = { ...DEFAULTS, ...params };
	const baseRadius = getBaseRadius(context);
	const scale = getScale(context);
	const rawStroke = p.thickness ?? p.strokeWidth;
	const strokeWidth = Math.max(0, clamp01(rawStroke, DEFAULTS.strokeWidth) * baseRadius * scale);
	const rawFill = typeof p.fill === "string" ? p.fill.trim() : "";
	const fill = rawFill.toLowerCase() === "none" ? "none" : rawFill || DEFAULTS.fill;
	const rawStrokeColor = typeof p.stroke === "string" ? p.stroke.trim() : "";
	const stroke = strokeWidth > 0 && rawStrokeColor.toLowerCase() !== "none" ? (rawStrokeColor || DEFAULTS.stroke) : "none";
	const points = buildPoints([p.side1, p.side2, p.side3, p.side4, p.side5, p.side6], p.rotation, baseRadius, scale);

	return `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
}

export const freeHexagonElement = {
	id: "free_hexagon",
	geometry: { type: "rect" },
	defaultParams: { ...DEFAULTS },
	render: renderFreeHexagon,
};
