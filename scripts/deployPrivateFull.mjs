/**
 * deployPrivateFull.mjs
 *
 * Private-only deploy. Runs in sequence:
 *   1. Build private bundle (vite --mode private)
 *   2. Copy dist → docs/ + root/ (private bundle paths)
 *   3. Override root index.html with production (undo dev-entry restore from deployDistToDocs)
 *   4. git add -A  →  git commit  →  git push origin main
 *   5. Restore root index.html files to dev entry (uncommitted — for local npm run dev)
 *
 * KEY INVARIANT: root index.html MUST have the production bundle in committed state.
 * GH Pages (origin) serves from repo root (not docs/). deployDistToDocs restores root
 * to dev shell BEFORE returning — we override that before git add.
 *
 * Usage: node scripts/deployPrivateFull.mjs
 * Or via npm: npm run deploy:full:private
 */

import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

// Dev entry — restored to root after push so `npm run dev` keeps working.
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

async function main() {
  // ── Step 1: Build private ─────────────────────────────────────────────────
  run('npm run build:private', 'Building private bundle…');

  // ── Step 2: Write private bundle to docs/ + assets at root ───────────────
  run(
    'node scripts/deployDistToDocs.mjs --target=private --mirror-root',
    'Writing private bundle to docs/ and root…',
  );

  // Override the dev-entry restoration so root index.html = production for GH Pages.
  const privateHash = overrideRootWithProduction();
  console.log(`\n📦 Private bundle: ${privateHash}`);

  // ── Step 3: Commit + push origin (root = production bundle) ──────────────
  run('git add -A', 'Staging private docs + root…');
  run(`git commit -m "Deploy: private build ${privateHash}"`, 'Committing private build…');
  run('git push origin main', 'Pushing to origin (private)…');
  console.log(`\n✅ Private push done. Bundle: ${privateHash}`);

  // Restore root to dev entry locally so next `npm run dev` works.
  restoreRootToDev();

  console.log('\n🎉 Private deploy complete.');
  console.log(`   Private → origin/main   bundle: ${privateHash}`);
}

main().catch((err) => {
  console.error('\n❌', err.message);
  process.exit(1);
});
