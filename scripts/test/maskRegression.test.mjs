/**
 * Spec 074 T8 — mask pipeline regression tests.
 * Run: node app/scripts/test/maskRegression.test.mjs
 *
 * Exercises buildElementMaskPrimitives + buildElementMaskDef directly via the
 * test-only export `__maskInternalsForTest`. Avoids the full renderSvg path so
 * tests stay focused on the surgical fix surface.
 */
import { __maskInternalsForTest } from '../../engine/core/renderer.js';

const { buildElementMaskPrimitives, buildElementMaskDef } = __maskInternalsForTest;

let pass = 0;
let fail = 0;
function expect(name, cond, detail) {
	if (cond) { pass++; console.log('  ok  ' + name); }
	else { fail++; console.log('  FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}

const layout = { width: 200, height: 100 };

// T8.1 — empty mask → no <mask> def emitted.
{
	const def = buildElementMaskDef('m1', { enabled: false }, layout);
	expect('T8.1 disabled mask → no defs', def.defs === '' && def.active === false);
}

// T8.2 — enabled + 0 strokes + invert false → no def.
{
	const def = buildElementMaskDef('m2', { enabled: true, invert: false, strokes: [], coordinateSpace: 'local' }, layout);
	expect('T8.2 empty enabled non-invert → no defs', def.defs === '' && def.active === false);
}

// T8.3 — tiny hide stroke (polyline, 2 points) → exactly 1 polyline.
{
	const mask = {
		enabled: true,
		coordinateSpace: 'local',
		strokes: [{ tool: 'brush', action: 'hide', size: 16, opacity: 1, points: [{ x: 40, y: 50 }, { x: 60, y: 50 }] }],
	};
	const def = buildElementMaskDef('m3', mask, layout);
	const polylineCount = (def.defs.match(/<polyline\b/g) || []).length;
	expect('T8.3 single brush stroke → 1 polyline', def.active === true && polylineCount === 1, def.defs);
}

// T8.4 — malformed point → 0 primitives, no throw.
{
	const mask = {
		enabled: true,
		coordinateSpace: 'local',
		strokes: [{ tool: 'brush', action: 'hide', size: 16, opacity: 1, points: [{ x: 'x', y: null }, { x: NaN, y: undefined }] }],
	};
	let threw = false;
	let prims = '';
	try { prims = buildElementMaskPrimitives(mask, layout); } catch (e) { threw = true; }
	expect('T8.4 malformed points → no throw, no primitives', !threw && prims.trim() === '');
}

// T8.5 — mask region attrs origin-centered for local.
{
	const mask = {
		enabled: true,
		coordinateSpace: 'local',
		invert: true, // ensures def emits even with 0 strokes
		strokes: [],
	};
	const def = buildElementMaskDef('m5', mask, layout);
	const expectedX = String(-layout.width / 2);
	const expectedY = String(-layout.height / 2);
	const ok = def.active === true
		&& def.defs.includes(` x="${expectedX}"`)
		&& def.defs.includes(` y="${expectedY}"`)
		&& def.defs.includes(` width="${layout.width}"`)
		&& def.defs.includes(` height="${layout.height}"`);
	expect('T8.5 local mask region origin-centered (-W/2,-H/2,W,H)', ok, def.defs);
}

// T8.5b — legacy global → top-left region (back-compat until migration).
{
	const mask = { enabled: true, coordinateSpace: 'global', invert: true, strokes: [] };
	const def = buildElementMaskDef('m5b', mask, layout);
	const ok = def.defs.includes(' x="0"') && def.defs.includes(' y="0"');
	expect('T8.5b global mask region remains top-left', ok, def.defs);
}

// T8.6 — invert true + 0 strokes → active def with all-black region.
{
	const mask = { enabled: true, coordinateSpace: 'local', invert: true, strokes: [] };
	const def = buildElementMaskDef('m6', mask, layout);
	expect('T8.6 invert empty → active def with black base', def.active === true && def.defs.includes('fill="black"'));
}

// T8.7 — snapshot: deterministic output across runs.
{
	const mask = {
		enabled: true,
		coordinateSpace: 'local',
		strokes: [
			{ tool: 'brush', action: 'hide', size: 16, opacity: 1, points: [{ x: 40, y: 50 }, { x: 60, y: 50 }] },
			{ tool: 'selection', shape: 'rect', action: 'reveal', opacity: 1, x: 10, y: 10, width: 20, height: 20 },
		],
	};
	const a = buildElementMaskDef('snap', mask, layout).defs;
	const b = buildElementMaskDef('snap', mask, layout).defs;
	expect('T8.7 snapshot — output stable across calls', a === b);
	const expected = '<mask id="snap" maskUnits="userSpaceOnUse" x="-100" y="-50" width="200" height="100"><rect x="-100" y="-50" width="200" height="100" fill="white" /><polyline points="-20,0 20,0" fill="none" stroke="black" stroke-opacity="1" stroke-width="3.0769230769230766" stroke-linecap="round" stroke-linejoin="round" /><rect x="-80" y="-40" width="40" height="20" fill="white" fill-opacity="1" /></mask>';
	expect('T8.7 snapshot matches expected', a === expected, a);
}

// Bonus — selection rect with zero area is dropped.
{
	const mask = {
		enabled: true,
		coordinateSpace: 'local',
		strokes: [{ tool: 'selection', shape: 'rect', action: 'hide', opacity: 1, x: 10, y: 10, width: 0, height: 20 }],
	};
	const prims = buildElementMaskPrimitives(mask, layout);
	expect('zero-area selection dropped', prims.trim() === '');
}

// Bonus — non-array strokes safe.
{
	const def = buildElementMaskDef('mx', { enabled: true, coordinateSpace: 'local', invert: true, strokes: 'oops' }, layout);
	expect('non-array strokes safe', def.active === true);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
