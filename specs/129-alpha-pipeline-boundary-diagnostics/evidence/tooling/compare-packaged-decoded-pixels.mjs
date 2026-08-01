import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import JSZip from 'jszip';

const require = createRequire(import.meta.url);
const { PNG } = require('../../../../node_modules/pngjs');
const appRoot = process.cwd();
const specRoot = path.join(appRoot, 'specs', '129-alpha-pipeline-boundary-diagnostics');
const packageRoot = path.join(specRoot, 'evidence', 'packages');
const matrix = JSON.parse(await fs.readFile(path.join(packageRoot, 'T030-package-matrix.json'), 'utf8'));
const binaryDiagnostic = JSON.parse(await fs.readFile(
  path.join(specRoot, 'evidence', 'binary-control', 'T029-binary-label-control.zpk.diagnostic.json'),
  'utf8',
));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

function chunks(bytes) {
  const result = [];
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    result.push({ type, length });
    offset += length + 12;
    if (type === 'IEND') break;
  }
  return result;
}

function metrics(image) {
  const histogram = new Array(256).fill(0);
  let coverage = 0;
  let weightedX = 0;
  let weightedY = 0;
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = image.data[(y * image.width + x) * 4 + 3];
      histogram[alpha] += 1;
      const weight = alpha / 255;
      coverage += weight;
      weightedX += x * weight;
      weightedY += y * weight;
      if (alpha > 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return {
    rgbaSha256: sha256(image.data),
    alphaSha256: sha256(Buffer.from(image.data.filter((_, index) => index % 4 === 3))),
    histogram,
    coverage,
    centroid: coverage > 0
      ? { x: weightedX / coverage, y: weightedY / coverage }
      : { x: image.width / 2, y: image.height / 2 },
    bounds: maxX >= 0 ? { minX, minY, maxX, maxY } : null,
  };
}

function composite(image, mode) {
  const output = Buffer.alloc(image.data.length);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      const alpha = image.data[offset + 3] / 255;
      const checker = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0 ? 224 : 48;
      const background = mode === 'black' ? 0 : mode === 'white' ? 255 : checker;
      for (let channel = 0; channel < 3; channel += 1) {
        output[offset + channel] = Math.round(
          image.data[offset + channel] * alpha + background * (1 - alpha),
        );
      }
      output[offset + 3] = 255;
    }
  }
  return output;
}

function compare(sourceBytes, candidateBytes, packageId, asset, comparisonClass) {
  const source = PNG.sync.read(sourceBytes);
  const candidate = PNG.sync.read(candidateBytes);
  const sourceMetrics = metrics(source);
  const candidateMetrics = metrics(candidate);
  const dimensionsEqual = source.width === candidate.width && source.height === candidate.height;
  let mismatchedPixels = null;
  let mismatchedAlphaPixels = null;
  let maxChannelDelta = null;
  if (dimensionsEqual) {
    mismatchedPixels = 0;
    mismatchedAlphaPixels = 0;
    maxChannelDelta = 0;
    for (let offset = 0; offset < source.data.length; offset += 4) {
      let mismatch = false;
      for (let channel = 0; channel < 4; channel += 1) {
        const delta = Math.abs(source.data[offset + channel] - candidate.data[offset + channel]);
        if (delta > 0) mismatch = true;
        maxChannelDelta = Math.max(maxChannelDelta, delta);
      }
      if (mismatch) mismatchedPixels += 1;
      if (source.data[offset + 3] !== candidate.data[offset + 3]) mismatchedAlphaPixels += 1;
    }
  }
  const composites = Object.fromEntries(['black', 'white', 'checker'].map((mode) => {
    const sourceComposite = composite(source, mode);
    const candidateComposite = composite(candidate, mode);
    return [mode, {
      sourceSha256: sha256(sourceComposite),
      candidateSha256: sha256(candidateComposite),
      exact: sourceComposite.equals(candidateComposite),
    }];
  }));
  const metadata = {
    sourceChunks: chunks(sourceBytes),
    candidateChunks: chunks(candidateBytes),
  };
  metadata.chunksEqual = JSON.stringify(metadata.sourceChunks) === JSON.stringify(metadata.candidateChunks);
  const metricDeltas = {
    coverage: candidateMetrics.coverage - sourceMetrics.coverage,
    centroidX: candidateMetrics.centroid.x - sourceMetrics.centroid.x,
    centroidY: candidateMetrics.centroid.y - sourceMetrics.centroid.y,
    boundsEqual: JSON.stringify(sourceMetrics.bounds) === JSON.stringify(candidateMetrics.bounds),
    histogramEqual: sourceMetrics.histogram.every((count, alpha) => count === candidateMetrics.histogram[alpha]),
  };
  const exact = dimensionsEqual
    && metadata.chunksEqual
    && mismatchedPixels === 0
    && mismatchedAlphaPixels === 0
    && maxChannelDelta === 0
    && metricDeltas.coverage === 0
    && metricDeltas.centroidX === 0
    && metricDeltas.centroidY === 0
    && metricDeltas.boundsEqual
    && metricDeltas.histogramEqual
    && Object.values(composites).every((item) => item.exact);
  return {
    packageId,
    asset,
    comparisonClass,
    dimensions: {
      source: { width: source.width, height: source.height },
      candidate: { width: candidate.width, height: candidate.height },
      equal: dimensionsEqual,
    },
    metadata,
    decoded: {
      sourceRgbaSha256: sourceMetrics.rgbaSha256,
      candidateRgbaSha256: candidateMetrics.rgbaSha256,
      sourceAlphaSha256: sourceMetrics.alphaSha256,
      candidateAlphaSha256: candidateMetrics.alphaSha256,
      mismatchedPixels,
      mismatchedAlphaPixels,
      maxChannelDelta,
    },
    metricDeltas,
    composites,
    exact,
  };
}

const comparisons = [];
for (const packageEntry of matrix.packages.filter(({ id }) => id !== 'P11')) {
  for (const asset of packageEntry.assets) {
    const [sourceBytes, candidateBytes] = await Promise.all([
      fs.readFile(path.join(appRoot, asset.source)),
      fs.readFile(path.join(packageRoot, 'extracted', packageEntry.id, 'device', ...asset.target.split('/'))),
    ]);
    comparisons.push(compare(
      sourceBytes,
      candidateBytes,
      packageEntry.id,
      asset.target,
      'route-source-to-extracted-package',
    ));
  }
}

const p11Entry = matrix.packages.find(({ id }) => id === 'P11');
const sourceOuter = await JSZip.loadAsync(await fs.readFile(path.join(appRoot, p11Entry.exactCopyOf)));
const sourceDevice = await JSZip.loadAsync(await sourceOuter.file('device.zip').async('nodebuffer'));
for (const asset of binaryDiagnostic.assets) {
  const [sourceBytes, candidateBytes] = await Promise.all([
    sourceDevice.file(asset.name).async('nodebuffer'),
    fs.readFile(path.join(packageRoot, 'extracted', 'P11', 'device', ...asset.name.split('/'))),
  ]);
  comparisons.push(compare(
    sourceBytes,
    candidateBytes,
    'P11',
    asset.name,
    'binary-control-source-package-to-extracted-copy',
  ));
}

const packages = matrix.packages.map(({ id }) => {
  const items = comparisons.filter(({ packageId }) => packageId === id);
  return {
    id,
    assetCount: items.length,
    exactCount: items.filter(({ exact }) => exact).length,
    differingCount: items.filter(({ exact }) => !exact).length,
    result: items.length > 0 && items.every(({ exact }) => exact) ? 'PASS' : 'FAIL',
  };
});
const result = {
  task: 'T033',
  testOnly: true,
  decoder: 'pngjs',
  totalAssets: comparisons.length,
  exactAssets: comparisons.filter(({ exact }) => exact).length,
  differingAssets: comparisons.filter(({ exact }) => !exact).length,
  maxMismatchedPixels: Math.max(...comparisons.map(({ decoded }) => decoded.mismatchedPixels ?? Infinity)),
  maxMismatchedAlphaPixels: Math.max(...comparisons.map(({ decoded }) => decoded.mismatchedAlphaPixels ?? Infinity)),
  maxChannelDelta: Math.max(...comparisons.map(({ decoded }) => decoded.maxChannelDelta ?? Infinity)),
  maxAbsoluteCoverageDelta: Math.max(...comparisons.map(({ metricDeltas }) => Math.abs(metricDeltas.coverage))),
  maxAbsoluteCentroidDelta: Math.max(...comparisons.flatMap(({ metricDeltas }) => [
    Math.abs(metricDeltas.centroidX),
    Math.abs(metricDeltas.centroidY),
  ])),
  allBoundsEqual: comparisons.every(({ metricDeltas }) => metricDeltas.boundsEqual),
  allHistogramsEqual: comparisons.every(({ metricDeltas }) => metricDeltas.histogramEqual),
  allCompositesEqual: comparisons.every(({ composites }) =>
    Object.values(composites).every(({ exact }) => exact)),
  packages,
  comparisons,
};
result.result = result.differingAssets === 0 ? 'PASS' : 'FAIL';
await fs.writeFile(
  path.join(packageRoot, 'T033-decoded-pixel-comparison.json'),
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(JSON.stringify({
  task: result.task,
  result: result.result,
  totalAssets: result.totalAssets,
  exactAssets: result.exactAssets,
  differingAssets: result.differingAssets,
  maxMismatchedPixels: result.maxMismatchedPixels,
  maxMismatchedAlphaPixels: result.maxMismatchedAlphaPixels,
  maxChannelDelta: result.maxChannelDelta,
  maxAbsoluteCoverageDelta: result.maxAbsoluteCoverageDelta,
  maxAbsoluteCentroidDelta: result.maxAbsoluteCentroidDelta,
  allBoundsEqual: result.allBoundsEqual,
  allHistogramsEqual: result.allHistogramsEqual,
  allCompositesEqual: result.allCompositesEqual,
  packages: result.packages,
}, null, 2));
if (result.result !== 'PASS') process.exitCode = 1;
