/**
 * Digit Rendering Variable Isolation Experiment — Spec 113
 *
 * Generates 5 test ZPK files, each changing exactly ONE property of the digit PNG.
 * Install on a real Amazfit Balance and compare — the variant with correct spacing
 * reveals which metric Zepp's engine uses for IMG_DATE glyph placement.
 *
 *   node scripts/buildDigitExperiment.mjs
 *
 * Output: exports/digit-experiment/variant_A..E.zpk
 */

import JSZip from 'jszip';
import { deflateSync } from 'zlib';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'exports', 'digit-experiment');

// ─── Minimal PNG encoder (pure Node, no external dep) ────────────────────────

function makePNG(width, height, rgbaBuffer) {
  const rowSize = width * 4;
  const filtered = Buffer.alloc((rowSize + 1) * height);
  for (let y = 0; y < height; y++) {
    filtered[y * (rowSize + 1)] = 0; // filter type: None
    rgbaBuffer.copy(filtered, y * (rowSize + 1) + 1, y * rowSize, (y + 1) * rowSize);
  }
  const compressed = deflateSync(filtered, { level: 6 });

  function wu32(v) { const b = Buffer.alloc(4); b.writeUInt32BE(v, 0); return b; }
  function crc32c(type, data) {
    const full = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    let c = 0xffffffff;
    for (const byte of full) { c ^= byte; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); }
    return wu32((c ^ 0xffffffff) >>> 0);
  }
  function chunk(type, data) {
    return Buffer.concat([wu32(data.length), Buffer.from(type, 'ascii'), data, crc32c(type, data)]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Digit glyph drawing ──────────────────────────────────────────────────────

// Proportional ink width fraction per digit (0=wide like "0", 1=narrow like "1")
const INK_FRAC = [0.78, 0.28, 0.78, 0.78, 0.82, 0.78, 0.78, 0.68, 0.78, 0.78];

/**
 * Draw a single digit as a filled white rectangle (proportional width) on transparent bg.
 * glyphSlotX/Y = where the glyph SLOT begins (top-left of the reserved ink area).
 * glyphSlotW/H = size of the slot (the glyph fills inkFrac of slotW).
 */
function makeDigitPNG(digit, canvasW, canvasH, glyphSlotX, glyphSlotY, glyphSlotW, glyphSlotH) {
  const rgba = Buffer.alloc(canvasW * canvasH * 4, 0); // transparent
  const frac = INK_FRAC[digit] ?? 0.78;
  const inkW = Math.max(2, Math.round(glyphSlotW * frac));
  // Center the glyph within the slot
  const startX = Math.max(0, Math.min(canvasW - 1, glyphSlotX + Math.floor((glyphSlotW - inkW) / 2)));
  const startY = Math.max(0, Math.min(canvasH - 1, glyphSlotY));
  const endX = Math.min(canvasW, startX + inkW);
  const endY = Math.min(canvasH, startY + glyphSlotH);
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const i = (y * canvasW + x) * 4;
      rgba[i] = 255; rgba[i + 1] = 255; rgba[i + 2] = 255; rgba[i + 3] = 255;
    }
  }
  return makePNG(canvasW, canvasH, rgba);
}

// ─── Variant definitions ──────────────────────────────────────────────────────

/**
 * VARIABLES UNDER TEST:
 *   canvasW    — total PNG canvas width  (Zepp may use this for cell advance)
 *   glyphSlotX — horizontal offset of the glyph slot inside the canvas (= left bearing)
 *   glyphSlotW — available width for the glyph inside the slot
 *
 * Everything else (canvasH, glyphSlotH, glyphSlotY) is held constant.
 */
const VARIANTS = {
  // Baseline: 25px canvas, glyph slot from x=4..20 (4px left pad, 5px right pad)
  A: {
    desc: '25x50 canvas, glyph slot centered (BASELINE — current approach)',
    canvasW: 25, canvasH: 50,
    glyphSlotX: 4,  glyphSlotY: 6, glyphSlotW: 16, glyphSlotH: 38,
  },
  // Same canvas, glyph flushed to left edge (0 left bearing)
  B: {
    desc: '25x50 canvas, glyph flush LEFT (zero left bearing)',
    canvasW: 25, canvasH: 50,
    glyphSlotX: 0,  glyphSlotY: 6, glyphSlotW: 16, glyphSlotH: 38,
  },
  // Same canvas, glyph pushed further right (more left bearing = 8px)
  C: {
    desc: '25x50 canvas, glyph pushed RIGHT (8px left bearing)',
    canvasW: 25, canvasH: 50,
    glyphSlotX: 8,  glyphSlotY: 6, glyphSlotW: 16, glyphSlotH: 38,
  },
  // SMALLER canvas (18px vs 25px) — glyph same proportional size
  D: {
    desc: '18x50 canvas SMALLER (tests: does canvas width drive spacing?)',
    canvasW: 18, canvasH: 50,
    glyphSlotX: 1,  glyphSlotY: 6, glyphSlotW: 14, glyphSlotH: 38,
  },
  // LARGER canvas (35px vs 25px) — glyph same proportional size
  E: {
    desc: '35x50 canvas LARGER (tests: does canvas width drive spacing?)',
    canvasW: 35, canvasH: 50,
    glyphSlotX: 4,  glyphSlotY: 6, glyphSlotW: 16, glyphSlotH: 38,
  },
};

// ─── ZPK assembly ─────────────────────────────────────────────────────────────

// Amazfit Balance device sources (480x480 round, v2)
const DEVICE_SOURCES = [8519936, 8519937, 8519939];

function makeAppJSON() {
  return JSON.stringify({
    configVersion: 'v2',
    app: { appId: 20260706, appVersion: '1.0.0', appName: 'DgtExp', type: 'watchface', icon: 'icon.png' },
    targets: {
      default: {
        module: { watchface: { path: 'watchface/index' } },
        platforms: DEVICE_SOURCES.map(ds => ({ name: 'watchface', deviceSource: ds })),
      },
    },
  }, null, 2);
}

function makeWatchfaceJS(variantKey, desc, prefix, canvasW, canvasH) {
  const arr = Array.from({ length: 10 }, (_, i) => `"assets/${prefix}_${i}.png"`).join(', ');
  const safeDesc = (desc + '').replace(/"/g, "'").substring(0, 60);
  return `// Digit Experiment ${variantKey}: ${safeDesc}\nvar Page = hmApp.createPage();\nPage.onInit = function() {\n  hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 0, y: 0, w: 480, h: 480, color: 0x111111 });\n  hmUI.createWidget(hmUI.widget.IMG_DATE, {\n    day_startX: px(160), day_startY: px(190),\n    day_sc_array: [${arr}],\n    day_tc_array: [${arr}],\n    day_en_array: [${arr}],\n    day_zero: 1, day_space: 0,\n    day_align: hmUI.align.CENTER_H,\n    day_is_character: false,\n    show_level: hmUI.show_level.ONLY_NORMAL,\n  });\n  hmUI.createWidget(hmUI.widget.TEXT, {\n    x: px(10), y: px(360), w: px(460), h: px(80),\n    text: "EXP ${variantKey}: canvas=${canvasW}px",\n    text_size: px(20), color: 0xFFFF44,\n    align_h: hmUI.align.CENTER_H, align_v: hmUI.align.TOP,\n    text_style: hmUI.text_style.WRAP,\n  });\n};\nPage.onDestroy = function() {};`;
}

async function buildZPK(variantKey, variant) {
  const { desc, canvasW, canvasH, glyphSlotX, glyphSlotY, glyphSlotW, glyphSlotH } = variant;
  const prefix = `dgt${variantKey.toLowerCase()}`;
  console.log(`\n[${variantKey}] ${desc}`);

  const deviceZip = new JSZip();
  deviceZip.file('app.json', makeAppJSON());
  deviceZip.file('watchface/index.js', makeWatchfaceJS(variantKey, desc, prefix, canvasW, canvasH));
  deviceZip.file('assets/icon.png', makePNG(1, 1, Buffer.from([0, 0, 0, 0])));

  for (let d = 0; d <= 9; d++) {
    const png = makeDigitPNG(d, canvasW, canvasH, glyphSlotX, glyphSlotY, glyphSlotW, glyphSlotH);
    deviceZip.file(`assets/${prefix}_${d}.png`, png);
    const inkW = Math.round(glyphSlotW * INK_FRAC[d]);
    const padL = glyphSlotX + Math.floor((glyphSlotW - inkW) / 2);
    const padR = canvasW - padL - inkW;
    console.log(`  digit ${d}: canvas=${canvasW}x${canvasH}  inkW=${inkW}  padL=${padL}  padR=${padR}`);
  }

  const deviceBuf = await deviceZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const outerZip = new JSZip();
  outerZip.file('device.zip', deviceBuf);
  const appSideZip = new JSZip();
  appSideZip.file('app.json', makeAppJSON());
  outerZip.file('app-side.zip', await appSideZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  const zpkBuf = await outerZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

  const outPath = path.join(OUT_DIR, `variant_${variantKey}.zpk`);
  fs.writeFileSync(outPath, zpkBuf);
  console.log(`  → ${outPath} (${zpkBuf.length} bytes)`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [key, variant] of Object.entries(VARIANTS)) {
    await buildZPK(key, variant);
  }
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       5 TEST ZPKs GENERATED — EXPERIMENT READY            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  for (const [k, v] of Object.entries(VARIANTS)) {
    console.log(`  variant_${k}.zpk  →  ${v.desc}`);
  }
  console.log('\n── HOW TO READ RESULTS ──────────────────────────────────────');
  console.log('Install each on Amazfit Balance. Observe the DATE digits only.\n');
  console.log('If D (18px) tighter + E (35px) wider than A (25px):');
  console.log('  → Zepp uses CANVAS WIDTH. Fix: shrink canvas to near-zero padding.');
  console.log('');
  console.log('If A, D, E all show same visible gap:');
  console.log('  → Zepp uses INK WIDTH (Spec 113 approach was right, fix alignment bug instead).');
  console.log('');
  console.log('If B (flush-left) tighter than A (centered):');
  console.log('  → Zepp uses LEFT BEARING. Fix: draw glyph flush-left in canvas.');
  console.log('');
  console.log('If C (8px bearing) wider than A (4px bearing):');
  console.log('  → Same confirmation: LEFT BEARING drives spacing.');
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
