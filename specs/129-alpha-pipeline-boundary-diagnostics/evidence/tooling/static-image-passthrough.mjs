import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const token = argv[index];
    const value = argv[index + 1];
    if (!token?.startsWith('--') || !value) {
      throw new Error(
        'Usage: node static-image-passthrough.mjs --input <png> --output-inline <png> --output-fetch <png>',
      );
    }
    options[token.slice(2)] = value;
  }
  if (!options.input || !options['output-inline'] || !options['output-fetch']) {
    throw new Error('Input and both outputs are required');
  }
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
  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const loadImage = (dataUrl) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  // Source-equivalent implementation of StudioApp.resizeDataUrl().
  const resizeDataUrl = async (dataUrl, targetW, targetH) => {
    if (!targetW || !targetH) return dataUrl;
    const image = await loadImage(dataUrl);
    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;
    if (naturalWidth === targetW && naturalHeight === targetH) return dataUrl;
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const context = canvas.getContext('2d');
    if (!context) return dataUrl;
    context.drawImage(image, 0, 0, targetW, targetH);
    return canvas.toDataURL('image/png');
  };

  // Source-equivalent data-URL decoder used when elementFiles are created.
  const decodeDataUrlToBytes = (dataUrl) => {
    const commaIndex = dataUrl.indexOf(',');
    if (!dataUrl.startsWith('data:') || commaIndex < 0) {
      throw new Error('Invalid data URL');
    }
    const header = dataUrl.slice(0, commaIndex);
    const payload = dataUrl.slice(commaIndex + 1);
    const binary = header.includes(';base64') ? atob(payload) : decodeURIComponent(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  };

  const bytesToBase64 = (bytes) => {
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return btoa(binary);
  };

  (async () => {
    const sourceResponse = await fetch('/fixture.png', { cache: 'no-store' });
    const sourceBlob = await sourceResponse.blob();
    const uploadedFile = new File([sourceBlob], 'alpha-fixture.png', { type: 'image/png' });
    const uploadedDataUrl = await fileToDataUrl(uploadedFile);

    const resizedDataUrl = await resizeDataUrl(uploadedDataUrl, 480, 480);
    const inlineBytes = decodeDataUrlToBytes(resizedDataUrl);

    // Source-equivalent fallback used for remaining Add Image data URLs.
    const fallbackBlob = await fetch(uploadedDataUrl).then((response) => response.blob());
    const fallbackBytes = new Uint8Array(await fallbackBlob.arrayBuffer());

    const result = {
      uploadedMimeType: uploadedFile.type,
      uploadedBytes: uploadedFile.size,
      dataUrlUnchangedByExactSizeResize: resizedDataUrl === uploadedDataUrl,
      inlineBase64: bytesToBase64(inlineBytes),
      fallbackBase64: bytesToBase64(fallbackBytes),
    };
    document.title = 'complete';
    document.body.textContent = 'STATIC_RESULT:' + btoa(JSON.stringify(result));
  })().catch((error) => {
    document.title = 'failed';
    document.body.textContent = 'STATIC_FAILED:' + String(error?.stack || error);
  });
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
const inputPath = path.resolve(options.input);
const inlineOutputPath = path.resolve(options['output-inline']);
const fetchOutputPath = path.resolve(options['output-fetch']);
const fixtureBytes = fs.readFileSync(inputPath);
const executable = findChromium();
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'spec129-static-'));

const server = http.createServer((request, response) => {
  if (request.url === '/fixture.png') {
    response.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': fixtureBytes.length,
      'Cache-Control': 'no-store',
    });
    response.end(fixtureBytes);
    return;
  }
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
  const match = browserResult.stdout.match(/STATIC_RESULT:([A-Za-z0-9+/=]+)/);
  if (!match) {
    throw new Error(
      `Static result was absent from dumped DOM: ${browserResult.stdout.slice(0, 500)}`,
    );
  }
  const result = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
  const inlineBytes = Buffer.from(result.inlineBase64, 'base64');
  const fetchBytes = Buffer.from(result.fallbackBase64, 'base64');

  fs.mkdirSync(path.dirname(inlineOutputPath), { recursive: true });
  fs.mkdirSync(path.dirname(fetchOutputPath), { recursive: true });
  fs.writeFileSync(inlineOutputPath, inlineBytes);
  fs.writeFileSync(fetchOutputPath, fetchBytes);

  process.stdout.write(`${JSON.stringify({
    executable,
    inputPath,
    inlineOutputPath,
    fetchOutputPath,
    sourceBytes: fixtureBytes.length,
    inlineBytes: inlineBytes.length,
    fetchBytes: fetchBytes.length,
    uploadedMimeType: result.uploadedMimeType,
    uploadedBytes: result.uploadedBytes,
    dataUrlUnchangedByExactSizeResize: result.dataUrlUnchangedByExactSizeResize,
    browserStderr: browserResult.stderr,
  }, null, 2)}\n`);
} finally {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(profileDirectory, { recursive: true, force: true });
}
