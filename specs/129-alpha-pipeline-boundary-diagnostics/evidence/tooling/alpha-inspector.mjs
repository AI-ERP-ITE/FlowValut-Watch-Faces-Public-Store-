import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('../../../../node_modules/pngjs');

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function parseArgs(argv) {
  const command = argv[0];
  const options = {};
  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
    options[key] = value;
    i += 1;
  }
  return { command, options };
}

function parseIhdr(bytes) {
  const signature = bytes.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error('Input is not a PNG');
  if (bytes.subarray(12, 16).toString('ascii') !== 'IHDR') {
    throw new Error('PNG does not begin with IHDR');
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bitDepth: bytes[24],
    colorType: bytes[25],
    compressionMethod: bytes[26],
    filterMethod: bytes[27],
    interlaceMethod: bytes[28],
  };
}

function listChunks(bytes) {
  const chunks = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    chunks.push({ type, length });
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  return chunks;
}

function rgbaAt(image, x, y) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
    throw new Error(`Sample coordinate outside image: ${x},${y}`);
  }
  const offset = (y * image.width + x) * 4;
  return Array.from(image.data.subarray(offset, offset + 4));
}

function compositePixel(rgba, background) {
  const alpha = rgba[3] / 255;
  return [
    Math.round(rgba[0] * alpha + background[0] * (1 - alpha)),
    Math.round(rgba[1] * alpha + background[1] * (1 - alpha)),
    Math.round(rgba[2] * alpha + background[2] * (1 - alpha)),
    255,
  ];
}

function checkerBackground(x, y) {
  const light = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0;
  return light ? [224, 224, 224] : [48, 48, 48];
}

function compositeBuffer(image, mode) {
  const output = Buffer.alloc(image.width * image.height * 4);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      const rgba = Array.from(image.data.subarray(offset, offset + 4));
      const background = mode === 'black'
        ? [0, 0, 0]
        : mode === 'white'
          ? [255, 255, 255]
          : checkerBackground(x, y);
      const composited = compositePixel(rgba, background);
      output.set(composited, offset);
    }
  }
  return output;
}

function inspectPng(inputPath, manifestPath) {
  const bytes = fs.readFileSync(inputPath);
  const ihdr = parseIhdr(bytes);
  const image = PNG.sync.read(bytes);
  const alphaHistogram = new Array(256).fill(0);
  let coverage = 0;
  let weightedX = 0;
  let weightedY = 0;
  let partialAlphaPixels = 0;
  let transparentPixels = 0;
  let opaquePixels = 0;
  let transparentNonzeroRgbPixels = 0;
  let partialRgbExceedsAlphaPixels = 0;
  let partialRgbWithinAlphaPixels = 0;
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      const r = image.data[offset];
      const g = image.data[offset + 1];
      const b = image.data[offset + 2];
      const alpha = image.data[offset + 3];
      alphaHistogram[alpha] += 1;
      const normalizedAlpha = alpha / 255;
      coverage += normalizedAlpha;
      weightedX += x * normalizedAlpha;
      weightedY += y * normalizedAlpha;

      if (alpha === 0) {
        transparentPixels += 1;
        if (r !== 0 || g !== 0 || b !== 0) transparentNonzeroRgbPixels += 1;
      } else {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        if (alpha === 255) {
          opaquePixels += 1;
        } else {
          partialAlphaPixels += 1;
          if (r > alpha || g > alpha || b > alpha) partialRgbExceedsAlphaPixels += 1;
          else partialRgbWithinAlphaPixels += 1;
        }
      }
    }
  }

  const uniqueAlphaValues = alphaHistogram
    .map((count, alpha) => ({ alpha, count }))
    .filter((entry) => entry.count > 0);
  const sampleValidation = [];
  let manifest = null;
  if (manifestPath) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const point of manifest.samplePoints ?? []) {
      const actualRgba = rgbaAt(image, point.x, point.y);
      sampleValidation.push({
        id: point.id,
        x: point.x,
        y: point.y,
        expectedRgba: point.expectedRgba,
        actualRgba,
        pass: actualRgba.every((value, index) => value === point.expectedRgba[index]),
      });
    }
  }

  const composites = {};
  for (const mode of ['black', 'white', 'checker']) {
    composites[mode] = {
      decodedRgbaSha256: sha256(compositeBuffer(image, mode)),
    };
  }

  return {
    inputPath: path.resolve(inputPath),
    encodedSha256: sha256(bytes),
    encodedBytes: bytes.length,
    ihdr,
    chunks: listChunks(bytes),
    decoded: {
      width: image.width,
      height: image.height,
      pixelCount: image.width * image.height,
      uniqueAlphaValueCount: uniqueAlphaValues.length,
      uniqueAlphaValues,
      transparentPixels,
      partialAlphaPixels,
      opaquePixels,
      transparentNonzeroRgbPixels,
      totalAlphaCoveragePixels: coverage,
      alphaCentroid: {
        x: coverage > 0 ? weightedX / coverage : image.width / 2,
        y: coverage > 0 ? weightedY / coverage : image.height / 2,
      },
      nonzeroAlphaBounds: maxX >= 0 ? { minX, minY, maxX, maxY } : null,
      premultiplicationIndicators: {
        partialRgbExceedsAlphaPixels,
        partialRgbWithinAlphaPixels,
        interpretation:
          'Indicators only: RGB<=alpha is compatible with premultiplied storage but is not proof.',
      },
    },
    manifest: manifest
      ? {
          path: path.resolve(manifestPath),
          fixtureId: manifest.fixtureId,
          declaredPngSha256: manifest.png?.sha256,
          encodedHashMatches: manifest.png?.sha256 === sha256(bytes),
          sampleCount: sampleValidation.length,
          samplePassCount: sampleValidation.filter((sample) => sample.pass).length,
          sampleFailCount: sampleValidation.filter((sample) => !sample.pass).length,
          samples: sampleValidation,
        }
      : null,
    composites,
  };
}

function comparePng(referencePath, candidatePath) {
  const referenceBytes = fs.readFileSync(referencePath);
  const candidateBytes = fs.readFileSync(candidatePath);
  const reference = PNG.sync.read(referenceBytes);
  const candidate = PNG.sync.read(candidateBytes);
  const dimensionsMatch =
    reference.width === candidate.width && reference.height === candidate.height;
  if (!dimensionsMatch) {
    return {
      referencePath: path.resolve(referencePath),
      candidatePath: path.resolve(candidatePath),
      dimensionsMatch: false,
      referenceDimensions: { width: reference.width, height: reference.height },
      candidateDimensions: { width: candidate.width, height: candidate.height },
      encodedBytesEqual: referenceBytes.equals(candidateBytes),
      encodedSha256: {
        reference: sha256(referenceBytes),
        candidate: sha256(candidateBytes),
      },
    };
  }

  let mismatchedPixels = 0;
  let mismatchedAlphaPixels = 0;
  let maxChannelDelta = 0;
  const channelAbsoluteError = [0, 0, 0, 0];
  for (let offset = 0; offset < reference.data.length; offset += 4) {
    let pixelMismatch = false;
    for (let channel = 0; channel < 4; channel += 1) {
      const delta = Math.abs(reference.data[offset + channel] - candidate.data[offset + channel]);
      channelAbsoluteError[channel] += delta;
      maxChannelDelta = Math.max(maxChannelDelta, delta);
      if (delta !== 0) pixelMismatch = true;
    }
    if (pixelMismatch) mismatchedPixels += 1;
    if (reference.data[offset + 3] !== candidate.data[offset + 3]) {
      mismatchedAlphaPixels += 1;
    }
  }

  const compositeComparisons = {};
  for (const mode of ['black', 'white', 'checker']) {
    const referenceComposite = compositeBuffer(reference, mode);
    const candidateComposite = compositeBuffer(candidate, mode);
    let absoluteError = 0;
    let maxDelta = 0;
    for (let i = 0; i < referenceComposite.length; i += 1) {
      const delta = Math.abs(referenceComposite[i] - candidateComposite[i]);
      absoluteError += delta;
      maxDelta = Math.max(maxDelta, delta);
    }
    compositeComparisons[mode] = {
      meanAbsoluteChannelError: absoluteError / referenceComposite.length,
      maxChannelDelta: maxDelta,
      referenceSha256: sha256(referenceComposite),
      candidateSha256: sha256(candidateComposite),
    };
  }

  return {
    referencePath: path.resolve(referencePath),
    candidatePath: path.resolve(candidatePath),
    dimensionsMatch,
    encodedBytesEqual: referenceBytes.equals(candidateBytes),
    encodedSha256: {
      reference: sha256(referenceBytes),
      candidate: sha256(candidateBytes),
    },
    decodedRgbaEqual: mismatchedPixels === 0,
    mismatchedPixels,
    mismatchedAlphaPixels,
    maxChannelDelta,
    meanAbsoluteChannelError: channelAbsoluteError.map(
      (error) => error / (reference.width * reference.height),
    ),
    compositeComparisons,
  };
}

function writeResult(result, outputPath) {
  const json = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath) {
    fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
    fs.writeFileSync(outputPath, json, 'utf8');
  }
  process.stdout.write(json);
}

function usage() {
  return [
    'Usage:',
    '  node alpha-inspector.mjs inspect --input <png> [--manifest <json>] [--output <json>]',
    '  node alpha-inspector.mjs compare --reference <png> --candidate <png> [--output <json>]',
  ].join('\n');
}

const { command, options } = parseArgs(process.argv.slice(2));
if (command === 'inspect') {
  if (!options.input) throw new Error(`--input is required\n${usage()}`);
  writeResult(inspectPng(options.input, options.manifest), options.output);
} else if (command === 'compare') {
  if (!options.reference || !options.candidate) {
    throw new Error(`--reference and --candidate are required\n${usage()}`);
  }
  writeResult(comparePng(options.reference, options.candidate), options.output);
} else {
  throw new Error(usage());
}
