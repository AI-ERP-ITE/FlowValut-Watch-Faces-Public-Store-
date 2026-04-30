"use strict";

function requireObject(value, label) {
	if (!value || typeof value !== "object") {
		throw new Error(`${label} must be an object.`);
	}
	return value;
}

function resolveMaterialKey(element, styleMap) {
	if (typeof element.materialRef === "string" && element.materialRef.trim().length > 0) {
		return element.materialRef;
	}

	if (typeof element.role === "string" && styleMap[element.role]) {
		return styleMap[element.role];
	}

	return null;
}

export function compose(geometry, styleName, styles, materials, paramOverrides = {}) {
	const geometryObj = requireObject(geometry, "geometry");
	const stylesObj = requireObject(styles, "styles");
	const materialsObj = requireObject(materials, "materials");
	const overrideObj = requireObject(paramOverrides, "paramOverrides");

	const styleMap = styleName ? stylesObj[styleName] : {};
	if (styleName && !styleMap) {
		throw new Error(`Unknown style: ${styleName}`);
	}

	const sourceElements = Array.isArray(geometryObj.elements) ? geometryObj.elements : [];
	const elements = sourceElements.map((element, index) => {
		const materialKey = resolveMaterialKey(element, styleMap || {});
		const material = materialKey ? materialsObj[materialKey] : null;
		if (materialKey && !material) {
			throw new Error(`Unknown material \"${materialKey}\" at geometry element index ${index}.`);
		}

		const roleOverrides = element.role && overrideObj[element.role] && typeof overrideObj[element.role] === "object"
			? overrideObj[element.role]
			: {};

		return {
			type: element.type,
			role: element.role,
			materialRef: materialKey,
			params: {
				...(element.params || {}),
				...(material || {}),
				...roleOverrides,
			},
			placement: element.placement ? { ...element.placement, config: { ...(element.placement.config || {}) } } : null,
			symmetry: element.symmetry ? { ...element.symmetry, config: { ...(element.symmetry.config || {}) } } : { mode: "none", config: {} },
		};
	});

	return { elements };
}
