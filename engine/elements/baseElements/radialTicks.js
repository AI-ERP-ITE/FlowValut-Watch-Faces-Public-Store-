"use strict";

const DEFAULTS = {
	count: 60,
	radius: 42,
	length: 4,
	majorEvery: 5,
	majorScale: 1.7,
	width: 0.8,
	rotation: 0,
	stroke: "#ffffff",
};

function polarToCartesian(cx, cy, radius, angleDeg) {
	const rad = (angleDeg * Math.PI) / 180;
	return {
		x: cx + radius * Math.cos(rad),
		y: cy + radius * Math.sin(rad),
	};
}

export function renderRadialTicks(params = {}, position = {}, context = {}) {
	const p = { ...DEFAULTS, ...params };
	const cx = 0;
	const cy = 0;
	const count = Math.max(1, Math.floor(Number.isFinite(Number(p.count)) ? Number(p.count) : DEFAULTS.count));
	const radius = Math.max(0, Number.isFinite(Number(p.radius)) ? Number(p.radius) : DEFAULTS.radius);
	const length = Math.max(0, Number.isFinite(Number(p.length)) ? Number(p.length) : DEFAULTS.length);
	const width = Math.max(0, Number.isFinite(Number(p.width)) ? Number(p.width) : DEFAULTS.width);
	const majorEvery = Math.max(1, Math.floor(Number.isFinite(Number(p.majorEvery)) ? Number(p.majorEvery) : DEFAULTS.majorEvery));
	const majorScale = Math.max(1, Number.isFinite(Number(p.majorScale)) ? Number(p.majorScale) : DEFAULTS.majorScale);
	const rotation = Number.isFinite(Number(p.rotation)) ? Number(p.rotation) : DEFAULTS.rotation;

	let svg = "<g>";
	for (let i = 0; i < count; i += 1) {
		const angle = rotation + (360 * i) / count - 90;
		const isMajor = i % majorEvery === 0;
		const tickLength = isMajor ? length * majorScale : length;
		const start = polarToCartesian(cx, cy, radius - tickLength, angle);
		const end = polarToCartesian(cx, cy, radius, angle);
		svg += `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${p.stroke}" stroke-width="${width}" stroke-linecap="round" />`;
	}
	svg += "</g>";
	return svg;
}

export const radialTicksElement = {
	id: "radialTicks",
	geometry: { type: "radial" },
	defaultParams: { ...DEFAULTS },
	render: renderRadialTicks,
};
