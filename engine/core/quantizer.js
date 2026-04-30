"use strict";

import { hexToRgb565, normalizeHex } from "../utils/color.js";

function dedupeStable(hexColors) {
	const seen = new Set();
	const out = [];
	for (const color of hexColors) {
		if (!seen.has(color)) {
			seen.add(color);
			out.push(color);
		}
	}
	return out;
}

export function quantizePalette(hexColors = [], options = {}) {
	const input = Array.isArray(hexColors) ? hexColors : [];
	const enabled = options.enabled !== false;
	const maxColors = Number.isFinite(Number(options.maxColors)) ? Math.max(1, Math.floor(Number(options.maxColors))) : input.length || 1;

	const normalized = dedupeStable(input.map((hex) => normalizeHex(hex)));

	if (!enabled) {
		return {
			enabled: false,
			colors: normalized,
			rgb565: normalized.map((hex) => ({ hex, rgb565: hexToRgb565(hex) })),
		};
	}

	const reduced = normalized.slice(0, maxColors);
	return {
		enabled: true,
		colors: reduced,
		rgb565: reduced.map((hex) => ({ hex, rgb565: hexToRgb565(hex) })),
	};
}

export function hexToRgb565Value(hex) {
	return hexToRgb565(hex);
}
