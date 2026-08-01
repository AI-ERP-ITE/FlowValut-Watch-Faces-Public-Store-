import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const JSZip = require('../../../../node_modules/jszip');
const { PNG } = require('../../../../node_modules/pngjs');

const [sourceArg, candidateArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !candidateArg || !outputArg) {
  throw new Error('Usage: node validate-binary-label-control.mjs <source.zpk> <candidate.zpk> <output.json>');
}

const targetPattern = /^assets\/(?:week|month)_main_[^/]+_\d+\.png$/;

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

async function fileMap(zip) {
  const result = new Map();
  for (const [name, entry] of Object.entries(zip.files)) {
    if (!entry.dir) result.set(name, await entry.async('nodebuffer'));
  }
  return result;
}

function alphaMetrics(bytes) {
  const png = PNG.sync.read(bytes);
  let coverage = 0;
  let weightedX = 0;
  let weightedY = 0;
  let partial = 0;
  let opaque = 0;
  let transparent = 0;
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  const alphaValues = new Set();
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const alphaByte = png.data[(y * png.width + x) * 4 + 3];
      const alpha = alphaByte / 255;
      alphaValues.add(alphaByte);
      coverage += alpha;
      weightedX += x * alpha;
      weightedY += y * alpha;
      if (alphaByte === 0) transparent += 1;
      else {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        if (alphaByte === 255) opaque += 1;
        else partial += 1;
      }
    }
  }
  return {
    width: png.width,
    height: png.height,
    alphaValues: [...alphaValues].sort((left, right) => left - right),
    coverage,
    centroid: {
      x: weightedX / coverage,
      y: weightedY / coverage,
    },
    transparent,
    partial,
    opaque,
    bounds: maxX >= 0 ? { minX, minY, maxX, maxY } : null,
  };
}

const sourcePath = path.resolve(sourceArg);
const candidatePath = path.resolve(candidateArg);
const sourceOuter = await JSZip.loadAsync(fs.readFileSync(sourcePath));
const candidateOuter = await JSZip.loadAsync(fs.readFileSync(candidatePath));
const sourceOuterFiles = await fileMap(sourceOuter);
const candidateOuterFiles = await fileMap(candidateOuter);
const sourceDevice = await JSZip.loadAsync(sourceOuterFiles.get('device.zip'));
const candidateDevice = await JSZip.loadAsync(candidateOuterFiles.get('device.zip'));
const sourceDeviceFiles = await fileMap(sourceDevice);
const candidateDeviceFiles = await fileMap(candidateDevice);

const outerEntryResults = [...sourceOuterFiles.keys()]
  .filter((name) => name !== 'device.zip')
  .map((name) => ({
    name,
    equal:
      candidateOuterFiles.has(name) &&
      sourceOuterFiles.get(name).equals(candidateOuterFiles.get(name)),
  }));
const deviceEntryResults = [...sourceDeviceFiles.keys()].map((name) => ({
  name,
  target: targetPattern.test(name),
  equal:
    candidateDeviceFiles.has(name) &&
    sourceDeviceFiles.get(name).equals(candidateDeviceFiles.get(name)),
}));
const targetNames = deviceEntryResults
  .filter((entry) => entry.target)
  .map((entry) => entry.name)
  .sort();

const targets = targetNames.map((name) => {
  const sourceBytes = sourceDeviceFiles.get(name);
  const candidateBytes = candidateDeviceFiles.get(name);
  const source = alphaMetrics(sourceBytes);
  const candidate = alphaMetrics(candidateBytes);
  const centroidShift = Math.hypot(
    candidate.centroid.x - source.centroid.x,
    candidate.centroid.y - source.centroid.y,
  );
  const boundsDelta = {
    minX: candidate.bounds.minX - source.bounds.minX,
    minY: candidate.bounds.minY - source.bounds.minY,
    maxX: candidate.bounds.maxX - source.bounds.maxX,
    maxY: candidate.bounds.maxY - source.bounds.maxY,
  };
  return {
    name,
    sourceSha256: sha256(sourceBytes),
    candidateSha256: sha256(candidateBytes),
    dimensionsMatch:
      source.width === candidate.width && source.height === candidate.height,
    source,
    candidate,
    binaryAlpha: candidate.alphaValues.every(
      (value) => value === 0 || value === 255,
    ),
    coverageError: candidate.coverage - source.coverage,
    centroidShift,
    boundsDelta,
  };
});

const result = {
  result:
    outerEntryResults.every((entry) => entry.equal) &&
    deviceEntryResults
      .filter((entry) => !entry.target)
      .every((entry) => entry.equal) &&
    targets.length === 19 &&
    targets.every(
      (target) =>
        target.dimensionsMatch &&
        target.source.partial > 0 &&
        target.candidate.partial === 0 &&
        target.binaryAlpha,
    )
      ? 'PASS'
      : 'FAIL',
  sourcePath,
  candidatePath,
  sourceOuterSha256: sha256(fs.readFileSync(sourcePath)),
  candidateOuterSha256: sha256(fs.readFileSync(candidatePath)),
  targetCount: targets.length,
  unchangedOuterEntryCount:
    outerEntryResults.filter((entry) => entry.equal).length,
  unchangedNonTargetDeviceEntryCount:
    deviceEntryResults.filter((entry) => !entry.target && entry.equal).length,
  changedTargetCount:
    deviceEntryResults.filter((entry) => entry.target && !entry.equal).length,
  maximumAbsoluteCoverageError:
    Math.max(...targets.map((target) => Math.abs(target.coverageError))),
  maximumCentroidShift:
    Math.max(...targets.map((target) => target.centroidShift)),
  maximumAbsoluteBoundsDelta:
    Math.max(
      ...targets.flatMap((target) =>
        Object.values(target.boundsDelta).map((value) => Math.abs(value)),
      ),
    ),
  outerEntryResults,
  deviceEntryResults,
  targets,
};

const outputPath = path.resolve(outputArg);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({
  result: result.result,
  targetCount: result.targetCount,
  unchangedOuterEntryCount: result.unchangedOuterEntryCount,
  unchangedNonTargetDeviceEntryCount: result.unchangedNonTargetDeviceEntryCount,
  changedTargetCount: result.changedTargetCount,
  maximumAbsoluteCoverageError: result.maximumAbsoluteCoverageError,
  maximumCentroidShift: result.maximumCentroidShift,
  maximumAbsoluteBoundsDelta: result.maximumAbsoluteBoundsDelta,
}, null, 2)}\n`);
if (result.result !== 'PASS') process.exitCode = 1;
