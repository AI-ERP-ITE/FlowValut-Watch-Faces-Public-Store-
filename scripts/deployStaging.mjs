import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const firebaseRoot = path.resolve(appRoot, '..', 'firebase');
const projectId = 'flowvault-staging-2026';

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed with exit ${result.status}`);
}

run('npm', ['run', 'prepare:hosting:staging'], appRoot);
run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['-y', 'firebase-tools@latest', 'deploy', '--config', 'firebase.staging.json', '--project', projectId, '--only', 'hosting'], firebaseRoot);

console.log('Staging deployed to https://flowvault-staging-2026.web.app');
