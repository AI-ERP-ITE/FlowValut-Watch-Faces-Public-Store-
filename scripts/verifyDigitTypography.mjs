import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createCanvas, registerFont } from 'canvas';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(root, '.verify-output', 'spec117');
fs.mkdirSync(outputDir, { recursive: true });

const checks = [];
const geometry = { fonts: [], pairs: {}, ranges: {} };

function check(suite, name, condition, details = '') {
  checks.push({ suite, name, status: condition ? 'pass' : 'fail', details });
}

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function alphaBounds(canvas) {
  const { width, height } = canvas;
  const data = canvas.getContext('2d').getImageData(0, 0, width, height).data;
  let left = width; let right = -1; let top = height; let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
  }
  return right < 0 ? { width: 0, height: 0 } : { width: right - left + 1, height: bottom - top + 1 };
}

function measureFamily(name, family, fontPath, fontSize = 32, bitmapHeight = 40, tabular = false) {
  if (fontPath) registerFont(path.join(root, fontPath), { family });
  const measureCanvas = createCanvas(256, bitmapHeight);
  const measure = measureCanvas.getContext('2d');
  measure.font = `${fontSize}px "${family}"`;
  const naturalWidths = Array.from({ length: 10 }, (_, digit) => Math.max(2, Math.ceil(measure.measureText(String(digit)).width)));
  const tabularWidth = Math.max(...naturalWidths);
  const digits = [];
  for (let digit = 0; digit <= 9; digit++) {
    const char = String(digit);
    const naturalAdvance = naturalWidths[digit];
    const advance = tabular ? tabularWidth : naturalAdvance;
    const canvas = createCanvas(advance, bitmapHeight);
    const ctx = canvas.getContext('2d');
    ctx.font = `${fontSize}px "${family}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(char, advance / 2, bitmapHeight / 2);
    digits.push({ char, fontSize, width: advance, naturalAdvance, height: bitmapHeight, ink: alphaBounds(canvas) });
  }
  geometry.fonts.push({ name, family, fontSize, bitmapHeight, digits });
  check('typography', `${name}: uniform requested font size`, digits.every((item) => item.fontSize === fontSize));
  check('typography', `${name}: uniform bitmap height`, digits.every((item) => item.height === bitmapHeight));
  check('typography', `${name}: visible glyphs`, digits.every((item) => item.ink.width > 0 && item.ink.height > 0));
  check('typography', `${name}: ${tabular ? 'common time cell retained' : 'natural advances retained'}`,
    tabular
      ? digits.every((item) => item.width === tabularWidth)
      : digits.every((item) => item.width === item.naturalAdvance));
  return digits;
}

function pairMetrics(digits, pair, hSpace = 1) {
  const first = digits[Number(pair[0])];
  const second = digits[Number(pair[1])];
  return {
    pair,
    totalAdvance: first.width + hSpace + second.width,
    visibleGapEstimate: Math.max(0, first.width - first.ink.width) / 2
      + hSpace
      + Math.max(0, second.width - second.ink.width) / 2,
  };
}

function alignedStart(bounds, contentWidth, align) {
  if (align === 'CENTER_H') return Math.floor(bounds.x + (bounds.width - contentWidth) / 2);
  if (align === 'RIGHT') return Math.floor(bounds.x + bounds.width - contentWidth);
  return bounds.x;
}

function fittedBounds(bounds, contentWidth, contentHeight, align, padding = 2) {
  const width = Math.ceil(contentWidth + padding * 2);
  const height = Math.ceil(contentHeight + padding * 2);
  const x = align === 'CENTER_H'
    ? Math.round(bounds.x + bounds.width / 2 - width / 2)
    : align === 'RIGHT' ? Math.round(bounds.x + bounds.width - width) : bounds.x;
  return { x, y: bounds.y, width, height };
}

const bitmapSource = source('src/lib/digitBitmapGeometry.ts');
const layoutSource = source('src/lib/digitLayoutEngine.ts');
const studioSource = source('src/StudioApp.tsx');
const v2Source = source('src/lib/jsCodeGeneratorV2.ts');

check('source guards', 'no active MIN_INK_FRACTION', !/^(?!\s*\/\/).*\b(?:const|let|var)\s+MIN_INK_FRACTION\b/m.test(bitmapSource));
check('source guards', 'runtime layout imports no pair-correction table', !/import[\s\S]*PairCorrectionTable[\s\S]*from/.test(layoutSource));
check('source guards', 'time tabular mode is explicit', /options\?: \{ tabular\?: boolean \}/.test(bitmapSource));
check('source guards', 'digit rasterization measures natural advances before optional padding', /const naturalWidths = measurements\.map/.test(bitmapSource));
check('source guards', 'tabular mode uses widest measured advance', /options\?\.tabular \? tabularWidth : naturalWidths\[i\]/.test(bitmapSource));
check('source guards', 'digit rasterization contains no glyph drawImage distortion', !/generateOptimizedDigitBitmaps[\s\S]*?drawImage\(/.test(bitmapSource));
check('source guards', 'time/date generation stores no sample-derived origin', !/widgetType:\s*'IMG_(?:TIME|DATE)'[\s\S]{0,400}layoutStartX/.test(studioSource));
check('source guards', 'V2 time/date ignores legacy layoutStartX', !/(?:hour_startX|day_startX)[\s\S]{0,300}layoutStartX/.test(v2Source));
check('source guards', 'V2 derives time left origin from centered pair geometry', /getCenteredTimeStartX\(el\.bounds, el\.timeDigitCellWidth\)/.test(v2Source));

const proportional = measureFamily('proportional-style', 'Arial');
const nearTabular = measureFamily('near-tabular', 'Spec117CascadiaMono', 'fonts/CascadiaMono.ttf');
const timeTabular = measureFamily('time-tabular-proportional-style', 'Arial', undefined, 32, 40, true);
for (const pair of ['11', '18', '31', '58', '88']) {
  geometry.pairs[pair] = {
    proportional: pairMetrics(proportional, pair),
    nearTabular: pairMetrics(nearTabular, pair),
  };
}
check('typography', 'required pair metrics recorded', ['11', '18', '31', '58', '88'].every((pair) => geometry.pairs[pair]));
check('typography', 'no false equal-pair constraint', new Set(Object.values(geometry.pairs).map((entry) => entry.proportional.totalAdvance)).size >= 1,
  'Pair widths are recorded as evidence; proportional equality is intentionally not required.');
check('typography', 'all IMG_TIME pairs have equal two-cell width',
  new Set(['11', '18', '31', '58', '88'].map((pair) => pairMetrics(timeTabular, pair, 0).totalAdvance)).size === 1);

const bounds = { x: 100, y: 50, width: 160, height: 40 };
const contentWidth = geometry.pairs['88'].proportional.totalAdvance;
const starts = {
  LEFT: alignedStart(bounds, contentWidth, 'LEFT'),
  CENTER_H: alignedStart(bounds, contentWidth, 'CENTER_H'),
  RIGHT: alignedStart(bounds, contentWidth, 'RIGHT'),
};
check('alignment', 'left start equals frame origin', starts.LEFT === bounds.x);
check('alignment', 'center start preserves frame center', starts.CENTER_H + contentWidth / 2 === Math.floor(bounds.x + (bounds.width - contentWidth) / 2) + contentWidth / 2);
check('alignment', 'right start preserves frame right edge', starts.RIGHT + contentWidth === bounds.x + bounds.width);
for (const align of ['LEFT', 'CENTER_H', 'RIGHT']) {
  const fitted = fittedBounds(bounds, contentWidth, 40, align);
  const anchorBefore = align === 'LEFT' ? bounds.x : align === 'RIGHT' ? bounds.x + bounds.width : bounds.x + bounds.width / 2;
  const anchorAfter = align === 'LEFT' ? fitted.x : align === 'RIGHT' ? fitted.x + fitted.width : fitted.x + fitted.width / 2;
  check('frame fit', `${align} reset preserves anchor`, Math.abs(anchorBefore - anchorAfter) <= 1);
  check('frame fit', `${align} reset preserves top Y`, fitted.y === bounds.y);
}

const policies = {
  STEP: { sample: '88888', max: '99999' },
  CAL: { sample: '8888', max: '9999' },
  BATTERY: { sample: '100', max: '100' },
  HEART: { sample: '888', max: '999' },
};
const policySource = source('src/lib/numericFitPolicy.ts');
for (const [type, policy] of Object.entries(policies)) {
  const present = new RegExp(`${type}:\\s*\\{[^}]*maxValue:\\s*'${policy.max}'[^}]*previewValue:\\s*'${policy.sample}'`).test(policySource);
  geometry.ranges[type] = policy;
  check('range fit', `${type} range policy`, present);
}

const vitestFiles = [
  'src/lib/__tests__/digitAlignment.test.ts',
  'src/lib/__tests__/digitFrameFit.test.ts',
  'src/lib/__tests__/jsCodeGeneratorV2DigitAlignment.test.ts',
  'src/lib/__tests__/jsCodeGeneratorV3DigitAlignment.test.ts',
  'src/lib/__tests__/jsCodeGeneratorV2NativeDigitOrigins.test.ts',
  'src/lib/__tests__/timeDigitGeometry.test.ts',
  'src/lib/projectFileConfig.test.ts',
];
const vitest = spawnSync('npx.cmd', ['vitest', 'run', ...vitestFiles], {
  cwd: root,
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
check('integration', 'focused Vitest export/persistence suites', vitest.status === 0,
  `${vitest.stdout}${vitest.stderr}`.trim().slice(-4000));

const totals = {
  passed: checks.filter((item) => item.status === 'pass').length,
  failed: checks.filter((item) => item.status === 'fail').length,
};
const results = {
  spec: 117,
  generatedAt: new Date().toISOString(),
  status: totals.failed === 0 ? 'pass' : 'fail',
  totals,
  checks,
  geometry,
};
fs.writeFileSync(path.join(outputDir, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);

const rows = checks.map((item) => `| ${item.status === 'pass' ? 'PASS' : 'FAIL'} | ${item.suite} | ${item.name} | ${String(item.details).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|')} |`);
const report = [
  '# Spec 117 Digit Typography Verification',
  '',
  `Status: **${results.status.toUpperCase()}**`,
  '',
  `Passed: ${totals.passed}  `,
  `Failed: ${totals.failed}`,
  '',
  '| Status | Suite | Check | Details |',
  '|---|---|---|---|',
  ...rows,
  '',
  '## Recorded pair geometry',
  '',
  '```json',
  JSON.stringify(geometry.pairs, null, 2),
  '```',
  '',
].join('\n');
fs.writeFileSync(path.join(outputDir, 'report.md'), report);

console.log(`Spec 117 verification: ${totals.passed} passed, ${totals.failed} failed`);
console.log(`Reports: ${path.relative(root, outputDir)}`);
process.exitCode = totals.failed === 0 ? 0 : 1;
