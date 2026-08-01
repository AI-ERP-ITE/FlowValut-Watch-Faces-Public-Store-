import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('../../../../node_modules/pngjs');

const directory = path.resolve(process.argv[2]);
const outputPath = path.resolve(process.argv[3]);
const manifest = JSON.parse(
  fs.readFileSync(path.join(directory, 'pointer-hand-manifest.json'), 'utf8'),
);

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

const decoded = manifest.outputs.map((entry) => {
  const bytes = fs.readFileSync(path.join(directory, entry.filename));
  const png = PNG.sync.read(bytes);
  const alpha = Buffer.alloc(png.width * png.height);
  let coverage = 0;
  let transparent = 0;
  let partial = 0;
  let opaque = 0;
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
    alpha,
    metrics: {
      id: entry.id,
      role: entry.role,
      width: png.width,
      height: png.height,
      pad: entry.pad,
      pivot: entry.pivot,
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

const caseIds = [
  'neutral',
  'opacity-50',
  'shadow-50',
  'glow-50',
  'trail-50',
  'tint-orange',
];
const comparisons = caseIds.map((caseId) => {
  const reference = decoded.find(
    (item) => item.entry.id === `${caseId}-prepared`,
  );
  const effected = decoded.find(
    (item) => item.entry.id === `${caseId}-effected`,
  );
  let alphaMismatchPixels = 0;
  let expectedOpacityMismatch = 0;
  let transparentBecameNonzero = 0;
  let nonzeroBecameTransparent = 0;
  let maximumAlphaDelta = 0;
  for (let pixel = 0; pixel < reference.alpha.length; pixel += 1) {
    const source = reference.alpha[pixel];
    const candidate = effected.alpha[pixel];
    if (source !== candidate) alphaMismatchPixels += 1;
    if (caseId === 'opacity-50' && candidate !== Math.round(source * 0.5)) {
      expectedOpacityMismatch += 1;
    }
    if (source === 0 && candidate > 0) transparentBecameNonzero += 1;
    if (source > 0 && candidate === 0) nonzeroBecameTransparent += 1;
    maximumAlphaDelta = Math.max(
      maximumAlphaDelta,
      Math.abs(source - candidate),
    );
  }
  const expectedBehaviorPass =
    caseId === 'neutral'
      ? reference.bytes.equals(effected.bytes)
      : caseId === 'opacity-50'
        ? expectedOpacityMismatch === 0
        : alphaMismatchPixels > 0;
  return {
    caseId,
    prepared: reference.metrics,
    effected: effected.metrics,
    dimensionsPreserved:
      reference.metrics.width === effected.metrics.width &&
      reference.metrics.height === effected.metrics.height,
    pivotPreserved:
      JSON.stringify(reference.metrics.pivot) ===
      JSON.stringify(effected.metrics.pivot),
    alphaMismatchPixels,
    expectedOpacityMismatch,
    transparentBecameNonzero,
    nonzeroBecameTransparent,
    maximumAlphaDelta,
    expectedBehaviorPass,
  };
});

const result = {
  result:
    comparisons.every(
      (comparison) =>
        comparison.expectedBehaviorPass &&
        comparison.dimensionsPreserved &&
        comparison.pivotPreserved &&
        comparison.prepared.browserRawAlphaMatchesEncodedPng &&
        comparison.effected.browserRawAlphaMatchesEncodedPng,
    )
      ? 'PASS'
      : 'FAIL',
  comparisons,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.result !== 'PASS') process.exitCode = 1;
