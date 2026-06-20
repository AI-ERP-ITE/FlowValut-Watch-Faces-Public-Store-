/**
 * photoEditUtils.ts
 * Shared photo-editing pixel pipeline used by BackgroundPhotoEditor
 * and image_layer canvas rendering.
 */

export interface PhotoEditParams {
  exposure:    number;  // −100…+100, default 0
  brightness:  number;  // −100…+100, default 0
  contrast:    number;  // −100…+100, default 0
  highlights:  number;  // −100…+100, default 0
  shadows:     number;  // −100…+100, default 0
  saturation:  number;  // −100…+100, default 0
  hue:         number;  //    0…360,  default 0
  temperature: number;  // −100…+100, default 0
  tint:        number;  // −100…+100, default 0
  sharpness:   number;  //    0…100,  default 0
  vignette:    number;  //    0…100,  default 0
}

export const DEFAULT_PHOTO_EDIT: PhotoEditParams = {
  exposure:    0,
  brightness:  0,
  contrast:    0,
  highlights:  0,
  shadows:     0,
  saturation:  0,
  hue:         0,
  temperature: 0,
  tint:        0,
  sharpness:   0,
  vignette:    0,
};

/**
 * Apply photo-edit pipeline to an offscreen canvas that already has the image drawn.
 * Returns the same canvas (mutated in-place).
 *
 * @param off   Offscreen canvas (already contains the source image at full size)
 * @param params PhotoEditParams
 */
export function applyPhotoEditToCanvas(
  off: HTMLCanvasElement,
  params: PhotoEditParams,
): void {
  const { exposure, brightness, contrast, highlights, shadows,
          saturation, hue, temperature, tint, sharpness, vignette } = params;

  const SIZE = off.width;
  const offCtx = off.getContext('2d');
  if (!offCtx) return;

  // ── Step 1: Bake exposure + brightness + contrast via CSS filter ──────
  const expBrightFactor = Math.pow(2, exposure / 100) * Math.max(0, 1 + brightness / 100);
  const contrastFactor  = (259 * (contrast + 255)) / (255 * (259 - contrast));

  // Re-draw with filter applied (requires a temp copy of the current pixels)
  if (exposure !== 0 || brightness !== 0 || contrast !== 0) {
    const tmp = document.createElement('canvas');
    tmp.width = SIZE; tmp.height = SIZE;
    const tmpCtx = tmp.getContext('2d')!;
    tmpCtx.drawImage(off, 0, 0);
    offCtx.clearRect(0, 0, SIZE, SIZE);
    offCtx.filter = `brightness(${expBrightFactor}) contrast(${contrastFactor})`;
    offCtx.drawImage(tmp, 0, 0);
    offCtx.filter = 'none';
  }

  // ── Steps 2–4: Per-pixel — highlights/shadows, temp/tint, hue/sat ────
  const needsPixelOps = highlights !== 0 || shadows !== 0 ||
                        temperature !== 0 || tint !== 0 ||
                        hue !== 0 || saturation !== 0;

  if (needsPixelOps) {
    const hlStr   = highlights  / 100;
    const shStr   = shadows     / 100;
    const tempSh  = (temperature / 100) * 0.8;
    const tintSh  = (tint        / 100) * 0.4;
    const satMult = 1 + saturation / 100;
    const doHS    = hue !== 0 || saturation !== 0;

    const hue2rgb = (p: number, q: number, t: number): number => {
      const tt = ((t % 1) + 1) % 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };

    const imageData = offCtx.getImageData(0, 0, SIZE, SIZE);
    const d = imageData.data;

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;

      if (highlights !== 0 || shadows !== 0) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (highlights !== 0) {
          const delta = hlStr * Math.max(0, (lum - 0.5) * 2);
          r = Math.min(1, Math.max(0, r + delta));
          g = Math.min(1, Math.max(0, g + delta));
          b = Math.min(1, Math.max(0, b + delta));
        }
        if (shadows !== 0) {
          const delta = shStr * Math.max(0, (0.5 - lum) * 2);
          r = Math.min(1, Math.max(0, r + delta));
          g = Math.min(1, Math.max(0, g + delta));
          b = Math.min(1, Math.max(0, b + delta));
        }
      }

      if (temperature !== 0) {
        r = Math.min(1, Math.max(0, r + tempSh));
        b = Math.min(1, Math.max(0, b - tempSh));
      }

      if (tint !== 0) {
        g = Math.min(1, Math.max(0, g - tintSh));
        r = Math.min(1, Math.max(0, r + tintSh * 0.5));
        b = Math.min(1, Math.max(0, b + tintSh * 0.5));
      }

      if (doHS) {
        const cmax = Math.max(r, g, b);
        const cmin = Math.min(r, g, b);
        const dlt  = cmax - cmin;
        let hh = 0, ss = 0;
        const ll = (cmax + cmin) / 2;
        if (dlt > 0) {
          ss = ll > 0.5 ? dlt / (2 - cmax - cmin) : dlt / (cmax + cmin);
          if      (cmax === r) hh = ((g - b) / dlt + (g < b ? 6 : 0)) / 6;
          else if (cmax === g) hh = ((b - r) / dlt + 2) / 6;
          else                 hh = ((r - g) / dlt + 4) / 6;
        }
        hh = ((((hh * 360 + hue) % 360) + 360) % 360) / 360;
        ss = Math.min(1, Math.max(0, ss * satMult));
        if (ss === 0) {
          r = g = b = ll;
        } else {
          const q2 = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
          const p2 = 2 * ll - q2;
          r = hue2rgb(p2, q2, hh + 1 / 3);
          g = hue2rgb(p2, q2, hh);
          b = hue2rgb(p2, q2, hh - 1 / 3);
        }
      }

      d[i]     = Math.min(255, Math.max(0, Math.round(r * 255)));
      d[i + 1] = Math.min(255, Math.max(0, Math.round(g * 255)));
      d[i + 2] = Math.min(255, Math.max(0, Math.round(b * 255)));
    }
    offCtx.putImageData(imageData, 0, 0);
  }

  // ── Sharpness — 3×3 unsharp-mask convolution ─────────────────────────
  if (sharpness > 0) {
    const src = offCtx.getImageData(0, 0, SIZE, SIZE);
    const dst = offCtx.createImageData(SIZE, SIZE);
    const sd  = src.data;
    const dd  = dst.data;
    const amt = sharpness / 100;

    for (let y = 1; y < SIZE - 1; y++) {
      for (let x = 1; x < SIZE - 1; x++) {
        const idx = (y * SIZE + x) * 4;
        for (let c = 0; c < 3; c++) {
          const center = sd[idx + c];
          const conv   = Math.min(255, Math.max(0,
            5 * center
            - sd[((y - 1) * SIZE + x    ) * 4 + c]
            - sd[((y + 1) * SIZE + x    ) * 4 + c]
            - sd[(y       * SIZE + x - 1) * 4 + c]
            - sd[(y       * SIZE + x + 1) * 4 + c],
          ));
          dd[idx + c] = Math.round(center + (conv - center) * amt);
        }
        dd[idx + 3] = sd[idx + 3];
      }
    }
    for (let i = 0; i < SIZE; i++) {
      const top = i * 4;
      const bot = ((SIZE - 1) * SIZE + i) * 4;
      const lft = (i * SIZE) * 4;
      const rgt = (i * SIZE + SIZE - 1) * 4;
      for (const p of [top, bot, lft, rgt]) {
        dd[p] = sd[p]; dd[p+1] = sd[p+1]; dd[p+2] = sd[p+2]; dd[p+3] = sd[p+3];
      }
    }
    offCtx.putImageData(dst, 0, 0);
  }

  // ── Vignette radial-gradient overlay ─────────────────────────────────
  if (vignette > 0) {
    const cx = SIZE / 2;
    const r  = SIZE / 2;
    const strength = (vignette / 100) * 0.85;
    const grad = offCtx.createRadialGradient(cx, cx, 0, cx, cx, r);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${strength.toFixed(3)})`);
    offCtx.fillStyle = grad;
    offCtx.fillRect(0, 0, SIZE, SIZE);
  }
}

/**
 * Draw an image onto a target canvas with photo-edit params applied.
 * The target canvas is drawn into at (dx, dy) with (dw, dh) size.
 */
export function drawImageWithPhotoEdit(
  targetCtx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  params: PhotoEditParams,
  dx: number, dy: number, dw: number, dh: number,
): void {
  const off = document.createElement('canvas');
  off.width  = dw;
  off.height = dh;
  const offCtx = off.getContext('2d');
  if (!offCtx) return;
  offCtx.drawImage(img, 0, 0, dw, dh);
  applyPhotoEditToCanvas(off, params);
  targetCtx.drawImage(off, dx, dy);
}
