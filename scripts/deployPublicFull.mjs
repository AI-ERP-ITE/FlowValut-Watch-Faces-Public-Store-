/**
 * deployPublicFull.mjs
 *
 * All-in-one public deploy. Runs in sequence:
 *   1. Build public bundle (vite --mode public)
 *   2. Copy dist → docs/ (public bundle paths)
 *   3. git add -A  →  git commit "Deploy: public build <hash>"  →  git push public main
 *   4. Immediately rebuild private bundle
 *   5. Copy dist → docs/ (private bundle paths)
 *   6. git add -A  →  git push origin main  (no new commit — amend/separate commit optional)
 *
 * This ensures origin/main always has the private bundle in docs/ after this script.
 * Usage: node scripts/deployPublicFull.mjs
 * Or via npm: npm run deploy:full:public
 */

import { execSync, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

function run(cmd, label) {
  console.log(`\n▶  ${label || cmd}`);
  const result = spawnSync(cmd, { shell: true, cwd: appRoot, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`Command failed (exit ${result.status}): ${cmd}`);
  }
}

function gitOutput(cmd) {
  return execSync(cmd, { cwd: appRoot, encoding: 'utf8' }).trim();
}

async function main() {
  // ── Step 1: Build public ─────────────────────────────────────────────────
  run('npm run build:public', 'Building public bundle…');

  // ── Step 2: Write public bundle to docs/ ────────────────────────────────
  run(
    'node scripts/deployDistToDocs.mjs --target=public --mirror-root',
    'Writing public bundle to docs/…',
  );

  // Extract the public JS hash for the commit message.
  let publicHash = '?';
  try {
    const html = execSync('cat docs/index.html', { cwd: appRoot, encoding: 'utf8' });
    const m = html.match(/assets\/(index-[A-Za-z0-9_-]+\.js)/);
    if (m) publicHash = m[1];
  } catch { /* ignore */ }

  // ── Step 3: Commit + push public ─────────────────────────────────────────
  run('git add -A', 'Staging public docs…');
  run(`git commit -m "Deploy: public build ${publicHash}"`, 'Committing public build…');
  run('git push public main', 'Pushing to public remote…');
  console.log(`\n✅ Public push done. Bundle: ${publicHash}`);

  // ── Step 4: Rebuild private ───────────────────────────────────────────────
  console.log('\n▶  Rebuilding private bundle to restore docs/…');
  run('npm run build:private', 'Building private bundle…');
  run(
    'node scripts/deployDistToDocs.mjs --target=private --mirror-root',
    'Writing private bundle to docs/…',
  );

  // Extract private JS hash.
  let privateHash = '?';
  try {
    const html = execSync('cat docs/index.html', { cwd: appRoot, encoding: 'utf8' });
    const m = html.match(/assets\/(index-[A-Za-z0-9_-]+\.js)/);
    if (m) privateHash = m[1];
  } catch { /* ignore */ }

  // ── Step 5: Commit + push private ────────────────────────────────────────
  run('git add -A', 'Staging private docs restore…');
  run(`git commit -m "Restore: private docs after public deploy (${privateHash})"`, 'Committing private restore…');
  run('git push origin main', 'Pushing to origin (private)…');
  console.log(`\n✅ Private restore pushed. Bundle: ${privateHash}`);

  console.log('\n🎉 Full public deploy complete.');
  console.log(`   Public  → public/main   bundle: ${publicHash}`);
  console.log(`   Private → origin/main   bundle: ${privateHash}`);
}

main().catch((err) => {
  console.error('\n❌', err.message);
  process.exit(1);
});
