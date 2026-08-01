import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

const appRoot = process.cwd();
const specRoot = path.join(appRoot, 'specs', '129-alpha-pipeline-boundary-diagnostics');
const packageRoot = path.join(specRoot, 'evidence', 'packages');
const matrix = JSON.parse(await fs.readFile(path.join(packageRoot, 'T030-package-matrix.json'), 'utf8'));
const binaryDiagnostic = JSON.parse(await fs.readFile(
  path.join(specRoot, 'evidence', 'binary-control', 'T029-binary-label-control.zpk.diagnostic.json'),
  'utf8',
));
const templateBytes = await fs.readFile(matrix.template.path);
const templateOuter = await JSZip.loadAsync(templateBytes);
const templateDevice = await JSZip.loadAsync(await templateOuter.file('device.zip').async('nodebuffer'));
const templateIndex = await templateDevice.file('watchface/index.js').async('string');
const templateAppJson = await templateDevice.file('app.json').async('nodebuffer');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

const expected = {
  P2: { kinds: ['IMG'], tokens: ['x: px(480)', 'y: px(480)', 'w: px(480)', 'h: px(480)'] },
  P3: { kinds: ['IMG'], tokens: ['x: px(480)', 'y: px(480)', 'w: px(466)', 'h: px(466)'] },
  P4: { kinds: ['IMG_LEVEL'], tokens: ['x: px(480)', 'y: px(480)', 'image_length: 1', 'hmUI.data_type.BATTERY'] },
  P5: { kinds: ['IMG_WEEK', 'IMG_DATE'], tokens: ['x: px(480)', 'y: px(480)', 'Array(7)', 'Array(12)'] },
  P6: { kinds: ['TEXT_IMG'], tokens: ['x: px(480)', 'y: px(480)', 'hmUI.data_type.BATTERY'] },
  P7: { kinds: ['IMG'], tokens: ['x: px(480)', 'y: px(480)', 'w: px(96)', 'h: px(96)'] },
  P8: {
    kinds: ['TIME_POINTER'],
    tokens: [
      'hour_centerX: px(720)', 'hour_centerY: px(720)',
      'hour_posX: px(33)', 'hour_posY: px(140)',
      'minute_centerX: px(720)', 'second_centerX: px(720)',
    ],
  },
};

function diagnosticBlock(index, id) {
  const startToken = `// SPEC129 ${id} TEST-ONLY:`;
  const start = index.indexOf(startToken);
  const end = index.indexOf(
    '// Widget delegate for lifecycle management (matches working reference)',
    start,
  );
  if (start < 0 || end < 0) return null;
  return index.slice(start, end);
}

const results = [];
for (const packageEntry of matrix.packages) {
  const deviceRoot = path.join(packageRoot, 'extracted', packageEntry.id, 'device');
  const [index, appJson] = await Promise.all([
    fs.readFile(path.join(deviceRoot, 'watchface', 'index.js'), 'utf8'),
    fs.readFile(path.join(deviceRoot, 'app.json')),
  ]);
  const checks = {
    appJsonByteIdenticalToTemplate: appJson.equals(templateAppJson),
    appJsonParses: false,
    indexPresent: index.length > 0,
  };
  try {
    JSON.parse(appJson.toString('utf8'));
    checks.appJsonParses = true;
  } catch {
    checks.appJsonParses = false;
  }

  if (packageEntry.id !== 'P11') {
    const block = diagnosticBlock(index, packageEntry.id);
    const definition = expected[packageEntry.id];
    const intendedTargets = packageEntry.assets.map(({ target }) => path.posix.basename(target));
    const allSpec129Names = [...index.matchAll(/spec129_[a-z0-9_]+\.png/g)].map(([name]) => name);
    const uniqueSpec129Names = [...new Set(allSpec129Names)];
    const strippedIndex = index.replace(
      /\s*\/\/ SPEC129 [\s\S]*?(?=\s*\/\/ Widget delegate for lifecycle management \(matches working reference\))/,
      '',
    );
    checks.testBlockPresent = Boolean(block);
    checks.testOnlyMarkerOccursOnce = index.split(`SPEC129 ${packageEntry.id} TEST-ONLY`).length - 1 === 1;
    checks.correctWidgetKinds = definition.kinds.every((kind) =>
      block?.includes(`hmUI.widget.${kind}`));
    checks.geometryAndBindingTokensPresent = definition.tokens.every((token) => block?.includes(token));
    checks.onlyIntendedDiagnosticAssetNames = uniqueSpec129Names.length === intendedTargets.length
      && uniqueSpec129Names.every((name) => intendedTargets.includes(name));
    checks.allIntendedAssetsReferenced = intendedTargets.every((target) => block?.includes(target));
    checks.noCrossRouteReferences = uniqueSpec129Names.every((name) =>
      name.startsWith(`spec129_${packageEntry.id.toLowerCase()}_`));
    checks.originalIndexPreservedOutsideBlock = strippedIndex.trim() === templateIndex.trim();
    checks.onlyNormalDisplayLevel = block?.includes('hmUI.show_level.ONLY_NORMAL') ?? false;
    checks.offscreenIsolation = packageEntry.id === 'P8'
      ? block?.includes('centerX: px(720)')
      : block?.includes('x: px(480)');
    checks.assetFilesExist = (await Promise.all(intendedTargets.map(async (target) => {
      try {
        await fs.access(path.join(deviceRoot, 'assets', target));
        return true;
      } catch {
        return false;
      }
    }))).every(Boolean);
  } else {
    const targets = binaryDiagnostic.assets.map(({ name }) => name);
    checks.indexByteIdenticalToTemplate = index === templateIndex;
    checks.transformedAssetCount = targets.length === 19;
    checks.allTransformedAssetsReferenced = targets.every((target) =>
      index.includes(path.posix.basename(target)));
    checks.allTransformedAssetsExist = (await Promise.all(targets.map(async (target) => {
      try {
        await fs.access(path.join(deviceRoot, ...target.split('/')));
        return true;
      } catch {
        return false;
      }
    }))).every(Boolean);
    checks.packageMatchesT029Hash = sha256(
      await fs.readFile(path.join(packageRoot, packageEntry.package)),
    ) === packageEntry.sha256;
  }

  const failedChecks = Object.entries(checks).filter(([, value]) =>
    typeof value === 'boolean' && !value).map(([name]) => name);
  results.push({
    id: packageEntry.id,
    widgetKind: packageEntry.widgetKind,
    result: failedChecks.length === 0 ? 'PASS' : 'FAIL',
    failedChecks,
    checks,
  });
}

const output = {
  task: 'T034',
  testOnly: true,
  packageCount: results.length,
  passedCount: results.filter(({ result }) => result === 'PASS').length,
  failedCount: results.filter(({ result }) => result !== 'PASS').length,
  result: results.every(({ result }) => result === 'PASS') ? 'PASS' : 'FAIL',
  packages: results,
};
await fs.writeFile(
  path.join(packageRoot, 'T034-runtime-reference-validation.json'),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(JSON.stringify(output, null, 2));
if (output.result !== 'PASS') process.exitCode = 1;
