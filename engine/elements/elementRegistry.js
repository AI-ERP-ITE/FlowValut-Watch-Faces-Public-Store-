"use strict";

const registry = new Map();

const ALLOWED_GEOMETRY_TYPES = new Set(["circle", "rect", "radial"]);

function assertNonEmptyString(value, label) {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new Error(`${label} must be a non-empty string.`);
	}
}

function assertValidDefinition(definition) {
	if (!definition || typeof definition !== "object") {
		throw new Error("Element definition must be an object.");
	}

	assertNonEmptyString(definition.id, "definition.id");

	if (!definition.geometry || typeof definition.geometry !== "object") {
		throw new Error("definition.geometry must be an object.");
	}

	assertNonEmptyString(definition.geometry.type, "definition.geometry.type");

	if (!ALLOWED_GEOMETRY_TYPES.has(definition.geometry.type)) {
		throw new Error(
			`Unsupported geometry type \"${definition.geometry.type}\". Use one of: ${Array.from(ALLOWED_GEOMETRY_TYPES).join(", ")}.`,
		);
	}

	if (definition.defaultParams !== undefined && (definition.defaultParams === null || typeof definition.defaultParams !== "object")) {
		throw new Error("definition.defaultParams must be an object when provided.");
	}

	if (typeof definition.render !== "function") {
		throw new Error("definition.render must be a function(params, position, context).");
	}
}

function assertValidElementModel(type, element) {
	if (!element || typeof element !== "object") {
		throw new Error(`Rendered element for type \"${type}\" must be an object.`);
	}

	if (typeof element.type !== "string" || element.type.trim().length === 0) {
		throw new Error("Element model requires non-empty type.");
	}

	if (!element.placement || typeof element.placement !== "object") {
		throw new Error(`Element \"${element.type}\" requires placement object.`);
	}

	if (typeof element.placement.mode !== "string" || element.placement.mode.trim().length === 0) {
		throw new Error(`Element \"${element.type}\" requires placement.mode.`);
	}

	if (!element.placement.config || typeof element.placement.config !== "object") {
		throw new Error(`Element \"${element.type}\" requires placement.config object.`);
	}

	if (!element.symmetry || typeof element.symmetry !== "object") {
		throw new Error(`Element \"${element.type}\" requires symmetry object.`);
	}

	if (typeof element.symmetry.mode !== "string" || element.symmetry.mode.trim().length === 0) {
		throw new Error(`Element \"${element.type}\" requires symmetry.mode.`);
	}

	if (!element.symmetry.config || typeof element.symmetry.config !== "object") {
		throw new Error(`Element \"${element.type}\" requires symmetry.config object.`);
	}

	if (element.params && typeof element.params === "object") {
		for (const forbidden of ["x", "y", "cx", "cy"]) {
			if (Object.prototype.hasOwnProperty.call(element.params, forbidden)) {
				throw new Error(`Element \"${element.type}\" uses forbidden raw coordinate field \"${forbidden}\".`);
			}
		}
	}
}

export function registerElement(type, definition) {
	assertNonEmptyString(type, "type");
	assertValidDefinition(definition);
	registry.set(type, {
		...definition,
		defaultParams: definition.defaultParams ? { ...definition.defaultParams } : {},
	});
}

export function getElement(type) {
	assertNonEmptyString(type, "type");
	const definition = registry.get(type);
	if (!definition) {
		throw new Error(`Element type \"${type}\" is not registered.`);
	}
	return definition;
}

export function validateElementModel(type, element) {
	assertNonEmptyString(type, "type");
	assertValidElementModel(type, element);
}
