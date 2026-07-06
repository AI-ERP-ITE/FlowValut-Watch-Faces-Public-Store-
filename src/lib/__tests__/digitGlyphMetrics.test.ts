/**
 * Spec 113 — Automated tests for digitGlyphMetrics pure functions.
 *
 * These tests cover the math logic without requiring a real browser canvas.
 * Uses a mock canvas that returns controlled pixel data.
 */

import {
  extractVisibleGlyphMetrics,
  computeAllPairCorrections,
  buildPairCorrectionTable,
  validatePairCorrectionTable,
  type GlyphMetrics,
} from '../digitGlyphMetrics';

// ─── Mock canvas context ─────────────────────────────────────────────────────

function makeCtxWithRect(
  canvasW: number,
  canvasH: number,
  inkLeft: number,
  inkTop: number,
  inkRight: number,
  inkBottom: number,
): CanvasRenderingContext2D {
  const data = new Uint8ClampedArray(canvasW * canvasH * 4);
  for (let y = inkTop; y <= inkBottom; y++) {
    for (let x = inkLeft; x <= inkRight; x++) {
      const idx = (y * canvasW + x) * 4;
      data[idx] = 255;     // R
      data[idx + 1] = 255; // G
      data[idx + 2] = 255; // B
      data[idx + 3] = 255; // A — fully opaque ink
    }
  }
  return {
    getImageData: (_sx: number, _sy: number, sw: number, sh: number) => ({
      data: new Uint8ClampedArray(
        // Return only the requested region — for our tests sw=canvasW, sh=canvasH
        sw === canvasW && sh === canvasH ? data : new Uint8ClampedArray(sw * sh * 4),
      ),
    }),
  } as unknown as CanvasRenderingContext2D;
}

// ─── extractVisibleGlyphMetrics ─────────────────────────────────────────────

describe('extractVisibleGlyphMetrics', () => {
  test('measures ink bounds correctly for a centered rectangle', () => {
    // Canvas 20x30, ink from x=3..16, y=5..24
    const ctx = makeCtxWithRect(20, 30, 3, 5, 16, 24);
    const m = extractVisibleGlyphMetrics(ctx, 20, 30, '0');

    expect(m.inkLeft).toBe(3);
    expect(m.inkRight).toBe(16);
    expect(m.inkTop).toBe(5);
    expect(m.inkBottom).toBe(24);
    expect(m.inkWidth).toBe(14); // 16 - 3 + 1
    expect(m.inkHeight).toBe(20); // 24 - 5 + 1
    expect(m.sourceWidth).toBe(20);
    expect(m.sourceHeight).toBe(30);
  });

  test('bboxCenterX is midpoint of ink bounds', () => {
    const ctx = makeCtxWithRect(20, 30, 3, 5, 16, 24);
    const m = extractVisibleGlyphMetrics(ctx, 20, 30, '0');
    expect(m.bboxCenterX).toBeCloseTo((3 + 16 + 1) / 2);
  });

  test('opticalCenterX is between inkLeft and inkRight', () => {
    const ctx = makeCtxWithRect(20, 30, 3, 5, 16, 24);
    const m = extractVisibleGlyphMetrics(ctx, 20, 30, '0');
    expect(m.opticalCenterX).toBeGreaterThan(m.inkLeft);
    expect(m.opticalCenterX).toBeLessThan(m.inkRight + 1);
  });

  test('handles empty canvas (no ink) gracefully', () => {
    const data = new Uint8ClampedArray(20 * 30 * 4); // all zeros
    const ctx = { getImageData: () => ({ data }) } as unknown as CanvasRenderingContext2D;
    const m = extractVisibleGlyphMetrics(ctx, 20, 30, '1');
    expect(m.inkWidth).toBe(1); // degenerate fallback
    expect(m.inkHeight).toBe(1);
  });

  test('narrow glyph (like "1") has smaller inkWidth than wide glyph (like "0")', () => {
    // Wide: ink spans 3..16 (width 14)
    const wide = extractVisibleGlyphMetrics(makeCtxWithRect(20, 30, 3, 5, 16, 24), 20, 30, '0');
    // Narrow: ink spans 8..11 (width 4)
    const narrow = extractVisibleGlyphMetrics(makeCtxWithRect(20, 30, 8, 5, 11, 24), 20, 30, '1');
    expect(wide.inkWidth).toBeGreaterThan(narrow.inkWidth);
  });
});

// ─── computeAllPairCorrections ───────────────────────────────────────────────

function makeUniformGlyph(char: string, inkW: number, inkH: number, canvasW: number, canvasH: number): GlyphMetrics {
  const inkLeft = Math.floor((canvasW - inkW) / 2);
  const inkRight = inkLeft + inkW - 1;
  const bboxCenterX = (inkLeft + inkRight + 1) / 2;
  return {
    char,
    inkLeft,
    inkRight,
    inkTop: Math.floor((canvasH - inkH) / 2),
    inkBottom: Math.floor((canvasH - inkH) / 2) + inkH - 1,
    inkWidth: inkW,
    inkHeight: inkH,
    bboxCenterX,
    alphaCentroidX: bboxCenterX,
    opticalCenterX: bboxCenterX,
    sourceHeight: canvasH,
    sourceWidth: canvasW,
  };
}

describe('computeAllPairCorrections', () => {
  test('produces exactly 100 entries (00–99)', () => {
    const glyphs: GlyphMetrics[] = Array.from({ length: 10 }, (_, i) =>
      makeUniformGlyph(String(i), 10, 20, 14, 30),
    );
    const pairs = computeAllPairCorrections(glyphs, 30);
    expect(pairs).toHaveLength(100);
  });

  test('all 100 pair strings are unique and in range 00–99', () => {
    const glyphs: GlyphMetrics[] = Array.from({ length: 10 }, (_, i) =>
      makeUniformGlyph(String(i), 10, 20, 14, 30),
    );
    const pairs = computeAllPairCorrections(glyphs, 30);
    const pairStrings = pairs.map((p) => p.pair);
    const unique = new Set(pairStrings);
    expect(unique.size).toBe(100);
    for (let d1 = 0; d1 <= 9; d1++) {
      for (let d2 = 0; d2 <= 9; d2++) {
        expect(unique.has(`${d1}${d2}`)).toBe(true);
      }
    }
  });

  test('symmetric glyphs produce near-zero dx corrections', () => {
    // All digits identical ink width → no optical drift expected
    const glyphs: GlyphMetrics[] = Array.from({ length: 10 }, (_, i) =>
      makeUniformGlyph(String(i), 10, 20, 14, 30),
    );
    const pairs = computeAllPairCorrections(glyphs, 30);
    for (const p of pairs) {
      expect(Math.abs(p.dx)).toBeLessThan(0.5);
    }
  });

  test('different glyph widths produce non-trivial corrections for asymmetric pairs', () => {
    const glyphs: GlyphMetrics[] = Array.from({ length: 10 }, (_, i) => {
      const inkW = i === 1 ? 4 : 12; // "1" is much narrower
      return makeUniformGlyph(String(i), inkW, 20, 16, 30);
    });
    const pairs = computeAllPairCorrections(glyphs, 30);

    // A pair like "10" (narrow then wide) should differ from "00" (same widths)
    const p10 = pairs.find((p) => p.pair === '10')!;
    const p00 = pairs.find((p) => p.pair === '00')!;
    // "10" visible width should be less than "00" visible width
    expect(p10.visiblePairWidth).toBeLessThan(p00.visiblePairWidth);
  });

  test('visiblePairWidth is always positive', () => {
    const glyphs: GlyphMetrics[] = Array.from({ length: 10 }, (_, i) =>
      makeUniformGlyph(String(i), 8 + i, 20, 20, 30),
    );
    const pairs = computeAllPairCorrections(glyphs, 30);
    for (const p of pairs) {
      expect(p.visiblePairWidth).toBeGreaterThan(0);
    }
  });
});

// ─── buildPairCorrectionTable ────────────────────────────────────────────────

describe('buildPairCorrectionTable', () => {
  test('table contains all 100 pairs and correct sourceHeight', () => {
    const glyphs: GlyphMetrics[] = Array.from({ length: 10 }, (_, i) =>
      makeUniformGlyph(String(i), 10, 20, 14, 30),
    );
    const table = buildPairCorrectionTable(glyphs, 30);
    expect(table.sourceHeight).toBe(30);
    expect(table.pairs).toHaveLength(100);
    expect(table.glyphs).toHaveLength(10);
  });
});

// ─── validatePairCorrectionTable ─────────────────────────────────────────────

describe('validatePairCorrectionTable', () => {
  test('report has averageError, maxError, worstPair and all 100 pair entries', () => {
    const glyphs: GlyphMetrics[] = Array.from({ length: 10 }, (_, i) =>
      makeUniformGlyph(String(i), 10, 20, 14, 30),
    );
    const table = buildPairCorrectionTable(glyphs, 30);
    const report = validatePairCorrectionTable(table);

    expect(report.pairs).toHaveLength(100);
    expect(typeof report.averageError).toBe('number');
    expect(typeof report.maxError).toBe('number');
    expect(typeof report.worstPair).toBe('string');
    expect(report.maxError).toBeGreaterThanOrEqual(report.averageError);
  });

  test('uniform glyphs produce near-zero average error', () => {
    const glyphs: GlyphMetrics[] = Array.from({ length: 10 }, (_, i) =>
      makeUniformGlyph(String(i), 10, 20, 14, 30),
    );
    const table = buildPairCorrectionTable(glyphs, 30);
    const report = validatePairCorrectionTable(table);
    expect(report.averageError).toBeLessThan(0.5);
  });

  test('adaptation: different font sizes produce same zero-error result for uniform glyphs', () => {
    for (const h of [20, 30, 50, 80]) {
      const glyphs: GlyphMetrics[] = Array.from({ length: 10 }, (_, i) =>
        makeUniformGlyph(String(i), Math.round(h * 0.5), h, Math.round(h * 0.6), h * 1.3),
      );
      const table = buildPairCorrectionTable(glyphs, h);
      const report = validatePairCorrectionTable(table);
      expect(report.averageError).toBeLessThan(0.5);
    }
  });
});
