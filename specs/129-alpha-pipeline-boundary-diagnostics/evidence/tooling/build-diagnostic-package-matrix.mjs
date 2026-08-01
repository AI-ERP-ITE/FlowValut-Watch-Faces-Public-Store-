import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

const appRoot = process.cwd();
const specRoot = path.join(appRoot, 'specs', '129-alpha-pipeline-boundary-diagnostics');
const evidenceRoot = path.join(specRoot, 'evidence');
const outputRoot = path.join(evidenceRoot, 'packages');
const prepackageRoot = path.join(outputRoot, 'prepackage');
const templatePath = path.resolve(appRoot, '..', 'ZPK for tests', 'test for fonts .zpk');
const binaryControlPath = path.join(evidenceRoot, 'binary-control', 'T029-binary-label-control.zpk');
const marker = '                // Widget delegate for lifecycle management (matches working reference)';

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

const route = (id, name, widgetKind, assets, widgetSource) => ({
  id,
  name,
  widgetKind,
  assets: assets.map(([source, target]) => ({
    source: path.join(evidenceRoot, 'flowvault-routes', source),
    target,
  })),
  widgetSource,
});

const digitAssets = Array.from({ length: 10 }, (_, digit) => [
  `T025-numeric-glyphs/digit-${digit}-h21-natural-orange.png`,
  `spec129_p6_digit_${digit}.png`,
]);

const routes = [
  route(
    'P2',
    'static-img-pass-through',
    'IMG',
    [['T021-inline-static-pass-through.png', 'spec129_p2_static_pass.png']],
    `                // SPEC129 P2 TEST-ONLY: static IMG pass-through
                let spec129_p2 = hmUI.createWidget(hmUI.widget.IMG, {
                    x: px(480), y: px(480), w: px(480), h: px(480),
                    src: 'spec129_p2_static_pass.png',
                    show_level: hmUI.show_level.ONLY_NORMAL
                });
`,
  ),
  route(
    'P3',
    'static-img-normalized',
    'IMG',
    [['T022-static-normalized-466.png', 'spec129_p3_static_466.png']],
    `                // SPEC129 P3 TEST-ONLY: normalized static IMG
                let spec129_p3 = hmUI.createWidget(hmUI.widget.IMG, {
                    x: px(480), y: px(480), w: px(466), h: px(466),
                    src: 'spec129_p3_static_466.png',
                    show_level: hmUI.show_level.ONLY_NORMAL
                });
`,
  ),
  route(
    'P4',
    'image-switcher',
    'IMG_LEVEL',
    [['T023-switcher-normalized-466.png', 'spec129_p4_switcher_466.png']],
    `                // SPEC129 P4 TEST-ONLY: image-switcher IMG_LEVEL
                let spec129_p4 = hmUI.createWidget(hmUI.widget.IMG_LEVEL, {
                    x: px(480), y: px(480),
                    image_array: ['spec129_p4_switcher_466.png'],
                    image_length: 1,
                    type: hmUI.data_type.BATTERY,
                    show_level: hmUI.show_level.ONLY_NORMAL
                });
`,
  ),
  route(
    'P5',
    'week-month-labels',
    'IMG_WEEK+IMG_DATE',
    [
      ['T024-label-baker/wed-21-orange.png', 'spec129_p5_week.png'],
      ['T024-label-baker/jul-21-orange.png', 'spec129_p5_month.png'],
    ],
    `                // SPEC129 P5 TEST-ONLY: week/month baked-label routes
                let spec129_p5_week = hmUI.createWidget(hmUI.widget.IMG_WEEK, {
                    x: px(480), y: px(480),
                    week_en: Array(7).fill('spec129_p5_week.png'),
                    week_tc: Array(7).fill('spec129_p5_week.png'),
                    show_level: hmUI.show_level.ONLY_NORMAL
                });
                let spec129_p5_month = hmUI.createWidget(hmUI.widget.IMG_DATE, {
                    x: px(480), y: px(480),
                    month_en: Array(12).fill('spec129_p5_month.png'),
                    month_tc: Array(12).fill('spec129_p5_month.png'),
                    show_level: hmUI.show_level.ONLY_NORMAL
                });
`,
  ),
  route(
    'P6',
    'numeric-glyphs',
    'TEXT_IMG',
    digitAssets,
    `                // SPEC129 P6 TEST-ONLY: numeric TEXT_IMG glyph array
                let spec129_p6 = hmUI.createWidget(hmUI.widget.TEXT_IMG, {
                    x: px(480), y: px(480),
                    font_array: [${digitAssets.map(([, target]) => `'${target}'`).join(', ')}],
                    type: hmUI.data_type.BATTERY,
                    show_level: hmUI.show_level.ONLY_NORMAL
                });
`,
  ),
  route(
    'P7',
    'effects-photo-edit',
    'IMG',
    [['T027-effects-photo-edit/opacity-50.png', 'spec129_p7_opacity50.png']],
    `                // SPEC129 P7 TEST-ONLY: effects/photo-edit IMG
                let spec129_p7 = hmUI.createWidget(hmUI.widget.IMG, {
                    x: px(480), y: px(480), w: px(96), h: px(96),
                    src: 'spec129_p7_opacity50.png',
                    show_level: hmUI.show_level.ONLY_NORMAL
                });
`,
  ),
  route(
    'P8',
    'pointer-hand',
    'TIME_POINTER',
    [['T028-pointer-hand/glow-50-effected.png', 'spec129_p8_pointer_glow.png']],
    `                // SPEC129 P8 TEST-ONLY: pointer/hand route
                let spec129_p8 = hmUI.createWidget(hmUI.widget.TIME_POINTER, {
                    hour_centerX: px(720), hour_centerY: px(720),
                    hour_posX: px(33), hour_posY: px(140),
                    hour_path: 'spec129_p8_pointer_glow.png',
                    minute_centerX: px(720), minute_centerY: px(720),
                    minute_posX: px(33), minute_posY: px(140),
                    minute_path: 'spec129_p8_pointer_glow.png',
                    second_centerX: px(720), second_centerY: px(720),
                    second_posX: px(33), second_posY: px(140),
                    second_path: 'spec129_p8_pointer_glow.png',
                    show_level: hmUI.show_level.ONLY_NORMAL
                });
`,
  ),
];

await fs.mkdir(outputRoot, { recursive: true });
await fs.mkdir(prepackageRoot, { recursive: true });
const templateBytes = await fs.readFile(templatePath);
const templateOuter = await JSZip.loadAsync(templateBytes);
const templateDeviceBytes = await templateOuter.file('device.zip').async('nodebuffer');
const templateDevice = await JSZip.loadAsync(templateDeviceBytes);
const templateIndex = await templateDevice.file('watchface/index.js').async('string');
if (!templateIndex.includes(marker)) throw new Error('Template injection marker not found');

const matrix = {
  task: 'T030',
  purpose: 'Test-only isolated diagnostic packages; no production exporter changes',
  generatedAt: new Date().toISOString(),
  template: {
    path: templatePath,
    sha256: sha256(templateBytes),
    deviceZipSha256: sha256(templateDeviceBytes),
  },
  packages: [],
};

for (const definition of routes) {
  const outer = await JSZip.loadAsync(templateBytes);
  const device = await JSZip.loadAsync(templateDeviceBytes);
  const copiedAssets = [];
  const packagePreRoot = path.join(prepackageRoot, definition.id);
  await fs.mkdir(packagePreRoot, { recursive: true });

  for (const asset of definition.assets) {
    const bytes = await fs.readFile(asset.source);
    device.file(`assets/${asset.target}`, bytes);
    await fs.writeFile(path.join(packagePreRoot, asset.target), bytes);
    copiedAssets.push({
      source: path.relative(appRoot, asset.source).replaceAll('\\', '/'),
      target: `assets/${asset.target}`,
      byteLength: bytes.length,
      sha256: sha256(bytes),
    });
  }

  const patchedIndex = templateIndex.replace(marker, `${definition.widgetSource}\n${marker}`);
  device.file('watchface/index.js', patchedIndex);
  const internalManifest = {
    task: 'T030',
    packageId: definition.id,
    name: definition.name,
    testOnly: true,
    widgetKind: definition.widgetKind,
    offscreenIsolation: true,
    productionCodeModified: false,
    assets: copiedAssets,
  };
  device.file('spec129-diagnostic.json', `${JSON.stringify(internalManifest, null, 2)}\n`);
  const rebuiltDeviceBytes = await device.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
  outer.file('device.zip', rebuiltDeviceBytes);
  const packageBytes = await outer.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
  const packageName = `${definition.id}-${definition.name}.zpk`;
  await fs.writeFile(path.join(outputRoot, packageName), packageBytes);
  matrix.packages.push({
    id: definition.id,
    name: definition.name,
    widgetKind: definition.widgetKind,
    package: packageName,
    sha256: sha256(packageBytes),
    byteLength: packageBytes.length,
    deviceZipSha256: sha256(rebuiltDeviceBytes),
    assets: copiedAssets,
  });
}

const binaryBytes = await fs.readFile(binaryControlPath);
const binaryName = 'P11-binary-alpha-control.zpk';
await fs.writeFile(path.join(outputRoot, binaryName), binaryBytes);
matrix.packages.push({
  id: 'P11',
  name: 'binary-alpha-control',
  widgetKind: 'existing week/month routes',
  package: binaryName,
  sha256: sha256(binaryBytes),
  byteLength: binaryBytes.length,
  exactCopyOf: path.relative(appRoot, binaryControlPath).replaceAll('\\', '/'),
  exactCopy: true,
});

await fs.writeFile(path.join(outputRoot, 'T030-package-matrix.json'), `${JSON.stringify(matrix, null, 2)}\n`);
console.log(JSON.stringify({
  outputRoot,
  packageCount: matrix.packages.length,
  packageIds: matrix.packages.map(({ id }) => id),
  testOnly: true,
}, null, 2));
