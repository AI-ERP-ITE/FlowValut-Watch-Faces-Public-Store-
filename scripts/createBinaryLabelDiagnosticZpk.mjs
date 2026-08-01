import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from 'canvas';
import JSZip from 'jszip';

const [inputPathArg, outputPathArg] = process.argv.slice(2);

if (!inputPathArg || !outputPathArg) {
  console.error('Usage: node scripts/createBinaryLabelDiagnosticZpk.mjs <input.zpk> <output.zpk>');
  process.exit(1);
}

const inputPath = path.resolve(inputPathArg);
const outputPath = path.resolve(outputPathArg);
const TARGET_ASSET = /^assets\/(?:week|month)_main_[^/]+_\d+\.png$/;

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

async function zipContentHashes(zip) {
  const hashes = new Map();
  for (const [name, entry] of Object.entries(zip.files)) {
    if (!entry.dir) hashes.set(name, sha256(await entry.async('nodebuffer')));
  }
  return hashes;
}

function dominantOpaqueRgb(data) {
  const counts = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] !== 255) continue;
    const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (counts.size === 0) {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const winner = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '255,255,255';
  return winner.split(',').map(Number);
}

function alphaStats(data, width, height) {
  let coverage = 0;
  let weightedX = 0;
  let weightedY = 0;
  let partial = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3] / 255;
      coverage += alpha;
      weightedX += x * alpha;
      weightedY += y * alpha;
      if (alpha > 0 && alpha < 1) partial += 1;
    }
  }
  return {
    coverage,
    centroidX: coverage > 0 ? weightedX / coverage : width / 2,
    centroidY: coverage > 0 ? weightedY / coverage : height / 2,
    partial,
  };
}

function binaryMaskPreservingCoverageAndCentroid(data, width, height) {
  const source = alphaStats(data, width, height);
  const opaqueCount = Math.max(1, Math.round(source.coverage));
  const pixels = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 0) pixels.push({ x, y, alpha, selected: false });
    }
  }

  pixels.sort((a, b) =>
    b.alpha - a.alpha
    || Math.hypot(a.x - source.centroidX, a.y - source.centroidY)
      - Math.hypot(b.x - source.centroidX, b.y - source.centroidY)
    || a.y - b.y
    || a.x - b.x
  );

  for (let i = 0; i < Math.min(opaqueCount, pixels.length); i += 1) pixels[i].selected = true;

  let selectedX = pixels.filter((p) => p.selected).reduce((sum, p) => sum + p.x, 0);
  let selectedY = pixels.filter((p) => p.selected).reduce((sum, p) => sum + p.y, 0);
  const targetX = source.centroidX * opaqueCount;
  const targetY = source.centroidY * opaqueCount;
  const centroidError = (sumX, sumY) =>
    ((sumX - targetX) / opaqueCount) ** 2 + ((sumY - targetY) / opaqueCount) ** 2;

  // Swap only antialiased boundary pixels. Fully opaque core pixels remain fixed.
  // The primary objective is centroid parity; alpha fidelity breaks near-equal ties.
  for (let iteration = 0; iteration < 256; iteration += 1) {
    const selectedBoundary = pixels.filter((p) => p.selected && p.alpha < 255);
    const unselectedBoundary = pixels.filter((p) => !p.selected && p.alpha > 0);
    const currentError = centroidError(selectedX, selectedY);
    let best = null;

    for (const remove of selectedBoundary) {
      for (const add of unselectedBoundary) {
        const nextX = selectedX - remove.x + add.x;
        const nextY = selectedY - remove.y + add.y;
        const nextError = centroidError(nextX, nextY);
        const alphaPenalty = Math.max(0, remove.alpha - add.alpha) / 255 * 0.0005;
        const score = nextError + alphaPenalty;
        if (score + 1e-12 >= currentError) continue;
        if (!best || score < best.score) best = { remove, add, nextX, nextY, score };
      }
    }

    if (!best) break;
    best.remove.selected = false;
    best.add.selected = true;
    selectedX = best.nextX;
    selectedY = best.nextY;
  }

  const selected = new Set(
    pixels.filter((p) => p.selected).map((p) => p.y * width + p.x),
  );
  const output = new Uint8ClampedArray(data.length);
  const [red, green, blue] = dominantOpaqueRgb(data);

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    if (selected.has(pixel)) {
      output[offset] = red;
      output[offset + 1] = green;
      output[offset + 2] = blue;
      output[offset + 3] = 255;
    } else {
      output[offset] = 0;
      output[offset + 1] = 0;
      output[offset + 2] = 0;
      output[offset + 3] = 0;
    }
  }

  return {
    output,
    source,
    result: alphaStats(output, width, height),
    rgb: [red, green, blue],
  };
}

async function transformPng(bytes) {
  const image = await loadImage(bytes);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  const sourceImage = context.getImageData(0, 0, image.width, image.height);
  const transformed = binaryMaskPreservingCoverageAndCentroid(
    sourceImage.data,
    image.width,
    image.height,
  );
  const outputCanvas = createCanvas(image.width, image.height);
  const outputContext = outputCanvas.getContext('2d');
  const outputImage = outputContext.createImageData(image.width, image.height);
  outputImage.data.set(transformed.output);
  outputContext.putImageData(outputImage, 0, 0);
  return {
    bytes: outputCanvas.toBuffer('image/png'),
    width: image.width,
    height: image.height,
    ...transformed,
  };
}

const originalOuterBytes = fs.readFileSync(inputPath);
const outerZip = await JSZip.loadAsync(originalOuterBytes);
const originalOuterHashes = await zipContentHashes(outerZip);
const originalDeviceBytes = await outerZip.file('device.zip')?.async('nodebuffer');
if (!originalDeviceBytes) throw new Error('Input ZPK does not contain device.zip');

const deviceZip = await JSZip.loadAsync(originalDeviceBytes);
const originalDeviceHashes = await zipContentHashes(deviceZip);
const targetNames = Object.keys(deviceZip.files).filter((name) => TARGET_ASSET.test(name)).sort();
if (targetNames.length === 0) throw new Error('No main weekday/month label PNGs found');

const report = [];
for (const name of targetNames) {
  const originalBytes = await deviceZip.file(name).async('nodebuffer');
  const transformed = await transformPng(originalBytes);
  deviceZip.file(name, transformed.bytes);
  const coverageError = transformed.result.coverage - transformed.source.coverage;
  const centroidShift = Math.hypot(
    transformed.result.centroidX - transformed.source.centroidX,
    transformed.result.centroidY - transformed.source.centroidY,
  );
  report.push({
    name,
    size: `${transformed.width}x${transformed.height}`,
    rgb: transformed.rgb.join(','),
    sourceCoverage: transformed.source.coverage,
    binaryCoverage: transformed.result.coverage,
    coverageError,
    centroidShift,
    sourcePartialAlphaPixels: transformed.source.partial,
    resultPartialAlphaPixels: transformed.result.partial,
  });
}

const nextDeviceBytes = await deviceZip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 },
});
outerZip.file('device.zip', nextDeviceBytes);
const nextOuterBytes = await outerZip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 },
});
fs.writeFileSync(outputPath, nextOuterBytes);

const verificationOuter = await JSZip.loadAsync(nextOuterBytes);
const verificationOuterHashes = await zipContentHashes(verificationOuter);
const verificationDevice = await JSZip.loadAsync(
  await verificationOuter.file('device.zip').async('nodebuffer'),
);
const verificationDeviceHashes = await zipContentHashes(verificationDevice);

for (const [name, hash] of originalOuterHashes) {
  if (name === 'device.zip') continue;
  if (verificationOuterHashes.get(name) !== hash) {
    throw new Error(`Outer archive parity failure: ${name}`);
  }
}
for (const [name, hash] of originalDeviceHashes) {
  if (TARGET_ASSET.test(name)) continue;
  if (verificationDeviceHashes.get(name) !== hash) {
    throw new Error(`Device archive parity failure: ${name}`);
  }
}

const summary = {
  inputPath,
  outputPath,
  transformedAssetCount: report.length,
  untouchedOuterEntriesVerified: originalOuterHashes.size - 1,
  untouchedDeviceEntriesVerified: originalDeviceHashes.size - report.length,
  maxAbsoluteCoverageErrorPixels: Math.max(...report.map((item) => Math.abs(item.coverageError))),
  maxCentroidShiftPixels: Math.max(...report.map((item) => item.centroidShift)),
  assets: report,
};

const reportPath = `${outputPath}.diagnostic.json`;
fs.writeFileSync(reportPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({ ...summary, assets: undefined, reportPath }, null, 2));
