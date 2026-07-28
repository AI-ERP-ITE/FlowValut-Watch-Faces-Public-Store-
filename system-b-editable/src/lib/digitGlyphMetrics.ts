/**
 * Spec 113 — Visible Glyph Metrics for Automatic Optical Pair Centering
 *
 * @deprecated (pair correction portion) by Spec 114 (Bitmap Geometry Refactor).
 *
 * The pair correction table approach (buildPairCorrectionTable, computeAllPairCorrections)
 * has been replaced. The geometry engine in digitBitmapGeometry.ts eliminates the need
 * for runtime or export-time pair corrections by ensuring canvas ≈ ink from the start.
 *
 * The ink measurement utilities (extractVisibleGlyphMetrics, validatePairCorrectionTable)
 * remain useful for diagnostics and are kept.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** Per-digit visible ink metrics, measured at a specific source height. */
export interface GlyphMetrics {
  char: string;
  /** Visible ink bounds in source canvas pixels. */
  inkLeft: number;
  inkRight: number;
  inkTop: number;
  inkBottom: number;
  /** inkRight - inkLeft + 1 */
  inkWidth: number;
  /** inkBottom - inkTop + 1 */
  inkHeight: number;
  /** (inkLeft + inkRight + 1) / 2 — geometric center of ink bounding box */
  bboxCenterX: number;
  /** Alpha-weighted centroid X */
  alphaCentroidX: number;
  /** Blend of bboxCenter and alphaCentroid (0.65 alpha weight). Used as optical center. */
  opticalCenterX: number;
  /** Source canvas height at which these metrics were measured. */
  sourceHeight: number;
  /** Source canvas width at which these metrics were measured (for scaling). */
  sourceWidth: number;
}

/** Pre-computed horizontal correction for one two-digit pair. */
export interface PairCorrection {
  /** Two-character string e.g. "31" */
  pair: string;
  /**
   * Horizontal shift to apply to the SECOND glyph (in source px at sourceHeight).
   * Positive = shift right, negative = shift left.
   */
  dx: number;
  /** Total visible width of the pair after correction (source px). */
  visiblePairWidth: number;
  /** Remaining optical error after correction (source px). Lower = better. */
  remainingError: number;
}

/** Full correction table for one digit font/size set. */
export interface PairCorrectionTable {
  /** The canvas height at which glyph metrics were measured. */
  sourceHeight: number;
  glyphs: GlyphMetrics[];
  /** All 100 pairs 00–99. */
  pairs: PairCorrection[];
}

/** Per-pair validation result. */
export interface PairValidationResult {
  pair: string;
  visibleWidth: number;
  opticalCenter: number;
  appliedDx: number;
  remainingError: number;
}

export interface ValidationReport {
  pairs: PairValidationResult[];
  averageError: number;
  maxError: number;
  worstPair: string;
}

// ─── Extraction ──────────────────────────────────────────────────────────────

/**
 * Extract visible glyph metrics from a rendered canvas context.
 * The digit must already be drawn on the canvas before calling this.
 */
export function extractVisibleGlyphMetrics(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  char: string,
): GlyphMetrics {
  const data = ctx.getImageData(0, 0, width, height).data;

  let inkLeft = width;
  let inkRight = -1;
  let inkTop = height;
  let inkBottom = -1;
  let alphaSum = 0;
  let alphaWeightedX = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a <= 0) continue;
      if (x < inkLeft) inkLeft = x;
      if (x > inkRight) inkRight = x;
      if (y < inkTop) inkTop = y;
      if (y > inkBottom) inkBottom = y;
      alphaSum += a;
      alphaWeightedX += (x + 0.5) * a;
    }
  }

  if (inkRight < 0) {
    // No ink found — return degenerate metrics
    return {
      char,
      inkLeft: 0, inkRight: 0, inkTop: 0, inkBottom: 0,
      inkWidth: 1, inkHeight: 1,
      bboxCenterX: width / 2,
      alphaCentroidX: width / 2,
      opticalCenterX: width / 2,
      sourceHeight: height,
      sourceWidth: width,
    };
  }

  const inkWidth = inkRight - inkLeft + 1;
  const inkHeight = inkBottom - inkTop + 1;
  const bboxCenterX = (inkLeft + inkRight + 1) / 2;
  const alphaCentroidX = alphaSum > 0 ? alphaWeightedX / alphaSum : bboxCenterX;
  const ALPHA_BLEND = 0.65;
  const opticalCenterX = alphaCentroidX * ALPHA_BLEND + bboxCenterX * (1 - ALPHA_BLEND);

  return {
    char,
    inkLeft,
    inkRight,
    inkTop,
    inkBottom,
    inkWidth,
    inkHeight,
    bboxCenterX,
    alphaCentroidX,
    opticalCenterX,
    sourceHeight: height,
    sourceWidth: width,
  };
}

// ─── Pair Correction Computation ─────────────────────────────────────────────

/**
 * Compute optical centering corrections for all 100 two-digit pairs (00–99).
 *
 * For each pair XY:
 * - Ideal combined visible width = inkWidth(X) + gap + inkWidth(Y)
 *   where gap = natural inter-glyph gap (0 px — glyphs are placed edge-to-edge on visible ink)
 * - dx = correction needed so the second glyph's optical center aligns correctly
 *
 * The result is expressed in source pixels at sourceHeight.
 * Scale by (targetHeight / sourceHeight) at layout time.
 */
export function computeAllPairCorrections(
  glyphs: GlyphMetrics[],
  _sourceHeight: number,
): PairCorrection[] {
  const byChar = new Map<string, GlyphMetrics>();
  for (const g of glyphs) byChar.set(g.char, g);

  const pairs: PairCorrection[] = [];

  for (let d1 = 0; d1 <= 9; d1++) {
    for (let d2 = 0; d2 <= 9; d2++) {
      const pair = `${d1}${d2}`;
      const g1 = byChar.get(String(d1));
      const g2 = byChar.get(String(d2));

      if (!g1 || !g2) {
        pairs.push({ pair, dx: 0, visiblePairWidth: 0, remainingError: 0 });
        continue;
      }

      // Place g2 immediately after g1 ink edge with 1 px natural gap
      const naturalGap = 1;
      const naturalG2Start = g1.inkRight + 1 + naturalGap;
      const naturalG2End = naturalG2Start + g2.inkWidth - 1;
      const naturalPairCenter = (g1.inkLeft + naturalG2End + 1) / 2;

      // Optical center of g1: g1.opticalCenterX - g1.inkLeft (relative to g1 ink left)
      // Optical center of g2 in natural position: naturalG2Start + (g2.opticalCenterX - g2.inkLeft)
      const optG1 = g1.opticalCenterX;
      const optG2Natural = naturalG2Start + (g2.opticalCenterX - g2.inkLeft);
      const naturalOpticalCenter = (optG1 + optG2Natural) / 2;

      // Correction: shift the whole pair so its optical center = naturalPairCenter
      const pairOpticalDrift = naturalOpticalCenter - naturalPairCenter;
      // dx applied to g2 position to compensate for inter-glyph optical imbalance
      const dx = -pairOpticalDrift * 0.5;

      const visiblePairWidth = g1.inkWidth + naturalGap + g2.inkWidth;
      const remainingError = Math.abs(pairOpticalDrift + dx);

      pairs.push({ pair, dx, visiblePairWidth, remainingError });
    }
  }

  return pairs;
}

export function buildPairCorrectionTable(
  glyphs: GlyphMetrics[],
  sourceHeight: number,
): PairCorrectionTable {
  return {
    sourceHeight,
    glyphs,
    pairs: computeAllPairCorrections(glyphs, sourceHeight),
  };
}

// ─── Validation ──────────────────────────────────────────────────────────────

export function validatePairCorrectionTable(table: PairCorrectionTable): ValidationReport {
  const results: PairValidationResult[] = table.pairs.map((p) => ({
    pair: p.pair,
    visibleWidth: p.visiblePairWidth,
    opticalCenter: p.visiblePairWidth / 2,
    appliedDx: p.dx,
    remainingError: p.remainingError,
  }));

  const errors = results.map((r) => r.remainingError);
  const averageError = errors.reduce((a, b) => a + b, 0) / Math.max(1, errors.length);
  const maxError = Math.max(...errors);
  const worstPair = results.find((r) => r.remainingError === maxError)?.pair ?? '--';

  return { pairs: results, averageError, maxError, worstPair };
}

export function logValidationReport(report: ValidationReport, tag = 'Spec113'): void {
  console.group(`[${tag}] Pair correction validation`);
  console.log(`Average error: ${report.averageError.toFixed(3)} px`);
  console.log(`Max error:     ${report.maxError.toFixed(3)} px  (worst pair: ${report.worstPair})`);
  const bad = report.pairs.filter((p) => p.remainingError > 1.0);
  if (bad.length > 0) {
    console.warn(`Pairs with error > 1px:`, bad.map((p) => p.pair).join(', '));
  }
  console.groupEnd();
}
