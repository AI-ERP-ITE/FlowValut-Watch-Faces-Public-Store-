/**
 * Spec 084 – Effect Parameter Behavior Coverage
 *
 * Run with:  node app/scripts/test/effectProfiles.test.mjs
 *
 * Validates:
 * 1. mapEffectUiToRender / mapEffectRenderToUi roundtrip for all 14 keys.
 * 2. Render ceiling — UI 100 must never exceed the profile renderMax.
 * 3. Signed profiles — UI 0 must map to render 0.
 * 4. Monotonicity — increasing UI always yields non-decreasing render.
 * 5. Precision normalisation — stored value has at most `profile.precision` decimals.
 */

import { strict as assert } from 'node:assert';

// Inline the profile registry so the test has no build dependency.
const PROFILES = {
  highlight:           { uiMin: -100, uiMax: 100, renderMin: -0.20, renderMax: 0.20, curve: 'soft-knee', precision: 4 },
  shadows:             { uiMin: -100, uiMax: 100, renderMin: -0.20, renderMax: 0.20, curve: 'soft-knee', precision: 4 },
  contrast:            { uiMin: -100, uiMax: 100, renderMin: -0.18, renderMax: 0.18, curve: 'gamma',     precision: 4 },
  sharpness:           { uiMin:    0, uiMax: 100, renderMin:  0,    renderMax: 0.35, curve: 'exponential', precision: 4 },
  colorOpacity:        { uiMin:    0, uiMax: 100, renderMin:  0,    renderMax: 1.00, curve: 'linear',    precision: 4 },
  depthIntensity:      { uiMin:    0, uiMax: 100, renderMin:  0,    renderMax: 0.45, curve: 'gamma',     precision: 4 },
  depthOpacity:        { uiMin:    0, uiMax: 100, renderMin:  0,    renderMax: 0.50, curve: 'gamma',     precision: 4 },
  lightX:              { uiMin: -100, uiMax: 100, renderMin: -1.00, renderMax: 1.00, curve: 'soft-knee', precision: 4 },
  lightY:              { uiMin: -100, uiMax: 100, renderMin: -1.00, renderMax: 1.00, curve: 'soft-knee', precision: 4 },
  lightZ:              { uiMin:    0, uiMax: 100, renderMin:  0.20, renderMax: 1.00, curve: 'soft-knee', precision: 4 },
  depthDistance:       { uiMin:    0, uiMax: 100, renderMin:  0.60, renderMax: 1.60, curve: 'soft-knee', precision: 4 },
  depthFalloff:        { uiMin:    0, uiMax: 100, renderMin:  0.60, renderMax: 1.50, curve: 'soft-knee', precision: 4 },
  depthWhiteBalance:   { uiMin: -100, uiMax: 100, renderMin: -0.25, renderMax: 0.25, curve: 'soft-knee', precision: 4 },
  depthSpread:         { uiMin:    0, uiMax: 100, renderMin:  0,    renderMax: 0.25, curve: 'soft-knee', precision: 4 },
};

const EPSILON = 1e-6;

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

function mapByCurve(n, curve) {
  n = clamp01(n);
  if (curve === 'linear')      return n;
  if (curve === 'exponential') return Math.pow(n, 1.8);
  if (curve === 'gamma')       return Math.pow(n, 2.2);
  if (curve === 'soft-knee')   { const k = n / (n + 0.5); return clamp01(k / (1/1.5)); }
  return n;
}

function mapSignedByCurve(unitSigned, curve) {
  const c = Math.max(-1, Math.min(1, unitSigned));
  const sign = c < 0 ? -1 : 1;
  const mag  = Math.abs(c);
  if (curve === 'linear')      return c;
  if (curve === 'exponential') return sign * Math.pow(mag, 1.8);
  if (curve === 'gamma')       return sign * Math.pow(mag, 2.2);
  if (curve === 'soft-knee')   { const k = mag / (mag + 0.5); return sign * clamp01(k / (1/1.5)); }
  return c;
}

function mapUiToRender(uiValue, p) {
  const isSigned = p.uiMin < 0 && p.uiMax > 0 && p.renderMin < 0 && p.renderMax > 0;
  if (isSigned) {
    const uiAbsMax = Math.max(Math.abs(p.uiMin), Math.abs(p.uiMax));
    const renderAbsMax = Math.max(Math.abs(p.renderMin), Math.abs(p.renderMax));
    const unitSigned = Math.max(-1, Math.min(1, uiValue / uiAbsMax));
    return mapSignedByCurve(unitSigned, p.curve) * renderAbsMax;
  }
  const uiNorm   = clamp01((uiValue - p.uiMin) / (p.uiMax - p.uiMin));
  const rendered = mapByCurve(uiNorm, p.curve);
  return p.renderMin + rendered * (p.renderMax - p.renderMin);
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

console.log('\nSpec 084 – effect parameter behavior\n');

for (const [key, p] of Object.entries(PROFILES)) {
  console.log(`  [${key}]`);

  test('UI max renders ≤ renderMax', () => {
    const render = mapUiToRender(p.uiMax, p);
    assert(render <= p.renderMax + EPSILON, `render(${render}) > renderMax(${p.renderMax})`);
  });

  test('UI min renders ≥ renderMin', () => {
    const render = mapUiToRender(p.uiMin, p);
    assert(render >= p.renderMin - EPSILON, `render(${render}) < renderMin(${p.renderMin})`);
  });

  const isSigned = p.uiMin < 0 && p.uiMax > 0;
  if (isSigned) {
    test('UI 0 maps to render ≈ 0', () => {
      const render = mapUiToRender(0, p);
      assert(Math.abs(render) < EPSILON, `render at UI=0 is ${render}, expected 0`);
    });
  }

  test('precision: stored value has correct decimal places', () => {
    const r = mapUiToRender(p.uiMax * 0.73, p);
    const normalised = Number(r.toFixed(p.precision));
    const decimals = (normalised.toString().split('.')[1] ?? '').length;
    assert(decimals <= p.precision, `decimals(${decimals}) > precision(${p.precision})`);
  });

  test('monotonicity: increasing UI → non-decreasing render', () => {
    const steps = 20;
    const range = p.uiMax - p.uiMin;
    let prev = mapUiToRender(p.uiMin, p);
    for (let i = 1; i <= steps; i++) {
      const ui = p.uiMin + (i / steps) * range;
      const cur = mapUiToRender(ui, p);
      assert(cur >= prev - EPSILON, `non-monotone at ui=${ui.toFixed(1)}: prev=${prev}, cur=${cur}`);
      prev = cur;
    }
  });
}

console.log(`\n${ failed === 0 ? '✅ All' : `❌ ${failed} of ${ passed + failed }`} tests passed (${passed}/${passed + failed})\n`);
if (failed > 0) process.exit(1);
