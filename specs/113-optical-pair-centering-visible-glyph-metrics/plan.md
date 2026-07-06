# Spec 113 — Plan

## Workstream A — New type definitions
1. Create `src/lib/digitGlyphMetrics.ts` with `GlyphMetrics`, `PairCorrection`, `PairCorrectionTable` types and pure functions for metric extraction and pair correction computation.
2. Extend `ElementImage.digitMetrics` in `src/types/index.ts` to carry `PairCorrectionTable`.

## Workstream B — Metric extraction
1. Add `extractVisibleGlyphMetrics(ctx, width, height, char)` to `digitGlyphMetrics.ts`.
2. Add `computeAllPairCorrections(glyphs, sourceHeight)` — generates all 100 pair corrections.
3. These are build-time only; no DOM interaction at runtime.

## Workstream C — Layout engine rewrite
1. Rewrite `computeDigitBitmapLayout` in `digitLayoutEngine.ts` to:
   - Use `inkWidth` for advance (not `advanceWidth`).
   - Apply pair correction from `PairCorrectionTable` for 2-digit widgets.
   - Use `opticalCenterX` to center the trimmed sprite within its slot.
2. Keep existing fallback path for missing metrics.

## Workstream D — Wire into generators
1. `StudioApp.tsx` → `makeDigitCanvas`: after rendering each digit, extract `GlyphMetrics`. After all 10 digits, call `computeAllPairCorrections`. Attach `PairCorrectionTable` to generated `ElementImage`.
2. `pipeline/assetImageGenerator.ts` → `generateDigitImages`: same wiring.

## Workstream E — Wire into canvas renderer
1. `InteractiveCanvas.tsx` → `drawDigitElement`: pass `PairCorrectionTable` through to `computeDigitBitmapLayout`.

## Workstream F — Validation report
1. Add `validatePairCorrectionTable(table)` to `digitGlyphMetrics.ts` — renders each of the 100 pairs at a fixed size, applies correction, measures remaining error. Returns per-pair report + summary stats.
2. Call this after table generation and log to console in dev mode.

## Milestone order
1. A → Types exist, no runtime change yet.
2. B → Extraction functions exist, tested in isolation.
3. C → Layout engine reads new types, falls back gracefully when table missing.
4. D → Generators produce tables.
5. E → Canvas uses tables.
6. F → Validation runs and logs.
7. Build + private deploy.
