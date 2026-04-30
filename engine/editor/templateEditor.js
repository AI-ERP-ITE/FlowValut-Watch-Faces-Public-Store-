"use strict";

import { buildGeometry } from "../core/geometry.js";
import { compose } from "../core/composer.js";
import { renderSvg } from "../core/renderer.js";
import { getDefaultEditorParams } from "./paramSchema.js";

function assertObject(value, label) {
	if (!value || typeof value !== "object") {
		throw new Error(`${label} must be an object.`);
	}
	return value;
}

function deepMerge(base, override) {
	const output = Array.isArray(base) ? [...base] : { ...base };
	const source = override && typeof override === "object" ? override : {};

	for (const [key, value] of Object.entries(source)) {
		if (value && typeof value === "object" && !Array.isArray(value) && output[key] && typeof output[key] === "object" && !Array.isArray(output[key])) {
			output[key] = deepMerge(output[key], value);
		} else {
			output[key] = value;
		}
	}

	return output;
}

export class TemplateEditor {
	constructor({ templates = {}, styles = {}, materials = {}, activeStyle = null } = {}) {
		this.templates = assertObject(templates, "templates");
		this.styles = assertObject(styles, "styles");
		this.materials = assertObject(materials, "materials");
		this.activeStyle = activeStyle;

		this.currentTemplateName = null;
		this.currentTemplate = null;
		this.currentParams = getDefaultEditorParams();
	}

	loadTemplate(templateName) {
		if (typeof templateName !== "string" || templateName.trim().length === 0) {
			throw new Error("templateName must be a non-empty string.");
		}

		const template = this.templates[templateName];
		if (!template) {
			throw new Error(`Unknown template: ${templateName}`);
		}

		this.currentTemplateName = templateName;
		this.currentTemplate = template;
		this.currentParams = getDefaultEditorParams();
		return this.currentTemplate;
	}

	applyParameterOverrides(overrides = {}) {
		assertObject(overrides, "overrides");
		this.currentParams = deepMerge(this.currentParams, overrides);
		return this.currentParams;
	}

	updatePreview() {
		if (!this.currentTemplate) {
			throw new Error("No template loaded. Call loadTemplate(templateName) first.");
		}

		const geometry = buildGeometry(this.currentTemplate);
		const composed = compose(
			geometry,
			this.activeStyle,
			this.styles,
			this.materials,
			this.currentParams,
		);

		return renderSvg(composed, {
			template: this.currentTemplateName,
			params: this.currentParams,
		});
	}

	saveVariant() {
		if (!this.currentTemplateName) {
			throw new Error("No template loaded. Cannot save variant.");
		}

		return {
			template: this.currentTemplateName,
			params: this.currentParams,
		};
	}
}
