# Spec 114 — Tasks (Complete)

Every item below maps directly to a requirement in the implementation request.
Nothing may be skipped.

---

## PHASE 1 — Spec + Plan (done before any code)

### T01 — Create spec.md ✅
- [x] State root cause: Zepp advances by canvas width, not ink width
- [x] State core principle: visible glyph geometry is the design input
- [x] Define algorithm phases (measure → compute size → render → remove compensation)
- [x] List every file that changes
- [x] State acceptance criteria (padding ≤ 2px, gap ≤ 4px for all 15 pairs)
- [x] State exit criteria

### T02 — Create plan.md ✅
- [x] 7 implementation phases (geometry engine → generators → layout → preview → remove dead code → validation → deploy)

### T03 — Create tasks.md (this file) ✅

---

## PHASE 2 — New Geometry Engine

### T04 — Create src/lib/digitBitmapGeometry.ts
This is the core new file. Must implement all three steps:

**Step 1 — Measure every glyph:**
- [ ] `measureAllGlyphs(ctx, scratchW, scratchH, font, color)` function
- [ ] For every digit 0–9: render on scratch canvas, scan alpha pixels
- [ ] For every digit, collect ALL 7 measurements:
  - [ ] `visibleWidth` — inkRight - inkLeft + 1
  - [ ] `visibleHeight` — inkBottom - inkTop + 1
  - [ ] `visibleBBox` — {left, top, right, bottom}
  - [ ] `leftTransparentMargin` — inkLeft
  - [ ] `rightTransparentMargin` — scratchW - 1 - inkRight
  - [ ] `topMargin` — inkTop
  - [ ] `bottomMargin` — scratchH - 1 - inkBottom
- [ ] Return array of 10 `GlyphMeasurement` objects

**Step 2 — Compute production bitmap size:**
- [ ] `computeOptimizedBitmapSize(measurements)` function
- [ ] Must NOT use: font metrics, arbitrary constants, previous bitmap size, current canvas size
- [ ] Compute `maxInkW` = max of visibleWidth across 0–9
- [ ] Compute `maxInkH` = max of visibleHeight across 0–9
- [ ] Compute `bitmapW` = maxInkW + MARGIN_H (MARGIN_H = 2, never more than 2px per side)
- [ ] Compute `bitmapH` = maxInkH + MARGIN_V (MARGIN_V = 2)
- [ ] ALL 10 digits in a family MUST share the SAME bitmap size (enforce this)
- [ ] No variable-width bitmaps per digit

**Step 3 — Render each digit into optimized bitmap:**
- [ ] `renderDigitToBitmap(ctx, bitmapW, bitmapH, digit, font, color)` function
- [ ] Glyph must occupy nearly the full bitmap
- [ ] Transparent padding minimized (≤ 2px)
- [ ] Left/right margins must be nearly symmetric
- [ ] No oversized canvas
- [ ] No arbitrary empty space
- [ ] Implementation: draw digit, measure actual ink center, shift draw so ink centers in bitmap

**Generic/automatic requirements (from code quality section):**
- [ ] Font-independent: works with any CSS font family
- [ ] Size-independent: works with any font size
- [ ] No hardcoded offsets
- [ ] No font-specific hacks
- [ ] No manual adjustments
- [ ] No magic numbers (MARGIN_H = 2 must be a named constant, not inline literal)
- [ ] Everything derived automatically from measured glyph geometry

---

## PHASE 3 — Remove Previous Compensation Logic

### T05 — Remove from StudioApp.tsx
Per Step 4 of the spec — remove ALL of the following:
- [ ] Remove iterative centroid correction (the `drawOpticallyCenteredDigit` loop iterations)
- [ ] Remove optical recentering loops
- [ ] Remove pair compensation tables being built at export time
- [ ] Remove runtime correction table generation (PairCorrectionTable building)
- [ ] Remove automatic pair offset generation for 00–99
- [ ] Replace `makeDigitCanvas` with new geometry engine:
  - [ ] Phase 1: call `measureAllGlyphs` once per font+size combination
  - [ ] Phase 2: call `computeOptimizedBitmapSize` once
  - [ ] Phase 3: call `renderDigitToBitmap` for each digit 0–9
- [ ] The bitmap generation MUST be simple centered draw inside optimized bitmap
- [ ] No `drawOpticallyCenteredDigit` iterative logic in new path

### T06 — Remove from pipeline/assetImageGenerator.ts
Per Step 4 — same removal requirements:
- [ ] Remove `trimHorizontalTransparentPadding` as primary step
- [ ] Remove iterative centering in `generateDigitImages`
- [ ] Replace with geometry engine (same Phase 1/2/3 pattern as T05)

### T07 — Deprecate from digitOpticalCentering.ts
- [ ] Mark `drawOpticallyCenteredDigit` as `@deprecated` (keep code, do not delete)
- [ ] Mark `trimHorizontalTransparentPadding` as `@deprecated — not needed when geometry is correct`
- [ ] Add comment explaining why each is deprecated (Spec 114)
- [ ] Do NOT delete the file (keep for diagnostics)

### T08 — Deprecate from digitGlyphMetrics.ts
- [ ] Mark `buildPairCorrectionTable` as `@deprecated`
- [ ] Mark `computeAllPairCorrections` as `@deprecated`
- [ ] Remove `pairCorrectionTable` property from `ElementImage` type (types/index.ts)
  - Or mark it `@deprecated` with a JSDoc comment — do NOT break existing saved projects
- [ ] Do NOT delete the file (keep measurement utilities which are still valid)

---

## PHASE 4 — Simplify Layout Engine

### T09 — Simplify computeDigitBitmapLayout in digitLayoutEngine.ts
Per Step 6 (Runtime must perform no optical calculations):
- [ ] Remove `pairCorrectionTable` parameter from `DigitLayoutRequest`
- [ ] Remove the pair correction lookup path (the `isPair && table` branch)
- [ ] Layout advance = bitmap.naturalWidth (now ≈ inkWidth since geometry is correct)
- [ ] Runtime must NOT perform: centroid analysis, alpha scanning, pair correction, runtime image processing
- [ ] Simplify the multi-digit path: just use bitmap width for advance, center the whole strip
- [ ] Keep `DigitBitmapMetrics` interface backward compatible but remove deprecated fields

---

## PHASE 5 — Preview Integration

### T10 — Update InteractiveCanvas.tsx per Step 5
- [ ] Preview must render using actual exported bitmap dimensions (img.naturalWidth)
- [ ] Never synthesize digit widths (no fallback math that guesses widths)
- [ ] Never estimate spacing
- [ ] Preview must display exact geometry that will be exported
- [ ] Remove passing of `pairCorrectionTable` to `computeDigitBitmapLayout`
- [ ] Verify: bitmapMetrics still collected from img.naturalWidth correctly

---

## PHASE 6 — Validation (all 15 pairs required)

### T11 — Geometry validation for all 15 pairs
The spec explicitly requires these pairs (not a subset):
`00`, `05`, `08`, `11`, `18`, `20`, `22`, `28`, `31`, `44`, `55`, `66`, `77`, `88`, `99`

For EVERY pair, the validation must report:
- [ ] bitmap width (same for all digits in family — must be constant)
- [ ] visible glyph width (measured ink pixels)
- [ ] left transparent padding
- [ ] right transparent padding
- [ ] visual gap between the two digits
- [ ] total strip width (2 × bitmapW)

Compare against reference watchface (Time_S digits from active 2 square v2.zip).

### T12 — Acceptance criteria check
The validation must confirm:
- [ ] Minimal transparent padding (≤ 2px per side for widest digit, reference padded ≤ 1px)
- [ ] Consistent bitmap geometry (all 10 digits same canvas size — boolean check)
- [ ] Correct inter-digit spacing (visual gap ≤ 4px for all pairs, reference = 0–1px)
- [ ] Stable visual centering (left pad ≈ right pad for symmetric digits ±1px)
- [ ] No excessive gaps (no pair shows gap > 4px)
- [ ] No optical compensation algorithm used at runtime

### T13 — Write validation.md in specs/114/

---

## PHASE 7 — Build + Deploy

### T14 — Build check
- [ ] `npm run build` passes, 0 TypeScript errors

### T15 — Private deploy only
Per speckit.master.prompt.md: this is Studio-only code → private route task
- [ ] `npm run deploy:full:private` ONLY
- [ ] Do NOT touch public remote
- [ ] Report: origin/main commit hash, bundle hash

### T16 — Write deployment-report.md in specs/114/
- [ ] Commit hash
- [ ] Bundle hash
- [ ] Files changed list
- [ ] Verification: HTTP 200 on private site, public site untouched
