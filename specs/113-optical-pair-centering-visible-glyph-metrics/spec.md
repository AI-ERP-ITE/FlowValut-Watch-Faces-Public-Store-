# Spec 113 — Automatic Optical Pair Centering v2: Visible Glyph Metrics Architecture

## Status: IN PROGRESS

## Problem

The previous digit layout implementation (added during the session on 2026-07-06) still uses `advanceWidth` which is the original **canvas cell width** — a container dimension, not a visible glyph dimension. That means transparent padding still indirectly controls spacing even though the PNG is trimmed.

The core principle: **every geometric calculation must be driven by visible ink, not by container size.**

## Goal

Replace the current `advanceWidth`-based layout with a fully automatic system that:

1. Extracts **visible glyph metrics** (ink bounds, ink width, alpha centroid, optical center) per digit during asset generation.
2. Pre-computes per-pair optical corrections for all 100 two-digit combinations (00–99).
3. Stores those corrections in a compact lookup table attached to the font asset set.
4. At runtime: lookup only. No pixel scanning, no centroid math, no image analysis.

## Scope

| File | Action |
|---|---|
| `src/lib/digitOpticalCentering.ts` | Extend — add `extractVisibleGlyphMetrics`, `computePairCorrections` |
| `src/lib/digitLayoutEngine.ts` | Replace advance-width layout with visible-glyph layout + pair correction lookup |
| `src/lib/digitGlyphMetrics.ts` | NEW — visible glyph metric types and pair correction table types |
| `src/StudioApp.tsx` | Update digit generation to extract visible metrics and build correction table |
| `src/pipeline/assetImageGenerator.ts` | Same as StudioApp path |
| `src/types/index.ts` | Add `GlyphMetrics`, `PairCorrectionTable` to `ElementImage` |
| `src/components/InteractiveCanvas.tsx` | Pass correction table into layout engine |

Out of scope: V2 code generator, ZPK packaging, device runtime.

## Core Data Types

```ts
// Per-digit visible metrics (measured from rendered ink only)
interface GlyphMetrics {
  char: string;
  // Visible ink bounds (px in source canvas)
  inkLeft: number;
  inkRight: number;
  inkTop: number;
  inkBottom: number;
  inkWidth: number;
  inkHeight: number;
  // Centers based on visible ink only
  bboxCenterX: number;      // (inkLeft + inkRight) / 2
  alphaCentroidX: number;   // alpha-weighted x center
  opticalCenterX: number;   // blend of bbox and alpha
}

// Pre-computed horizontal correction for a specific pair
interface PairCorrection {
  pair: string;   // e.g. "31"
  dx: number;     // horizontal shift to apply to second glyph (px, scaled to source height)
  visibleWidth: number;  // total visible width of the pair after correction
  remainingError: number; // validation: how far off center after correction
}

// Full correction table for one font/size set
interface PairCorrectionTable {
  sourceHeight: number;  // the height at which metrics were measured
  glyphs: GlyphMetrics[];
  pairs: PairCorrection[];  // all 100 entries (00–99)
}
```

## Algorithm

### Phase 1 — Glyph metric extraction (at generation time)

For every digit 0–9:
1. Render on a scratch canvas at the generation height.
2. Scan all pixels, find `inkLeft`, `inkRight`, `inkTop`, `inkBottom`.
3. Compute `inkWidth`, `bboxCenterX`, `alphaCentroidX`, `opticalCenterX`.
4. Store as `GlyphMetrics`.

### Phase 2 — Pair correction computation (at generation time)

For every pair XY (00–99):
1. Get `GlyphMetrics` for X and Y.
2. Ideal: place X and Y such that the combined visible width = `inkWidth(X) + gap + inkWidth(Y)` and the whole pair is centered with zero shift.
3. Compute `dx` = offset needed on Y's draw position to achieve optical centering.
4. Store `PairCorrection`.

### Phase 3 — Runtime layout (at preview/draw time)

For a two-digit value (IMG_DATE, IMG_TIME):
1. Lookup the pair in `PairCorrectionTable.pairs`.
2. Apply `dx` to the second glyph's x position.
3. Center the visible pair within the widget bounds.

For longer values (TEXT_IMG, multi-digit):
1. Apply sequential visible-ink placement: cursor advances by `inkWidth + userDefinedGap`, not by canvas cell width.
2. No pair lookup needed for >2 digits.

## What Changes From Current Implementation

| Before | After |
|---|---|
| Uses `advanceWidth` (canvas cell width) | Uses `inkWidth` (visible ink only) |
| Uses `trimLeft` as draw offset | Uses `opticalCenterX` for centering |
| No pair awareness | Pre-computed per-pair correction |
| Layout computes at draw time | Layout reads from lookup table |

## Acceptance Criteria

All these pairs must appear visually centered inside the same bounding box, with no apparent shift:
`00`, `05`, `08`, `10`, `11`, `17`, `20`, `22`, `28`, `31`, `44`, `55`, `66`, `77`, `88`, `99`

No pair may appear shifted because of different glyph widths or transparent padding.

## Exit Criteria

1. `PairCorrectionTable` is generated and attached to every digit font asset set.
2. Layout engine uses visible-ink widths, not canvas widths.
3. Validation report generated (all 100 pairs, average error, max error, worst pair).
4. Build passes.
5. Private deploy done.
