/**
 * Spec 074 T1 — maskFrame helper unit test.
 * Run: node app/scripts/test/maskFrame.test.mjs
 */
import {
  getMaskFrame,
  mapLocalPointToFrame,
  mapCanvasPointToLocal,
  mapLocalPointToCanvas,
} from '../../engine/core/maskFrame.js';

let pass = 0;
let fail = 0;
function expect(name, cond, detail) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}
function approx(a, b, tol = 1e-6) { return Math.abs(a - b) < tol; }

// getMaskFrame
{
  const f = getMaskFrame({ width: 200, height: 100 });
  expect('frame width', f.width === 200);
  expect('frame height', f.height === 100);
  expect('frame originX = -W/2', f.originX === -100);
  expect('frame originY = -H/2', f.originY === -50);
}
{
  const f = getMaskFrame(null);
  expect('frame defaults to 1x1', f.width === 1 && f.height === 1);
}

// mapLocalPointToFrame — center
{
  const f = getMaskFrame({ width: 200, height: 100 });
  const p = mapLocalPointToFrame({ x: 50, y: 50 }, f);
  expect('local (50,50) → frame (0,0)', p && approx(p.px, 0) && approx(p.py, 0));
}
// top-left corner
{
  const f = getMaskFrame({ width: 200, height: 100 });
  const p = mapLocalPointToFrame({ x: 0, y: 0 }, f);
  expect('local (0,0) → frame (-W/2,-H/2)', p && approx(p.px, -100) && approx(p.py, -50));
}
// bottom-right
{
  const f = getMaskFrame({ width: 200, height: 100 });
  const p = mapLocalPointToFrame({ x: 100, y: 100 }, f);
  expect('local (100,100) → frame (+W/2,+H/2)', p && approx(p.px, 100) && approx(p.py, 50));
}
// NaN safe
{
  const f = getMaskFrame({ width: 200, height: 100 });
  expect('NaN x → null', mapLocalPointToFrame({ x: 'foo', y: 0 }, f) === null);
  expect('null point → null', mapLocalPointToFrame(null, f) === null);
}

// mapCanvasPointToLocal / mapLocalPointToCanvas — no rotation
{
  const t = { width: 100, height: 100, centerX: 50, centerY: 50, rotation: 0 };
  const local = mapCanvasPointToLocal({ x: 50, y: 50 }, t);
  expect('canvas center → local center', approx(local.x, 50) && approx(local.y, 50));
  const back = mapLocalPointToCanvas(local, t);
  expect('round trip center', approx(back.x, 50) && approx(back.y, 50));
}

// rotated 45°
{
  const t = { width: 100, height: 100, centerX: 50, centerY: 50, rotation: 45 };
  const local = mapCanvasPointToLocal({ x: 50, y: 50 }, t);
  expect('rotated 45° center → local center', approx(local.x, 50) && approx(local.y, 50));
  // canvas (100,50) — point to right of center in canvas, after -45° de-rotation should map to upper-right in local
  const localRight = mapCanvasPointToLocal({ x: 100, y: 50 }, t);
  // dx=50, dy=0, rad=-45°: lx = 50*cos(-45)=35.355, ly=50*sin(-45)=-35.355
  // local = (35.355/100*100)+50 = 85.355, (-35.355/100*100)+50 = 14.645
  expect('rotated 45° canvas (100,50) → local',
    approx(localRight.x, 85.35533905932738, 1e-6) &&
    approx(localRight.y, 14.644660940672622, 1e-6));
  // round trip
  const back = mapLocalPointToCanvas(localRight, t);
  expect('rotated 45° round trip', approx(back.x, 100, 1e-6) && approx(back.y, 50, 1e-6));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
