import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { PNG } = require('../../../../node_modules/pngjs');

const WIDTH = 480;
const HEIGHT = 480;
const ALPHAS = [0, 32, 64, 96, 128, 160, 192, 224, 255];
const COLORS = [
  { id: 'white', rgb: [255, 255, 255] },
  { id: 'black', rgb: [0, 0, 0] },
  { id: 'red', rgb: [255, 0, 0] },
  { id: 'green', rgb: [0, 255, 0] },
  { id: 'blue', rgb: [0, 0, 255] },
  { id: 'orange', rgb: [230, 154, 90] },
];

const fixtureDirectory = path.dirname(fileURLToPath(import.meta.url));
const pngPath = path.join(fixtureDirectory, 'alpha-fixture.png');
const manifestPath = path.join(fixtureDirectory, 'alpha-fixture.manifest.json');
const png = new PNG({ width: WIDTH, height: HEIGHT, colorType: 6 });
png.data.fill(0);

function setPixel(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const offset = (y * WIDTH + x) * 4;
  png.data[offset] = r;
  png.data[offset + 1] = g;
  png.data[offset + 2] = b;
  png.data[offset + 3] = a;
}

function fillRect(x, y, width, height, rgb, alpha) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      setPixel(px, py, rgb[0], rgb[1], rgb[2], alpha);
    }
  }
}

function coverageCircle(cx, cy, radius, rgb, maxAlpha = 255) {
  const samples = 8;
  const minX = Math.floor(cx - radius - 1);
  const maxX = Math.ceil(cx + radius + 1);
  const minY = Math.floor(cy - radius - 1);
  const maxY = Math.ceil(cy + radius + 1);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      let inside = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const dx = x + (sx + 0.5) / samples - cx;
          const dy = y + (sy + 0.5) / samples - cy;
          if (dx * dx + dy * dy <= radius * radius) inside += 1;
        }
      }
      const alpha = Math.round((inside / (samples * samples)) * maxAlpha);
      if (alpha > 0) setPixel(x, y, rgb[0], rgb[1], rgb[2], alpha);
    }
  }
}

function coverageDiagonal(x0, y0, length, thickness, rgb) {
  const samples = 8;
  for (let y = y0 - 2; y < y0 + length + 2; y += 1) {
    for (let x = x0 - 2; x < x0 + length + 2; x += 1) {
      let covered = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const px = x + (sx + 0.5) / samples;
          const py = y + (sy + 0.5) / samples;
          const along = ((px - x0) + (py - y0)) / 2;
          const distance = Math.abs((py - y0) - (px - x0)) / Math.sqrt(2);
          if (along >= 0 && along <= length && distance <= thickness / 2) covered += 1;
        }
      }
      const alpha = Math.round((covered / (samples * samples)) * 255);
      if (alpha > 0) setPixel(x, y, rgb[0], rgb[1], rgb[2], alpha);
    }
  }
}

const samplePoints = [];
const grid = { x: 20, y: 20, cellWidth: 40, cellHeight: 26, gapX: 2, gapY: 3 };
for (let row = 0; row < COLORS.length; row += 1) {
  for (let column = 0; column < ALPHAS.length; column += 1) {
    const color = COLORS[row];
    const alpha = ALPHAS[column];
    const x = grid.x + column * (grid.cellWidth + grid.gapX);
    const y = grid.y + row * (grid.cellHeight + grid.gapY);
    fillRect(x, y, grid.cellWidth, grid.cellHeight, color.rgb, alpha);
    samplePoints.push({
      id: `grid.${color.id}.a${alpha}`,
      x: x + Math.floor(grid.cellWidth / 2),
      y: y + Math.floor(grid.cellHeight / 2),
      expectedRgba: [...color.rgb, alpha],
    });
  }
}

// Straight-alpha and intentionally premultiplied-RGB comparison rows.
const compareY = 210;
for (let column = 0; column < ALPHAS.length; column += 1) {
  const alpha = ALPHAS[column];
  const x = 20 + column * 42;
  const straightRgb = [255, 128, 32];
  const premultipliedRgb = straightRgb.map((channel) => Math.round(channel * alpha / 255));
  fillRect(x, compareY, 40, 20, straightRgb, alpha);
  fillRect(x, compareY + 24, 40, 20, premultipliedRgb, alpha);
  samplePoints.push({
    id: `straight.a${alpha}`,
    x: x + 20,
    y: compareY + 10,
    expectedRgba: [...straightRgb, alpha],
  });
  samplePoints.push({
    id: `premultiplied-rgb.a${alpha}`,
    x: x + 20,
    y: compareY + 34,
    expectedRgba: [...premultipliedRgb, alpha],
  });
}

// Deterministic antialiased contours.
coverageCircle(90, 330, 52.25, [230, 154, 90]);
coverageCircle(210, 330, 46.5, [255, 255, 255], 128);
coverageDiagonal(280, 280, 105, 1.25, [0, 238, 255]);
coverageDiagonal(335, 280, 85, 3.5, [255, 64, 128]);

// Low-alpha reflection ramp with exact alpha values from 0 through 160.
const reflection = { x: 20, y: 405, width: 360, height: 32 };
for (let x = reflection.x; x < reflection.x + reflection.width; x += 1) {
  const t = (x - reflection.x) / (reflection.width - 1);
  const alpha = Math.round(Math.sin(Math.PI * t) * 160);
  for (let y = reflection.y; y < reflection.y + reflection.height; y += 1) {
    setPixel(x, y, 255, 255, 255, alpha);
  }
}

// Fully transparent pixels retaining nonzero RGB.
fillRect(400, 405, 60, 32, [255, 0, 255], 0);
samplePoints.push({
  id: 'transparent-nonzero-rgb',
  x: 430,
  y: 421,
  expectedRgba: [255, 0, 255, 0],
});

const pngBytes = PNG.sync.write(png, {
  colorType: 6,
  inputColorType: 6,
  bitDepth: 8,
  deflateLevel: 9,
  deflateStrategy: 3,
});
const sha256 = crypto.createHash('sha256').update(pngBytes).digest('hex');

const uniqueAlphaValues = [...new Set(
  Array.from({ length: WIDTH * HEIGHT }, (_, index) => png.data[index * 4 + 3]),
)].sort((a, b) => a - b);

const manifest = {
  version: 1,
  fixtureId: 'spec129-rgba-alpha-v1',
  generator: 'generate-alpha-fixture.mjs',
  generationPolicy: 'deterministic integer RGBA with 8x8 analytic coverage samples',
  width: WIDTH,
  height: HEIGHT,
  png: {
    file: 'alpha-fixture.png',
    sha256,
    colorType: 6,
    bitDepth: 8,
    interlace: false,
  },
  requiredAlphaLevels: ALPHAS,
  uniqueAlphaValues,
  colors: COLORS,
  regions: {
    exactAlphaGrid: {
      ...grid,
      rows: COLORS.map((color) => color.id),
      columns: ALPHAS,
    },
    straightAlpha: { x: 20, y: compareY, width: 376, height: 20 },
    premultipliedRgbControl: { x: 20, y: compareY + 24, width: 376, height: 20 },
    opaqueAntialiasedCircle: { centerX: 90, centerY: 330, radius: 52.25 },
    partialAntialiasedCircle: { centerX: 210, centerY: 330, radius: 46.5, maxAlpha: 128 },
    thinDiagonal: { x: 280, y: 280, length: 105, thickness: 1.25 },
    thickDiagonal: { x: 335, y: 280, length: 85, thickness: 3.5 },
    reflectionRamp: reflection,
    transparentNonzeroRgb: { x: 400, y: 405, width: 60, height: 32 },
  },
  samplePoints,
};

fs.writeFileSync(pngPath, pngBytes);
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  fixtureId: manifest.fixtureId,
  pngPath,
  manifestPath,
  sha256,
  width: WIDTH,
  height: HEIGHT,
  uniqueAlphaValueCount: uniqueAlphaValues.length,
  requiredAlphaLevelsPresent: ALPHAS.every((alpha) => uniqueAlphaValues.includes(alpha)),
  samplePointCount: samplePoints.length,
}));
