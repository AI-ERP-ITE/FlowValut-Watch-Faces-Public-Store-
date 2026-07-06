# Spec 113 — Tasks

## T01 — Create digitGlyphMetrics.ts with core types and extraction functions
- [x] Define `GlyphMetrics`, `PairCorrection`, `PairCorrectionTable` interfaces.
- [x] Implement `extractVisibleGlyphMetrics(ctx, width, height, char): GlyphMetrics`.
- [x] Implement `computeAllPairCorrections(glyphs, sourceHeight): PairCorrection[]`.
- [x] Implement `validatePairCorrectionTable(table): ValidationReport` (build/dev only).

## T02 — Extend ElementImage types
- [x] Replace `digitMetrics` in `types/index.ts` with a richer shape carrying full `GlyphMetrics[]` + `PairCorrectionTable`.

## T03 — Rewrite computeDigitBitmapLayout
- [x] Replace `advanceWidth`-based advance with `inkWidth`-based advance.
- [x] Add pair correction lookup path for 2-char digit widgets.
- [x] Keep graceful fallback for missing table.
- [x] Verify output: `startX`, `totalWidth`, `glyphs[].x` all reference visible ink, not canvas bounds.

## T04 — Wire metric extraction into StudioApp makeDigitCanvas
- [x] After rendering each digit, call `extractVisibleGlyphMetrics`.
- [x] After 10 digits are done, call `computeAllPairCorrections`.
- [x] Attach table to `ElementImage`.

## T05 — Wire metric extraction into assetImageGenerator generateDigitImages
- [x] Same wiring as T04.

## T06 — Wire correction table into InteractiveCanvas
- [x] Pass `PairCorrectionTable` from `ElementImage` into `computeDigitBitmapLayout`.

## T07 — Validation log
- [x] Call `validatePairCorrectionTable` after table generation.
- [x] Log summary: average error, max error, worst pair.

## T08 — Build check
- [x] `npm run build` passes, no TS errors.

## T09 — Automated tests
- [x] `src/lib/__tests__/digitGlyphMetrics.test.ts` covering:
  - Ink bound measurement accuracy
  - bboxCenterX correctness
  - Empty canvas graceful handling
  - Narrow vs wide glyph detection
  - 100 unique pairs generated
  - Symmetric glyphs → near-zero corrections
  - Different glyph widths → non-trivial corrections
  - Adaptation across multiple font sizes

## T10 — Visual acceptance check
- [ ] Open Studio, create IMG_DATE element, use preview values: 00, 10, 11, 28, 31, 88.
- [ ] Confirm no visible shift between wide (88) and narrow (11) pairs.
- Note: requires browser — cannot be automated here.

## T11 — Validation report
- [x] `validation.md` produced in spec folder.

## T12 — Deployment report
- [x] `deployment-report.md` produced in spec folder.
- [x] `npm run deploy:full:private` only.
- [x] origin/main → `56211f7b`, bundle → `index-Bn_LOrj6.js`, public/main untouched.
