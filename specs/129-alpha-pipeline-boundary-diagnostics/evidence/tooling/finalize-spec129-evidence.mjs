import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const appRoot = process.cwd();
const specRoot = path.join(appRoot, 'specs', '129-alpha-pipeline-boundary-diagnostics');
const evidenceRoot = path.join(specRoot, 'evidence');
const outputPath = path.join(evidenceRoot, 'T064-final-evidence-manifest.json');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const excludedSegments = new Set(['node_modules', 'npm-cache']);
const files = [];

async function walk(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (excludedSegments.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(absolute);
    } else if (entry.isFile() && absolute !== outputPath) {
      const bytes = await fs.readFile(absolute);
      files.push({
        path: path.relative(specRoot, absolute).replaceAll('\\', '/'),
        byteLength: bytes.length,
        sha256: sha256(bytes),
      });
    }
  }
}

await walk(evidenceRoot);
files.sort((left, right) => left.path.localeCompare(right.path));
const manifest = {
  task: 'T064',
  spec: '129-alpha-pipeline-boundary-diagnostics',
  status: 'COMPLETE_WITH_G7_BLOCKED',
  productionImplementationPerformed: false,
  generatorCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: appRoot,
    encoding: 'utf8',
  }).trim(),
  excludedDependencyDirectories: [
    'evidence/official-zepp/tool-env/node_modules',
    'evidence/official-zepp/npm-cache',
  ],
  evidenceFileCount: files.length,
  totalEvidenceBytes: files.reduce((sum, file) => sum + file.byteLength, 0),
  files,
};
await fs.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  task: manifest.task,
  status: manifest.status,
  productionImplementationPerformed: manifest.productionImplementationPerformed,
  evidenceFileCount: manifest.evidenceFileCount,
  totalEvidenceBytes: manifest.totalEvidenceBytes,
  manifestSha256: sha256(await fs.readFile(outputPath)),
}, null, 2));
