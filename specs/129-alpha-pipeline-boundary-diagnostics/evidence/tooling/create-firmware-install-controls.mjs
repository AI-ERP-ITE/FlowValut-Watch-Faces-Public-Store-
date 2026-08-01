import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

const appRoot = process.cwd();
const specRoot = path.join(appRoot, 'specs', '129-alpha-pipeline-boundary-diagnostics');
const evidenceRoot = path.join(specRoot, 'evidence');
const firmwareRoot = path.join(evidenceRoot, 'firmware');
const controlRoot = path.join(firmwareRoot, 'install-controls');
const templatePath = path.resolve(appRoot, '..', 'ZPK for tests', 'test for fonts .zpk');
const fixturePath = path.join(evidenceRoot, 'fixture', 'alpha-fixture.png');
const binaryPath = path.join(evidenceRoot, 'binary-control', 'T029-binary-label-control.zpk');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

await fs.mkdir(controlRoot, { recursive: true });
const fixtureBytes = await fs.readFile(fixturePath);
const templateBytes = await fs.readFile(templatePath);
const outer = await JSZip.loadAsync(templateBytes);
const deviceBytes = await outer.file('device.zip').async('nodebuffer');
const device = await JSZip.loadAsync(deviceBytes);
device.file('assets/spec129_flowvault_fixture.png', fixtureBytes);
device.file('watchface/index.js', `import { px } from '@zos/utils'
import * as hmUI from '@zos/ui'

WatchFace({
  build() {
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: px(0), y: px(0), w: px(480), h: px(480), color: 0x202020,
      show_level: hmUI.show_level.ONLY_NORMAL
    })
    hmUI.createWidget(hmUI.widget.IMG, {
      x: px(0), y: px(0), w: px(480), h: px(480),
      src: 'spec129_flowvault_fixture.png',
      show_level: hmUI.show_level.ONLY_NORMAL
    })
  }
})
`);
device.file('spec129-firmware-control.json', `${JSON.stringify({
  task: 'T050',
  testOnly: true,
  route: 'FlowVault-compatible static IMG',
  fixtureSha256: sha256(fixtureBytes),
}, null, 2)}\n`);
const rebuiltDevice = await device.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 },
});
outer.file('device.zip', rebuiltDevice);
const flowVaultBytes = await outer.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 },
});
const flowVaultName = 'P2-visible-flowvault-fixture.zpk';
await fs.writeFile(path.join(controlRoot, flowVaultName), flowVaultBytes);

const officialProjects = [
  ['P9', 'P9-per-pixel-alpha'],
  ['P10', 'P10-widget-opacity'],
];
const controls = [{
  id: 'P2-visible',
  file: flowVaultName,
  kind: 'FlowVault ZPK',
  byteLength: flowVaultBytes.length,
  sha256: sha256(flowVaultBytes),
  fixtureSha256: sha256(fixtureBytes),
}];
for (const [id, project] of officialProjects) {
  const dist = path.join(evidenceRoot, 'official-zepp', 'projects', project, 'dist');
  const zabName = (await fs.readdir(dist)).find((name) => name.endsWith('.zab'));
  if (!zabName) throw new Error(`${id}: ZAB missing`);
  const bytes = await fs.readFile(path.join(dist, zabName));
  const targetName = `${id}-${project}.zab`;
  await fs.writeFile(path.join(controlRoot, targetName), bytes);
  controls.push({
    id,
    file: targetName,
    kind: 'Official Zeus ZAB',
    byteLength: bytes.length,
    sha256: sha256(bytes),
    fixtureSha256: sha256(fixtureBytes),
  });
}
const binaryBytes = await fs.readFile(binaryPath);
const binaryName = 'P11-binary-label-control.zpk';
await fs.writeFile(path.join(controlRoot, binaryName), binaryBytes);
controls.push({
  id: 'P11',
  file: binaryName,
  kind: 'FlowVault binary-label compatibility ZPK',
  byteLength: binaryBytes.length,
  sha256: sha256(binaryBytes),
});

const manifest = {
  task: 'T050',
  testOnly: true,
  fixtureSha256: sha256(fixtureBytes),
  localInstallControlsReady: true,
  qrStatus: 'BLOCKED',
  qrBlocker: 'Official Zeus is not logged in; no simulator or Developer Bridge is connected. Installable preview QR generation requires authenticated Zepp upload/signing.',
  controls,
};
await fs.writeFile(
  path.join(firmwareRoot, 'T050-install-control-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(JSON.stringify(manifest, null, 2));
