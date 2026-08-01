import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('../../../../node_modules/pngjs');
const appRoot = process.cwd();
const specRoot = path.join(appRoot, 'specs', '129-alpha-pipeline-boundary-diagnostics');
const fixturePath = path.join(specRoot, 'evidence', 'fixture', 'alpha-fixture.png');
const officialRoot = path.join(specRoot, 'evidence', 'official-zepp');
const p9Assets = path.join(officialRoot, 'projects', 'P9-per-pixel-alpha', 'assets', 'default');
const p10Assets = path.join(officialRoot, 'projects', 'P10-widget-opacity', 'assets', 'default');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

const fixtureBytes = await fs.readFile(fixturePath);
const fixture = PNG.sync.read(fixtureBytes);
const opaque = new PNG({ width: fixture.width, height: fixture.height });
fixture.data.copy(opaque.data);
for (let offset = 3; offset < opaque.data.length; offset += 4) opaque.data[offset] = 255;
const opaqueBytes = PNG.sync.write(opaque, { colorType: 6 });

await fs.mkdir(p9Assets, { recursive: true });
await fs.mkdir(p10Assets, { recursive: true });
await fs.writeFile(path.join(p9Assets, 'alpha-fixture.png'), fixtureBytes);
await fs.writeFile(path.join(p9Assets, 'icon.png'), fixtureBytes);
await fs.writeFile(path.join(p10Assets, 'alpha-fixture-opaque.png'), opaqueBytes);
await fs.writeFile(path.join(p10Assets, 'icon.png'), fixtureBytes);

const manifest = {
  task: 'T041-T042',
  testOnly: true,
  fixture: {
    path: path.relative(appRoot, fixturePath).replaceAll('\\', '/'),
    byteLength: fixtureBytes.length,
    sha256: sha256(fixtureBytes),
  },
  P9: {
    route: 'official Zeus IMG with untouched per-pixel-alpha PNG',
    asset: 'assets/default/alpha-fixture.png',
    byteLength: fixtureBytes.length,
    sha256: sha256(fixtureBytes),
    exactFixtureCopy: true,
  },
  P10: {
    route: 'official Zeus IMG with opaque derivative and widget alpha 128',
    asset: 'assets/default/alpha-fixture-opaque.png',
    byteLength: opaqueBytes.length,
    sha256: sha256(opaqueBytes),
    sourceRgbPreserved: true,
    sourceAlphaForcedTo255: true,
    widgetAlpha: 128,
  },
};
await fs.writeFile(
  path.join(officialRoot, 'T041-T042-source-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(JSON.stringify(manifest, null, 2));
