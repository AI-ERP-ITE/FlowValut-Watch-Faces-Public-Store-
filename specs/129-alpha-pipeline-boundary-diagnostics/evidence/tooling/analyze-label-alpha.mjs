import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('../../../../node_modules/pngjs');

const directory = path.resolve(process.argv[2]);
const outputPath = path.resolve(process.argv[3]);
const manifest = JSON.parse(
  fs.readFileSync(path.join(directory, 'label-baker-manifest.json'), 'utf8'),
);

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function parseHexColor(value) {
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
}

const images = manifest.outputs.map((entry) => {
  const bytes = fs.readFileSync(path.join(directory, entry.filename));
  const png = PNG.sync.read(bytes);
  const expectedRgb = parseHexColor(entry.color);
  const alphaBytes = Buffer.alloc(png.width * png.height);
  let transparent = 0;
  let partial = 0;
  let opaque = 0;
  let coverage = 0;
  let weightedX = 0;
  let weightedY = 0;
  let nonzeroRgbMismatchPixels = 0;
  let partialRgbMismatchPixels = 0;
  let maximumRgbDeltaFromFill = 0;
  const alphaHistogram = new Array(256).fill(0);

  for (let pixel = 0; pixel < png.width * png.height; pixel += 1) {
    const offset = pixel * 4;
    const alpha = png.data[offset + 3];
    alphaBytes[pixel] = alpha;
    alphaHistogram[alpha] += 1;
    const normalizedAlpha = alpha / 255;
    coverage += normalizedAlpha;
    weightedX += (pixel % png.width) * normalizedAlpha;
    weightedY += Math.floor(pixel / png.width) * normalizedAlpha;
    if (alpha === 0) transparent += 1;
    else if (alpha === 255) opaque += 1;
    else partial += 1;

    if (alpha > 0) {
      let mismatch = false;
      for (let channel = 0; channel < 3; channel += 1) {
        const delta = Math.abs(png.data[offset + channel] - expectedRgb[channel]);
        maximumRgbDeltaFromFill = Math.max(maximumRgbDeltaFromFill, delta);
        if (delta !== 0) mismatch = true;
      }
      if (mismatch) {
        nonzeroRgbMismatchPixels += 1;
        if (alpha < 255) partialRgbMismatchPixels += 1;
      }
    }
  }

  return {
    ...entry,
    encodedSha256: sha256(bytes),
    alphaSha256: sha256(alphaBytes),
    browserRawAlphaMatchesEncodedPng:
      entry.browserRawAlphaSha256 === sha256(alphaBytes),
    transparentPixels: transparent,
    partialAlphaPixels: partial,
    opaquePixels: opaque,
    uniqueAlphaValueCount: alphaHistogram.filter((count) => count > 0).length,
    totalAlphaCoveragePixels: coverage,
    alphaCentroid: {
      x: weightedX / coverage,
      y: weightedY / coverage,
    },
    nonzeroRgbMismatchPixels,
    partialRgbMismatchPixels,
    maximumRgbDeltaFromFill,
  };
});

const groups = [];
for (const label of ['WED', 'JUL']) {
  for (const height of [21, 40]) {
    const members = images.filter(
      (image) => image.label === label && image.height === height,
    );
    const alphaHashes = [...new Set(members.map((image) => image.alphaSha256))];
    const coverages = [...new Set(members.map((image) => image.totalAlphaCoveragePixels))];
    const centroids = [
      ...new Set(members.map((image) => JSON.stringify(image.alphaCentroid))),
    ];
    groups.push({
      label,
      height,
      memberIds: members.map((image) => image.id),
      alphaMasksEqualAcrossColors: alphaHashes.length === 1,
      coverageEqualAcrossColors: coverages.length === 1,
      centroidEqualAcrossColors: centroids.length === 1,
      alphaSha256: alphaHashes[0],
    });
  }
}

const result = {
  result: groups.every(
    (group) =>
      group.alphaMasksEqualAcrossColors &&
      group.coverageEqualAcrossColors &&
      group.centroidEqualAcrossColors,
  )
    ? 'PASS'
    : 'FAIL',
  images,
  groups,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.result !== 'PASS') process.exitCode = 1;
