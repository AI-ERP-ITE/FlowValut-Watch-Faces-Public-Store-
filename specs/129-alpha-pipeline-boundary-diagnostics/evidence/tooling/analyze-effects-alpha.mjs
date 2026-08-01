import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('../../../../node_modules/pngjs');

const directory = path.resolve(process.argv[2]);
const outputPath = path.resolve(process.argv[3]);
const manifest = JSON.parse(
  fs.readFileSync(path.join(directory, 'effects-photo-edit-manifest.json'), 'utf8'),
);

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

const decoded = manifest.outputs.map((entry) => {
  const bytes = fs.readFileSync(path.join(directory, entry.filename));
  const png = PNG.sync.read(bytes);
  const alpha = Buffer.alloc(png.width * png.height);
  let coverage = 0;
  let partial = 0;
  let opaque = 0;
  let transparent = 0;
  const uniqueAlpha = new Set();
  for (let pixel = 0; pixel < png.width * png.height; pixel += 1) {
    const value = png.data[pixel * 4 + 3];
    alpha[pixel] = value;
    uniqueAlpha.add(value);
    coverage += value / 255;
    if (value === 0) transparent += 1;
    else if (value === 255) opaque += 1;
    else partial += 1;
  }
  const alphaSha256 = sha256(alpha);
  return {
    entry,
    bytes,
    png,
    alpha,
    metrics: {
      id: entry.id,
      expectedAlphaBehavior: entry.expectedAlphaBehavior,
      encodedSha256: sha256(bytes),
      alphaSha256,
      browserRawAlphaMatchesEncodedPng:
        entry.browserRawAlphaSha256 === alphaSha256,
      uniqueAlphaValueCount: uniqueAlpha.size,
      transparentPixels: transparent,
      partialAlphaPixels: partial,
      opaquePixels: opaque,
      totalAlphaCoveragePixels: coverage,
    },
  };
});

const neutral = decoded.find((item) => item.entry.id === 'neutral');
const results = decoded.map((item) => {
  let alphaMismatchVsNeutral = 0;
  let expectedOpacityMismatch = 0;
  let transparentBecameNonzero = 0;
  let nonzeroBecameTransparent = 0;
  let maximumAlphaDelta = 0;
  for (let pixel = 0; pixel < item.alpha.length; pixel += 1) {
    const reference = neutral.alpha[pixel];
    const candidate = item.alpha[pixel];
    if (reference !== candidate) alphaMismatchVsNeutral += 1;
    if (item.entry.id === 'opacity-50') {
      const expected = Math.round(reference * 0.5);
      if (candidate !== expected) expectedOpacityMismatch += 1;
    }
    if (reference === 0 && candidate > 0) transparentBecameNonzero += 1;
    if (reference > 0 && candidate === 0) nonzeroBecameTransparent += 1;
    maximumAlphaDelta = Math.max(
      maximumAlphaDelta,
      Math.abs(reference - candidate),
    );
  }
  const expectedBehaviorPass =
    item.entry.expectedAlphaBehavior === 'baseline'
      ? alphaMismatchVsNeutral === 0
      : item.entry.expectedAlphaBehavior === 'preserve'
        ? alphaMismatchVsNeutral === 0
        : item.entry.expectedAlphaBehavior === 'alpha=round(baseline*0.5)'
          ? expectedOpacityMismatch === 0
          : item.entry.expectedAlphaBehavior === 'generated-overlay-alpha'
            ? alphaMismatchVsNeutral > 0
            : false;
  return {
    ...item.metrics,
    alphaMismatchVsNeutral,
    expectedOpacityMismatch,
    transparentBecameNonzero,
    nonzeroBecameTransparent,
    maximumAlphaDelta,
    expectedBehaviorPass,
  };
});

const result = {
  result:
    results.every(
      (item) =>
        item.expectedBehaviorPass && item.browserRawAlphaMatchesEncodedPng,
    )
      ? 'PASS'
      : 'FAIL',
  baselineId: 'neutral',
  results,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.result !== 'PASS') process.exitCode = 1;
