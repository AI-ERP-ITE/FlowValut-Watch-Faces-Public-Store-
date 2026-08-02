interface ColorAdjustOptions {
  brightness?: number; // -100..100
  contrast?: number; // -100..100
  saturation?: number; // for pointer: -100..100, for icon pass saturationMode='percent'
  saturationMode?: 'delta' | 'percent';
  hueDeg?: number;
  opacity?: number; // 0..1
}

interface IconPhotoEdit {
  exposure?: number; brightness?: number; contrast?: number;
  highlights?: number; shadows?: number; temperature?: number;
  tint?: number; sharpness?: number; vignette?: number;
}

interface IconBakeOptions {
  hueDeg?: number;
  saturationPercent?: number;
  colorize?: string;
  colorizeOpacity?: number;
  photoEdit?: IconPhotoEdit;
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

  // Apply extended photo-edit pipeline if any param is non-default
  if (options.photoEdit) {
    const pe = options.photoEdit;
    const hasPhotoEdit = (pe.exposure ?? 0) !== 0 || (pe.brightness ?? 0) !== 0 ||
      (pe.contrast ?? 0) !== 0 || (pe.highlights ?? 0) !== 0 || (pe.shadows ?? 0) !== 0 ||
      (pe.temperature ?? 0) !== 0 || (pe.tint ?? 0) !== 0 ||
      (pe.sharpness ?? 0) !== 0 || (pe.vignette ?? 0) !== 0;
    if (hasPhotoEdit) {
      // Lazy-import to avoid circular deps — inline the pixel ops directly
      const ctx = base.getContext('2d');
      if (ctx) {
        const W = base.width;
        const { exposure = 0, brightness = 0, contrast = 0,
                highlights = 0, shadows = 0, temperature = 0, tint = 0,
                sharpness = 0, vignette = 0 } = pe;

        // Step 1: exposure + brightness + contrast via CSS filter re-draw
        if (exposure !== 0 || brightness !== 0 || contrast !== 0) {
          const tmp = document.createElement('canvas');
          tmp.width = W; tmp.height = base.height;
          const tmpCtx = tmp.getContext('2d')!;
          tmpCtx.drawImage(base, 0, 0);
          const expBright = Math.pow(2, exposure / 100) * Math.max(0, 1 + brightness / 100);
          const contF = (259 * (contrast + 255)) / (255 * (259 - contrast));
          ctx.clearRect(0, 0, W, base.height);
          ctx.filter = `brightness(${expBright}) contrast(${contF})`;
          ctx.drawImage(tmp, 0, 0);
          ctx.filter = 'none';
        }

        // Step 2: per-pixel ops
        const H = base.height;
        if (highlights !== 0 || shadows !== 0 || temperature !== 0 || tint !== 0) {
          const hlStr = highlights / 100, shStr = shadows / 100;
          const tempSh = (temperature / 100) * 0.8, tintSh = (tint / 100) * 0.4;
          const imgData = ctx.getImageData(0, 0, W, H);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            let r = d[i]/255, g = d[i+1]/255, b = d[i+2]/255;
            if (highlights !== 0 || shadows !== 0) {
              const lum = 0.299*r + 0.587*g + 0.114*b;
              if (highlights !== 0) { const delta = hlStr * Math.max(0,(lum-0.5)*2); r=Math.min(1,Math.max(0,r+delta)); g=Math.min(1,Math.max(0,g+delta)); b=Math.min(1,Math.max(0,b+delta)); }
              if (shadows !== 0) { const delta = shStr * Math.max(0,(0.5-lum)*2); r=Math.min(1,Math.max(0,r+delta)); g=Math.min(1,Math.max(0,g+delta)); b=Math.min(1,Math.max(0,b+delta)); }
            }
            if (temperature !== 0) { r=Math.min(1,Math.max(0,r+tempSh)); b=Math.min(1,Math.max(0,b-tempSh)); }
            if (tint !== 0) { g=Math.min(1,Math.max(0,g-tintSh)); r=Math.min(1,Math.max(0,r+tintSh*0.5)); b=Math.min(1,Math.max(0,b+tintSh*0.5)); }
            d[i]=Math.min(255,Math.max(0,Math.round(r*255))); d[i+1]=Math.min(255,Math.max(0,Math.round(g*255))); d[i+2]=Math.min(255,Math.max(0,Math.round(b*255)));
          }
          ctx.putImageData(imgData, 0, 0);
        }

        // Step 3: sharpness
        if (sharpness > 0) {
          const src = ctx.getImageData(0, 0, W, H);
          const dst = ctx.createImageData(W, H);
          const sd = src.data, dd = dst.data, amt = sharpness/100;
          for (let y = 1; y < H-1; y++) for (let x = 1; x < W-1; x++) {
            const idx = (y*W+x)*4;
            for (let c = 0; c < 3; c++) {
              const center = sd[idx+c];
              const conv = Math.min(255,Math.max(0,5*center-sd[((y-1)*W+x)*4+c]-sd[((y+1)*W+x)*4+c]-sd[(y*W+x-1)*4+c]-sd[(y*W+x+1)*4+c]));
              dd[idx+c] = Math.round(center+(conv-center)*amt);
            }
            dd[idx+3] = sd[idx+3];
          }
          for (let x = 0; x < W; x++) {
            for (const p of [x * 4, ((H - 1) * W + x) * 4]) {
              dd[p]=sd[p];dd[p+1]=sd[p+1];dd[p+2]=sd[p+2];dd[p+3]=sd[p+3];
            }
          }
          for (let y = 0; y < H; y++) {
            for (const p of [(y * W) * 4, (y * W + W - 1) * 4]) {
              dd[p]=sd[p];dd[p+1]=sd[p+1];dd[p+2]=sd[p+2];dd[p+3]=sd[p+3];
            }
          }
          ctx.putImageData(dst, 0, 0);
        }

        // Step 4: vignette
        if (vignette > 0) {
          const cx = W/2, cy = H/2, r = Math.min(W,H)/2;
          const strength = (vignette/100)*0.85;
          const grad = ctx.createRadialGradient(cx,cy,0,cx,cy,r);
          grad.addColorStop(0,'rgba(0,0,0,0)');
          grad.addColorStop(1,`rgba(0,0,0,${strength.toFixed(3)})`);
          ctx.fillStyle = grad;
          ctx.fillRect(0,0,W,H);
        }
      }
    }
  }

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
