/**
 * deployPrivateFull.mjs
 *
 * Private-only deploy. Runs in sequence:
 *   1. Build private bundle (vite --mode private)
 *   2. Copy dist → docs/ + root/ (private bundle paths)
 *      deployDistToDocs --mirror-root copies assets to root/assets/ and writes root HTML,
 *      then IMMEDIATELY restores root HTML to dev shell. Working tree stays clean.
 *   3. git add -A  — stages everything; root index.html in staging area = dev shell
 *   4. stageProductionIndexInGit() — REPLACES staged root HTML with production content
 *      using git hash-object + git update-index, WITHOUT touching the working tree.
 *      Vite dev server never sees production HTML → no hot-reload to broken hash path.
 *   5. git commit + git push origin main
 *      Working tree root already has dev shell — no restore step needed.
 *
 * KEY INVARIANT: root index.html MUST have the production bundle in committed state.
 * GH Pages (origin) serves from repo root (not docs/).
 *
 * Usage: node scripts/deployPrivateFull.mjs
 * Or via npm: npm run deploy:full:private
 */

import { execSync, spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

/**
 * Stage production HTML directly into git's index WITHOUT writing to the working tree.
 *
 * WHY: The naive approach writes production bundle HTML to root index.html, does git add,
 * then restores dev shell after push. But if Vite dev server is running it hot-reloads
 * to the hashed asset path (e.g. /assets/index-XXXX.js) which doesn't exist in dev mode
 * → blank page for ~20-30s until the restore runs. This git-plumbing approach bypasses
 * the working tree entirely: git commits production HTML while the working tree keeps the
 * dev shell. Vite never sees any change.
 *
 * HOW:
 * 1. git hash-object -w --stdin  — write production HTML content to git object store, get blob SHA
 * 2. git update-index --cacheinfo — replace staged entry for each HTML path with that blob SHA
 *    (working tree file is untouched)
 * 3. git commit reads from the index → production HTML committed
 */
function stageProductionIndexInGit() {
  const docsHtml = readFileSync(path.join(appRoot, 'docs', 'index.html'), 'utf8');
  if (/src\/main\.tsx/.test(docsHtml)) {
    throw new Error('docs/index.html contains /src/main.tsx — refusing to stage dev entry as production.');
  }
  // Write blob to git object store
  const blobHash = execSync('git hash-object -w --stdin', {
    cwd: appRoot,
    input: docsHtml,
    encoding: 'utf8',
  }).trim();
  // Overwrite the staged (index) entries — working tree stays as dev shell
  execSync(`git update-index --cacheinfo 100644,${blobHash},index.html`, { cwd: appRoot });
  execSync(`git update-index --cacheinfo 100644,${blobHash},studio/index.html`, { cwd: appRoot });
  execSync(`git update-index --cacheinfo 100644,${blobHash},studio/parametric/index.html`, { cwd: appRoot });
  const m = docsHtml.match(/assets\/(index-[A-Za-z0-9_-]+\.js)/);
  return m ? m[1] : '?';
}

function run(cmd, label) {
  console.log(`\n▶  ${label || cmd}`);
  const result = spawnSync(cmd, { shell: true, cwd: appRoot, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`Command failed (exit ${result.status}): ${cmd}`);
  }
}

async function main() {
  // ── Step 1: Build private ─────────────────────────────────────────────────
  run('npm run build:private', 'Building private bundle…');

  // ── Step 2: Write private bundle to docs/ + assets at root ───────────────
  run(
    'node scripts/deployDistToDocs.mjs --target=private --mirror-root',
    'Writing private bundle to docs/ and root…',
  );

  // deployDistToDocs --mirror-root copies assets to root/assets/ and writes root HTML,
  // then RESTORES root HTML to dev shell. Working tree stays clean for Vite.

  // ── Step 3: Commit + push origin (root = production bundle) ──────────────
  run('git add -A', 'Staging private docs + root…');
  // Stage production HTML into git index WITHOUT touching working tree (Vite-safe).
  // git add -A staged the dev shell; stageProductionIndexInGit() swaps those staged
  // entries to production HTML via git plumbing — Vite never sees the production HTML.
  const privateHash = stageProductionIndexInGit();
  console.log(`\n📦 Private bundle: ${privateHash}`);
  run(`git commit -m "Deploy: private build ${privateHash}"`, 'Committing private build…');
  run('git push origin main', 'Pushing to origin (private)…');
  console.log(`\n✅ Private push done. Bundle: ${privateHash}`);
  console.log('Root index.html unchanged in working tree (dev shell preserved — Vite safe).');

  console.log('\n🎉 Private deploy complete.');
  console.log(`   Private → origin/main   bundle: ${privateHash}`);
}

main().catch((err) => {
  console.error('\n❌', err.message);
  process.exit(1);
});
