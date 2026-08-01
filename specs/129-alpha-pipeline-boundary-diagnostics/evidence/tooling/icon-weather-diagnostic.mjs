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
  const loadImage = (src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

  function alphaBase64(context, width, height) {
    const rgba = context.getImageData(0, 0, width, height).data;
    let binary = '';
    for (let offset = 3; offset < rgba.length; offset += 4) {
      binary += String.fromCharCode(rgba[offset]);
    }
    return btoa(binary);
  }

  function parseHexColor(hex) {
    return [
      Number.parseInt(hex.slice(1, 3), 16),
      Number.parseInt(hex.slice(3, 5), 16),
      Number.parseInt(hex.slice(5, 7), 16),
    ];
  }

  // Source-equivalent neutral deterministic icon bake plus optional full colorize.
  function bakeIcon(source, colorize) {
    const width = 480;
    const height = 480;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, width, height);
    context.drawImage(source, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    if (colorize) {
      const [r, g, b] = parseHexColor(colorize);
      for (let offset = 0; offset < data.length; offset += 4) {
        if (data[offset + 3] === 0) continue;
        data[offset] = r;
        data[offset + 1] = g;
        data[offset + 2] = b;
      }
    }
    context.putImageData(imageData, 0, 0);
    return {
      pngBase64: canvas.toDataURL('image/png').split(',')[1],
      rawAlphaBase64: alphaBase64(context, width, height),
      width,
      height,
    };
  }

  // Source-equivalent flat-weather code 0 primitive with color isolated.
  function bakeFlatWeatherSun(color) {
    const width = 60;
    const height = 60;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, width, height);
    const cx = 30;
    const cy = 30;
    const radius = 14;
    context.strokeStyle = color;
    context.lineWidth = 1.5;
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      context.beginPath();
      context.moveTo(
        cx + Math.cos(angle) * (radius + 3),
        cy + Math.sin(angle) * (radius + 3),
      );
      context.lineTo(
        cx + Math.cos(angle) * (radius + 7),
        cy + Math.sin(angle) * (radius + 7),
      );
      context.stroke();
    }
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
    return {
      pngBase64: canvas.toDataURL('image/png').split(',')[1],
      rawAlphaBase64: alphaBase64(context, width, height),
      width,
      height,
    };
  }

  // Source-equivalent flat-weather code 11 path: cloud shape + text snowflakes.
  function bakeFlatWeatherSnow(color) {
    const width = 60;
    const height = 60;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, width, height);
    const cx = 30;
    const cy = 30;
    const cloudCy = cy - 8;
    const cloudW = 30;
    const cloudH = 16;
    const x = cx - cloudW / 2;
    const y = cloudCy - cloudH / 2;
    context.beginPath();
    context.moveTo(x + cloudW * 0.25, y + cloudH);
    context.lineTo(x + cloudW * 0.75, y + cloudH);
    context.arc(
      x + cloudW * 0.75,
      y + cloudH * 0.6,
      cloudH * 0.4,
      Math.PI * 0.5,
      -Math.PI * 0.1,
      true,
    );
    context.arc(
      x + cloudW * 0.5,
      y + cloudH * 0.3,
      cloudH * 0.38,
      -Math.PI * 0.05,
      Math.PI * 1.05,
      true,
    );
    context.arc(
      x + cloudW * 0.25,
      y + cloudH * 0.55,
      cloudH * 0.33,
      -Math.PI * 1.1,
      Math.PI * 0.5,
      false,
    );
    context.closePath();
    context.fillStyle = color;
    context.fill();

    const top = cy + 10;
    const count = 3;
    const spacing = 9;
    const startX = cx - ((count - 1) * spacing) / 2;
    context.fillStyle = color;
    context.font = '9px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'top';
    for (let index = 0; index < count; index += 1) {
      const snowX = startX + index * spacing;
      const offsetY = (index % 2) * 4;
      context.fillText('*', snowX, top + offsetY);
    }
    return {
      pngBase64: canvas.toDataURL('image/png').split(',')[1],
      rawAlphaBase64: alphaBase64(context, width, height),
      width,
      height,
    };
  }

  (async () => {
    const source = await loadImage('/fixture.png');
    const colors = [
      { id: 'orange', value: '#e69a5a' },
      { id: 'black', value: '#000000' },
      { id: 'teal', value: '#00a887' },
    ];
    const outputs = [];
    outputs.push({
      id: 'icon-neutral',
      route: 'icon',
      colorId: 'neutral',
      color: null,
      ...bakeIcon(source, null),
    });
    for (const color of colors) {
      outputs.push({
        id: 'icon-colorize-' + color.id,
        route: 'icon',
        colorId: color.id,
        color: color.value,
        ...bakeIcon(source, color.value),
      });
      outputs.push({
        id: 'weather-flat-sun-' + color.id,
        route: 'weather-shape',
        weatherStyle: 'flat',
        weatherCode: 0,
        colorId: color.id,
        color: color.value,
        ...bakeFlatWeatherSun(color.value),
      });
      outputs.push({
        id: 'weather-flat-snow-' + color.id,
        route: 'weather-text',
        weatherStyle: 'flat',
        weatherCode: 11,
        colorId: color.id,
        color: color.value,
        ...bakeFlatWeatherSnow(color.value),
      });
    }
    document.title = 'complete';
    document.body.textContent =
      'ICON_WEATHER_RESULT:' +
      btoa(unescape(encodeURIComponent(JSON.stringify(outputs))));
  })().catch((error) => {
    document.title = 'failed';
    document.body.textContent = 'ICON_WEATHER_FAILED:' + String(error?.stack || error);
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
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'spec129-icon-'));
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
  const match = browserResult.stdout.match(
    /ICON_WEATHER_RESULT:([A-Za-z0-9+/=]+)/,
  );
  if (!match) {
    throw new Error(
      `Icon/weather result absent from DOM: ${browserResult.stdout.slice(0, 500)}`,
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
    path.join(outputDirectory, 'icon-weather-manifest.json'),
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
