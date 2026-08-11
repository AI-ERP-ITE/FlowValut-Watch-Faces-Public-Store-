import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(appRoot, '..');
const distRoot = path.join(appRoot, 'dist');
const target = process.argv.find((value) => value.startsWith('--target='))?.split('=')[1];

if (target !== 'staging' && target !== 'production') throw new Error('Use --target=staging or --target=production');

function gitHead(cwd) {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
  if (result.status !== 0) throw new Error(`Cannot resolve Git commit in ${cwd}`);
  return result.stdout.trim();
}

function listFiles(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (relative === 'flowvault-release.json') return [];
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolute, relative) : [relative];
  }).sort();
}

const files = listFiles(distRoot).map((relativePath) => {
  const absolute = path.join(distRoot, ...relativePath.split('/'));
  const bytes = readFileSync(absolute);
  return {
    path: relativePath,
    size: statSync(absolute).size,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
});
const artifactHash = createHash('sha256').update(JSON.stringify(files)).digest('hex');
const appCommit = gitHead(appRoot);
const backendCommit = gitHead(workspaceRoot);
const syncId = `sync-${appCommit.slice(0, 8)}-${backendCommit.slice(0, 8)}-${artifactHash.slice(0, 12)}`;

writeFileSync(path.join(distRoot, 'flowvault-release.json'), `${JSON.stringify({
  schemaVersion: 1,
  syncId,
  target,
  appCommit,
  backendCommit,
  artifactHash,
  fileCount: files.length,
  files,
}, null, 2)}\n`, 'utf8');

console.log(`Promotion manifest ${syncId} written for ${target} (${files.length} files).`);
