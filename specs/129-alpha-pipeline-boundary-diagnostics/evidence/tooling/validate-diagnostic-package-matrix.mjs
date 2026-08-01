import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

const appRoot = process.cwd();
const packageRoot = path.join(appRoot, 'specs', '129-alpha-pipeline-boundary-diagnostics', 'evidence', 'packages');
const matrixPath = path.join(packageRoot, 'T030-package-matrix.json');
const resultPath = path.join(packageRoot, 'T030-package-validation.json');
const matrix = JSON.parse(await fs.readFile(matrixPath, 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const results = [];

for (const entry of matrix.packages) {
  const packagePath = path.join(packageRoot, entry.package);
  const packageBytes = await fs.readFile(packagePath);
  const outer = await JSZip.loadAsync(packageBytes);
  const deviceEntry = outer.file('device.zip');
  if (!deviceEntry) throw new Error(`${entry.id}: device.zip missing`);
  const deviceBytes = await deviceEntry.async('nodebuffer');
  const device = await JSZip.loadAsync(deviceBytes);
  const index = await device.file('watchface/index.js')?.async('string');
  const appJson = await device.file('app.json')?.async('string');
  const checks = {
    packageHashMatches: sha256(packageBytes) === entry.sha256,
    packageSizeMatches: packageBytes.length === entry.byteLength,
    outerReadable: true,
    nestedDeviceReadable: true,
    indexPresent: Boolean(index),
    appJsonPresent: Boolean(appJson),
    binaryControlExactCopy: entry.id !== 'P11'
      || packageBytes.equals(await fs.readFile(path.join(appRoot, entry.exactCopyOf))),
  };

  if (entry.id !== 'P11') {
    const internal = JSON.parse(await device.file('spec129-diagnostic.json').async('string'));
    checks.internalManifestMatches = internal.packageId === entry.id && internal.testOnly === true;
    checks.testMarkerPresent = index.includes(`SPEC129 ${entry.id} TEST-ONLY`);
    checks.offscreenIsolationRecorded = internal.offscreenIsolation === true;
    checks.allAssetsPresent = entry.assets.every(({ target }) => Boolean(device.file(target)));
    checks.allAssetHashesMatch = true;
    checks.allAssetsReferenced = true;
    for (const asset of entry.assets) {
      const packaged = await device.file(asset.target).async('nodebuffer');
      checks.allAssetHashesMatch &&= sha256(packaged) === asset.sha256;
      checks.allAssetsReferenced &&= index.includes(path.posix.basename(asset.target));
    }
  }

  const passed = Object.values(checks).every(Boolean);
  results.push({ id: entry.id, passed, checks });
}

const validation = {
  task: 'T030',
  testOnly: true,
  packageCount: results.length,
  passedCount: results.filter(({ passed }) => passed).length,
  failedCount: results.filter(({ passed }) => !passed).length,
  result: results.every(({ passed }) => passed) ? 'PASS' : 'FAIL',
  packages: results,
};
await fs.writeFile(resultPath, `${JSON.stringify(validation, null, 2)}\n`);
console.log(JSON.stringify(validation, null, 2));
if (validation.result !== 'PASS') process.exitCode = 1;
