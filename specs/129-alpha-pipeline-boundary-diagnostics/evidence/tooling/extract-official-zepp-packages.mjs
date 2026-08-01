import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

const appRoot = process.cwd();
const officialRoot = path.join(
  appRoot,
  'specs',
  '129-alpha-pipeline-boundary-diagnostics',
  'evidence',
  'official-zepp',
);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

function safeTarget(root, name) {
  const parts = name.replaceAll('\\', '/').split('/');
  if (name.startsWith('/') || parts.includes('..')) throw new Error(`Unsafe ZIP entry: ${name}`);
  const target = path.resolve(root, ...parts);
  if (!target.startsWith(`${path.resolve(root)}${path.sep}`)) throw new Error(`Escaped root: ${name}`);
  return target;
}

async function extract(zipBytes, root) {
  const zip = await JSZip.loadAsync(zipBytes);
  const files = [];
  for (const [name, entry] of Object.entries(zip.files).sort(([a], [b]) => a.localeCompare(b))) {
    if (entry.dir) continue;
    const bytes = await entry.async('nodebuffer');
    const target = safeTarget(root, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes);
    files.push({ name, byteLength: bytes.length, sha256: sha256(bytes) });
  }
  return { zip, files };
}

const definitions = [
  ['P9', 'P9-per-pixel-alpha'],
  ['P10', 'P10-widget-opacity'],
];
const packages = [];
for (const [id, projectName] of definitions) {
  const projectRoot = path.join(officialRoot, 'projects', projectName);
  const distFiles = (await fs.readdir(path.join(projectRoot, 'dist')))
    .filter((name) => name.endsWith('.zab'))
    .sort();
  if (distFiles.length !== 1) throw new Error(`${id}: expected one ZAB, found ${distFiles.length}`);
  const zabName = distFiles[0];
  const zabPath = path.join(projectRoot, 'dist', zabName);
  const zabBytes = await fs.readFile(zabPath);
  const extractionRoot = path.join(officialRoot, 'extracted', id);
  const outer = await extract(zabBytes, path.join(extractionRoot, 'outer'));
  const zpkEntries = outer.files.filter(({ name }) => name.endsWith('.zpk'));
  if (zpkEntries.length !== 1) throw new Error(`${id}: expected one nested ZPK`);
  const zpkBytes = await fs.readFile(path.join(extractionRoot, 'outer', zpkEntries[0].name));
  const nested = await extract(zpkBytes, path.join(extractionRoot, 'zpk'));
  const deviceEntries = nested.files.filter(({ name }) => name === 'device.zip');
  let device = null;
  if (deviceEntries.length === 1) {
    const deviceBytes = await fs.readFile(path.join(extractionRoot, 'zpk', 'device.zip'));
    device = await extract(deviceBytes, path.join(extractionRoot, 'device'));
  }
  packages.push({
    id,
    projectName,
    zab: { name: zabName, byteLength: zabBytes.length, sha256: sha256(zabBytes) },
    outerFiles: outer.files,
    zpk: { name: zpkEntries[0].name, byteLength: zpkBytes.length, sha256: sha256(zpkBytes) },
    zpkFiles: nested.files,
    deviceFiles: device?.files ?? [],
  });
}

const output = {
  task: 'T043',
  officialCompiler: '@zeppos/zeus-cli 1.9.3 / @zeppos/zpm 3.4.2',
  packageCount: packages.length,
  packages,
};
await fs.writeFile(
  path.join(officialRoot, 'T043-official-extraction-manifest.json'),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(JSON.stringify({
  task: output.task,
  packageCount: output.packageCount,
  packages: packages.map(({ id, zab, outerFiles, zpkFiles, deviceFiles }) => ({
    id,
    zab: zab.name,
    outerFileCount: outerFiles.length,
    zpkFileCount: zpkFiles.length,
    deviceFileCount: deviceFiles.length,
    compiledImages: deviceFiles.filter(({ name }) => /\.(tga|png)$/i.test(name)),
  })),
}, null, 2));
