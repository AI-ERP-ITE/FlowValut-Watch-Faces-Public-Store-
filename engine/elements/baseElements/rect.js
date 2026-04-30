"use strict";

const DEFAULTS = {
	width: 20,
	height: 20,
	rx: 0,
	ry: 0,
	fill: "none",
	stroke: "#ffffff",
	strokeWidth: 1,
};

function safeNumber(value, fallback) {
	const num = Number(value);
	return Number.isFinite(num) ? num : fallback;
}

export function renderRect(params = {}, position = {}, context = {}) {
	const p = { ...DEFAULTS, ...params };
	const width = Math.max(0, Math.min(100, safeNumber(p.width, DEFAULTS.width)));
	const height = Math.max(0, Math.min(100, safeNumber(p.height, DEFAULTS.height)));
	const rx = Math.max(0, Math.min(50, safeNumber(p.rx, DEFAULTS.rx)));
	const ry = Math.max(0, Math.min(50, safeNumber(p.ry, DEFAULTS.ry)));
	const strokeWidth = Math.max(0, safeNumber(p.strokeWidth, DEFAULTS.strokeWidth));
	const x = -width / 2;
	const y = -height / 2;

	return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" ry="${ry}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${strokeWidth}" />`;
}

export const rectElement = {
	id: "rect",
	geometry: { type: "rect" },
	defaultParams: { ...DEFAULTS },
	render: renderRect,
};
