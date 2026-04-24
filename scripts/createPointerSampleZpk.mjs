import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { generateWatchFaceCode } from '../src/lib/jsCodeGenerator.ts';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    outDir: path.join(process.cwd(), 'temp_validation_90'),
    model: 'Active',
    name: 'Gauge Pointer Sample',
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--outDir' && args[i + 1]) {
      out.outDir = path.resolve(args[++i]);
      continue;
    }
    if (args[i] === '--model' && args[i + 1]) {
      out.model = args[++i];
      continue;
    }
    if (args[i] === '--name' && args[i + 1]) {
      out.name = args[++i];
      continue;
    }
  }

  return out;
}

async function main() {
  const args = parseArgs();
  const extractDir = path.join(args.outDir, 'extracted', 'latest');
  const zpkPath = path.join(args.outDir, 'gauge_pointer_sample.zpk');

  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO9f3GQAAAAASUVORK5CYII=';
  const pngBuffer = Buffer.from(pngBase64, 'base64');

  fs.rmSync(args.outDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(extractDir, 'watchface'), { recursive: true });
  fs.mkdirSync(path.join(extractDir, 'assets'), { recursive: true });

  const config = {
    name: args.name,
    resolution: { width: 480, height: 480 },
    background: { src: 'background.png', format: 'TGA-P' },
    watchModel: args.model,
    elements: [
      {
        id: 'bg-1',
        type: 'IMG',
        name: 'Background',
        bounds: { x: 0, y: 0, width: 480, height: 480 },
        src: 'background.png',
        visible: true,
        zIndex: 0,
      },
      {
        id: 'tp-1',
        type: 'TIME_POINTER',
        name: 'Analog Clock',
        bounds: { x: 0, y: 0, width: 480, height: 480 },
        center: { x: 240, y: 240 },
        hourHandSrc: 'hour_hand.png',
        minuteHandSrc: 'minute_hand.png',
        secondHandSrc: 'second_hand.png',
        coverSrc: 'hand_cover.png',
        hourPos: { x: 11, y: 118 },
        minutePos: { x: 8, y: 172 },
        secondPos: { x: 4, y: 180 },
        visible: true,
        zIndex: 10,
      },
      {
        id: 'gp-1',
        type: 'GAUGE_POINTER',
        name: 'Battery Needle',
        bounds: { x: 210, y: 270, width: 40, height: 120 },
        center: { x: 240, y: 350 },
        hourPos: { x: 20, y: 112 },
        src: 'gauge_pointer.png',
        startAngle: -90,
        endAngle: 90,
        dataType: 'BATTERY',
        visible: true,
        zIndex: 11,
      },
    ],
  };

  const code = generateWatchFaceCode(config);

  fs.writeFileSync(path.join(extractDir, 'app.json'), code.appJson, 'utf8');
  fs.writeFileSync(path.join(extractDir, 'app.js'), code.appJs, 'utf8');
  fs.writeFileSync(path.join(extractDir, 'watchface', 'index.js'), code.watchfaceIndexJs, 'utf8');

  for (const fileName of ['background.png', 'hour_hand.png', 'minute_hand.png', 'second_hand.png', 'hand_cover.png', 'gauge_pointer.png']) {
    fs.writeFileSync(path.join(extractDir, 'assets', fileName), pngBuffer);
  }

  const deviceZip = new JSZip();
  deviceZip.file('app.json', code.appJson);
  deviceZip.file('app.js', code.appJs);
  deviceZip.file('watchface/index.js', code.watchfaceIndexJs);
  const assets = deviceZip.folder('assets');
  for (const fileName of ['background.png', 'hour_hand.png', 'minute_hand.png', 'second_hand.png', 'hand_cover.png', 'gauge_pointer.png']) {
    assets.file(fileName, pngBuffer);
  }
  const deviceZipBuffer = await deviceZip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });

  const appSideZip = new JSZip();
  appSideZip.file('app.json', JSON.stringify({ configVersion: 'v2', app: { appName: args.name } }, null, 2));
  const appSideZipBuffer = await appSideZip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });

  const finalZip = new JSZip();
  finalZip.file('device.zip', deviceZipBuffer);
  finalZip.file('app-side.zip', appSideZipBuffer);

  const zpkBuffer = await finalZip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
  fs.mkdirSync(args.outDir, { recursive: true });
  fs.writeFileSync(zpkPath, zpkBuffer);

  console.log(`WROTE_ZPK=${zpkPath}`);
  console.log(`WROTE_EXTRACTED=${extractDir}`);
  console.log(`HAS_TIME_POINTER=${/hmUI\.widget\.TIME_POINTER/.test(code.watchfaceIndexJs)}`);
  console.log(`HAS_IMG_POINTER=${/hmUI\.widget\.IMG_POINTER/.test(code.watchfaceIndexJs)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
