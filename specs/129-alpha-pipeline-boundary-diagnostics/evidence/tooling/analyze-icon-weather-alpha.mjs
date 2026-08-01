import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('../../../../node_modules/pngjs');

const directory = path.resolve(process.argv[2]);
const outputPath = path.resolve(process.argv[3]);
const manifest = JSON.parse(
  fs.readFileSync(path.join(directory, 'icon-weather-manifest.json'), 'utf8'),
);

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

const images = manifest.outputs.map((entry) => {
  const bytes = fs.readFileSync(path.join(directory, entry.filename));
  const png = PNG.sync.read(bytes);
  const alphaBytes = Buffer.alloc(png.width * png.height);
  let coverage = 0;
  let partial = 0;
  let opaque = 0;
  let transparent = 0;
  const uniqueAlpha = new Set();
  for (let pixel = 0; pixel < png.width * png.height; pixel += 1) {
    const alpha = png.data[pixel * 4 + 3];
    alphaBytes[pixel] = alpha;
    uniqueAlpha.add(alpha);
    coverage += alpha / 255;
    if (alpha === 0) transparent += 1;
    else if (alpha === 255) opaque += 1;
    else partial += 1;
  }
  const alphaSha256 = sha256(alphaBytes);
  return {
    ...entry,
    encodedSha256: sha256(bytes),
    alphaSha256,
    browserRawAlphaMatchesEncodedPng:
      entry.browserRawAlphaSha256 === alphaSha256,
    uniqueAlphaValueCount: uniqueAlpha.size,
    transparentPixels: transparent,
    partialAlphaPixels: partial,
    opaquePixels: opaque,
    totalAlphaCoveragePixels: coverage,
  };
});

const iconImages = images.filter((image) => image.route === 'icon');
const weatherShapeImages = images.filter((image) => image.route === 'weather-shape');
const weatherTextImages = images.filter((image) => image.route === 'weather-text');
const byColor = (items) =>
  Object.fromEntries(
    items.map((image) => [
      image.colorId,
      {
        alphaSha256: image.alphaSha256,
        coverage: image.totalAlphaCoveragePixels,
        partialAlphaPixels: image.partialAlphaPixels,
        uniqueAlphaValueCount: image.uniqueAlphaValueCount,
      },
    ]),
  );

const iconAlphaInvariant =
  new Set(iconImages.map((image) => image.alphaSha256)).size === 1;
const weatherShapeAlphaInvariant =
  new Set(weatherShapeImages.map((image) => image.alphaSha256)).size === 1;
const weatherTextAlphaInvariant =
  new Set(weatherTextImages.map((image) => image.alphaSha256)).size === 1;
const coverageComparison = (items) => {
  const black = items.find((image) => image.colorId === 'black');
  const orange = items.find((image) => image.colorId === 'orange');
  const teal = items.find((image) => image.colorId === 'teal');
  return {
    orangeVsBlackCoveragePercent:
      (orange.totalAlphaCoveragePixels / black.totalAlphaCoveragePixels - 1) * 100,
    tealVsBlackCoveragePercent:
      (teal.totalAlphaCoveragePixels / black.totalAlphaCoveragePixels - 1) * 100,
  };
};

const result = {
  result:
    iconAlphaInvariant && weatherShapeAlphaInvariant && weatherTextAlphaInvariant
      ? 'PASS'
      : 'FAIL',
  liveAlphaMatchesEncodedPng:
    images.every((image) => image.browserRawAlphaMatchesEncodedPng),
  icon: {
    alphaInvariantAcrossNeutralAndColorizedOutputs: iconAlphaInvariant,
    byColor: byColor(iconImages),
  },
  weatherShape: {
    alphaInvariantAcrossColors: weatherShapeAlphaInvariant,
    byColor: byColor(weatherShapeImages),
    ...coverageComparison(weatherShapeImages),
  },
  weatherText: {
    alphaInvariantAcrossColors: weatherTextAlphaInvariant,
    byColor: byColor(weatherTextImages),
    ...coverageComparison(weatherTextImages),
  },
  images,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({
  result: result.result,
  liveAlphaMatchesEncodedPng: result.liveAlphaMatchesEncodedPng,
  icon: result.icon,
  weatherShape: result.weatherShape,
  weatherText: result.weatherText,
}, null, 2)}\n`);
if (result.result !== 'PASS') process.exitCode = 1;
