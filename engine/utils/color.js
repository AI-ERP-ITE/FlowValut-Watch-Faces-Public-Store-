"use strict";

function clampByte(value) {
	const num = Number(value);
	if (!Number.isFinite(num)) return 0;
	return Math.max(0, Math.min(255, Math.round(num)));
}

export function normalizeHex(hex) {
	if (typeof hex !== "string") {
		throw new Error("hex color must be a string.");
	}

	const raw = hex.trim().replace(/^#/, "");
	const expanded = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
	if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
		throw new Error(`Invalid hex color: ${hex}`);
	}
	return `#${expanded.toLowerCase()}`;
}

export function hexToRgb(hex) {
	const safeHex = normalizeHex(hex).slice(1);
	return {
		r: clampByte(parseInt(safeHex.slice(0, 2), 16)),
		g: clampByte(parseInt(safeHex.slice(2, 4), 16)),
		b: clampByte(parseInt(safeHex.slice(4, 6), 16)),
	};
}

export function rgbToHex(rgb) {
	if (!rgb || typeof rgb !== "object") {
		throw new Error("rgb must be an object with r,g,b.");
	}
	const r = clampByte(rgb.r).toString(16).padStart(2, "0");
	const g = clampByte(rgb.g).toString(16).padStart(2, "0");
	const b = clampByte(rgb.b).toString(16).padStart(2, "0");
	return `#${r}${g}${b}`;
}

export function rgbToRgb565(rgb) {
	if (!rgb || typeof rgb !== "object") {
		throw new Error("rgb must be an object with r,g,b.");
	}
	const r = clampByte(rgb.r);
	const g = clampByte(rgb.g);
	const b = clampByte(rgb.b);

	const r5 = (r >> 3) & 0x1f;
	const g6 = (g >> 2) & 0x3f;
	const b5 = (b >> 3) & 0x1f;

	return (r5 << 11) | (g6 << 5) | b5;
}

export function hexToRgb565(hex) {
	return rgbToRgb565(hexToRgb(hex));
}
