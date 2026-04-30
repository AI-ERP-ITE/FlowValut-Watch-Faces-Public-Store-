"use strict";

const DEFAULTS = {
	count: 60,
	radius: 0.42,
	length: 0.02,
	width: 0.003,
	majorEvery: 5,
	majorLength: 0.035,
	rotation: 0,
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

function polarToCartesian(cx, cy, radius, angleDeg) {
	const rad = (angleDeg * Math.PI) / 180;
	return {
		x: cx + radius * Math.cos(rad),
		y: cy + radius * Math.sin(rad),
	};
}

export function renderTicksRadial(params = {}, position = {}, context = {}) {
	const p = { ...DEFAULTS, ...params };
	const baseRadius = getBaseRadius(context);
	const scale = getScale(context);

	const count = Math.max(1, Math.floor(Number.isFinite(Number(p.count)) ? Number(p.count) : DEFAULTS.count));
	const radius = clamp01(p.radius, DEFAULTS.radius) * baseRadius * scale;
	const lengthMinor = clamp01(p.length, DEFAULTS.length) * baseRadius * scale;
	const lengthMajor = clamp01(p.majorLength, DEFAULTS.majorLength) * baseRadius * scale;
	const width = Math.max(0.1, clamp01(p.width, DEFAULTS.width) * baseRadius * scale);
	const majorEvery = Math.max(1, Math.floor(Number.isFinite(Number(p.majorEvery)) ? Number(p.majorEvery) : DEFAULTS.majorEvery));
	const rotation = Number.isFinite(Number(p.rotation)) ? Number(p.rotation) : DEFAULTS.rotation;

	let svg = "<g>";
	for (let i = 0; i < count; i += 1) {
		const angle = rotation + (360 * i) / count - 90;
		const tickLength = i % majorEvery === 0 ? lengthMajor : lengthMinor;
		const start = polarToCartesian(0, 0, Math.max(0, radius - tickLength), angle);
		const end = polarToCartesian(0, 0, radius, angle);
		svg += `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${p.stroke}" stroke-width="${width}" stroke-linecap="round" />`;
	}
	svg += "</g>";
	return svg;
}

export const ticksRadialElement = {
	id: "ticks_radial",
	geometry: { type: "radial" },
	defaultParams: { ...DEFAULTS },
	render: renderTicksRadial,
};
