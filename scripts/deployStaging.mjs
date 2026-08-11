import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(appRoot, '..');
const firebaseRoot = path.join(workspaceRoot, 'firebase');
const projectId = 'flowvault-staging-2026';

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: false });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed with exit ${result.status}`);
}

run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'prepare:hosting:staging'], appRoot);
run(process.execPath, [path.join(firebaseRoot, 'scripts', 'prepareStorefrontFunctionsCodebase.mjs'), '--target=staging'], workspaceRoot);

const manifest = JSON.parse(readFileSync(path.join(firebaseRoot, '.staging-hosting', 'flowvault-release.json'), 'utf8'));
if (manifest.schemaVersion !== 2 || manifest.policyVersion !== 151 || manifest.target !== 'staging') {
  throw new Error('Staging build did not produce a Spec 151 Firebase release manifest.');
}

run(process.execPath, [path.join(firebaseRoot, 'scripts', 'createFrozenFirebaseRelease.mjs'), '--upload'], workspaceRoot);

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
run(npx, ['-y', 'firebase-tools@latest', 'deploy', '--config', 'firebase.storefront.staging.json', '--project', projectId, '--only', 'functions:storefront', '--non-interactive'], firebaseRoot);
run(npx, ['-y', 'firebase-tools@latest', 'deploy', '--config', 'firebase.staging.json', '--project', projectId, '--only', 'functions:adminDeploymentSync', '--non-interactive'], firebaseRoot);
run(npx, ['-y', 'firebase-tools@latest', 'deploy', '--config', 'firebase.staging.json', '--project', projectId, '--only', 'hosting', '--non-interactive'], firebaseRoot);

const remote = await fetch('https://flowvault-staging-2026.web.app/flowvault-release.json', { headers: { 'cache-control': 'no-cache' } });
if (!remote.ok) throw new Error(`Deployed staging manifest is unavailable (${remote.status}).`);
const remoteManifest = await remote.json();
if (remoteManifest.releaseId !== manifest.releaseId || remoteManifest.artifactHash !== manifest.artifactHash) {
  throw new Error('The deployed Firebase Hosting release does not match the frozen local package.');
}

run(process.execPath, [path.join(firebaseRoot, 'scripts', 'registerFrozenRelease.mjs'), `--release-id=${manifest.releaseId}`], workspaceRoot);
console.log(`Staging Firebase release ${manifest.releaseId} deployed and registered at https://flowvault-staging-2026.web.app`);
