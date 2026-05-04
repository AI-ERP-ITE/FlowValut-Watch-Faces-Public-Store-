"use strict";

function asObject(value, label) {
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

export function buildGeometry(template) {
	const templateObj = asObject(template, "template");
	const sourceElements = Array.isArray(templateObj.elements) ? templateObj.elements : [];
	const layout = templateObj.layout && typeof templateObj.layout === "object" ? { ...templateObj.layout } : null;
	const scale = templateObj.scale && typeof templateObj.scale === "object" ? { ...templateObj.scale } : null;
	const relationships = templateObj.relationships && typeof templateObj.relationships === "object" ? { ...templateObj.relationships } : null;
	const effects3d = templateObj.effects3d && typeof templateObj.effects3d === "object" ? { ...templateObj.effects3d } : null;
	const styleAdjust = templateObj.styleAdjust && typeof templateObj.styleAdjust === "object" ? { ...templateObj.styleAdjust } : null;
	const texture = templateObj.texture && typeof templateObj.texture === "object" ? { ...templateObj.texture } : null;
	const gradient = templateObj.gradient && typeof templateObj.gradient === "object" ? { ...templateObj.gradient } : null;

	const elements = sourceElements.map((element, index) => {
		const safeElement = asObject(element, `template.elements[${index}]`);
		const placement = safeElement.placement && typeof safeElement.placement === "object"
			? { ...safeElement.placement, config: { ...(safeElement.placement.config || {}) } }
			: { mode: "center", config: { offset: [0, 0], rotation: 0 } };
		const symmetry = safeElement.symmetry && typeof safeElement.symmetry === "object"
			? { ...safeElement.symmetry, config: { ...(safeElement.symmetry.config || {}) } }
			: { mode: "none", config: {} };
		return {
			id: safeElement.id,
			name: safeElement.name,
			type: safeElement.type,
			role: safeElement.role,
			visible: safeElement.visible,
			materialRef: safeElement.materialRef,
			params: { ...safeElement.params },
			material: safeElement.material && typeof safeElement.material === "object" ? { ...safeElement.material } : null,
			texture: safeElement.texture && typeof safeElement.texture === "object" ? { ...safeElement.texture } : null,
			gradient: safeElement.gradient && typeof safeElement.gradient === "object" ? { ...safeElement.gradient } : null,
			materialLayers: cloneEffectLayers(safeElement.materialLayers),
			textureLayers: cloneEffectLayers(safeElement.textureLayers),
			gradientLayers: cloneEffectLayers(safeElement.gradientLayers),
			mask: safeElement.mask,
			dropShadow: safeElement.dropShadow && typeof safeElement.dropShadow === "object" ? { ...safeElement.dropShadow } : null,
			styleAdjust: safeElement.styleAdjust && typeof safeElement.styleAdjust === "object" ? { ...safeElement.styleAdjust } : null,
			effect3d: safeElement.effect3d && typeof safeElement.effect3d === "object" ? { ...safeElement.effect3d } : null,
			placement,
			symmetry,
		};
	});

	return {
		layout,
		scale,
		relationships,
		effects3d,
		styleAdjust,
		texture,
		gradient,
		elements,
	};
}
