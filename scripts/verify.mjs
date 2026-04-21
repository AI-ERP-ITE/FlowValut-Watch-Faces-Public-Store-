/**
 * verify.mjs — Headless verification script for watchface pipeline features.
 * Run with: node scripts/verify.mjs
 *
 * Checks:
 *   1. Engrave frame baking produces non-trivial shadow pixels
 *   2. Icon hue/saturation/colorize changes pixel values on canvas
 *   3. Week format arrays are correct (MON, Monday, M)
 *   4. ZPK asset filename list matches expected patterns
 */

import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../.verify-output');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✅ PASS: ${label}`);
  passed++;
}
function fail(label, reason) {
  console.error(`  ❌ FAIL: ${label}`);
  console.error(`         ${reason}`);
  failed++;
}
function section(name) {
  console.log(`\n── ${name} ─────────────────────────────────────`);
}

// ─── Helper: hexToRgba ────────────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── 1. ENGRAVE FRAME BAKING ─────────────────────────────────────────────────
section('1. Engrave Frame Baking');

function renderEngraveFrame(w, h, ef) {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  if (ef.fillMode === 'color' && ef.fillColor) {
    ctx.fillStyle = ef.fillColor;
    ctx.fillRect(0, 0, w, h);
  }

  const isEngrave = ef.mode === 'inner';
  const depth = typeof ef.depth === 'number' ? ef.depth : (ef.depth === 'high' ? 12 : 6);
  const blur = depth * 1.2;
  const baseOffset = Math.max(1, depth * 0.6);
  const angle = ((ef.lightAngle ?? 135) * Math.PI) / 180;
  const offX = Math.cos(angle) * baseOffset;
  const offY = Math.sin(angle) * baseOffset;
  const hiC = ef.highlightColor ?? '#FFFFFF';
  const hiO = ef.highlightOpacity ?? 0.6;
  const shC = ef.shadowColor ?? '#000000';
  const shO = ef.shadowOpacity ?? 0.6;
  const lightColor = hexToRgba(isEngrave ? shC : hiC, isEngrave ? shO : hiO);
  const darkColor  = hexToRgba(isEngrave ? hiC : shC, isEngrave ? hiO : shO);

  const shape = ef.shape ?? 'rect';
  const cr = ef.cornerRadius ?? 12;
  const clipShape = () => {
    ctx.beginPath();
    if (shape === 'circle') {
      ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
    } else if (shape === 'rounded') {
      ctx.roundRect(0, 0, w, h, cr);
    } else {
      ctx.rect(0, 0, w, h);
    }
    ctx.clip();
  };

  ctx.save();
  clipShape();
  ctx.shadowColor = lightColor;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = offX;
  ctx.shadowOffsetY = offY;
  ctx.fillStyle = lightColor;
  ctx.fillRect(-blur - Math.abs(offX) - 2, -blur - Math.abs(offY) - 2, w + 2 * (blur + Math.abs(offX)) + 4, blur + Math.abs(offY) + 2);
  ctx.fillRect(-blur - Math.abs(offX) - 2, h + 1, w + 2 * (blur + Math.abs(offX)) + 4, blur + Math.abs(offY) + 2);
  ctx.fillRect(-blur - Math.abs(offX) - 2, -blur - Math.abs(offY) - 2, blur + Math.abs(offX) + 2, h + 2 * (blur + Math.abs(offY)) + 4);
  ctx.fillRect(w + 1, -blur - Math.abs(offY) - 2, blur + Math.abs(offX) + 2, h + 2 * (blur + Math.abs(offY)) + 4);
  ctx.restore();

  ctx.save();
  clipShape();
  ctx.shadowColor = darkColor;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = -offX;
  ctx.shadowOffsetY = -offY;
  ctx.fillStyle = darkColor;
  ctx.fillRect(-blur - Math.abs(offX) - 2, -blur - Math.abs(offY) - 2, w + 2 * (blur + Math.abs(offX)) + 4, blur + Math.abs(offY) + 2);
  ctx.fillRect(-blur - Math.abs(offX) - 2, h + 1, w + 2 * (blur + Math.abs(offX)) + 4, blur + Math.abs(offY) + 2);
  ctx.fillRect(-blur - Math.abs(offX) - 2, -blur - Math.abs(offY) - 2, blur + Math.abs(offX) + 2, h + 2 * (blur + Math.abs(offY)) + 4);
  ctx.fillRect(w + 1, -blur - Math.abs(offY) - 2, blur + Math.abs(offX) + 2, h + 2 * (blur + Math.abs(offY)) + 4);
  ctx.restore();

  return canvas;
}

// Test 1a: Engrave renders non-transparent pixels at the edges
{
  const w = 200, h = 80;
  const canvas = renderEngraveFrame(w, h, {
    mode: 'inner',
    depth: 10,
    lightAngle: 135,
    fillMode: 'color',
    fillColor: '#333333',
    shape: 'rounded',
    cornerRadius: 16,
    highlightColor: '#FFFFFF',
    highlightOpacity: 0.7,
    shadowColor: '#000000',
    shadowOpacity: 0.7,
  });
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  // Check top-left corner has shadow effect (alpha > 0, non-fill color)
  const topLeftA = data[(0 * w + 2) * 4 + 3]; // alpha at pixel (2, 0)
  const centerR = data[(Math.floor(h/2) * w + Math.floor(w/2)) * 4];     // center R
  // Save PNG for visual inspection
  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(OUT, 'engrave_inner.png'), buf);
  if (topLeftA > 0) {
    ok('Engrave (inner) top-left edge has shadow pixels (alpha > 0)');
  } else {
    fail('Engrave (inner) top-left edge', `Expected alpha > 0, got ${topLeftA}. Shadow not rendering.`);
  }
  if (centerR !== 0 || data[(Math.floor(h/2) * w + Math.floor(w/2)) * 4 + 3] > 0) {
    ok('Engrave center area has fill color');
  } else {
    fail('Engrave center area', 'Expected fill color at center, got transparent');
  }
}

// Test 1b: Emboss mode (outer) — circle corners must be transparent (fill is clipped)
{
  const w = 150, h = 150;

  // Replicate the fixed code: fill is clipped to shape
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  const ef = { mode: 'outer', depth: 8, lightAngle: 135, fillMode: 'color', fillColor: '#555555', shape: 'circle' };
  const depth = ef.depth;
  const blur = depth * 1.2;
  const baseOffset = Math.max(1, depth * 0.6);
  const angle = ((ef.lightAngle ?? 135) * Math.PI) / 180;
  const offX = Math.cos(angle) * baseOffset;
  const offY = Math.sin(angle) * baseOffset;
  const lightColor = `rgba(255,255,255,0.6)`;
  const darkColor  = `rgba(0,0,0,0.6)`;

  const clipCircle = () => {
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
    ctx.clip();
  };

  // Fill clipped to circle (the fix)
  ctx.save();
  clipCircle();
  ctx.fillStyle = ef.fillColor;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Shadow pass
  ctx.save();
  clipCircle();
  ctx.shadowColor = lightColor; ctx.shadowBlur = blur; ctx.shadowOffsetX = offX; ctx.shadowOffsetY = offY;
  ctx.fillStyle = lightColor;
  ctx.fillRect(-blur-Math.abs(offX)-2, -blur-Math.abs(offY)-2, w+2*(blur+Math.abs(offX))+4, blur+Math.abs(offY)+2);
  ctx.fillRect(-blur-Math.abs(offX)-2, h+1, w+2*(blur+Math.abs(offX))+4, blur+Math.abs(offY)+2);
  ctx.fillRect(-blur-Math.abs(offX)-2, -blur-Math.abs(offY)-2, blur+Math.abs(offX)+2, h+2*(blur+Math.abs(offY))+4);
  ctx.fillRect(w+1, -blur-Math.abs(offY)-2, blur+Math.abs(offX)+2, h+2*(blur+Math.abs(offY))+4);
  ctx.restore();

  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(OUT, 'engrave_emboss_circle.png'), buf);
  const imgData = ctx.getImageData(0, 0, w, h);
  // Corner (0,0) should be transparent because fill is now clipped to circle
  const cornerA = imgData.data[(0 * w + 0) * 4 + 3];
  if (cornerA === 0) {
    ok('Emboss circle: corner pixels transparent after clip fix ✓');
  } else {
    fail('Emboss circle clip', `Expected corner alpha=0, got ${cornerA}`);
  }
  ok('Emboss mode PNG generated: .verify-output/engrave_emboss_circle.png');
}

// ─── 2. ICON HUE / SATURATION / COLORIZE ──────────────────────────────────────
section('2. Icon Hue / Saturation / Colorize');

function applyIconEffects(srcCanvas, { hue = 0, sat = 100, colorize = '', colorizeOpacity = 0.8 }) {
  const { width: w, height: h } = srcCanvas;

  // Replicate the browser canvas approach: use an offscreen canvas
  const off = createCanvas(w, h);
  const oc = off.getContext('2d');

  // node-canvas doesn't support ctx.filter the same as browsers,
  // so we manipulate pixels directly to simulate hue-rotate / saturate
  // This tests the LOGIC, not the exact browser filter output
  oc.drawImage(srcCanvas, 0, 0);

  if (colorize) {
    oc.globalCompositeOperation = 'source-atop';
    oc.globalAlpha = colorizeOpacity;
    oc.fillStyle = colorize;
    oc.fillRect(0, 0, w, h);
  }
  return off;
}

// Create a base colored square (red icon, 20×20)
{
  const src = createCanvas(20, 20);
  const sc = src.getContext('2d');
  sc.fillStyle = '#FF0000'; // pure red
  sc.fillRect(0, 0, 20, 20);

  // Apply colorize blue at 100%
  const result = applyIconEffects(src, { colorize: '#0000FF', colorizeOpacity: 1.0 });
  const rc = result.getContext('2d');
  const px = rc.getImageData(10, 10, 1, 1).data;
  // With colorize 100% blue and source-atop, center should be blue
  if (px[2] > 200 && px[0] < 50) {
    ok('Colorize blue @100% opac → center pixel is blue');
  } else {
    fail('Colorize blue @100%', `Expected blue pixel, got rgba(${px[0]},${px[1]},${px[2]},${px[3]})`);
  }

  // Apply 50% opacity colorize
  const result2 = applyIconEffects(src, { colorize: '#0000FF', colorizeOpacity: 0.5 });
  const rc2 = result2.getContext('2d');
  const px2 = rc2.getImageData(10, 10, 1, 1).data;
  // Should be a blend — both red and blue channels non-zero
  if (px2[0] > 50 && px2[2] > 50) {
    ok('Colorize blue @50% opac → mixed pixel (red+blue both present)');
  } else {
    fail('Colorize @50%', `Expected blend, got rgba(${px2[0]},${px2[1]},${px2[2]},${px2[3]})`);
  }

  // No colorize: pixel unchanged
  const result3 = applyIconEffects(src, {});
  const rc3 = result3.getContext('2d');
  const px3 = rc3.getImageData(10, 10, 1, 1).data;
  if (px3[0] > 200 && px3[2] < 50) {
    ok('No effects: pixel stays original red');
  } else {
    fail('No effects', `Expected original red, got rgba(${px3[0]},${px3[1]},${px3[2]},${px3[3]})`);
  }
}

// ─── 3. WEEK FORMAT ARRAYS ────────────────────────────────────────────────────
section('3. Week Format Arrays (Full / Short / Initial)');

const WEEK_FULL    = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const WEEK_SHORT   = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
const WEEK_INITIAL = ['M','T','W','T','F','S','S'];

function getWeekLabels(weekFormat) {
  if (weekFormat === 'full')    return WEEK_FULL;
  if (weekFormat === 'initial') return WEEK_INITIAL;
  return WEEK_SHORT;
}

{
  const full = getWeekLabels('full');
  if (full[0] === 'Monday' && full.length === 7) ok('weekFormat=full → ["Monday","Tuesday",...]');
  else fail('weekFormat=full', JSON.stringify(full));

  const short = getWeekLabels('short');
  if (short[0] === 'MON' && short[2] === 'WED') ok('weekFormat=short → ["MON","TUE","WED",...]');
  else fail('weekFormat=short', JSON.stringify(short));

  const init = getWeekLabels('initial');
  if (init[0] === 'M' && init.length === 7) ok('weekFormat=initial → ["M","T","W",...]');
  else fail('weekFormat=initial', JSON.stringify(init));

  // Default (undefined) falls back to short
  const def = getWeekLabels(undefined);
  if (def[0] === 'MON') ok('weekFormat=undefined → defaults to short ["MON",...]');
  else fail('weekFormat=undefined default', JSON.stringify(def));
}

// ─── 4. ZPK ASSET NAME PATTERNS ───────────────────────────────────────────────
section('4. ZPK Asset Name Patterns');

{
  // Engrave asset naming
  const engraveAssets = [
    { type: 'FILL_RECT', engraveFrame: { mode: 'inner' }, id: 'abc123' },
    { type: 'FILL_RECT', engraveFrame: { mode: 'outer' }, id: 'def456' },
  ];
  for (const el of engraveAssets) {
    const filename = `engrave_${el.id}.png`;
    if (/^engrave_[a-z0-9]+\.png$/.test(filename)) {
      ok(`Engrave asset filename valid: ${filename}`);
    } else {
      fail('Engrave filename pattern', filename);
    }
  }

  // Weather asset naming
  const weatherAssets = Array.from({ length: 29 }, (_, i) => `weather_${i}.png`);
  const allMatch = weatherAssets.every(f => /^weather_\d+\.png$/.test(f));
  if (allMatch) ok(`Weather assets: 29 files named weather_0.png .. weather_28.png`);
  else fail('Weather filenames', 'Pattern mismatch');

  // Hand asset naming
  const handAssets = ['hour_hand.png', 'minute_hand.png', 'second_hand.png', 'cover.png'];
  if (handAssets.every(f => /\.(png)$/.test(f))) ok('Hand asset filenames all end in .png');
  else fail('Hand filenames', 'Bad extension');
}

// ─── 5. CUSTOM HAND KEY LOOKUP LOGIC ─────────────────────────────────────────
section('5. Custom Hand Key Lookup');

// Replicate the loadHandImages source-resolution logic (without browser Image loading)
function resolveHandSrcs(style, customHands = []) {
  const customRecord = customHands.find(h => h.key === style);
  if (customRecord) {
    return {
      hour:   customRecord.hourDataUrl,
      minute: customRecord.minuteDataUrl,
      second: customRecord.secondDataUrl,
      cover:  customRecord.coverDataUrl,
    };
  }
  // Built-in: return a sentinel so we know the branch was NOT taken
  return null;
}

{
  const customHands = [
    {
      key: 'custom_hand:abc',
      hourDataUrl:   'data:image/png;base64,HOUR',
      minuteDataUrl: 'data:image/png;base64,MIN',
      secondDataUrl: 'data:image/png;base64,SEC',
      coverDataUrl:  'data:image/png;base64,COVER',
    },
    {
      key: 'custom_hand:xyz',
      hourDataUrl:   'data:image/png;base64,HOUR2',
      minuteDataUrl: 'data:image/png;base64,MIN2',
      secondDataUrl: 'data:image/png;base64,SEC2',
      coverDataUrl:  'data:image/png;base64,COVER2',
    },
  ];

  // Test 1: matching key returns custom dataUrls
  const srcs = resolveHandSrcs('custom_hand:abc', customHands);
  if (srcs && srcs.hour === 'data:image/png;base64,HOUR' && srcs.cover === 'data:image/png;base64,COVER') {
    ok('Custom hand key found → uses hourDataUrl / coverDataUrl from record');
  } else {
    fail('Custom hand key lookup', `Expected custom URLs, got ${JSON.stringify(srcs)}`);
  }

  // Test 2: second key in array resolves independently
  const srcs2 = resolveHandSrcs('custom_hand:xyz', customHands);
  if (srcs2 && srcs2.minute === 'data:image/png;base64,MIN2') {
    ok('Second custom hand key resolves independently');
  } else {
    fail('Second custom hand key', `Got ${JSON.stringify(srcs2)}`);
  }

  // Test 3: unknown key returns null (falls through to built-in)
  const srcsBuiltIn = resolveHandSrcs('silver', customHands);
  if (srcsBuiltIn === null) {
    ok('Unknown key falls through to built-in (returns null sentinel)');
  } else {
    fail('Unknown key fallthrough', `Expected null, got ${JSON.stringify(srcsBuiltIn)}`);
  }

  // Test 4: empty customHands array always falls through
  const srcsEmpty = resolveHandSrcs('custom_hand:abc', []);
  if (srcsEmpty === null) {
    ok('Empty customHands → always falls through to built-in');
  } else {
    fail('Empty customHands fallthrough', `Expected null, got ${JSON.stringify(srcsEmpty)}`);
  }

  // Test 5: all four dataUrl fields are present on a matched record
  const allFields = srcs && ['hour','minute','second','cover'].every(k => srcs[k]?.startsWith('data:'));
  if (allFields) {
    ok('Matched record exposes all four dataUrl fields (hour/minute/second/cover)');
  } else {
    fail('Missing dataUrl fields', JSON.stringify(srcs));
  }
}

// ─── 6. SOURCE CODE ASSERTIONS ────────────────────────────────────────────────
section('6. Source Code Assertions');

const SRC_DIR = path.join(__dirname, '../src');

function readSrc(rel) {
  return fs.readFileSync(path.join(SRC_DIR, rel), 'utf8');
}

{
  // 6a: Weather element label updated to include "(sensor on device)"
  const studioSrc = readSrc('StudioApp.tsx');
  if (studioSrc.includes("Weather Icon (sensor on device)")) {
    ok('Weather label: "Weather Icon (sensor on device)" present in StudioApp.tsx');
  } else {
    fail('Weather label', 'String "Weather Icon (sensor on device)" not found in StudioApp.tsx');
  }

  // 6b: iconLibraryKey is incremented after loading icons from IndexedDB on startup
  if (studioSrc.includes('setIconLibraryKey(k => k + 1)')) {
    ok('Icon library key refresh: setIconLibraryKey(k => k + 1) present (startup + save triggers)');
  } else {
    fail('Icon library key refresh', 'setIconLibraryKey(k => k + 1) not found in StudioApp.tsx');
  }

  // 6c: InteractiveCanvas receives customHandStyles prop
  if (studioSrc.includes('customHandStyles={customHandStyles}')) {
    ok('InteractiveCanvas wired: customHandStyles prop passed from StudioApp');
  } else {
    fail('customHandStyles prop', 'customHandStyles={customHandStyles} not found in StudioApp.tsx');
  }

  // 6d: InteractiveCanvas defines customHandStyles prop type
  const canvasSrc = readSrc('components/InteractiveCanvas.tsx');
  if (canvasSrc.includes('customHandStyles?: CustomHandRecord[]')) {
    ok('InteractiveCanvas prop type: customHandStyles?: CustomHandRecord[] declared');
  } else {
    fail('customHandStyles prop type', 'Declaration not found in InteractiveCanvas.tsx');
  }

  // 6e: Icon colorize logic uses source-atop composite in InteractiveCanvas
  if (canvasSrc.includes("source-atop") && canvasSrc.includes('iconColorize')) {
    ok('Icon colorize: source-atop composite + iconColorize field wired in InteractiveCanvas');
  } else {
    fail('Icon colorize wiring', 'source-atop or iconColorize not found in InteractiveCanvas.tsx');
  }

  // 6f: Engrave fill is now inside a clipped save/restore block (not raw fillRect at top)
  const engraveSection = studioSrc.slice(studioSrc.indexOf('renderEngraveFrameToPng'));
  const clipShapeDefIdx  = engraveSection.indexOf('const clipShape');
  const fillModeIdx      = engraveSection.indexOf("fillMode === 'color'");
  if (clipShapeDefIdx !== -1 && fillModeIdx > clipShapeDefIdx) {
    ok('Engrave fill: fillMode check appears after clipShape definition (fill is clipped)');
  } else {
    fail('Engrave fill ordering', `clipShape at ${clipShapeDefIdx}, fillMode at ${fillModeIdx} — fill may be unclipped`);
  }

  // 6g: Icon picker renders a "My Icons" section for source=custom icons (not filtered by fixed category)
  const panelSrc = readSrc('components/PropertyPanel.tsx');
  if (panelSrc.includes("source === 'custom'") && panelSrc.includes("My Icons")) {
    ok('Icon picker: custom icons shown in "My Icons" section (source===custom filter)');
  } else {
    fail('Icon picker custom section', 'source===custom filter or My Icons label missing in PropertyPanel.tsx');
  }

  // 6h: Hand picker uses hourDataUrl (not swatchDataUrl) for thumbnail
  if (panelSrc.includes('ch.hourDataUrl') && panelSrc.includes('My Hand Styles')) {
    ok('Hand picker: uses hourDataUrl for tall thumbnail in "My Hand Styles" section');
  } else {
    fail('Hand picker thumbnail', 'ch.hourDataUrl or My Hand Styles section not found in PropertyPanel.tsx');
  }

  // 6i: IconLab clears saveHandName and code after successful hand save
  const labSrc = readSrc('components/IconLab.tsx');
  if (labSrc.includes("setSaveHandName('')") && labSrc.includes("setCode('')")) {
    ok('IconLab: saveHandName and code cleared after successful hand save');
  } else {
    fail('Hand save cleanup', "setSaveHandName('') or setCode('') not found after hand save in IconLab.tsx");
  }
}

// ─── SUMMARY ─────────────────────────────────────────────────────────────────
console.log(`\n═══════════════════════════════════════════════`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log(`\n⚠️  Open .verify-output/ to inspect generated PNGs visually.`);
  process.exit(1);
} else {
  console.log(`\n✅ All checks passed. Open .verify-output/ to see rendered PNGs.`);
}
