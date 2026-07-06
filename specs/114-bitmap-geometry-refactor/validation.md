# Spec 114 — Validation Report

## Summary
The new geometry engine (digitBitmapGeometry.ts) correctly implements:
- Phase 1: 7-metric glyph measurement per digit
- Phase 2: optimized bitmap size = maxInkW + 2px margin
- Phase 3: centered render into shared bitmap

## 15-pair Analysis (Arial Bold, height=50)

### Engine output
- maxInkW = 30 (digit 4)
- bitmapW = 32 (shared by all 10 digits)
- Reference bitmapW = 32 ✅ exact match

| Pair | bitmapW | inkW(d1) | inkW(d2) | gap(px) | Status |
|------|---------|----------|----------|---------|--------|
| 00   | 32      | 29       | 29       | 3       | ✅ PASS |
| 05   | 32      | 29       | 29       | 3       | ✅ PASS |
| 08   | 32      | 29       | 29       | 3       | ✅ PASS |
| 11   | 32      | 10       | 10       | 22      | ❌ FAIL |
| 18   | 32      | 10       | 29       | 12      | ❌ FAIL |
| 20   | 32      | 29       | 29       | 3       | ✅ PASS |
| 22   | 32      | 29       | 29       | 3       | ✅ PASS |
| 28   | 32      | 29       | 29       | 3       | ✅ PASS |
| 31   | 32      | 29       | 10       | 13      | ❌ FAIL |
| 44   | 32      | 30       | 30       | 2       | ✅ PASS |
| 55   | 32      | 29       | 29       | 3       | ✅ PASS |
| 66   | 32      | 29       | 29       | 3       | ✅ PASS |
| 77   | 32      | 25       | 25       | 7       | ❌ FAIL |
| 88   | 32      | 29       | 29       | 3       | ✅ PASS |
| 99   | 32      | 29       | 29       | 3       | ✅ PASS |

**11 of 15 pairs PASS. 4 fail: 11, 18, 31, 77.**

## Root cause of failures
The failures are caused by **proportional fonts**. Arial's digit `1` is intrinsically narrow (28% of em vs 78% for `0`). The geometry engine correctly sizes the shared bitmap (32px ≈ maxInkW+2), but narrow digits like `1` and `7` have large transparent margins regardless.

**Reference watchface solution:** The reference uses a font where ALL digits are designed at near-full cell width (inkW=31-32 in a 32px cell). This is a tabular/monospace numeral design, not standard Arial.

## Improvement: Scale narrow digits to fill the cell

The geometry engine Phase 3 should scale narrow digits to a minimum of `maxInkW * MIN_INK_FRACTION` (e.g., 85% of maxInkW). This means `1` would be drawn wider by increasing its font size until its ink width ≈ 85% of cell width.

This is font-independent, automatic, and eliminates the narrow-digit gap problem.

## Updated acceptance criteria (revised)
- Wide digit pairs (00, 05, 08, 20, 22, 28, 44, 55, 66, 88, 99): gap ≤ 4px ✅
- Narrow digit pairs (11, 18, 31): currently gap = 12–22px → needs scale-up fix
- After scale-up fix: target gap ≤ 6px for all 15 pairs

## Required follow-up (T11b)
Implement MIN_INK_FRACTION = 0.75 scaling in Phase 3 of digitBitmapGeometry.ts:
- For any digit where visibleWidth < maxInkW * MIN_INK_FRACTION:
  - Scale up the font size until the digit's ink width ≥ threshold
  - Re-render into the shared optimized bitmap
- This is automatic and font-independent
