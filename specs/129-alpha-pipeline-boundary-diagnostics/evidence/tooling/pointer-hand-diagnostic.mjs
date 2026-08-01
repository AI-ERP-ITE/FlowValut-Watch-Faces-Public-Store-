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
    const data = canvas
      .getContext('2d')
      .getImageData(0, 0, canvas.width, canvas.height).data;
    let binary = '';
    for (let offset = 3; offset < data.length; offset += 4) {
      binary += String.fromCharCode(data[offset]);
    }
    return btoa(binary);
  }

  function pointerShadow(intensity) {
    if (intensity <= 0) return null;
    return {
      opacity: 0.3 + intensity * 0.6,
      blur: 4 + intensity * 20,
      offsetX: intensity * 4,
      offsetY: intensity * 4,
    };
  }

  function pointerPadding(shadowIntensity, glowIntensity, trailIntensity) {
    const shadow = pointerShadow(shadowIntensity);
    const shadowPad = shadow
      ? Math.ceil(
          shadow.blur +
          Math.max(Math.abs(shadow.offsetX), Math.abs(shadow.offsetY)) +
          2
        )
      : 0;
    const glow = clamp(glowIntensity, 0, 1);
    const trail = clamp(trailIntensity, 0, 1);
    const glowPad = Math.ceil(glow * 20 + 12);
    const trailPad = Math.ceil(trail * 6);
    return Math.max(0, shadowPad, glowPad, trailPad);
  }

  function makeHourSource(image) {
    const canvas = document.createElement('canvas');
    canvas.width = 22;
    canvas.height = 140;
    canvas.getContext('2d').drawImage(image, 0, 0, 22, 140);
    return canvas;
  }

  function prepareGeometry(source, effects) {
    const pad = pointerPadding(
      effects.shadow || 0,
      effects.glow || 0,
      effects.trail || 0,
    );
    const output = document.createElement('canvas');
    output.width = 22 + pad * 2;
    output.height = 140 + pad * 2;
    output.getContext('2d').drawImage(source, pad, pad, 22, 140);
    return {
      canvas: output,
      pad,
      pivot: { x: 11 + pad, y: 118 + pad },
    };
  }

  function adjustedBase(source, opacity) {
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d');
    context.drawImage(source, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let offset = 3; offset < imageData.data.length; offset += 4) {
      imageData.data[offset] = Math.round(imageData.data[offset] * opacity);
    }
    context.putImageData(imageData, 0, 0);
    return canvas;
  }

  function applyPointerEffects(prepared, effects) {
    const hasEffects =
      effects.opacity !== 1 ||
      effects.shadow > 0 ||
      effects.glow > 0 ||
      effects.trail > 0 ||
      Boolean(effects.tint);
    if (!hasEffects) return prepared;

    const width = prepared.width;
    const height = prepared.height;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    const base = adjustedBase(prepared, effects.opacity);

    if (effects.trail > 0) {
      for (let step = 1; step <= 3; step += 1) {
        const trailAlpha = effects.trail * (0.18 - step * 0.04);
        if (trailAlpha <= 0) break;
        context.save();
        context.globalAlpha = trailAlpha;
        context.drawImage(base, 0, -step * 2, width, height);
        context.restore();
      }
    }

    context.save();
    const shadow = pointerShadow(effects.shadow);
    if (shadow) {
      context.shadowColor = 'rgba(0,0,0,' + shadow.opacity + ')';
      context.shadowBlur = shadow.blur;
      context.shadowOffsetX = shadow.offsetX;
      context.shadowOffsetY = shadow.offsetY;
    }
    context.globalAlpha = 1;
    context.drawImage(base, 0, 0, width, height);
    context.restore();

    if (effects.glow > 0) {
      context.save();
      context.globalCompositeOperation = 'screen';
      context.globalAlpha = effects.glow * 0.55;
      context.shadowColor = effects.tint || '#00EEFF';
      context.shadowBlur = 12 + effects.glow * 20;
      context.drawImage(base, 0, 0, width, height);
      context.restore();
    }

    if (effects.tint) {
      const tintCanvas = document.createElement('canvas');
      tintCanvas.width = width;
      tintCanvas.height = height;
      const tintContext = tintCanvas.getContext('2d');
      tintContext.drawImage(base, 0, 0, width, height);
      tintContext.globalCompositeOperation = 'source-in';
      tintContext.globalAlpha = 0.35;
      tintContext.fillStyle = effects.tint;
      tintContext.fillRect(0, 0, width, height);
      context.drawImage(tintCanvas, 0, 0, width, height);
    }

    return canvas;
  }

  function serialize(id, role, geometry, canvas, effects) {
    return {
      id,
      role,
      effects,
      width: canvas.width,
      height: canvas.height,
      pad: geometry.pad,
      pivot: geometry.pivot,
      pngBase64: canvas.toDataURL('image/png').split(',')[1],
      rawAlphaBase64: alphaBase64(canvas),
    };
  }

  (async () => {
    const sourceImage = await loadImage('/fixture.png');
    const source = makeHourSource(sourceImage);
    const cases = [
      {
        id: 'neutral',
        effects: { opacity: 1, shadow: 0, glow: 0, trail: 0, tint: null },
      },
      {
        id: 'opacity-50',
        effects: { opacity: 0.5, shadow: 0, glow: 0, trail: 0, tint: null },
      },
      {
        id: 'shadow-50',
        effects: { opacity: 1, shadow: 0.5, glow: 0, trail: 0, tint: null },
      },
      {
        id: 'glow-50',
        effects: { opacity: 1, shadow: 0, glow: 0.5, trail: 0, tint: null },
      },
      {
        id: 'trail-50',
        effects: { opacity: 1, shadow: 0, glow: 0, trail: 0.5, tint: null },
      },
      {
        id: 'tint-orange',
        effects: { opacity: 1, shadow: 0, glow: 0, trail: 0, tint: '#e69a5a' },
      },
    ];
    const outputs = [];
    for (const testCase of cases) {
      const geometry = prepareGeometry(source, testCase.effects);
      outputs.push(
        serialize(
          testCase.id + '-prepared',
          'prepared-reference',
          geometry,
          geometry.canvas,
          testCase.effects,
        ),
      );
      const effected = applyPointerEffects(geometry.canvas, testCase.effects);
      outputs.push(
        serialize(
          testCase.id + '-effected',
          'effected',
          geometry,
          effected,
          testCase.effects,
        ),
      );
    }
    document.title = 'complete';
    document.body.textContent =
      'POINTER_RESULT:' +
      btoa(unescape(encodeURIComponent(JSON.stringify(outputs))));
  })().catch((error) => {
    document.title = 'failed';
    document.body.textContent = 'POINTER_FAILED:' + String(error?.stack || error);
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
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'spec129-pointer-'));
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
  const match = browserResult.stdout.match(/POINTER_RESULT:([A-Za-z0-9+/=]+)/);
  if (!match) {
    throw new Error(
      `Pointer result absent from DOM: ${browserResult.stdout.slice(0, 500)}`,
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
    path.join(outputDirectory, 'pointer-hand-manifest.json'),
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
