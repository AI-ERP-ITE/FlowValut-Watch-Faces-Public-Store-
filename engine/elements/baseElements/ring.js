"use strict";

const DEFAULTS = {
	radius: 35,
	width: 4,
	stroke: "#ffffff",
	fill: "none",
};

function clampRadius(value, fallback) {
	const num = Number(value);
	if (!Number.isFinite(num)) return fallback;
	return Math.max(0, Math.min(50, num));
}

export function renderRing(params = {}, position = {}, context = {}) {
	const p = { ...DEFAULTS, ...params };
	const radius = clampRadius(p.radius, DEFAULTS.radius);
	const width = Math.max(0, Number.isFinite(Number(p.width)) ? Number(p.width) : DEFAULTS.width);

	return `<circle cx="0" cy="0" r="${radius}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${width}" />`;
}

export const ringElement = {
	id: "ring",
	geometry: { type: "circle" },
	defaultParams: { ...DEFAULTS },
	render: renderRing,
};
