import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('../../../../node_modules/pngjs');
const appRoot = process.cwd();
const specRoot = path.join(appRoot, 'specs', '129-alpha-pipeline-boundary-diagnostics');
const officialRoot = path.join(specRoot, 'evidence', 'official-zepp');
const fixturePath = path.join(specRoot, 'evidence', 'fixture', 'alpha-fixture.png');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

function decodeHmos(bytes) {
  const width = bytes.readUInt16LE(12);
  const height = bytes.readUInt16LE(14);
  const bitsPerPixel = bytes[16];
  const magic = bytes.subarray(18, 22).toString('ascii');
  if (magic !== 'SOMH' || bitsPerPixel !== 8) {
    throw new Error(`Unsupported compiled image: magic=${magic}, bpp=${bitsPerPixel}`);
  }
  const paletteOffset = 64;
  const paletteEntries = 256;
  const pixelOffset = paletteOffset + paletteEntries * 4;
  if (bytes.length !== pixelOffset + width * height) {
    throw new Error(`Unexpected compiled-image length ${bytes.length}`);
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const paletteIndex = bytes[pixelOffset + pixel];
    bytes.copy(rgba, pixel * 4, paletteOffset + paletteIndex * 4, paletteOffset + paletteIndex * 4 + 4);
  }
  return {
    width,
    height,
    bitsPerPixel,
    magic,
    paletteOffset,
    paletteEntries,
    pixelOffset,
    rgba,
  };
}

function imageMetrics(width, height, rgba) {
  const histogram = new Array(256).fill(0);
  let coverage = 0;
  let weightedX = 0;
  let weightedY = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = rgba[(y * width + x) * 4 + 3];
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
    rgbaSha256: sha256(rgba),
    uniqueAlphaValues: histogram.map((count, alpha) => ({ alpha, count })).filter(({ count }) => count > 0),
    coverage,
    centroid: coverage > 0
      ? { x: weightedX / coverage, y: weightedY / coverage }
      : { x: width / 2, y: height / 2 },
    bounds: maxX >= 0 ? { minX, minY, maxX, maxY } : null,
    histogram,
  };
}

function orientedOffset(x, y, width, height, orientation) {
  const sourceX = orientation.includes('flipX') ? width - 1 - x : x;
  const sourceY = orientation.includes('flipY') ? height - 1 - y : y;
  return (sourceY * width + sourceX) * 4;
}

function compare(reference, candidate) {
  const orientations = ['normal', 'flipX', 'flipY', 'flipX+flipY'];
  const orientationScores = orientations.map((orientation) => {
    let absoluteError = 0;
    for (let y = 0; y < reference.height; y += 8) {
      for (let x = 0; x < reference.width; x += 8) {
        const referenceOffset = (y * reference.width + x) * 4;
        const candidateOffset = orientedOffset(
          x,
          y,
          candidate.width,
          candidate.height,
          orientation,
        );
        for (let channel = 0; channel < 4; channel += 1) {
          absoluteError += Math.abs(
            reference.data[referenceOffset + channel] - candidate.rgba[candidateOffset + channel],
          );
        }
      }
    }
    return { orientation, sampledAbsoluteError: absoluteError };
  }).sort((left, right) => left.sampledAbsoluteError - right.sampledAbsoluteError);
  const orientation = orientationScores[0].orientation;
  let mismatchedPixels = 0;
  let mismatchedAlphaPixels = 0;
  let maxChannelDelta = 0;
  const maxChannelDeltaPerChannel = [0, 0, 0, 0];
  const channelAbsoluteError = [0, 0, 0, 0];
  for (let y = 0; y < reference.height; y += 1) {
    for (let x = 0; x < reference.width; x += 1) {
      const referenceOffset = (y * reference.width + x) * 4;
      const candidateOffset = orientedOffset(x, y, candidate.width, candidate.height, orientation);
      let mismatch = false;
      for (let channel = 0; channel < 4; channel += 1) {
        const delta = Math.abs(
          reference.data[referenceOffset + channel] - candidate.rgba[candidateOffset + channel],
        );
        channelAbsoluteError[channel] += delta;
        maxChannelDelta = Math.max(maxChannelDelta, delta);
        maxChannelDeltaPerChannel[channel] = Math.max(maxChannelDeltaPerChannel[channel], delta);
        if (delta > 0) mismatch = true;
      }
      if (mismatch) mismatchedPixels += 1;
      if (reference.data[referenceOffset + 3] !== candidate.rgba[candidateOffset + 3]) {
        mismatchedAlphaPixels += 1;
      }
    }
  }
  return {
    orientation,
    orientationScores,
    mismatchedPixels,
    mismatchedAlphaPixels,
    maxChannelDelta,
    maxChannelDeltaPerChannel,
    meanAbsoluteChannelError: channelAbsoluteError.map((value) =>
      value / (reference.width * reference.height)),
  };
}

function composite(width, height, rgba, mode) {
  const output = Buffer.alloc(rgba.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = rgba[offset + 3] / 255;
      const checker = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0 ? 224 : 48;
      const background = mode === 'black' ? 0 : mode === 'white' ? 255 : checker;
      for (let channel = 0; channel < 3; channel += 1) {
        output[offset + channel] = Math.round(rgba[offset + channel] * alpha + background * (1 - alpha));
      }
      output[offset + 3] = 255;
    }
  }
  return output;
}

const fixtureBytes = await fs.readFile(fixturePath);
const fixture = PNG.sync.read(fixtureBytes);
const opaque = new PNG({ width: fixture.width, height: fixture.height });
fixture.data.copy(opaque.data);
for (let offset = 3; offset < opaque.data.length; offset += 4) opaque.data[offset] = 255;

const definitions = [
  {
    id: 'P9',
    reference: fixture,
    asset: path.join(officialRoot, 'extracted', 'P9', 'device', 'assets', 'alpha-fixture.png'),
  },
  {
    id: 'P10',
    reference: opaque,
    asset: path.join(officialRoot, 'extracted', 'P10', 'device', 'assets', 'alpha-fixture-opaque.png'),
  },
];
const results = [];
for (const definition of definitions) {
  const compiledBytes = await fs.readFile(definition.asset);
  const compiled = decodeHmos(compiledBytes);
  const referenceMetrics = imageMetrics(
    definition.reference.width,
    definition.reference.height,
    definition.reference.data,
  );
  const compiledMetrics = imageMetrics(compiled.width, compiled.height, compiled.rgba);
  const decodedComparison = compare(definition.reference, compiled);
  const compositeHashes = {};
  for (const mode of ['black', 'white', 'checker']) {
    const referenceComposite = composite(
      definition.reference.width,
      definition.reference.height,
      definition.reference.data,
      mode,
    );
    const compiledComposite = composite(compiled.width, compiled.height, compiled.rgba, mode);
    let absoluteError = 0;
    let maxChannelDelta = 0;
    let mismatchedPixels = 0;
    for (let offset = 0; offset < referenceComposite.length; offset += 4) {
      let mismatch = false;
      for (let channel = 0; channel < 4; channel += 1) {
        const delta = Math.abs(referenceComposite[offset + channel] - compiledComposite[offset + channel]);
        absoluteError += delta;
        maxChannelDelta = Math.max(maxChannelDelta, delta);
        if (delta > 0) mismatch = true;
      }
      if (mismatch) mismatchedPixels += 1;
    }
    compositeHashes[mode] = {
      referenceSha256: sha256(referenceComposite),
      compiledSha256: sha256(compiledComposite),
      exact: referenceComposite.equals(compiledComposite),
      mismatchedPixels,
      maxChannelDelta,
      meanAbsoluteChannelError: absoluteError / referenceComposite.length,
    };
  }
  results.push({
    id: definition.id,
    compiledAsset: path.relative(appRoot, definition.asset).replaceAll('\\', '/'),
    compiledEncodedBytes: compiledBytes.length,
    compiledEncodedSha256: sha256(compiledBytes),
    format: {
      magic: compiled.magic,
      width: compiled.width,
      height: compiled.height,
      bitsPerPixel: compiled.bitsPerPixel,
      paletteEntries: compiled.paletteEntries,
    },
    decodedComparison,
    alpha: {
      referenceUniqueValues: referenceMetrics.uniqueAlphaValues,
      compiledUniqueValues: compiledMetrics.uniqueAlphaValues,
      coverageDelta: compiledMetrics.coverage - referenceMetrics.coverage,
      centroidDelta: {
        x: compiledMetrics.centroid.x - referenceMetrics.centroid.x,
        y: compiledMetrics.centroid.y - referenceMetrics.centroid.y,
      },
      boundsEqual: JSON.stringify(referenceMetrics.bounds) === JSON.stringify(compiledMetrics.bounds),
    },
    compositeHashes,
  });
}

const output = {
  task: 'T043',
  testOnly: true,
  decoder: 'Measured Zepp SOMH 8-bit indexed RGBA format: 64-byte header + 256×RGBA palette + indices',
  packages: results,
};
await fs.writeFile(
  path.join(officialRoot, 'T043-official-compiled-image-measurements.json'),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(JSON.stringify({
  task: output.task,
  packages: results.map(({ id, format, decodedComparison, alpha, compositeHashes }) => ({
    id,
    format,
    decodedComparison,
    alpha: {
      referenceUniqueAlphaCount: alpha.referenceUniqueValues.length,
      compiledUniqueAlphaCount: alpha.compiledUniqueValues.length,
      coverageDelta: alpha.coverageDelta,
      centroidDelta: alpha.centroidDelta,
      boundsEqual: alpha.boundsEqual,
    },
    compositesExact: Object.values(compositeHashes).every(({ exact }) => exact),
    composites: compositeHashes,
  })),
}, null, 2));
