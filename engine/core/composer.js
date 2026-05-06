"use strict";

function requireObject(value, label) {
	if (!value || typeof value !== "object") {
		throw new Error(`${label} must be an object.`);
	}
	return value;
}

function cloneEffectLayers(value) {
	if (!Array.isArray(value)) return [];
	return value
		.filter((entry) => entry && typeof entry === "object")
		.map((entry) => ({ ...entry }));
}

function cloneDeep(value) {
	try {
		return JSON.parse(JSON.stringify(value));
	} catch (_error) {
		return null;
	}
}

function parseMaskEnabled(value) {
	if (value === true || value === 1) return true;
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		return normalized === "true" || normalized === "1" || normalized === "yes";
	}
	return false;
}

function normalizeMask(mask) {
	if (!mask || typeof mask !== "object") return null;
	if (!parseMaskEnabled(mask.enabled)) return null;

	const cloned = cloneDeep(mask);
	if (!cloned || typeof cloned !== "object") return null;

	return {
		...cloned,
		enabled: true,
	};
}

function validateMask(mask) {
	if (!mask || typeof mask !== "object") return { valid: false, reason: "missing" };
	if (!parseMaskEnabled(mask.enabled)) return { valid: false, reason: "disabled" };

	const strokes = Array.isArray(mask.strokes) ? mask.strokes : [];
	if (strokes.length === 0) {
		return { valid: false, reason: "no_strokes" };
	}

	return { valid: true };
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
		const maskCheck = validateMask(element.mask);
		if (element.mask !== undefined && element.mask !== null && !maskCheck.valid) {
			console.warn("Mask invalid:", maskCheck.reason, element.id);
		}
		const materialKey = resolveMaterialKey(element, styleMap || {});
		const material = materialKey ? materialsObj[materialKey] : null;
		if (materialKey && !material) {
			throw new Error(`Unknown material \"${materialKey}\" at geometry element index ${index}.`);
		}

		const roleOverrides = element.role && overrideObj[element.role] && typeof overrideObj[element.role] === "object"
			? overrideObj[element.role]
			: {};

		return {
			id: element.id,
			name: element.name,
			type: element.type,
			role: element.role,
			visible: element.visible,
			opacity: element.opacity,
			materialRef: materialKey,
			params: {
				...(material || {}),
				...(element.params || {}),
				...roleOverrides,
			},
			material: element.material && typeof element.material === "object" ? { ...element.material } : null,
			texture: element.texture && typeof element.texture === "object" ? { ...element.texture } : null,
			gradient: element.gradient && typeof element.gradient === "object" ? { ...element.gradient } : null,
			materialLayers: cloneEffectLayers(element.materialLayers),
			textureLayers: cloneEffectLayers(element.textureLayers),
			gradientLayers: cloneEffectLayers(element.gradientLayers),
			mask: normalizeMask(element.mask),
			dropShadow: element.dropShadow && typeof element.dropShadow === "object" ? { ...element.dropShadow } : null,
			styleAdjust: element.styleAdjust && typeof element.styleAdjust === "object" ? { ...element.styleAdjust } : null,
			effect3d: element.effect3d && typeof element.effect3d === "object" ? { ...element.effect3d } : null,
			renderState: element.renderState && typeof element.renderState === "object" ? cloneDeep(element.renderState) : null,
			placement: element.placement ? { ...element.placement, config: { ...(element.placement.config || {}) } } : null,
			symmetry: element.symmetry ? { ...element.symmetry, config: { ...(element.symmetry.config || {}) } } : { mode: "none", config: {} },
		};
	});

	return {
		layout: geometryObj.layout && typeof geometryObj.layout === "object" ? { ...geometryObj.layout } : null,
		scale: geometryObj.scale && typeof geometryObj.scale === "object" ? { ...geometryObj.scale } : null,
		relationships: geometryObj.relationships && typeof geometryObj.relationships === "object" ? { ...geometryObj.relationships } : null,
		effects3d: geometryObj.effects3d && typeof geometryObj.effects3d === "object" ? { ...geometryObj.effects3d } : null,
		styleAdjust: geometryObj.styleAdjust && typeof geometryObj.styleAdjust === "object" ? { ...geometryObj.styleAdjust } : null,
		texture: geometryObj.texture && typeof geometryObj.texture === "object" ? { ...geometryObj.texture } : null,
		gradient: geometryObj.gradient && typeof geometryObj.gradient === "object" ? { ...geometryObj.gradient } : null,
		elements,
	};
}
