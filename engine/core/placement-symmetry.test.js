import { describe, expect, it } from "vitest";

import { resolvePlacement } from "./placement.js";
import { applySymmetry } from "./symmetry.js";

describe("placement", () => {
	it("resolves center placement with offset", () => {
		const element = {
			type: "circle",
			placement: { mode: "center", config: { offset: [10, -5], rotation: 15 } },
			symmetry: { mode: "none", config: {} },
			params: { r: 3 },
		};

		const out = resolvePlacement(element);
		expect(out).toEqual({ x: 60, y: 45, rotation: 15 });
	});

	it("resolves polar placement for bottom at 270", () => {
		const element = {
			type: "circle",
			placement: { mode: "polar", config: { radius: 0.84, angle: 270, rotation: 0 } },
			symmetry: { mode: "none", config: {} },
			params: { r: 3 },
		};

		const out = resolvePlacement(element);
		expect(Math.round(out.x)).toBe(50);
		expect(Math.round(out.y)).toBe(8);
		expect(out.rotation).toBe(0);
	});

	it("rejects forbidden raw coordinate fields", () => {
		const element = {
			type: "circle",
			placement: { mode: "center", config: { offset: [0, 0] } },
			symmetry: { mode: "none", config: {} },
			params: { cx: 50, r: 3 },
		};

		expect(() => resolvePlacement(element)).toThrow(/forbidden raw x\/y\/cx\/cy/i);
	});
});

describe("symmetry", () => {
	it("creates mirrored pair on X axis", () => {
		const element = {
			type: "circle",
			symmetry: { mode: "mirrorX", config: {} },
		};

		const out = applySymmetry(element, { x: 88, y: 50, rotation: 0 });
		expect(out).toHaveLength(2);
		expect(out[0]).toEqual({ x: 88, y: 50, rotation: 0 });
		expect(out[1].x).toBe(12);
		expect(out[1].y).toBe(50);
		expect(Math.abs(out[1].rotation)).toBe(0);
	});

	it("creates radial repeated positions", () => {
		const element = {
			type: "circle",
			symmetry: { mode: "radialRepeat", config: { count: 4 } },
		};

		const out = applySymmetry(element, { x: 80, y: 50, rotation: 0 });
		expect(out).toHaveLength(4);
		expect(out[0]).toEqual({ x: 80, y: 50, rotation: 0 });
		expect(out[1].x).toBeCloseTo(50, 5);
		expect(out[1].y).toBeCloseTo(80, 5);
	});
});
