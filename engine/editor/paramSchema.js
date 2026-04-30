"use strict";

export const paramSchema = Object.freeze({
	colors: {
		base: { type: "color", default: "#111111" },
		accent: { type: "color", default: "#d9b85f" },
	},
	textureType: {
		type: "enum",
		options: ["none", "brushed", "matte", "polished", "engraved"],
		default: "matte",
	},
	textureIntensity: {
		type: "number",
		min: 0,
		max: 1,
		step: 0.01,
		default: 0.5,
	},
	highlightStrength: {
		type: "number",
		min: 0,
		max: 1,
		step: 0.01,
		default: 0.4,
	},
	shadowStrength: {
		type: "number",
		min: 0,
		max: 1,
		step: 0.01,
		default: 0.35,
	},
	strokeWidth: {
		type: "number",
		min: 0,
		max: 10,
		step: 0.1,
		default: 1,
	},
	fillMode: {
		type: "enum",
		options: ["fill", "stroke", "both"],
		default: "both",
	},
	tickStyle: {
		type: "enum",
		options: ["minimal", "classic", "industrial", "sport"],
		default: "industrial",
	},
	bezelStyle: {
		type: "enum",
		options: ["flat", "stepped", "engraved", "coin-edge"],
		default: "engraved",
	},
});

export function getDefaultEditorParams() {
	return {
		colors: {
			base: paramSchema.colors.base.default,
			accent: paramSchema.colors.accent.default,
		},
		textureType: paramSchema.textureType.default,
		textureIntensity: paramSchema.textureIntensity.default,
		highlightStrength: paramSchema.highlightStrength.default,
		shadowStrength: paramSchema.shadowStrength.default,
		strokeWidth: paramSchema.strokeWidth.default,
		fillMode: paramSchema.fillMode.default,
		tickStyle: paramSchema.tickStyle.default,
		bezelStyle: paramSchema.bezelStyle.default,
	};
}
