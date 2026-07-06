# Spec 113 — Tasks

## T01 — Create digitGlyphMetrics.ts with core types and extraction functions
- [ ] Define `GlyphMetrics`, `PairCorrection`, `PairCorrectionTable` interfaces.
- [ ] Implement `extractVisibleGlyphMetrics(ctx, width, height, char): GlyphMetrics`.
- [ ] Implement `computeAllPairCorrections(glyphs, sourceHeight): PairCorrection[]`.
- [ ] Implement `validatePairCorrectionTable(table): ValidationReport` (build/dev only).

## T02 — Extend ElementImage types
- [ ] Replace `digitMetrics` in `types/index.ts` with a richer shape carrying full `GlyphMetrics[]` + `PairCorrectionTable`.

## T03 — Rewrite computeDigitBitmapLayout
- [ ] Replace `advanceWidth`-based advance with `inkWidth`-based advance.
- [ ] Add pair correction lookup path for 2-char digit widgets.
- [ ] Keep graceful fallback for missing table.
- [ ] Verify output: `startX`, `totalWidth`, `glyphs[].x` all reference visible ink, not canvas bounds.

## T04 — Wire metric extraction into StudioApp makeDigitCanvas
- [ ] After rendering each digit, call `extractVisibleGlyphMetrics`.
- [ ] After 10 digits are done, call `computeAllPairCorrections`.
- [ ] Attach table to `ElementImage`.

## T05 — Wire metric extraction into assetImageGenerator generateDigitImages
- [ ] Same wiring as T04.

## T06 — Wire correction table into InteractiveCanvas
- [ ] Pass `PairCorrectionTable` from `ElementImage` into `computeDigitBitmapLayout`.

## T07 — Validation log
- [ ] Call `validatePairCorrectionTable` after table generation.
- [ ] Log summary: average error, max error, worst pair.

## T08 — Build check
- [ ] `npm run build` passes, no TS errors.

## T09 — Visual acceptance check
- [ ] Open Studio, create IMG_DATE element, use preview values: 00, 10, 11, 28, 31, 88.
- [ ] Confirm no visible shift between wide (88) and narrow (11) pairs.

## T10 — Private deploy
- [ ] `npm run deploy:full:private` only.
- [ ] Report: origin/main commit hash, new bundle hash.
