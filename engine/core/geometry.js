"use strict";

function asObject(value, label) {
	if (!value || typeof value !== "object") {
		throw new Error(`${label} must be an object.`);
	}
	return value;
}

export function buildGeometry(template) {
	const templateObj = asObject(template, "template");
	const sourceElements = Array.isArray(templateObj.elements) ? templateObj.elements : [];

	const elements = sourceElements.map((element, index) => {
		const safeElement = asObject(element, `template.elements[${index}]`);
		return {
			type: safeElement.type,
			role: safeElement.role,
			materialRef: safeElement.materialRef,
			params: { ...safeElement.params },
			placement: safeElement.placement ? { ...safeElement.placement, config: { ...(safeElement.placement.config || {}) } } : null,
			symmetry: safeElement.symmetry ? { ...safeElement.symmetry, config: { ...(safeElement.symmetry.config || {}) } } : { mode: "none", config: {} },
		};
	});

	return {
		elements,
	};
}
