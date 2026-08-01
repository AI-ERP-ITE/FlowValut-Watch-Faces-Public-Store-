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
  function makeLabelCanvas(label, color, fontFamily, fontWeight, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, width, height);
    context.fillStyle = color;
    let fontSize = Math.floor(height * 0.8);
    context.font = fontWeight + ' ' + fontSize + 'px ' + fontFamily;
    while (fontSize > 6 && context.measureText(label).width > width * 0.95) {
      fontSize--;
      context.font = fontWeight + ' ' + fontSize + 'px ' + fontFamily;
    }
    const measuredWidth = context.measureText(label).width;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, width / 2, height / 2);
    const rgba = context.getImageData(0, 0, width, height).data;
    let rawAlphaBinary = '';
    for (let offset = 3; offset < rgba.length; offset += 4) {
      rawAlphaBinary += String.fromCharCode(rgba[offset]);
    }
    return {
      dataUrl: canvas.toDataURL('image/png'),
      fontSize,
      measuredWidth,
      font: context.font,
      rawAlphaBase64: btoa(rawAlphaBinary),
    };
  }

  const cases = [
    { label: 'WED', width: 60, height: 21 },
    { label: 'JUL', width: 60, height: 21 },
    { label: 'WED', width: 100, height: 40 },
    { label: 'JUL', width: 100, height: 40 },
  ];
  const colors = [
    { id: 'orange', value: '#e69a5a' },
    { id: 'black', value: '#000000' },
    { id: 'teal', value: '#00a887' },
  ];
  const outputs = [];
  for (const testCase of cases) {
    for (const color of colors) {
      const baked = makeLabelCanvas(
        testCase.label,
        color.value,
        'Arial',
        'bold',
        testCase.width,
        testCase.height,
      );
      outputs.push({
        id:
          testCase.label.toLowerCase() + '-' +
          testCase.height + '-' + color.id,
        ...testCase,
        color: color.value,
        colorId: color.id,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        actualFont: baked.font,
        actualFontSize: baked.fontSize,
        measuredWidth: baked.measuredWidth,
        pngBase64: baked.dataUrl.split(',')[1],
        rawAlphaBase64: baked.rawAlphaBase64,
      });
    }
  }
  document.title = 'complete';
  document.body.textContent =
    'LABEL_RESULT:' + btoa(unescape(encodeURIComponent(JSON.stringify(outputs))));
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
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'spec129-label-'));
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
  const match = browserResult.stdout.match(/LABEL_RESULT:([A-Za-z0-9+/=]+)/);
  if (!match) {
    throw new Error(
      `Label result was absent from dumped DOM: ${browserResult.stdout.slice(0, 500)}`,
    );
  }
  const outputs = JSON.parse(
    decodeURIComponent(
      escape(Buffer.from(match[1], 'base64').toString('binary')),
    ),
  );
  fs.mkdirSync(outputDirectory, { recursive: true });
  const manifest = outputs.map(({ pngBase64, rawAlphaBase64, ...metadata }) => {
    const bytes = Buffer.from(pngBase64, 'base64');
    const rawAlphaBytes = Buffer.from(rawAlphaBase64, 'base64');
    const filename = `${metadata.id}.png`;
    fs.writeFileSync(path.join(outputDirectory, filename), bytes);
    return {
      ...metadata,
      filename,
      encodedBytes: bytes.length,
      browserRawAlphaSha256:
        crypto.createHash('sha256').update(rawAlphaBytes).digest('hex'),
    };
  });
  fs.writeFileSync(
    path.join(outputDirectory, 'label-baker-manifest.json'),
    `${JSON.stringify({
      executable,
      browserStderr: browserResult.stderr,
      outputs: manifest,
    }, null, 2)}\n`,
    'utf8',
  );
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
} finally {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(profileDirectory, { recursive: true, force: true });
}
