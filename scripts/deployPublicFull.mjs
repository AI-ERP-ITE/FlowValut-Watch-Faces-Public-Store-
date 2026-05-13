/**
 * deployPublicFull.mjs
 *
 * All-in-one public deploy. Runs in sequence:
 *
 * Phase A — public bundle push:
 *   1. Build public bundle (vite --mode public)
 *   2. deployDistToDocs --target=public --mirror-root
 *      → copies dist/assets → root/assets/, writes root HTML, then RESTORES to dev shell.
 *      Working tree stays clean. Vite never disturbed.
 *   3. Mirror static catalog data + CNAME
 *   4. git add -A  (stages everything; root HTML in stage = dev shell)
 *   5. stageProductionIndexInGit() — replaces staged root HTML with production via
 *      git plumbing (hash-object + update-index). NO working tree modification.
 *   6. git commit + git push public main
 *
 * Phase B — private bundle restore:
 *   7. Build private bundle (vite --mode private)
 *   8. deployDistToDocs --target=private --mirror-root  (same working-tree-safe pattern)
 *   9. git add -A
 *  10. stageProductionIndexInGit() for private bundle
 *  11. git commit + git push origin main
 *      Working tree root already has dev shell throughout both phases — no restore step.
 *
 * KEY INVARIANTS:
 *   - root index.html MUST have the production bundle in committed/pushed state.
 *   - catalog.json, models.json, specGroups.json, storeConfig.json, fonts/, zpk/ MUST
 *     be at repo root on the public remote — they are sourced from docs/ at deploy time.
 *
 * Usage: node scripts/deployPublicFull.mjs
 * Or via npm: npm run deploy:full:public
 */

import { execSync, spawnSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, cpSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

/**
 * Stage production HTML directly into git's index WITHOUT writing to the working tree.
 *
 * WHY: The naive approach (overrideRootWithProduction) writes production HTML to root
 * index.html on disk. If Vite dev server is running it hot-reloads to the hashed asset
 * path which doesn't exist in dev mode → blank page for ~20-30s.
 * This git-plumbing approach stages production HTML using git hash-object + git
 * update-index so the commit contains production HTML while the working tree keeps the
 * dev shell. Vite never sees any change.
 */
function stageProductionIndexInGit() {
  const docsHtml = readFileSync(path.join(appRoot, 'docs', 'index.html'), 'utf8');
  if (/src\/main\.tsx/.test(docsHtml)) {
    throw new Error('docs/index.html contains /src/main.tsx — refusing to stage dev entry as production.');
  }
  const blobHash = execSync('git hash-object -w --stdin', {
    cwd: appRoot,
    input: docsHtml,
    encoding: 'utf8',
  }).trim();
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

function gitOutput(cmd) {
  return execSync(cmd, { cwd: appRoot, encoding: 'utf8' }).trim();
}

/**
 * STATIC DATA INVARIANT: catalog.json, models.json, specGroups.json, storeConfig.json,
 * fonts/, and zpk/ must exist at the repo root on the public remote.
 * GH Pages serves from root (NOT docs/), so fetching /catalog.json requires it at root.
 * Source of truth: docs/ (populated by the publish workflow and committed).
 * This function mirrors them from docs/ → root before git add -A.
 */
function ensurePublicStaticData() {
  const STATIC_FILES = ['catalog.json', 'models.json', 'specGroups.json', 'storeConfig.json'];
  const STATIC_DIRS  = ['fonts', 'zpk'];

  for (const file of STATIC_FILES) {
    const src = path.join(appRoot, 'docs', file);
    const dst = path.join(appRoot, file);
    if (existsSync(src)) {
      cpSync(src, dst);
      console.log(`Static file mirrored: docs/${file} → ${file}`);
    } else {
      console.warn(`Warning: docs/${file} not found — skipping (site may show empty catalog)`);
    }
  }

  for (const dir of STATIC_DIRS) {
    const src = path.join(appRoot, 'docs', dir);
    const dst = path.join(appRoot, dir);
    if (existsSync(src)) {
      cpSync(src, dst, { recursive: true });
      console.log(`Static dir mirrored: docs/${dir}/ → ${dir}/`);
    } else {
      console.warn(`Warning: docs/${dir}/ not found — skipping`);
    }
  }
}

/**
 * CNAME INVARIANT: GitHub Pages custom domain requires CNAME at the repo root.
 * git add -A will commit whatever is at root — if CNAME is missing, GH Pages drops
 * the custom domain and the site returns 404. Always call this before git add -A.
 */
function ensurePublicCNAME() {
  const cnamePath = path.join(appRoot, 'CNAME');
  const cnameDomain = 'www.fvwatchfaces.com';
  if (!existsSync(cnamePath) || readFileSync(cnamePath, 'utf8').trim() !== cnameDomain) {
    writeFileSync(cnamePath, cnameDomain + '\n');
    console.log(`CNAME written: ${cnameDomain}`);
  } else {
    console.log(`CNAME OK: ${cnameDomain}`);
  }
}

async function main() {
  // ── Step 1: Build public ─────────────────────────────────────────────────
  run('npm run build:public', 'Building public bundle…');

  // ── Step 2: Write public bundle to docs/ + assets at root ───────────────
  run(
    'node scripts/deployDistToDocs.mjs --target=public --mirror-root',
    'Writing public bundle to docs/…',
  );

  // deployDistToDocs --mirror-root copies assets to root/assets/ and writes root HTML,
  // then RESTORES root HTML to dev shell. Working tree stays clean for Vite.

  // ── Step 3: Mirror static catalog data + CNAME + commit + push public ───────
  // STATIC DATA INVARIANT: catalog.json, models.json, specGroups.json, storeConfig.json,
  // fonts/, zpk/ must be at ROOT (not just docs/) — GH Pages serves from root.
  ensurePublicStaticData();
  // CNAME INVARIANT: must write CNAME before git add -A or GH Pages drops custom domain.
  ensurePublicCNAME();
  run('git add -A', 'Staging public docs + root…');
  // Stage production HTML via git plumbing — no working tree modification (Vite-safe).
  const publicHash = stageProductionIndexInGit();
  console.log(`\n📦 Public bundle: ${publicHash}`);
  run(`git commit -m "Deploy: public build ${publicHash}"`, 'Committing public build…');
  run('git push public main', 'Pushing to public remote…');
  console.log(`\n✅ Public push done. Bundle: ${publicHash}`);
  console.log('Root index.html unchanged in working tree (dev shell preserved — Vite safe).');

  // Restore root to dev entry locally after public push.
  // NOTE: with stageProductionIndexInGit(), working tree is already dev shell.
  // This comment is retained for documentation purposes only — no restore call needed.

  // ── Step 4: Rebuild private ───────────────────────────────────────────────
  console.log('\n▶  Rebuilding private bundle to restore docs/…');
  run('npm run build:private', 'Building private bundle…');
  run(
    'node scripts/deployDistToDocs.mjs --target=private --mirror-root',
    'Writing private bundle to docs/…',
  );
  // deployDistToDocs restores root to dev shell — working tree stays clean.

  // ── Step 5: Commit + push private (root = production bundle) ────────────
  run('git add -A', 'Staging private docs restore + root…');
  // Stage production HTML via git plumbing — no working tree modification.
  const privateHash = stageProductionIndexInGit();
  console.log(`\n📦 Private bundle: ${privateHash}`);
  run(`git commit -m "Restore: private docs after public deploy (${privateHash})"`, 'Committing private restore…');
  run('git push origin main', 'Pushing to origin (private)…');
  console.log(`\n✅ Private restore pushed. Bundle: ${privateHash}`);
  console.log('Root index.html unchanged in working tree (dev shell preserved — Vite safe).', '\nℹ\ufe0f  If dev server was running during deploy, restart it now.');

  console.log('\n🎉 Full public deploy complete.');
  console.log(`   Public  → public/main   bundle: ${publicHash}`);
  console.log(`   Private → origin/main   bundle: ${privateHash}`);
}

main().catch((err) => {
  console.error('\n❌', err.message);
  process.exit(1);
});
