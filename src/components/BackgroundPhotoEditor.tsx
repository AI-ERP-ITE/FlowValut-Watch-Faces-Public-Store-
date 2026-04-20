// Spec 023 — Background Photo Editor
// Non-destructive photo editor modal for the cropped background image.
// Opens from an "Edit Photo" button in DesignInput; saves edited PNG back to state.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EditParams {
  exposure:    number;  // –100 … +100 (default 0)
  brightness:  number;  // –100 … +100 (default 0)
  contrast:    number;  // –100 … +100 (default 0)
  highlights:  number;  // –100 … +100 (default 0)
  shadows:     number;  // –100 … +100 (default 0)
  saturation:  number;  // –100 … +100 (default 0)
  hue:         number;  //    0 … 360  (default 0)
  temperature: number;  // –100 … +100 (default 0, cool → warm)
  tint:        number;  // –100 … +100 (default 0, green → magenta)
  sharpness:   number;  //    0 … 100  (default 0)
  vignette:    number;  //    0 … 100  (default 0)
}

export const DEFAULT_EDIT_PARAMS: EditParams = {
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

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  sourceDataUrl: string;          // the cropped 480×480 PNG from BackgroundCropTool
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

// ── T020: Reusable slider row ─────────────────────────────────────────────────

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  defaultValue?: number;
  unit?: string;
  safeMin?: number;  // values outside [safeMin, safeMax] show a flicker warning
  safeMax?: number;
  onChange: (v: number) => void;
}

function EditorSlider({ label, min, max, step = 1, value, defaultValue = 0, unit = '', safeMin, safeMax, onChange }: SliderProps) {
  const isUnsafe = (safeMin !== undefined && value < safeMin) || (safeMax !== undefined && value > safeMax);
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-zinc-400 text-xs w-24 flex-shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-cyan-500 cursor-pointer"
      />
      {/* T032: double-click value badge to reset single param */}
      <span
        className={`text-xs w-10 text-right flex-shrink-0 select-none cursor-pointer transition-colors hover:text-cyan-400 ${isUnsafe ? 'text-amber-400 font-semibold' : 'text-zinc-300'}`}
        title={isUnsafe ? `⚠ May cause display flicker on watch. Safe range: ${safeMin ?? min} to ${safeMax ?? max}` : 'Double-click to reset'}
        onDoubleClick={() => onChange(defaultValue)}
      >
        {value > 0 && min < 0 ? `+${value}` : `${value}`}{unit}
      </span>
    </div>
  );
}

// ── Section heading helper ────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mt-5 mb-2 first:mt-0">
      {children}
    </h3>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BackgroundPhotoEditor({ sourceDataUrl, onSave, onCancel }: Props) {
  const [editParams, setEditParams] = useState<EditParams>(DEFAULT_EDIT_PARAMS);

  // T007: Store loaded HTMLImageElement so draw functions can access it
  const imgRef = useRef<HTMLImageElement | null>(null);
  // T009: Ref to the visible 480×480 canvas element
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // T012: Pending RAF handle — lets us cancel stale frames on rapid slider drag
  const rafRef = useRef<number>(0);
  // Tracks whether the source image has finished loading
  const [imgLoaded, setImgLoaded] = useState(false);

  // T006: Load sourceDataUrl into an HTMLImageElement on mount
  useEffect(() => {
    setImgLoaded(false);
    imgRef.current = null;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true); // T008: triggers initial preview draw via drawPreview effect below
    };
    img.src = sourceDataUrl;
  }, [sourceDataUrl]);

  // T011: Full pixel pipeline — runs on every editParams change.
  // Steps: offscreen draw → CSS filter (exp+bright+contrast) → per-pixel ops
  //        (highlights/shadows, temperature/tint, hue/sat) → sharpness →
  //        copy to visible canvas with circle clip → vignette overlay.
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;

    const SIZE = 480;

    // T013: Fast-path — all params at default → draw source image directly
    const isDefault =
      editParams.exposure === 0 && editParams.brightness === 0 && editParams.contrast === 0 &&
      editParams.highlights === 0 && editParams.shadows === 0 && editParams.saturation === 0 &&
      editParams.hue === 0 && editParams.temperature === 0 && editParams.tint === 0 &&
      editParams.sharpness === 0 && editParams.vignette === 0;

    if (isDefault) {
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.save();
      ctx.beginPath();
      ctx.arc(240, 240, 240, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      ctx.restore();
      return;
    }
    const { exposure, brightness, contrast, highlights, shadows,
            saturation, hue, temperature, tint, sharpness, vignette } = editParams;

    // ── Step 1: Offscreen 480×480 canvas ─────────────────────────────────
    const off    = document.createElement('canvas');
    off.width    = SIZE;
    off.height   = SIZE;
    const offCtx = off.getContext('2d')!;

    // ── Step 2: Bake exposure + brightness + contrast via CSS filter ──────
    const expBrightFactor = Math.pow(2, exposure / 100) * Math.max(0, 1 + brightness / 100);
    const contrastFactor  = (259 * (contrast + 255)) / (255 * (259 - contrast));
    offCtx.filter = `brightness(${expBrightFactor}) contrast(${contrastFactor})`;
    offCtx.drawImage(img, 0, 0, SIZE, SIZE);
    offCtx.filter = 'none';

    // ── Steps 3–5: Per-pixel — highlights/shadows, temp/tint, hue/sat ────
    const needsPixelOps = highlights !== 0 || shadows !== 0 ||
                          temperature !== 0 || tint !== 0 ||
                          hue !== 0 || saturation !== 0;

    if (needsPixelOps) {
      // Pre-compute scalars outside the loop for performance
      const hlStr   = highlights / 100;
      const shStr   = shadows    / 100;
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

        // Highlights / Shadows — luminance-targeted adjustment
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

        // Temperature (cool ↔ warm): shift R and B channels
        if (temperature !== 0) {
          r = Math.min(1, Math.max(0, r + tempSh));
          b = Math.min(1, Math.max(0, b - tempSh));
        }

        // Tint (green ↔ magenta)
        if (tint !== 0) {
          g = Math.min(1, Math.max(0, g - tintSh));
          r = Math.min(1, Math.max(0, r + tintSh * 0.5));
          b = Math.min(1, Math.max(0, b + tintSh * 0.5));
        }

        // Hue / Saturation — RGB → HSL → adjust → RGB
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

    // ── Step 6: Sharpness — 3×3 unsharp-mask convolution ─────────────────
    // Kernel: [ 0,-1, 0, -1,5,-1, 0,-1, 0 ] blended by (sharpness/100)
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
      // Copy 1-px border pixels unchanged
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

    // ── Step 7: Copy offscreen → visible canvas with circular clip ────────
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(240, 240, 240, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(off, 0, 0);
    ctx.restore();

    // ── Step 8: Vignette radial-gradient overlay ──────────────────────────
    if (vignette > 0) {
      const strength = (vignette / 100) * 0.85;
      const grad = ctx.createRadialGradient(240, 240, 0, 240, 240, 240);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${strength.toFixed(3)})`);
      ctx.save();
      ctx.beginPath();
      ctx.arc(240, 240, 240, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.restore();
    }
  }, [editParams]);

  // T012: Schedule draw via RAF; cancel pending frame if params change again before it fires.
  // T028: Cancel on unmount too.
  useEffect(() => {
    if (!imgLoaded) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => drawPreview());
    return () => cancelAnimationFrame(rafRef.current);
  }, [imgLoaded, editParams, drawPreview]);

  // T003: Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  // T029: Export — run the full pixel pipeline on a fresh offscreen canvas
  // and call onSave with the resulting data URL.
  // T030: Export is a FULL 480×480 square PNG (no circular clip) — matching
  // how Spec 011 stores backgroundImage. The circular mask is UI-only.
  const handleSave = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;

    const SIZE = 480;
    const { exposure, brightness, contrast, highlights, shadows,
            saturation, hue, temperature, tint, sharpness, vignette } = editParams;

    const off    = document.createElement('canvas');
    off.width    = SIZE;
    off.height   = SIZE;
    const offCtx = off.getContext('2d')!;

    // Step 2: CSS filter — exposure × brightness + contrast
    const expBrightFactor = Math.pow(2, exposure / 100) * Math.max(0, 1 + brightness / 100);
    const contrastFactor  = (259 * (contrast + 255)) / (255 * (259 - contrast));
    offCtx.filter = `brightness(${expBrightFactor}) contrast(${contrastFactor})`;
    offCtx.drawImage(img, 0, 0, SIZE, SIZE);
    offCtx.filter = 'none';

    // Steps 3–5: per-pixel ops
    const needsPixelOps = highlights !== 0 || shadows !== 0 ||
                          temperature !== 0 || tint !== 0 ||
                          hue !== 0 || saturation !== 0;

    if (needsPixelOps) {
      const hlStr   = highlights / 100;
      const shStr   = shadows    / 100;
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

    // Step 6: Sharpness
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

    // Step 7: Vignette (drawn directly onto export canvas — full square)
    if (vignette > 0) {
      const strength = (vignette / 100) * 0.85;
      const grad = offCtx.createRadialGradient(240, 240, 0, 240, 240, 240);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${strength.toFixed(3)})`);
      offCtx.fillStyle = grad;
      offCtx.fillRect(0, 0, SIZE, SIZE);
    }

    // Step 8: Export full 480×480 square PNG → dispatch via onSave
    onSave(off.toDataURL('image/png'));
  }, [editParams, onSave]);

  return (
    // T003: Full-screen overlay with dark backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      {/* Modal panel */}
      <div className="bg-[#1a1a1a] rounded-xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[95vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <h2 className="text-white font-semibold text-base">Edit Photo</h2>
          <button
            onClick={onCancel}
            className="text-zinc-400 hover:text-white text-lg leading-none transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body — T004: two-column on ≥900px, stacked on smaller viewports */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">

          {/* Left column: canvas preview area (fixed-width on desktop, full-width on mobile) */}
          <div className="flex items-center justify-center p-6 bg-[#111111] md:flex-shrink-0">
            {/* T009: 480×480 pixel buffer, displayed at 400px CSS.
                T010: circular clip + cyan border applied via style. */}
            <canvas
              ref={canvasRef}
              width={480}
              height={480}
              style={{
                width: 400,
                height: 400,
                borderRadius: '50%',
                border: '2px solid rgba(0,212,255,0.5)',
                background: '#1a1a1a',
                flexShrink: 0,
              }}
            />
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-zinc-700 flex-shrink-0" />
          <div className="block md:hidden h-px bg-zinc-700 flex-shrink-0" />

          {/* Right column: sliders panel — scrollable */}
          <div className="flex-1 overflow-y-auto p-6 min-w-0">

            {/* T021: Light section */}
            <SectionHeading>Light</SectionHeading>
            <EditorSlider label="Exposure"   min={-100} max={100} safeMin={-40} safeMax={40} value={editParams.exposure}
              onChange={(v) => setEditParams((p) => ({ ...p, exposure: v }))} />
            <EditorSlider label="Brightness" min={-100} max={100} value={editParams.brightness}
              onChange={(v) => setEditParams((p) => ({ ...p, brightness: v }))} />
            <EditorSlider label="Contrast"   min={-100} max={100} value={editParams.contrast}
              onChange={(v) => setEditParams((p) => ({ ...p, contrast: v }))} />
            <EditorSlider label="Highlights" min={-100} max={100} safeMin={-65} safeMax={65} value={editParams.highlights}
              onChange={(v) => setEditParams((p) => ({ ...p, highlights: v }))} />
            <EditorSlider label="Shadows"    min={-100} max={100} safeMin={-65} safeMax={65} value={editParams.shadows}
              onChange={(v) => setEditParams((p) => ({ ...p, shadows: v }))} />

            {/* T022: Colour section */}
            <SectionHeading>Colour</SectionHeading>
            <EditorSlider label="Saturation"  min={-100} max={100} value={editParams.saturation}
              onChange={(v) => setEditParams((p) => ({ ...p, saturation: v }))} />
            <EditorSlider label="Hue"         min={0} max={360} defaultValue={0} unit="°" value={editParams.hue}
              onChange={(v) => setEditParams((p) => ({ ...p, hue: v }))} />
            <EditorSlider label="Temperature" min={-100} max={100} value={editParams.temperature}
              onChange={(v) => setEditParams((p) => ({ ...p, temperature: v }))} />
            <EditorSlider label="Tint"        min={-100} max={100} value={editParams.tint}
              onChange={(v) => setEditParams((p) => ({ ...p, tint: v }))} />

            {/* T023: Detail section */}
            <SectionHeading>Detail</SectionHeading>
            <EditorSlider label="Sharpness" min={0} max={100} defaultValue={0} value={editParams.sharpness}
              onChange={(v) => setEditParams((p) => ({ ...p, sharpness: v }))} />

            {/* T024: Effects section */}
            <SectionHeading>Effects</SectionHeading>
            <EditorSlider label="Vignette" min={0} max={100} defaultValue={0} value={editParams.vignette}
              onChange={(v) => setEditParams((p) => ({ ...p, vignette: v }))} />

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-700">
          <Button
            variant="outline"
            className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
            onClick={() => setEditParams(DEFAULT_EDIT_PARAMS)}
          >
            Reset All
          </Button>
          <Button
            variant="outline"
            className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
