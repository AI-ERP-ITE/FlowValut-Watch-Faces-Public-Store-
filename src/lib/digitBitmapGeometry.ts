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

// ─── Phase 3: Render each digit ──────────────────────────────────────────────

/**
 * Phase 3: Render one digit into the optimized bitmap.
 *
 * Bitmap geometry (bitmapW × bitmapH) controls Zepp's advance/spacing — unchanged.
 * Glyph scale is controlled independently via fillRatioX/fillRatioY so the visual
 * size matches the canvas preview. The glyph is centered with transparent margins;
 * those margins do NOT affect spacing because Zepp advances by bitmap width.
 */
function renderDigitToBitmap(
  char: string,
  measurement: GlyphMeasurement,
  size: OptimizedBitmapSize,
  font: string,
  color: string,
  fillRatioX: number,
  fillRatioY: number,
): string {
  const { bitmapW, bitmapH } = size;

  // Step 1: render glyph on scratch canvas at its natural size
  const scratch = document.createElement('canvas');
  scratch.width = measurement.scratchW;
  scratch.height = measurement.scratchH;
  const sCtx = scratch.getContext('2d')!;
  sCtx.clearRect(0, 0, measurement.scratchW, measurement.scratchH);
  sCtx.fillStyle = color;
  sCtx.font = font;
  sCtx.textAlign = 'center';
  sCtx.textBaseline = 'middle';
  sCtx.fillText(char, measurement.scratchW / 2, measurement.scratchH / 2);

  // Step 2: compute destination size — scale ink uniformly to fit within the
  // target fill area (fillRatioX × bitmapW by fillRatioY × bitmapH), then center.
  const { left, top, right, bottom } = measurement.visibleBBox;
  const inkW = right - left + 1;
  const inkH = bottom - top + 1;

  const targetW = Math.max(1, Math.round(bitmapW * fillRatioX));
  const targetH = Math.max(1, Math.round(bitmapH * fillRatioY));
  const scale = Math.min(targetW / inkW, targetH / inkH);
  const destW = Math.max(1, Math.round(inkW * scale));
  const destH = Math.max(1, Math.round(inkH * scale));
  const destX = Math.floor((bitmapW - destW) / 2);
  const destY = Math.floor((bitmapH - destH) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = bitmapW;
  canvas.height = bitmapH;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, bitmapW, bitmapH);
  ctx.drawImage(scratch, left, top, inkW, inkH, destX, destY, destW, destH);

  return canvas.toDataURL('image/png');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Full pipeline: measure all digits, compute optimal size, render all 10 bitmaps.
 *
 * Returns 10 RenderedDigit objects, all at the same bitmapW × bitmapH.
 * No optical compensation. No pair corrections. No runtime image processing.
 * Everything derived automatically from measured glyph geometry.
 *
 * Narrow digits (e.g. "1") are scaled up to MIN_INK_FRACTION * maxInkW so they
 * fill the cell visually — eliminating large gaps in pairs like "11", "18", "31".
 */
/**
 * Spec 114 — Generate 10 digit bitmaps sized exactly to element bounds.
 *
 * fillRatioX / fillRatioY control how much of the bitmap the glyph ink occupies.
 * They are measured from the canvas preview rendering so device matches preview.
 * Bitmap size is fixed (controls Zepp spacing). Glyph scale is independent.
 */
export function generateOptimizedDigitBitmaps(
  fontFamily: string,
  fontWeight: string,
  targetHeight: number,
  color: string,
  targetWidth?: number,
  fillRatioX = 0.85,  // fraction of bitmapW the widest ink should occupy
  fillRatioY = 0.85,  // fraction of bitmapH the tallest ink should occupy
): RenderedDigit[] {
  const bitmapH = targetHeight;
  const bitmapW = targetWidth ?? targetHeight;

  // Target ink area: glyph must fit within fillRatio × bitmap dimensions
  const targetInkH = Math.max(1, Math.round(bitmapH * fillRatioY));
  const targetInkW = Math.max(1, Math.round(bitmapW * fillRatioX));

  // Find largest fontSize where maxInkH ≤ targetInkH AND maxInkW ≤ targetInkW
  let fontSize = Math.max(4, Math.round(targetInkH / 0.7));
  for (let attempt = 0; attempt < 30 && fontSize > 4; attempt++) {
    const measurements = measureAllGlyphs(fontFamily, fontWeight, fontSize, color);
    const maxInkW = Math.max(...measurements.map(m => m.visibleWidth));
    const maxInkH = Math.max(...measurements.map(m => m.visibleHeight));
    if (maxInkH <= targetInkH && maxInkW <= targetInkW) break;
    fontSize = Math.floor(fontSize * 0.93);
  }

  const measurements = measureAllGlyphs(fontFamily, fontWeight, fontSize, color);
  const size: OptimizedBitmapSize = { bitmapW, bitmapH, maxInkW: 0, maxInkH: 0 };
  const font = `${fontWeight} ${fontSize}px ${fontFamily}`;

  return measurements.map(m => ({
    char: m.char,
    dataUrl: renderDigitToBitmap(m.char, m, size, font, color, fillRatioX, fillRatioY),
    width: bitmapW,
    height: bitmapH,
    measurement: m,
  }));
}
