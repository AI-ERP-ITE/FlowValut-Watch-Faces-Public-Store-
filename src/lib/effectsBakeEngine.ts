interface ColorAdjustOptions {
  brightness?: number; // -100..100
  contrast?: number; // -100..100
  saturation?: number; // for pointer: -100..100, for icon pass saturationMode='percent'
  saturationMode?: 'delta' | 'percent';
  hueDeg?: number;
  opacity?: number; // 0..1
}

interface IconBakeOptions {
  hueDeg?: number;
  saturationPercent?: number;
  colorize?: string;
  colorizeOpacity?: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3
    ? `${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`
    : clean.padEnd(6, '0').slice(0, 6);
  return {
    r: parseInt(full.slice(0, 2), 16) || 0,
    g: parseInt(full.slice(2, 4), 16) || 0,
    b: parseInt(full.slice(4, 6), 16) || 0,
  };
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (h < 60) {
    rp = c; gp = x; bp = 0;
  } else if (h < 120) {
    rp = x; gp = c; bp = 0;
  } else if (h < 180) {
    rp = 0; gp = c; bp = x;
  } else if (h < 240) {
    rp = 0; gp = x; bp = c;
  } else if (h < 300) {
    rp = x; gp = 0; bp = c;
  } else {
    rp = c; gp = 0; bp = x;
  }

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

export function bakeDeterministicColorAdjustments(
  source: CanvasImageSource,
  width: number,
  height: number,
  options: ColorAdjustOptions,
): HTMLCanvasElement {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  if (!ctx) return out;

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);

  const brightness = clamp(options.brightness ?? 0, -100, 100);
  const contrast = clamp(options.contrast ?? 0, -100, 100);
  const saturationInput = options.saturation ?? 0;
  const hueDeg = options.hueDeg ?? 0;
  const opacity = clamp(options.opacity ?? 1, 0, 1);

  const brightnessDelta = (brightness / 100) * 255;
  const contrastFactor = 1 + contrast / 100;
  const satFactor = options.saturationMode === 'percent'
    ? clamp(saturationInput / 100, 0, 4)
    : clamp(1 + saturationInput / 100, 0, 4);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    const alpha = d[i + 3];
    if (alpha === 0) continue;

    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];

    r = (r - 128) * contrastFactor + 128 + brightnessDelta;
    g = (g - 128) * contrastFactor + 128 + brightnessDelta;
    b = (b - 128) * contrastFactor + 128 + brightnessDelta;

    const hsv = rgbToHsv(clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255));
    const adjustedHue = ((hsv.h + hueDeg) % 360 + 360) % 360;
    const adjustedSat = clamp(hsv.s * satFactor, 0, 1);
    const rgb = hsvToRgb(adjustedHue, adjustedSat, hsv.v);

    d[i] = clamp(rgb.r, 0, 255);
    d[i + 1] = clamp(rgb.g, 0, 255);
    d[i + 2] = clamp(rgb.b, 0, 255);
    d[i + 3] = clamp(Math.round(alpha * opacity), 0, 255);
  }

  ctx.putImageData(imgData, 0, 0);
  return out;
}

export function bakeDeterministicIconEffects(
  source: CanvasImageSource,
  width: number,
  height: number,
  options: IconBakeOptions,
): HTMLCanvasElement {
  const base = bakeDeterministicColorAdjustments(source, width, height, {
    hueDeg: options.hueDeg ?? 0,
    saturation: options.saturationPercent ?? 100,
    saturationMode: 'percent',
  });

  if (!options.colorize) return base;

  const ctx = base.getContext('2d');
  if (!ctx) return base;
  const { r, g, b } = parseHexColor(options.colorize);
  const alphaMul = clamp(options.colorizeOpacity ?? 1, 0, 1);
  const imgData = ctx.getImageData(0, 0, base.width, base.height);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    const alpha = d[i + 3];
    if (alpha === 0) continue;
    const t = alphaMul;
    d[i] = clamp(Math.round(d[i] * (1 - t) + r * t), 0, 255);
    d[i + 1] = clamp(Math.round(d[i + 1] * (1 - t) + g * t), 0, 255);
    d[i + 2] = clamp(Math.round(d[i + 2] * (1 - t) + b * t), 0, 255);
  }

  ctx.putImageData(imgData, 0, 0);
  return base;
}
