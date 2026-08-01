import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    options[String(argv[index]).replace(/^--/, '')] = argv[index + 1];
  }
  if (!options.output) throw new Error('--output is required');
  return options;
}

function findChromium() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  const executable = candidates.find((candidate) => fs.existsSync(candidate));
  if (!executable) throw new Error('No supported Chromium executable found');
  return executable;
}

function htmlDocument() {
  return `<!doctype html>
<meta charset="utf-8">
<title>pending</title>
<body>pending</body>
<script>
  function measureGlyph(char, scratchW, scratchH, font, color) {
    const canvas = document.createElement('canvas');
    canvas.width = scratchW;
    canvas.height = scratchH;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, scratchW, scratchH);
    context.fillStyle = color;
    context.font = font;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(char, scratchW / 2, scratchH / 2);
    const data = context.getImageData(0, 0, scratchW, scratchH).data;
    let left = scratchW;
    let right = -1;
    let top = scratchH;
    let bottom = -1;
    for (let y = 0; y < scratchH; y++) {
      for (let x = 0; x < scratchW; x++) {
        if (data[(y * scratchW + x) * 4 + 3] > 0) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
    }
    return {
      char,
      visibleWidth: right >= 0 ? right - left + 1 : 1,
      visibleHeight: right >= 0 ? bottom - top + 1 : 1,
      visibleBBox: right >= 0
        ? { left, top, right, bottom }
        : { left: 0, top: 0, right: 0, bottom: 0 },
    };
  }

  function generateOptimizedDigitBitmaps(
    fontFamily,
    fontWeight,
    targetHeight,
    color,
    tabular,
  ) {
    const bitmapH = Math.max(4, targetHeight);
    const fontSize = Math.max(4, Math.floor(bitmapH * 0.8));
    const font = fontWeight + ' ' + fontSize + 'px ' + fontFamily;
    const measureCanvas = document.createElement('canvas');
    measureCanvas.width = fontSize * 6;
    measureCanvas.height = bitmapH;
    const measureContext = measureCanvas.getContext('2d');
    measureContext.font = font;
    const scratchH = fontSize * 4;
    const scratchW = scratchH * 2;
    const measurements = Array.from({ length: 10 }, (_, index) =>
      measureGlyph(String(index), scratchW, scratchH, font, color)
    );
    const naturalWidths = measurements.map((_, index) =>
      Math.max(2, Math.ceil(measureContext.measureText(String(index)).width))
    );
    const tabularWidth = Math.max(...naturalWidths);

    return measurements.map((measurement, index) => {
      const digit = String(index);
      const bitmapW = tabular ? tabularWidth : naturalWidths[index];
      const canvas = document.createElement('canvas');
      canvas.width = bitmapW;
      canvas.height = bitmapH;
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, bitmapW, bitmapH);
      context.fillStyle = color;
      context.font = font;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(digit, bitmapW / 2, bitmapH / 2);
      const rgba = context.getImageData(0, 0, bitmapW, bitmapH).data;
      let alphaBinary = '';
      for (let offset = 3; offset < rgba.length; offset += 4) {
        alphaBinary += String.fromCharCode(rgba[offset]);
      }
      return {
        digit,
        bitmapW,
        bitmapH,
        fontSize,
        font,
        measurement,
        pngBase64: canvas.toDataURL('image/png').split(',')[1],
        rawAlphaBase64: btoa(alphaBinary),
      };
    });
  }

  const colors = [
    { id: 'orange', value: '#e69a5a' },
    { id: 'black', value: '#000000' },
    { id: 'teal', value: '#00a887' },
  ];
  const outputs = [];
  for (const targetHeight of [21, 40]) {
    for (const tabular of [false, true]) {
      for (const color of colors) {
        const family = generateOptimizedDigitBitmaps(
          'Arial',
          'bold',
          targetHeight,
          color.value,
          tabular,
        );
        for (const glyph of family) {
          outputs.push({
            id:
              'digit-' + glyph.digit + '-h' + targetHeight + '-' +
              (tabular ? 'tabular' : 'natural') + '-' + color.id,
            targetHeight,
            tabular,
            colorId: color.id,
            color: color.value,
            fontFamily: 'Arial',
            fontWeight: 'bold',
            ...glyph,
          });
        }
      }
    }
  }
  document.title = 'complete';
  document.body.textContent =
    'NUMERIC_RESULT:' + btoa(unescape(encodeURIComponent(JSON.stringify(outputs))));
</script>`;
}

function runBrowser(executable, url, profileDirectory) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${profileDirectory}`,
      '--virtual-time-budget=5000',
      '--dump-dom',
      url,
    ], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(
          `Chromium exited with ${code}: ${Buffer.concat(stderr).toString('utf8')}`,
        ));
        return;
      }
      resolve({
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
      });
    });
  });
}

const options = parseArgs(process.argv.slice(2));
const outputDirectory = path.resolve(options.output);
const executable = findChromium();
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'spec129-digit-'));
const server = http.createServer((_request, response) => {
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(htmlDocument());
});

try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const browserResult = await runBrowser(
    executable,
    `http://127.0.0.1:${address.port}/`,
    profileDirectory,
  );
  const match = browserResult.stdout.match(/NUMERIC_RESULT:([A-Za-z0-9+/=]+)/);
  if (!match) {
    throw new Error(
      `Numeric result was absent from dumped DOM: ${browserResult.stdout.slice(0, 500)}`,
    );
  }
  const outputs = JSON.parse(
    decodeURIComponent(
      escape(Buffer.from(match[1], 'base64').toString('binary')),
    ),
  );
  fs.mkdirSync(outputDirectory, { recursive: true });
  const manifest = outputs.map(({ pngBase64, rawAlphaBase64, ...metadata }) => {
    const pngBytes = Buffer.from(pngBase64, 'base64');
    const rawAlphaBytes = Buffer.from(rawAlphaBase64, 'base64');
    const filename = `${metadata.id}.png`;
    fs.writeFileSync(path.join(outputDirectory, filename), pngBytes);
    return {
      ...metadata,
      filename,
      encodedBytes: pngBytes.length,
      browserRawAlphaSha256:
        crypto.createHash('sha256').update(rawAlphaBytes).digest('hex'),
    };
  });
  fs.writeFileSync(
    path.join(outputDirectory, 'numeric-glyph-manifest.json'),
    `${JSON.stringify({
      executable,
      browserStderr: browserResult.stderr,
      outputs: manifest,
    }, null, 2)}\n`,
    'utf8',
  );
  process.stdout.write(`${JSON.stringify({
    executable,
    outputDirectory,
    outputCount: manifest.length,
    browserStderr: browserResult.stderr,
  }, null, 2)}\n`);
} finally {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(profileDirectory, { recursive: true, force: true });
}
