import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

const appRoot = process.cwd();
const specRoot = path.join(appRoot, 'specs', '129-alpha-pipeline-boundary-diagnostics');
const packageRoot = path.join(specRoot, 'evidence', 'packages');
const matrix = JSON.parse(await fs.readFile(path.join(packageRoot, 'T030-package-matrix.json'), 'utf8'));
const binaryDiagnostic = JSON.parse(await fs.readFile(
  path.join(specRoot, 'evidence', 'binary-control', 'T029-binary-label-control.zpk.diagnostic.json'),
  'utf8',
));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

function firstDifference(left, right) {
  const limit = Math.min(left.length, right.length);
  for (let index = 0; index < limit; index += 1) {
    if (left[index] !== right[index]) return index;
  }
  return left.length === right.length ? -1 : limit;
}

const comparisons = [];
for (const packageEntry of matrix.packages.filter(({ id }) => id !== 'P11')) {
  for (const asset of packageEntry.assets) {
    const sourcePath = path.join(appRoot, asset.source);
    const extractedPath = path.join(
      packageRoot,
      'extracted',
      packageEntry.id,
      'device',
      ...asset.target.split('/'),
    );
    const [sourceBytes, extractedBytes] = await Promise.all([
      fs.readFile(sourcePath),
      fs.readFile(extractedPath),
    ]);
    comparisons.push({
      packageId: packageEntry.id,
      asset: asset.target,
      comparisonClass: 'route-source-to-extracted-package',
      sourceByteLength: sourceBytes.length,
      extractedByteLength: extractedBytes.length,
      sourceSha256: sha256(sourceBytes),
      extractedSha256: sha256(extractedBytes),
      firstDifferingByte: firstDifference(sourceBytes, extractedBytes),
      exact: sourceBytes.equals(extractedBytes),
    });
  }
}

const p11Entry = matrix.packages.find(({ id }) => id === 'P11');
const p11SourceBytes = await fs.readFile(path.join(appRoot, p11Entry.exactCopyOf));
const p11SourceOuter = await JSZip.loadAsync(p11SourceBytes);
const p11SourceDeviceBytes = await p11SourceOuter.file('device.zip').async('nodebuffer');
const p11SourceDevice = await JSZip.loadAsync(p11SourceDeviceBytes);
for (const asset of binaryDiagnostic.assets) {
  const sourceBytes = await p11SourceDevice.file(asset.name).async('nodebuffer');
  const extractedPath = path.join(
    packageRoot,
    'extracted',
    'P11',
    'device',
    ...asset.name.split('/'),
  );
  const extractedBytes = await fs.readFile(extractedPath);
  comparisons.push({
    packageId: 'P11',
    asset: asset.name,
    comparisonClass: 'binary-control-source-package-to-extracted-copy',
    sourceByteLength: sourceBytes.length,
    extractedByteLength: extractedBytes.length,
    sourceSha256: sha256(sourceBytes),
    extractedSha256: sha256(extractedBytes),
    firstDifferingByte: firstDifference(sourceBytes, extractedBytes),
    exact: sourceBytes.equals(extractedBytes),
  });
}

const packageSummary = matrix.packages.map(({ id }) => {
  const packageComparisons = comparisons.filter(({ packageId }) => packageId === id);
  return {
    id,
    assetCount: packageComparisons.length,
    exactCount: packageComparisons.filter(({ exact }) => exact).length,
    differingCount: packageComparisons.filter(({ exact }) => !exact).length,
    result: packageComparisons.length > 0 && packageComparisons.every(({ exact }) => exact)
      ? 'PASS'
      : 'FAIL',
  };
});
const result = {
  task: 'T032',
  testOnly: true,
  comparisonType: 'encoded PNG bytes; no decoding',
  totalAssets: comparisons.length,
  exactAssets: comparisons.filter(({ exact }) => exact).length,
  differingAssets: comparisons.filter(({ exact }) => !exact).length,
  result: comparisons.every(({ exact }) => exact) ? 'PASS' : 'FAIL',
  packages: packageSummary,
  comparisons,
};
await fs.writeFile(
  path.join(packageRoot, 'T032-encoded-byte-comparison.json'),
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(JSON.stringify({
  task: result.task,
  result: result.result,
  totalAssets: result.totalAssets,
  exactAssets: result.exactAssets,
  differingAssets: result.differingAssets,
  packages: result.packages,
}, null, 2));
if (result.result !== 'PASS') process.exitCode = 1;
