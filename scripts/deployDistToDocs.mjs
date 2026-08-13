import fs from 'fs/promises';
import path from 'path';

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  return {
    mirrorRoot: args.has('--mirror-root'),
    target: [...args].find((a) => a.startsWith('--target='))?.slice('--target='.length) || 'unknown',
  };
}

// Dev entry template for app/index.html.
// After a private deploy (which mirrors production to root), root index.html is
// overwritten with the production bundle reference. A subsequent build would fail
// because Vite can't resolve the hashed asset URL as a source file.
// Private GH Pages serves from docs/ so root index.html only needs to be
// production for the PUBLIC target. We restore it to dev after private deploys.
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

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function copyDirContents(srcDir, dstDir) {
  await ensureDir(dstDir);
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const src = path.join(srcDir, entry.name);
      const dst = path.join(dstDir, entry.name);
      if (entry.isDirectory()) {
        await copyDirContents(src, dst);
      } else {
        await fs.copyFile(src, dst);
      }
    }),
  );
}

async function removeStaleFiles(dstDir, srcDir) {
  const [dstEntries, srcEntries] = await Promise.all([
    fs.readdir(dstDir, { withFileTypes: true }).catch(() => []),
    fs.readdir(srcDir, { withFileTypes: true }).catch(() => []),
  ]);

  const srcNames = new Set(srcEntries.filter((e) => e.isFile()).map((e) => e.name));
  await Promise.all(
    dstEntries
      .filter((e) => e.isFile() && !srcNames.has(e.name))
      .map((e) => fs.rm(path.join(dstDir, e.name), { force: true })),
  );
}

function extractJsHash(html) {
  const match = html.match(/assets\/(index-[A-Za-z0-9_-]+\.js)/);
  return match?.[1] || null;
}

function assertNoSourceEntry(html, label) {
  if (/src\/main\.tsx/.test(html)) {
    throw new Error(`${label} contains /src/main.tsx source entry. Deployment blocked.`);
  }
}

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function writeText(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
}

async function main() {
  const { mirrorRoot, target } = parseArgs(process.argv);
  const appRoot = process.cwd();
  const appLeaf = path.basename(appRoot).toLowerCase();
  if (appLeaf !== 'app') {
    throw new Error(`Run this script from app/ repo root. Current cwd: ${appRoot}`);
  }

  const distDir = path.join(appRoot, 'dist');
  const distAssets = path.join(distDir, 'assets');
  const docsDir = path.join(appRoot, 'docs');
  const docsAssets = path.join(docsDir, 'assets');
  const docsIndex = path.join(docsDir, 'index.html');
  const docsStudioIndex = path.join(docsDir, 'studio', 'index.html');
  const docsStudioParametricIndex = path.join(docsDir, 'studio', 'parametric', 'index.html');
  const distIndex = path.join(distDir, 'index.html');
  const distRuntimeConfig = path.join(distDir, 'flowvault-runtime-config.js');
  const docsRuntimeConfig = path.join(docsDir, 'flowvault-runtime-config.js');
  const rootRuntimeConfig = path.join(appRoot, 'flowvault-runtime-config.js');

  const distHtml = await readText(distIndex);
  assertNoSourceEntry(distHtml, 'dist/index.html');

  const distJsHash = extractJsHash(distHtml);
  if (!distJsHash) {
    throw new Error('Could not find hashed JS entry in dist/index.html. Deployment blocked.');
  }

  await copyDirContents(distAssets, docsAssets);
  await removeStaleFiles(docsAssets, distAssets);

  await writeText(docsIndex, distHtml);
  await writeText(docsStudioIndex, distHtml);
  await writeText(docsStudioParametricIndex, distHtml);
  if (target === 'public') {
    await fs.copyFile(distRuntimeConfig, docsRuntimeConfig);
  } else {
    await fs.rm(docsRuntimeConfig, { force: true });
  }

  const [docsHtml, studioHtml, studioParametricHtml] = await Promise.all([
    readText(docsIndex),
    readText(docsStudioIndex),
    readText(docsStudioParametricIndex),
  ]);
  assertNoSourceEntry(docsHtml, 'docs/index.html');
  assertNoSourceEntry(studioHtml, 'docs/studio/index.html');
  assertNoSourceEntry(studioParametricHtml, 'docs/studio/parametric/index.html');

  const docsJsHash = extractJsHash(docsHtml);
  const studioJsHash = extractJsHash(studioHtml);
  const studioParametricJsHash = extractJsHash(studioParametricHtml);
  if (!docsJsHash || !studioJsHash || !studioParametricJsHash || docsJsHash !== studioJsHash || docsJsHash !== studioParametricJsHash) {
    throw new Error(
      `Hash parity check failed: docs=${docsJsHash || 'none'} studio=${studioJsHash || 'none'} studioParametric=${studioParametricJsHash || 'none'}`,
    );
  }

  if (mirrorRoot) {
    const rootAssets = path.join(appRoot, 'assets');
    await copyDirContents(distAssets, rootAssets);
    await removeStaleFiles(rootAssets, distAssets);
    if (target === 'public') {
      await fs.copyFile(distRuntimeConfig, rootRuntimeConfig);
    } else {
      await fs.rm(rootRuntimeConfig, { force: true });
    }

    // Root HTML files are intentionally NOT written here.
    // Both deployPrivateFull.mjs and deployPublicFull.mjs use stageProductionIndexInGit()
    // to commit production HTML via git plumbing (hash-object + update-index) without
    // ever touching the working tree. Writing production HTML here then immediately
    // restoring it was purely redundant and caused a Vite HMR race: Vite's file watcher
    // could fire during the brief production-on-disk window, hot-reloading the browser
    // to a hashed asset URL that doesn't exist in dev mode → blank page at
    // /studio/parametric and other deep routes (ISSUE_LOG.md #16).
    // Only the asset folder sync is needed here so git add -A picks up new/removed assets.
  }

  console.log(`Deploy sync complete for target=${target}`);
  console.log(`JS hash parity OK: ${docsJsHash}`);
  console.log(
    `docs updated: ${path.relative(appRoot, docsIndex)}, ${path.relative(appRoot, docsStudioIndex)}, ${path.relative(appRoot, docsStudioParametricIndex)}`,
  );
  if (mirrorRoot) {
    console.log('Root mirror: assets synced from dist (HTML left as dev shell — managed by stageProductionIndexInGit).');
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
