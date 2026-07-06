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
 * The digit is centered so that its visible ink center aligns with the bitmap center.
 * Transparent padding ≤ MARGIN_H / 2 on each side for the widest glyph.
 * Left ≈ right margin (symmetric for non-italic fonts).
 */
function renderDigitToBitmap(
  char: string,
  measurement: GlyphMeasurement,
  size: OptimizedBitmapSize,
  font: string,
  color: string,
): string {
  const { bitmapW, bitmapH } = size;
  const canvas = document.createElement('canvas');
  canvas.width = bitmapW;
  canvas.height = bitmapH;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, bitmapW, bitmapH);
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Compute the scale factor between scratch canvas and target bitmap
  const scale = bitmapH / measurement.scratchH;

  // Where the ink center is on the scratch canvas
  const inkCenterX = (measurement.visibleBBox.left + measurement.visibleBBox.right + 1) / 2;
  const inkCenterY = (measurement.visibleBBox.top + measurement.visibleBBox.bottom + 1) / 2;

  // We want the ink center to map to bitmap center
  const scratchMidX = measurement.scratchW / 2;
  const scratchMidY = measurement.scratchH / 2;
  const shiftX = (inkCenterX - scratchMidX) * scale;
  const shiftY = (inkCenterY - scratchMidY) * scale;

  // Draw at bitmap center, compensating for ink offset
  ctx.fillText(char, bitmapW / 2 - shiftX, bitmapH / 2 - shiftY);

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
 * bitmapW and bitmapH are passed by the caller (element bounds / digit count).
 * Font size = largest that fits. No transparent-padding compensation needed.
 */
export function generateOptimizedDigitBitmaps(
  fontFamily: string,
  fontWeight: string,
  targetHeight: number,
  color: string,
  targetWidth?: number, // if provided, each digit is targetWidth wide
): RenderedDigit[] {
  const bitmapH = targetHeight;
  const bitmapW = targetWidth ?? targetHeight; // fallback: square if width not given

  // Find largest fontSize where maxInkH+2 <= bitmapH AND maxInkW+2 <= bitmapW
  let fontSize = Math.floor(bitmapH * 0.9); // start near full height
  for (let attempt = 0; attempt < 20 && fontSize > 4; attempt++) {
    const measurements = measureAllGlyphs(fontFamily, fontWeight, fontSize, color);
    const maxInkW = Math.max(...measurements.map(m => m.visibleWidth));
    const maxInkH = Math.max(...measurements.map(m => m.visibleHeight));
    if (maxInkH + MARGIN_V <= bitmapH && maxInkW + MARGIN_H <= bitmapW) break;
    fontSize = Math.floor(fontSize * 0.93); // reduce until it fits
  }

  const measurements = measureAllGlyphs(fontFamily, fontWeight, fontSize, color);
  const size: OptimizedBitmapSize = { bitmapW, bitmapH, maxInkW: 0, maxInkH: 0 };
  const font = `${fontWeight} ${fontSize}px ${fontFamily}`;

  return measurements.map(m => ({
    char: m.char,
    dataUrl: renderDigitToBitmap(m.char, m, size, font, color),
    width: bitmapW,
    height: bitmapH,
    measurement: m,
  }));
}
