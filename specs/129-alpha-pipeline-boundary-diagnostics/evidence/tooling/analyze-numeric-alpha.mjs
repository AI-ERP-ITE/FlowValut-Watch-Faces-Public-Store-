import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('../../../../node_modules/pngjs');

const directory = path.resolve(process.argv[2]);
const outputPath = path.resolve(process.argv[3]);
const manifest = JSON.parse(
  fs.readFileSync(path.join(directory, 'numeric-glyph-manifest.json'), 'utf8'),
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
  let coverage = 0;
  let partial = 0;
  let opaque = 0;
  let transparent = 0;
  let nonzeroRgbMismatchPixels = 0;
  let maximumRgbDeltaFromFill = 0;
  const alphaValues = new Set();

  for (let pixel = 0; pixel < png.width * png.height; pixel += 1) {
    const offset = pixel * 4;
    const alpha = png.data[offset + 3];
    alphaBytes[pixel] = alpha;
    alphaValues.add(alpha);
    coverage += alpha / 255;
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
      if (mismatch) nonzeroRgbMismatchPixels += 1;
    }
  }

  const alphaSha256 = sha256(alphaBytes);
  return {
    ...entry,
    decodedWidth: png.width,
    decodedHeight: png.height,
    encodedSha256: sha256(bytes),
    alphaSha256,
    browserRawAlphaMatchesEncodedPng:
      entry.browserRawAlphaSha256 === alphaSha256,
    transparentPixels: transparent,
    partialAlphaPixels: partial,
    opaquePixels: opaque,
    uniqueAlphaValueCount: alphaValues.size,
    totalAlphaCoveragePixels: coverage,
    nonzeroRgbMismatchPixels,
    maximumRgbDeltaFromFill,
  };
});

const colorGroups = [];
for (const targetHeight of [21, 40]) {
  for (const tabular of [false, true]) {
    for (let digit = 0; digit < 10; digit += 1) {
      const members = images.filter(
        (image) =>
          image.targetHeight === targetHeight &&
          image.tabular === tabular &&
          image.digit === String(digit),
      );
      colorGroups.push({
        targetHeight,
        tabular,
        digit: String(digit),
        dimensionsEqualAcrossColors:
          new Set(members.map((image) => `${image.decodedWidth}x${image.decodedHeight}`)).size === 1,
        measurementBoundsEqualAcrossColors:
          new Set(members.map((image) => JSON.stringify(image.measurement.visibleBBox))).size === 1,
        alphaMasksEqualAcrossColors:
          new Set(members.map((image) => image.alphaSha256)).size === 1,
        coverageByColor: Object.fromEntries(
          members.map((image) => [image.colorId, image.totalAlphaCoveragePixels]),
        ),
      });
    }
  }
}

const familySummaries = [];
for (const targetHeight of [21, 40]) {
  for (const tabular of [false, true]) {
    const groups = colorGroups.filter(
      (group) => group.targetHeight === targetHeight && group.tabular === tabular,
    );
    const orangeVsBlackPercent = groups.map(
      (group) =>
        (group.coverageByColor.orange / group.coverageByColor.black - 1) * 100,
    );
    const tealVsBlackPercent = groups.map(
      (group) =>
        (group.coverageByColor.teal / group.coverageByColor.black - 1) * 100,
    );
    familySummaries.push({
      targetHeight,
      tabular,
      digitCount: groups.length,
      colorInvariantDigitCount:
        groups.filter((group) => group.alphaMasksEqualAcrossColors).length,
      dimensionsEqualDigitCount:
        groups.filter((group) => group.dimensionsEqualAcrossColors).length,
      measurementBoundsEqualDigitCount:
        groups.filter((group) => group.measurementBoundsEqualAcrossColors).length,
      orangeVsBlackCoveragePercent: {
        minimum: Math.min(...orangeVsBlackPercent),
        maximum: Math.max(...orangeVsBlackPercent),
        mean:
          orangeVsBlackPercent.reduce((sum, value) => sum + value, 0) /
          orangeVsBlackPercent.length,
      },
      tealVsBlackCoveragePercent: {
        minimum: Math.min(...tealVsBlackPercent),
        maximum: Math.max(...tealVsBlackPercent),
        mean:
          tealVsBlackPercent.reduce((sum, value) => sum + value, 0) /
          tealVsBlackPercent.length,
      },
    });
  }
}

const result = {
  result:
    colorGroups.every((group) => group.alphaMasksEqualAcrossColors)
      ? 'PASS'
      : 'FAIL',
  liveAlphaMatchesEncodedPng:
    images.every((image) => image.browserRawAlphaMatchesEncodedPng),
  outputCount: images.length,
  images,
  colorGroups,
  familySummaries,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({
  result: result.result,
  liveAlphaMatchesEncodedPng: result.liveAlphaMatchesEncodedPng,
  outputCount: result.outputCount,
  familySummaries,
}, null, 2)}\n`);
if (result.result !== 'PASS') process.exitCode = 1;
