# Spec 114 — Bitmap Geometry Refactor: Production-Grade Digit Rendering

## Status: IN PROGRESS

## Context
Specs 113 and earlier attempted to solve digit spacing via optical centering, pair correction tables,
and transparent-padding compensation. The root-cause analysis (2026-07-06) proved this was wrong.

**Root cause:** Zepp's IMG_DATE widget advances by **canvas width**, not ink width.
Reference watchfaces use canvas ≈ ink (zero/minimal transparent padding).
Our generator adds large transparent margins → those margins become visible gaps on device.

**Evidence from pair comparison:**
- Reference pair "11": visual gap = 1 px  
- Our pair "11": visual gap = 21 px  
- Reference digit 1: canvas=32, inkW=31, padL=1, padR=0  
- Our digit 1: canvas=25, inkW=4, padL=10, padR=11  

## Objective
Replace the bitmap generation architecture with a production system based on **correct geometry**:

1. Measure actual glyph ink bounds across all 10 digits for a given font+size.
2. Compute one optimized bitmap size = maxInkW + 2px × maxInkH + 2px.
3. Render every digit centered in that exact bitmap — no extra space.
4. The canvas ≈ ink principle is automatic and font-independent.
5. Remove all optical centering, pair correction, and runtime compensation.

## Scope

| File | Action |
|---|---|
| `src/lib/digitBitmapGeometry.ts` | NEW — measure, compute optimal size, render |
| `src/StudioApp.tsx` | Replace `makeDigitCanvas` with geometry engine |
| `src/pipeline/assetImageGenerator.ts` | Replace `generateDigitImages` with geometry engine |
| `src/components/InteractiveCanvas.tsx` | Preview uses actual bitmap width (now ≈ ink width) |
| `src/lib/digitLayoutEngine.ts` | Simplify — no pair correction, advance by bitmap width |
| `src/lib/digitGlyphMetrics.ts` | Deprecate pair correction; keep ink measurement utilities |
| `src/lib/digitOpticalCentering.ts` | Deprecate centering loop; keep `trimHorizontalTransparentPadding` |

## Algorithm

### Phase 1 — Measure every glyph (7 measurements per digit)
```
for d in 0..9:
  render d on large scratch canvas (4× target size, to avoid clipping)
  scan every alpha > 0 pixel
  collect:
    visibleWidth   = inkRight - inkLeft + 1
    visibleHeight  = inkBottom - inkTop + 1
    visibleBBox    = { left: inkLeft, top: inkTop, right: inkRight, bottom: inkBottom }
    leftMargin     = inkLeft
    rightMargin    = scratchW - 1 - inkRight
    topMargin      = inkTop
    bottomMargin   = scratchH - 1 - inkBottom

maxInkW = max(visibleWidth(0..9))
maxInkH = max(visibleHeight(0..9))
```

All 7 values are authoritative. No font metrics, no arbitrary constants,
no previous bitmap size, no current canvas size used in this computation.

### Phase 2 — Compute one optimized bitmap size
```
MARGIN_H = 2   (named constant — never an inline literal)
MARGIN_V = 2

bitmapW = maxInkW + MARGIN_H   (≈ 1–2 px per side max)
bitmapH = maxInkH + MARGIN_V

ALL 10 digits share the same bitmapW × bitmapH.
No variable-width bitmaps per digit.
```

### Phase 3 — Render each digit into optimized bitmap
```
for d in 0..9:
  create canvas bitmapW × bitmapH
  draw digit d, centered so ink is centered in the bitmap
  transparent padding = ≤ 2 px on any side
  left margin ≈ right margin (symmetric within ±1 px for non-italic fonts)
  export as bitmapW × bitmapH RGBA PNG
```

### Phase 4 — Remove previous compensation (every item is mandatory)
Remove from codebase:
- iterative centroid correction loops
- optical recentering iterations
- pair compensation tables (00–99)
- runtime correction table generation
- automatic pair offset building
- `trimHorizontalTransparentPadding` as a primary step

Mark as `@deprecated` (keep for diagnostics, do not delete):
- `drawOpticallyCenteredDigit`
- `buildPairCorrectionTable`
- `computeAllPairCorrections`
- `PairCorrectionTable` field on `ElementImage`

### Phase 5 — Preview contract (Step 5)
- Preview renders using `img.naturalWidth` (now ≈ inkWidth)
- Never synthesizes digit widths
- Never estimates spacing
- Shows exact geometry that will be exported

### Phase 6 — Runtime contract (Step 6)
At runtime, no:
- centroid analysis
- alpha pixel scanning
- pair correction
- runtime image processing of any kind
Runtime simply advances by bitmap canvas width and centers the strip.

## Validation — all 15 required pairs

For every pair below, report MUST include:
1. bitmap width (must be constant across all pairs)
2. visible glyph width for each digit
3. left transparent padding for each digit
4. right transparent padding for each digit
5. visual gap between the two digits
6. total strip width

Required pairs: `00`, `05`, `08`, `11`, `18`, `20`, `22`, `28`, `31`, `44`, `55`, `66`, `77`, `88`, `99`

Compare every metric against reference watchface (Time_S digits, active 2 square v2).

## Acceptance Criteria
- Minimal transparent padding: ≤ 2 px per side for any digit
- Consistent bitmap geometry: all 10 digits SAME canvas width (boolean)
- Correct inter-digit spacing: visual gap ≤ 4 px for ALL 15 pairs
- Stable visual centering: left pad ≈ right pad (±1 px for symmetric digits)
- No excessive gaps: no pair shows gap > 4 px
- No optical compensation algorithm used at runtime

## Code Quality Requirements
Implementation must be:
- Generic — works with any font family
- Automatic — no manual per-font tuning required
- Font-independent — no font-specific code paths
- Size-independent — works at any font size
- Maintainable — clear variable names, documented constants

Must NOT contain:
- Hardcoded offsets
- Font-specific hacks
- Manual adjustments
- Magic numbers (MARGIN_H = 2 must be a named constant)
- Pair-specific fixes

Everything must be derived automatically from measured glyph geometry.
