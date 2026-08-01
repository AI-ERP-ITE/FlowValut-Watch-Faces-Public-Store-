import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

const appRoot = process.cwd();
const packageRoot = path.join(appRoot, 'specs', '129-alpha-pipeline-boundary-diagnostics', 'evidence', 'packages');
const extractionRoot = path.join(packageRoot, 'extracted');
const matrix = JSON.parse(await fs.readFile(path.join(packageRoot, 'T030-package-matrix.json'), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

function safeTarget(root, zipName) {
  const normalized = zipName.replaceAll('\\', '/');
  if (normalized.startsWith('/') || normalized.split('/').includes('..')) {
    throw new Error(`Unsafe ZIP entry: ${zipName}`);
  }
  const target = path.resolve(root, ...normalized.split('/'));
  const resolvedRoot = path.resolve(root);
  if (target !== resolvedRoot && !target.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`ZIP entry escaped extraction root: ${zipName}`);
  }
  return target;
}

async function extractZip(zip, root) {
  const inventory = [];
  for (const [name, entry] of Object.entries(zip.files).sort(([a], [b]) => a.localeCompare(b))) {
    const target = safeTarget(root, name);
    if (entry.dir) {
      await fs.mkdir(target, { recursive: true });
      inventory.push({ name, directory: true });
      continue;
    }
    const bytes = await entry.async('nodebuffer');
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes);
    const reread = await fs.readFile(target);
    inventory.push({
      name,
      directory: false,
      byteLength: bytes.length,
      sha256: sha256(bytes),
      extractedSha256: sha256(reread),
      writeVerified: bytes.equals(reread),
    });
  }
  return inventory;
}

await fs.mkdir(extractionRoot, { recursive: true });
const results = [];

for (const packageEntry of matrix.packages) {
  const packagePath = path.join(packageRoot, packageEntry.package);
  const packageBytes = await fs.readFile(packagePath);
  const packageExtractRoot = path.join(extractionRoot, packageEntry.id);
  const outerRoot = path.join(packageExtractRoot, 'outer');
  const deviceRoot = path.join(packageExtractRoot, 'device');
  await fs.mkdir(outerRoot, { recursive: true });
  await fs.mkdir(deviceRoot, { recursive: true });

  const outer = await JSZip.loadAsync(packageBytes);
  const outerInventory = await extractZip(outer, outerRoot);
  const deviceEntry = outer.file('device.zip');
  if (!deviceEntry) throw new Error(`${packageEntry.id}: device.zip missing`);
  const nestedBytes = await deviceEntry.async('nodebuffer');
  const nested = await JSZip.loadAsync(nestedBytes);
  const deviceInventory = await extractZip(nested, deviceRoot);

  const extractedDeviceBytes = await fs.readFile(path.join(outerRoot, 'device.zip'));
  const result = {
    id: packageEntry.id,
    package: packageEntry.package,
    packageSha256: sha256(packageBytes),
    expectedPackageSha256: packageEntry.sha256,
    outerFileCount: outerInventory.filter(({ directory }) => !directory).length,
    deviceFileCount: deviceInventory.filter(({ directory }) => !directory).length,
    nestedDeviceSha256: sha256(nestedBytes),
    extractedDeviceSha256: sha256(extractedDeviceBytes),
    nestedDeviceWriteVerified: nestedBytes.equals(extractedDeviceBytes),
    allOuterWritesVerified: outerInventory.filter(({ directory }) => !directory).every(({ writeVerified }) => writeVerified),
    allDeviceWritesVerified: deviceInventory.filter(({ directory }) => !directory).every(({ writeVerified }) => writeVerified),
    outerInventory,
    deviceInventory,
  };
  await fs.writeFile(
    path.join(packageExtractRoot, 'extraction-manifest.json'),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  results.push(result);
}

const validation = {
  task: 'T031',
  testOnly: true,
  extractionRoot,
  packageCount: results.length,
  passedCount: results.filter((result) =>
    result.packageSha256 === result.expectedPackageSha256
    && result.nestedDeviceWriteVerified
    && result.allOuterWritesVerified
    && result.allDeviceWritesVerified
    && result.outerFileCount > 0
    && result.deviceFileCount > 0).length,
  packages: results.map((result) => ({
    id: result.id,
    packageSha256Matches: result.packageSha256 === result.expectedPackageSha256,
    outerFileCount: result.outerFileCount,
    deviceFileCount: result.deviceFileCount,
    nestedDeviceWriteVerified: result.nestedDeviceWriteVerified,
    allOuterWritesVerified: result.allOuterWritesVerified,
    allDeviceWritesVerified: result.allDeviceWritesVerified,
  })),
};
validation.failedCount = validation.packageCount - validation.passedCount;
validation.result = validation.failedCount === 0 ? 'PASS' : 'FAIL';
await fs.writeFile(
  path.join(packageRoot, 'T031-extraction-validation.json'),
  `${JSON.stringify(validation, null, 2)}\n`,
);
console.log(JSON.stringify(validation, null, 2));
if (validation.result !== 'PASS') process.exitCode = 1;
