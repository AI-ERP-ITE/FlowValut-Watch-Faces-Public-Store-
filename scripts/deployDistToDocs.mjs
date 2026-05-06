import fs from 'fs/promises';
import path from 'path';

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  return {
    mirrorRoot: args.has('--mirror-root'),
    target: [...args].find((a) => a.startsWith('--target='))?.slice('--target='.length) || 'unknown',
  };
}

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
    const rootIndex = path.join(appRoot, 'index.html');
    await copyDirContents(distAssets, rootAssets);
    await removeStaleFiles(rootAssets, distAssets);
    await writeText(rootIndex, distHtml);
  }

  console.log(`Deploy sync complete for target=${target}`);
  console.log(`JS hash parity OK: ${docsJsHash}`);
  console.log(
    `docs updated: ${path.relative(appRoot, docsIndex)}, ${path.relative(appRoot, docsStudioIndex)}, ${path.relative(appRoot, docsStudioParametricIndex)}`,
  );
  if (mirrorRoot) {
    console.log('Root mirror enabled: index.html + assets synced from dist.');
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
