"use strict";

const DEFAULTS = {
	r: 10,
	fill: "none",
	stroke: "#ffffff",
	strokeWidth: 1,
};

function clampSize(value, fallback) {
	const num = Number(value);
	if (!Number.isFinite(num)) return fallback;
	return Math.max(0, Math.min(50, num));
}

export function renderCircle(params = {}, position = {}, context = {}) {
	const p = { ...DEFAULTS, ...params };
	const r = clampSize(p.r, DEFAULTS.r);
	const strokeWidth = Math.max(0, Number.isFinite(Number(p.strokeWidth)) ? Number(p.strokeWidth) : DEFAULTS.strokeWidth);

	return `<circle cx="0" cy="0" r="${r}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${strokeWidth}" />`;
}

export const circleElement = {
	id: "circle",
	geometry: { type: "circle" },
	defaultParams: { ...DEFAULTS },
	render: renderCircle,
};
