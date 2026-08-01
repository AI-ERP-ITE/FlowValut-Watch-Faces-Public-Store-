/**
 * Spec 114 — Digit Bitmap Geometry Engine
 *
 * Production-grade bitmap generation for digit assets.
 * Core principle: visible glyph geometry determines bitmap size.
 * Transparent padding is minimized, not compensated for.
 *
 * Algorithm:
 *   1. Measure all 10 digits → collect 7 metrics each
 *   2. Compute optimized bitmap size: maxInkW + MARGIN_H × maxInkH + MARGIN_V
 *   3. Render each digit centered in the optimized bitmap
 *
 * Result: canvas ≈ ink → Zepp advances by canvas width → correct visual spacing.
 */

// ─── Named constants (no magic numbers) ─────────────────────────────────────

/** Horizontal safety margin added to each side of the widest digit. Never more than 2px per side. */
const MARGIN_H = 2;

/** Vertical safety margin added above and below the tallest digit. */
const MARGIN_V = 2;

/** Scratch canvas multiplier: render at this multiple of target height to avoid clipping during measurement. */
const SCRATCH_SCALE = 4;

// MIN_INK_FRACTION removed — bitmap now sized to element bounds, not ink. No scaling needed.

// ─── Types ───────────────────────────────────────────────────────────────────

/** All 7 measurements required by Spec 114 for a single rendered glyph. */
export interface GlyphMeasurement {
  char: string;
  /** Horizontal extent of visible ink pixels. */
  visibleWidth: number;
  /** Vertical extent of visible ink pixels. */
  visibleHeight: number;
  /** Bounding box of all visible pixels. */
  visibleBBox: { left: number; top: number; right: number; bottom: number };
  /** Transparent margin to the left of the first ink pixel. */
  leftTransparentMargin: number;
  /** Transparent margin to the right of the last ink pixel. */
  rightTransparentMargin: number;
  /** Transparent margin above the first ink row. */
  topMargin: number;
  /** Transparent margin below the last ink row. */
  bottomMargin: number;
  /** Canvas width used during measurement. */
  scratchW: number;
  /** Canvas height used during measurement. */
  scratchH: number;
}

/** Optimized bitmap dimensions for one digit font family. */
export interface OptimizedBitmapSize {
  /** Width shared by ALL 10 digits in this family. */
  bitmapW: number;
  /** Height shared by ALL 10 digits in this family. */
  bitmapH: number;
  /** maxInkW before margin was added. */
  maxInkW: number;
  /** maxInkH before margin was added. */
  maxInkH: number;
}

/** Result of rendering one digit into the optimized bitmap. */
export interface RenderedDigit {
  char: string;
  dataUrl: string;
  /** Always equals OptimizedBitmapSize.bitmapW — uniform across the family. */
  width: number;
  /** Always equals OptimizedBitmapSize.bitmapH. */
  height: number;
  /** Measurement taken from the scratch canvas (7 metrics). */
  measurement: GlyphMeasurement;
}

// ─── Phase 1: Measure ────────────────────────────────────────────────────────

/**
 * Render a single digit on a scratch canvas and measure all 7 ink metrics.
 * Uses a scratch canvas SCRATCH_SCALE × the font size to prevent any clipping.
 * Exported so generateOptimizedDigitBitmaps can re-measure at different font sizes.
 */
export function measureGlyph(
  char: string,
  scratchW: number,
  scratchH: number,
  font: string,
  color: string,
): GlyphMeasurement {
  const canvas = document.createElement('canvas');
  canvas.width = scratchW;
  canvas.height = scratchH;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, scratchW, scratchH);
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char, scratchW / 2, scratchH / 2);

  const data = ctx.getImageData(0, 0, scratchW, scratchH).data;
  let inkLeft = scratchW;
  let inkRight = -1;
  let inkTop = scratchH;
  let inkBottom = -1;

  for (let y = 0; y < scratchH; y++) {
    for (let x = 0; x < scratchW; x++) {
      if (data[(y * scratchW + x) * 4 + 3] > 0) {
        if (x < inkLeft) inkLeft = x;
        if (x > inkRight) inkRight = x;
        if (y < inkTop) inkTop = y;
        if (y > inkBottom) inkBottom = y;
      }
    }
  }

  const hasInk = inkRight >= 0;
  if (!hasInk) {
    return {
      char,
      visibleWidth: 1, visibleHeight: 1,
      visibleBBox: { left: 0, top: 0, right: 0, bottom: 0 },
      leftTransparentMargin: 0, rightTransparentMargin: 0,
      topMargin: 0, bottomMargin: 0,
      scratchW, scratchH,
    };
  }

  return {
    char,
    visibleWidth: inkRight - inkLeft + 1,
    visibleHeight: inkBottom - inkTop + 1,
    visibleBBox: { left: inkLeft, top: inkTop, right: inkRight, bottom: inkBottom },
    leftTransparentMargin: inkLeft,
    rightTransparentMargin: scratchW - 1 - inkRight,
    topMargin: inkTop,
    bottomMargin: scratchH - 1 - inkBottom,
    scratchW,
    scratchH,
  };
}

/**
 * Phase 1: Measure all 10 digits (0–9) for a given font and size.
 * Returns one GlyphMeasurement per digit.
 * Uses scratch canvas SCRATCH_SCALE × targetH to avoid clipping.
 */
export function measureAllGlyphs(
  fontFamily: string,
  fontWeight: string,
  fontSize: number,
  color: string,
): GlyphMeasurement[] {
  const scratchH = fontSize * SCRATCH_SCALE;
  const scratchW = scratchH * 2; // wide enough for any glyph
  const font = `${fontWeight} ${fontSize}px ${fontFamily}`;

  return Array.from({ length: 10 }, (_, i) =>
    measureGlyph(String(i), scratchW, scratchH, font, color),
  );
}

// ─── Phase 2: Compute optimized bitmap size ───────────────────────────────────

/**
 * Phase 2: Compute one optimized bitmap size for the entire digit family.
 *
 * Rules:
 * - NOT derived from font metrics, arbitrary constants, previous bitmap size, or caller's canvas size.
 * - ONLY derived from measured ink pixels across all 10 glyphs.
 * - bitmapW = maxInkW + MARGIN_H (≤ 2px total extra per dimension).
 * - ALL 10 digits MUST share the SAME bitmapW × bitmapH.
 */
export function computeOptimizedBitmapSize(measurements: GlyphMeasurement[]): OptimizedBitmapSize {
  const maxInkW = Math.max(1, ...measurements.map(m => m.visibleWidth));
  const maxInkH = Math.max(1, ...measurements.map(m => m.visibleHeight));
  return {
    bitmapW: maxInkW + MARGIN_H,
    bitmapH: maxInkH + MARGIN_V,
    maxInkW,
    maxInkH,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate 10 digit bitmaps that match exactly what the canvas preview draws.
 *
 * Strategy: mirror the canvas text-fallback rendering.
 *   - fontSize = Math.floor(targetHeight × 0.8)  ← same as InteractiveCanvas fallback
 *   - bitmapH  = targetHeight                    ← full element height
 *   - bitmapW  = ctx.measureText(digit).width    ← natural font advance, per digit
 *   - Glyph drawn centered vertically (textBaseline='middle', y = targetHeight/2)
 *
 * Each digit gets its natural advance width (variable per digit, just like a real font).
 * Zepp advances by image.naturalWidth → advances match canvas text-fallback advances.
 * No transparent horizontal padding → no artificial inter-digit gaps.
 * No stretching → glyph size matches preview exactly.
 */
export function generateOptimizedDigitBitmaps(
  fontFamily: string,
  fontWeight: string,
  targetHeight: number,
  color: string,
  options?: {
    tabular?: boolean;
    shadow?: { color: string; opacity: number; blur: number; offsetX: number; offsetY: number; pad: number };
  },
): RenderedDigit[] {
  const bitmapH = Math.max(4, targetHeight);
  // Match the canvas preview font size exactly (InteractiveCanvas fallback uses h * 0.8)
  const fontSize = Math.max(4, Math.floor(bitmapH * 0.8));
  const font = `${fontWeight} ${fontSize}px ${fontFamily}`;

  // Measure natural advance widths using the same canvas API the browser uses for layout
  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = fontSize * 6;
  measureCanvas.height = bitmapH;
  const mCtx = measureCanvas.getContext('2d')!;
  mCtx.font = font;

  const measurements = measureAllGlyphs(fontFamily, fontWeight, fontSize, color);
  const naturalWidths = measurements.map((_, i) => Math.max(2, Math.ceil(mCtx.measureText(String(i)).width)));
  const tabularWidth = Math.max(...naturalWidths);

  return measurements.map((m, i) => {
    const digit = String(i);
    // Natural advance = what the browser font renderer advances per character.
    // This is exactly what ctx.fillText uses, so canvas and device advances are identical.
    const contentW = options?.tabular ? tabularWidth : naturalWidths[i];
    const shadowPad = options?.shadow?.pad ?? 0;
    const bitmapW = contentW + shadowPad * 2;
    const outputH = bitmapH + shadowPad * 2;

    const canvas = document.createElement('canvas');
    canvas.width = bitmapW;
    canvas.height = outputH;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, bitmapW, outputH);
    if (options?.shadow) {
      const shadow = options.shadow;
      const hex = shadow.color.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16) || 0;
      const g = parseInt(hex.slice(2, 4), 16) || 0;
      const b = parseInt(hex.slice(4, 6), 16) || 0;
      ctx.shadowColor = `rgba(${r},${g},${b},${shadow.opacity})`;
      ctx.shadowBlur = shadow.blur;
      ctx.shadowOffsetX = shadow.offsetX;
      ctx.shadowOffsetY = shadow.offsetY;
    }
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(digit, shadowPad + contentW / 2, shadowPad + bitmapH / 2);

    return {
      char: digit,
      dataUrl: canvas.toDataURL('image/png'),
      width: bitmapW,
      height: outputH,
      measurement: m,
    };
  });
}
