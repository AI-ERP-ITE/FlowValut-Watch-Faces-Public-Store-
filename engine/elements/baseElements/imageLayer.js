"use strict";

const DEFAULTS = {
	imageDataUrl: "",
	imgX: 0,
	imgY: 0,
	width: 1,
	height: 1,
	fit: "fill",
	opacity: 1,
};

const FIT_TO_PAR = {
	fill:    "none",
	cover:   "xMidYMid slice",
	contain: "xMidYMid meet",
};

function clamp(value, min, max, fallback) {
	const n = Number(value);
	if (!Number.isFinite(n)) return fallback;
	return Math.max(min, Math.min(max, n));
}

function escapeAttribute(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

export function renderImageLayer(params = {}, position = {}, context = {}) {
	const p = { ...DEFAULTS, ...params };

	// Validate: must be an image data URL or empty
	const raw = typeof p.imageDataUrl === "string" ? p.imageDataUrl.trim() : "";
	if (!raw || !raw.startsWith("data:image/")) return "";

	const canvasW = Number(context?.layoutMetrics?.width);
	const canvasH = Number(context?.layoutMetrics?.height);
	const W = Number.isFinite(canvasW) && canvasW > 0 ? canvasW : 100;
	const H = Number.isFinite(canvasH) && canvasH > 0 ? canvasH : 100;

	// Fractions → canvas pixels; allow slight over-canvas placement
	const x      = clamp(p.imgX,   -1, 2, 0) * W;
	const y      = clamp(p.imgY,   -1, 2, 0) * H;
	const width  = clamp(p.width,  0.01, 2, 1) * W;
	const height = clamp(p.height, 0.01, 2, 1) * H;
	const opacity = clamp(p.opacity, 0, 1, 1);

	const fit = typeof p.fit === "string" && FIT_TO_PAR[p.fit] ? p.fit : "fill";
	const preserveAspectRatio = FIT_TO_PAR[fit];

	return (
		`<image ` +
		`x="${x.toFixed(3)}" y="${y.toFixed(3)}" ` +
		`width="${width.toFixed(3)}" height="${height.toFixed(3)}" ` +
		`preserveAspectRatio="${preserveAspectRatio}" ` +
		`href="${escapeAttribute(raw)}" ` +
		`opacity="${opacity.toFixed(3)}" />`
	);
}

export const imageLayerElement = {
	id: "image_layer",
	geometry: { type: "rect" },
	defaultParams: { ...DEFAULTS },
	render: renderImageLayer,
};
