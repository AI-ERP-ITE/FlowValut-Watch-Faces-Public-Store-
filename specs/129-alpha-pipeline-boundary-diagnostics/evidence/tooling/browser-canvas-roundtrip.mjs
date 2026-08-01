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
      throw new Error('Usage: node browser-canvas-roundtrip.mjs --input <png> --output <png>');
    }
    options[token.slice(2)] = value;
  }
  if (!options.input || !options.output) {
    throw new Error('Both --input and --output are required');
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

function htmlDocument(targetWidth, targetHeight) {
  return `<!doctype html>
<meta charset="utf-8">
<title>pending</title>
<body>pending</body>
<script>
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = ${targetWidth};
    canvas.height = ${targetHeight};
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = String(reader.result).split(',')[1];
        document.title = 'complete';
        document.body.textContent = 'CANVAS_PNG_BASE64:' + base64;
      };
      reader.readAsDataURL(blob);
    }, 'image/png');
  };
  image.onerror = () => {
    document.title = 'failed';
    document.body.textContent = 'IMAGE_LOAD_FAILED';
  };
  image.src = '/fixture.png';
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
const outputPath = path.resolve(options.output);
const fixtureBytes = fs.readFileSync(inputPath);
const targetWidth = options.width ? Number.parseInt(options.width, 10) : 480;
const targetHeight = options.height ? Number.parseInt(options.height, 10) : 480;
if (!Number.isInteger(targetWidth) || targetWidth < 1) throw new Error('Invalid --width');
if (!Number.isInteger(targetHeight) || targetHeight < 1) throw new Error('Invalid --height');
const executable = findChromium();
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'spec129-chromium-'));

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
  response.end(htmlDocument(targetWidth, targetHeight));
});

try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const result = await runBrowser(
    executable,
    `http://127.0.0.1:${address.port}/`,
    profileDirectory,
  );
  const match = result.stdout.match(/CANVAS_PNG_BASE64:([A-Za-z0-9+/=]+)/);
  if (!match) {
    throw new Error(
      `Canvas result was absent from dumped DOM. DOM: ${result.stdout.slice(0, 500)}`,
    );
  }
  const outputBytes = Buffer.from(match[1], 'base64');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, outputBytes);
  process.stdout.write(`${JSON.stringify({
    executable,
    inputPath,
    outputPath,
    targetWidth,
    targetHeight,
    inputBytes: fixtureBytes.length,
    outputBytes: outputBytes.length,
    browserStderr: result.stderr,
  }, null, 2)}\n`);
} finally {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(profileDirectory, { recursive: true, force: true });
}
