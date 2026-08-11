import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanDirectoryForSecrets } from './scanPublicBuildForSecrets.mjs';
import { spawnSync } from 'node:child_process';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const firebaseRoot = path.resolve(appRoot, '..', 'firebase');
const target = process.argv.find((value) => value.startsWith('--target='))?.split('=')[1];

if (target !== 'staging' && target !== 'production') {
  throw new Error('Use --target=staging or --target=production');
}

const hostingRoot = path.join(firebaseRoot, `.${target}-hosting`);

const seo = spawnSync(process.execPath, [path.join(appRoot, 'scripts', 'generateStoreSeo.mjs'), `--target=${target}`], {
  cwd: appRoot,
  stdio: 'inherit',
});
if (seo.status !== 0) throw new Error(`SEO generation failed for ${target}`);

for (const file of ['catalog.json', 'models.json', 'specGroups.json', 'storeConfig.json']) {
  const source = path.join(appRoot, file);
  if (!existsSync(source)) throw new Error(`Required Hosting asset is missing: ${file}`);
  copyFileSync(source, path.join(appRoot, 'dist', file));
}

const fonts = path.join(appRoot, 'public', 'fonts');
if (existsSync(fonts)) cpSync(fonts, path.join(appRoot, 'dist', 'fonts'), { recursive: true });

const manifest = spawnSync(process.execPath, [path.join(appRoot, 'scripts', 'writePromotionManifest.mjs'), `--target=${target}`], {
  cwd: appRoot,
  stdio: 'inherit',
});
if (manifest.status !== 0) throw new Error(`Promotion manifest generation failed for ${target}`);

scanDirectoryForSecrets(path.join(appRoot, 'dist'));
rmSync(hostingRoot, { recursive: true, force: true });
mkdirSync(hostingRoot, { recursive: true });
cpSync(path.join(appRoot, 'dist'), hostingRoot, { recursive: true });
scanDirectoryForSecrets(hostingRoot);

console.log(`Prepared isolated ${target} Hosting artifact at ${hostingRoot}`);
