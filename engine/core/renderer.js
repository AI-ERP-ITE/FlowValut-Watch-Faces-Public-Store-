"use strict";

import { getElement } from "../elements/elementRegistry.js";
import { validateElementModel } from "../elements/elementRegistry.js";
import { analyzeGradient, processColor } from "../color/colorController.js";
import { resolvePlacement } from "./placement.js";
import { applySymmetry } from "./symmetry.js";

const COLOR_KEYS = new Set(["fill", "stroke", "color", "stopColor", "shadowColor", "highlightColor"]);
const GRADIENT_KEYS = new Set(["gradientStops", "stops"]);

function requireObject(value, label) {
	if (!value || typeof value !== "object") {
		throw new Error(`${label} must be an object.`);
	}
	return value;
}

function processGradientStops(stops, context) {
	if (!Array.isArray(stops)) return stops;

	const originalColors = [];
	const processed = stops.map((entry) => {
		if (typeof entry === "string") {
			originalColors.push(entry);
			return processColor(entry, context.colorControlConfig);
		}

		if (entry && typeof entry === "object") {
			const copy = { ...entry };
			if (typeof copy.color === "string") {
				originalColors.push(copy.color);
				copy.color = processColor(copy.color, context.colorControlConfig);
			}
			if (typeof copy.stopColor === "string") {
				originalColors.push(copy.stopColor);
				copy.stopColor = processColor(copy.stopColor, context.colorControlConfig);
			}
			return copy;
		}

		return entry;
	});

	if (originalColors.length > 0) {
		analyzeGradient(originalColors, context.colorControlConfig);
	}

	return processed;
}

function applyColorControlToParams(params, context) {
	if (Array.isArray(params)) {
		return params.map((entry) => applyColorControlToParams(entry, context));
	}

	if (!params || typeof params !== "object") {
		return params;
	}

	const out = {};
	for (const [key, value] of Object.entries(params)) {
		if (GRADIENT_KEYS.has(key) && Array.isArray(value)) {
			out[key] = processGradientStops(value, context);
			continue;
		}

		if (COLOR_KEYS.has(key) && typeof value === "string") {
			out[key] = processColor(value, context.colorControlConfig);
			continue;
		}

		out[key] = applyColorControlToParams(value, context);
	}

	return out;
}

export function renderElement(element, context = {}) {
	const safeElement = requireObject(element, "element");
	if (typeof safeElement.type !== "string" || safeElement.type.trim().length === 0) {
		throw new Error("element.type must be a non-empty string.");
	}
	validateElementModel(safeElement.type, safeElement);

	const basePosition = resolvePlacement(safeElement, context);
	const positions = applySymmetry(safeElement, basePosition, context);

	const definition = getElement(safeElement.type);
	const mergedParams = {
		...(definition.defaultParams || {}),
		...(safeElement.params || {}),
	};
	const renderParams = applyColorControlToParams(mergedParams, context);

	return positions
		.map((position) => {
			const x = Number(position.x);
			const y = Number(position.y);
			const rotation = Number.isFinite(Number(position.rotation)) ? Number(position.rotation) : 0;
			const body = definition.render(renderParams, position, context);
			return `<g transform="translate(${x} ${y}) rotate(${rotation})">${body}</g>`;
		})
		.join("");
}

export function renderSvg(resolvedComposition, context = {}) {
	const composition = requireObject(resolvedComposition, "resolvedComposition");
	const elements = Array.isArray(composition.elements) ? composition.elements : [];
	const body = elements.map((element) => renderElement(element, context)).join("");
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;
}
