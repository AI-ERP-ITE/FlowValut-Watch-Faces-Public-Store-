# Spec 114 — Plan

## P1 — New geometry engine (digitBitmapGeometry.ts)
- Pure function: takes font+size, returns optimized bitmapW/bitmapH + renders 10 PNGs
- Phase 1: measure each digit on large scratch canvas
- Phase 2: compute bitmapW = maxInkW+2, bitmapH = maxInkH+2
- Phase 3: draw each digit centered in optimized bitmap

## P2 — Wire into generators
- Replace `makeDigitCanvas` in StudioApp.tsx with geometry engine
- Replace `generateDigitImages` in assetImageGenerator.ts with geometry engine
- Both generators: call measure phase once, then render all 10 digits at computed size

## P3 — Simplify layout engine
- Remove pairCorrectionTable from DigitLayoutRequest
- Remove pair correction path from computeDigitBitmapLayout
- Layout advance = bitmap.naturalWidth (now ≈ inkW)

## P4 — Simplify preview
- InteractiveCanvas already uses img.naturalWidth for each bitmap
- Since naturalWidth ≈ inkW, no further change needed
- Verify bitmapMetrics are collected and passed through correctly

## P5 — Remove dead code
- Deprecate PairCorrectionTable, GlyphMetrics pair fields from ElementImage
- Deprecate pairCorrectionTable parameter in layout engine
- Do NOT delete digitGlyphMetrics.ts or digitOpticalCentering.ts (keep for diagnostics)

## P6 — Validation
- Re-run pair geometry comparison script against new generator output
- Target: gap ≤ 4px for all 15 pairs
- Write result to specs/114-bitmap-geometry-refactor/validation.md

## P7 — Build + deploy
- npm run build (no TS errors)
- npm run deploy:full:private
