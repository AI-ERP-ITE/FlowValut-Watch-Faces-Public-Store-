/**
 * deployPublicFull.mjs
 *
 * All-in-one public deploy. Runs in sequence:
 *   1. Build public bundle (vite --mode public)
 *   2. Copy dist → docs/ + root/ (public bundle paths)
 *   3. git add -A  →  git commit "Deploy: public build <hash>"  →  git push public main
 *   4. Immediately rebuild private bundle
 *   5. Copy dist → docs/ + root/ (private bundle paths)
 *   6. git add -A  →  git commit "Restore: private docs…"  →  git push origin main
 *   7. Restore root index.html files to dev entry (uncommitted — for local npm run dev)
 *
 * KEY INVARIANT: root index.html MUST have the production bundle in committed/pushed
 * state. GH Pages serves from repo root (not docs/). deployDistToDocs --mirror-root
 * writes production to root but then restores to dev shell — we override that BEFORE
 * git add so the pushed commit always has production at root.
 *
 * Usage: node scripts/deployPublicFull.mjs
 * Or via npm: npm run deploy:full:public
 */

import { execSync, spawnSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

// Dev entry — restored to root after every push so `npm run dev` keeps working.
const DEV_INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Watch Face Creator</title>
    <script type="module" src="/src/main.tsx"><\/script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

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
 * deployDistToDocs --mirror-root writes production to root index.html files but then
 * immediately restores them to the dev entry. This means if we ran `git add -A` right
 * after, the committed root would have the dev shell — GH Pages (which serves from repo
 * root, NOT docs/) would get a blank page.
 *
 * Solution: after deployDistToDocs returns, re-read docs/index.html and write it back
 * to root index files, overriding the dev restoration. Then commit+push THAT. Only
 * after the push do we restore root to dev so `npm run dev` still works locally.
 */
function overrideRootWithProduction() {
  const docsHtml = readFileSync(path.join(appRoot, 'docs', 'index.html'), 'utf8');
  if (/src\/main\.tsx/.test(docsHtml)) {
    throw new Error('docs/index.html contains /src/main.tsx — refusing to mirror dev entry to root.');
  }
  writeFileSync(path.join(appRoot, 'index.html'), docsHtml);
  mkdirSync(path.join(appRoot, 'studio'), { recursive: true });
  writeFileSync(path.join(appRoot, 'studio', 'index.html'), docsHtml);
  mkdirSync(path.join(appRoot, 'studio', 'parametric'), { recursive: true });
  writeFileSync(path.join(appRoot, 'studio', 'parametric', 'index.html'), docsHtml);
  const m = docsHtml.match(/assets\/(index-[A-Za-z0-9_-]+\.js)/);
  return m ? m[1] : '?';
}

function restoreRootToDev() {
  writeFileSync(path.join(appRoot, 'index.html'), DEV_INDEX_HTML);
  writeFileSync(path.join(appRoot, 'studio', 'index.html'), DEV_INDEX_HTML);
  writeFileSync(path.join(appRoot, 'studio', 'parametric', 'index.html'), DEV_INDEX_HTML);
  console.log('Root index.html files restored to dev entry (local only — not committed).');
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

  // Override the dev-entry restoration so root index.html = production for GH Pages.
  const publicHash = overrideRootWithProduction();
  console.log(`\n📦 Public bundle: ${publicHash}`);

  // ── Step 3: Commit + push public (root = production bundle) ──────────────  // CNAME INVARIANT: must write CNAME before git add -A or GH Pages drops custom domain.
  ensurePublicCNAME();  run('git add -A', 'Staging public docs + root…');
  run(`git commit -m "Deploy: public build ${publicHash}"`, 'Committing public build…');
  run('git push public main', 'Pushing to public remote…');
  console.log(`\n✅ Public push done. Bundle: ${publicHash}`);

  // Restore root to dev entry locally after public push.
  restoreRootToDev();

  // ── Step 4: Rebuild private ───────────────────────────────────────────────
  console.log('\n▶  Rebuilding private bundle to restore docs/…');
  run('npm run build:private', 'Building private bundle…');
  run(
    'node scripts/deployDistToDocs.mjs --target=private --mirror-root',
    'Writing private bundle to docs/…',
  );

  // Override dev-entry restoration again for private root.
  const privateHash = overrideRootWithProduction();
  console.log(`\n📦 Private bundle: ${privateHash}`);

  // ── Step 5: Commit + push private (root = production bundle) ─────────────
  run('git add -A', 'Staging private docs restore + root…');
  run(`git commit -m "Restore: private docs after public deploy (${privateHash})"`, 'Committing private restore…');
  run('git push origin main', 'Pushing to origin (private)…');
  console.log(`\n✅ Private restore pushed. Bundle: ${privateHash}`);

  // Restore root to dev entry locally so next `npm run dev` works.
  restoreRootToDev();

  console.log('\n🎉 Full public deploy complete.');
  console.log(`   Public  → public/main   bundle: ${publicHash}`);
  console.log(`   Private → origin/main   bundle: ${privateHash}`);
}

main().catch((err) => {
  console.error('\n❌', err.message);
  process.exit(1);
});
