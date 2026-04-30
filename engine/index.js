"use strict";

import template from "./templates/chrono_industrial.json" with { type: "json" };
import materials from "./materials/materials.json" with { type: "json" };
import styles from "./styles/styles.json" with { type: "json" };

import { buildGeometry } from "./core/geometry.js";
import { compose } from "./core/composer.js";
import { renderSvg } from "./core/renderer.js";
import { registerElement } from "./elements/elementRegistry.js";
import { DEFAULT_COLOR_CONTROL_CONFIG } from "./color/colorController.js";

import { circleElement } from "./elements/baseElements/circle.js";
import { ringElement } from "./elements/baseElements/ring.js";
import { radialTicksElement } from "./elements/baseElements/radialTicks.js";
import { rectElement } from "./elements/baseElements/rect.js";

function registerBaseElements() {
	registerElement("circle", circleElement);
	registerElement("ring", ringElement);
	registerElement("radialTicks", radialTicksElement);
	registerElement("rect", rectElement);
}

function registerCustomElements() {
	registerElement("engraved_ring", {
		id: "engraved_ring",
		geometry: { type: "circle" },
		defaultParams: {
			radius: 30,
			width: 1.5,
			stroke: "#9ea3ab",
			highlightOpacity: 0.4,
			shadowOpacity: 0.35,
		},
		render(params, position, context) {
			const radius = Number(params.radius);
			const width = Number(params.width);
			const stroke = params.stroke;
			const highlightOpacity = Number(params.highlightOpacity);
			const shadowOpacity = Number(params.shadowOpacity);

			return [
				`<circle cx="0" cy="0" r="${radius}" fill="none" stroke="${stroke}" stroke-width="${width}" opacity="0.95" />`,
				`<circle cx="0" cy="0" r="${Math.max(0, radius - width * 0.9)}" fill="none" stroke="#ffffff" stroke-width="${width * 0.42}" opacity="${Math.max(0, Math.min(1, highlightOpacity))}" />`,
				`<circle cx="0" cy="0" r="${Math.max(0, radius + width * 0.75)}" fill="none" stroke="#000000" stroke-width="${width * 0.55}" opacity="${Math.max(0, Math.min(1, shadowOpacity))}" />`,
			].join("");
		},
	});
}

export function runEngine({ activeStyle = "gold_dark", paramOverrides = {}, colorControl = DEFAULT_COLOR_CONTROL_CONFIG, templateInput = null } = {}) {
	registerBaseElements();
	registerCustomElements();

	const sourceTemplate = templateInput && typeof templateInput === "object" ? templateInput : template;
	const geometry = buildGeometry(sourceTemplate);
	const resolved = compose(geometry, activeStyle, styles, materials, paramOverrides);
	return renderSvg(resolved, {
		activeStyle,
		colorControlConfig: colorControl,
	});
}

export function getTemplateSnapshot() {
	return JSON.parse(JSON.stringify(template));
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
	const svg = runEngine();
	console.log(svg);
}
