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
  if (!options.input || !options.output) {
    throw new Error('--input and --output are required');
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
  const clamp = (value, minimum, maximum) =>
    Math.max(minimum, Math.min(maximum, value));

  const loadImage = (src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

  function alphaBase64(canvas) {
    const context = canvas.getContext('2d');
    const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let binary = '';
    for (let offset = 3; offset < rgba.length; offset += 4) {
      binary += String.fromCharCode(rgba[offset]);
    }
    return btoa(binary);
  }

  function rgbToHsv(r, g, b) {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const maximum = Math.max(rn, gn, bn);
    const minimum = Math.min(rn, gn, bn);
    const difference = maximum - minimum;
    let hue = 0;
    if (difference !== 0) {
      if (maximum === rn) hue = ((gn - bn) / difference) % 6;
      else if (maximum === gn) hue = (bn - rn) / difference + 2;
      else hue = (rn - gn) / difference + 4;
      hue *= 60;
      if (hue < 0) hue += 360;
    }
    return {
      h: hue,
      s: maximum === 0 ? 0 : difference / maximum,
      v: maximum,
    };
  }

  function hsvToRgb(hue, saturation, value) {
    const chroma = value * saturation;
    const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = value - chroma;
    let r = 0, g = 0, b = 0;
    if (hue < 60) { r = chroma; g = x; }
    else if (hue < 120) { r = x; g = chroma; }
    else if (hue < 180) { g = chroma; b = x; }
    else if (hue < 240) { g = x; b = chroma; }
    else if (hue < 300) { r = x; b = chroma; }
    else { r = chroma; b = x; }
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }

  function bakeDeterministicColorAdjustments(source, opacity = 1) {
    const width = 128;
    const height = 128;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, width, height);
    context.drawImage(source, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let offset = 0; offset < data.length; offset += 4) {
      const alpha = data[offset + 3];
      if (alpha === 0) continue;
      const hsv = rgbToHsv(data[offset], data[offset + 1], data[offset + 2]);
      const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
      data[offset] = clamp(rgb.r, 0, 255);
      data[offset + 1] = clamp(rgb.g, 0, 255);
      data[offset + 2] = clamp(rgb.b, 0, 255);
      data[offset + 3] = clamp(Math.round(alpha * opacity), 0, 255);
    }
    context.putImageData(imageData, 0, 0);
    return canvas;
  }

  function copyCanvas(source) {
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    canvas.getContext('2d').drawImage(source, 0, 0);
    return canvas;
  }

  function applyExposureBrightnessContrast(base) {
    const canvas = copyCanvas(base);
    const context = canvas.getContext('2d');
    const temporary = copyCanvas(canvas);
    const exposure = 25;
    const brightness = 10;
    const contrast = 15;
    const expBright =
      Math.pow(2, exposure / 100) * Math.max(0, 1 + brightness / 100);
    const contrastFactor =
      (259 * (contrast + 255)) / (255 * (259 - contrast));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.filter =
      'brightness(' + expBright + ') contrast(' + contrastFactor + ')';
    context.drawImage(temporary, 0, 0);
    context.filter = 'none';
    return canvas;
  }

  function applyTonalPixelEdits(base) {
    const canvas = copyCanvas(base);
    const context = canvas.getContext('2d');
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const highlights = 25 / 100;
    const shadows = 15 / 100;
    const temperature = (20 / 100) * 0.8;
    const tint = (-10 / 100) * 0.4;
    for (let offset = 0; offset < data.length; offset += 4) {
      let r = data[offset] / 255;
      let g = data[offset + 1] / 255;
      let b = data[offset + 2] / 255;
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      const highlightDelta = highlights * Math.max(0, (luminance - 0.5) * 2);
      const shadowDelta = shadows * Math.max(0, (0.5 - luminance) * 2);
      r = clamp(r + highlightDelta + shadowDelta, 0, 1);
      g = clamp(g + highlightDelta + shadowDelta, 0, 1);
      b = clamp(b + highlightDelta + shadowDelta, 0, 1);
      r = clamp(r + temperature, 0, 1);
      b = clamp(b - temperature, 0, 1);
      g = clamp(g - tint, 0, 1);
      r = clamp(r + tint * 0.5, 0, 1);
      b = clamp(b + tint * 0.5, 0, 1);
      data[offset] = Math.round(r * 255);
      data[offset + 1] = Math.round(g * 255);
      data[offset + 2] = Math.round(b * 255);
    }
    context.putImageData(imageData, 0, 0);
    return canvas;
  }

  function applySharpness(base) {
    const canvas = copyCanvas(base);
    const context = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const source = context.getImageData(0, 0, width, height);
    const destination = context.createImageData(width, height);
    const sourceData = source.data;
    const destinationData = destination.data;
    const amount = 0.5;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = (y * width + x) * 4;
        for (let channel = 0; channel < 3; channel++) {
          const center = sourceData[index + channel];
          const convolution = clamp(
            5 * center -
              sourceData[((y - 1) * width + x) * 4 + channel] -
              sourceData[((y + 1) * width + x) * 4 + channel] -
              sourceData[(y * width + x - 1) * 4 + channel] -
              sourceData[(y * width + x + 1) * 4 + channel],
            0,
            255,
          );
          destinationData[index + channel] =
            Math.round(center + (convolution - center) * amount);
        }
        destinationData[index + 3] = sourceData[index + 3];
      }
    }
    for (let index = 0; index < width; index++) {
      const borderOffsets = [
        index * 4,
        ((height - 1) * width + index) * 4,
        index * width * 4,
        (index * width + width - 1) * 4,
      ];
      for (const offset of borderOffsets) {
        for (let channel = 0; channel < 4; channel++) {
          destinationData[offset + channel] = sourceData[offset + channel];
        }
      }
    }
    context.putImageData(destination, 0, 0);
    return canvas;
  }

  function applyVignette(base) {
    const canvas = copyCanvas(base);
    const context = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2;
    const strength = 0.5 * 0.85;
    const gradient = context.createRadialGradient(
      centerX, centerY, 0, centerX, centerY, radius,
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,' + strength.toFixed(3) + ')');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
  }

  function serialize(id, canvas, expectedAlphaBehavior) {
    return {
      id,
      expectedAlphaBehavior,
      width: canvas.width,
      height: canvas.height,
      pngBase64: canvas.toDataURL('image/png').split(',')[1],
      rawAlphaBase64: alphaBase64(canvas),
    };
  }

  (async () => {
    const source = await loadImage('/fixture.png');
    const neutral = bakeDeterministicColorAdjustments(source, 1);
    const outputs = [
      serialize('neutral', neutral, 'baseline'),
      serialize(
        'opacity-50',
        bakeDeterministicColorAdjustments(source, 0.5),
        'alpha=round(baseline*0.5)',
      ),
      serialize(
        'exposure-brightness-contrast',
        applyExposureBrightnessContrast(neutral),
        'preserve',
      ),
      serialize('tonal-pixel-edits', applyTonalPixelEdits(neutral), 'preserve'),
      serialize('sharpness-50', applySharpness(neutral), 'preserve'),
      serialize('vignette-50', applyVignette(neutral), 'generated-overlay-alpha'),
    ];
    document.title = 'complete';
    document.body.textContent =
      'EFFECTS_RESULT:' +
      btoa(unescape(encodeURIComponent(JSON.stringify(outputs))));
  })().catch((error) => {
    document.title = 'failed';
    document.body.textContent = 'EFFECTS_FAILED:' + String(error?.stack || error);
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
const outputDirectory = path.resolve(options.output);
const fixtureBytes = fs.readFileSync(inputPath);
const executable = findChromium();
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'spec129-effects-'));
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
  const match = browserResult.stdout.match(/EFFECTS_RESULT:([A-Za-z0-9+/=]+)/);
  if (!match) {
    throw new Error(
      `Effects result absent from DOM: ${browserResult.stdout.slice(0, 500)}`,
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
    path.join(outputDirectory, 'effects-photo-edit-manifest.json'),
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
