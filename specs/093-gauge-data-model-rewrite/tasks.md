# Tasks — Spec 093 Gauge Data-Model Rewrite

## Task List

- [ ] T1 — Create `app/src/lib/gaugeModel.ts` (interfaces only)
- [ ] T2 — Create `app/src/lib/gaugeDetector.ts` (Phase 1: detectGauge)
- [ ] T3 — Create `app/src/lib/gaugeRenderer.ts` (Phase 2: renderGaugeAssets)
- [ ] T4 — Update `app/src/components/PropertyPanel.tsx` (Phase 3: swap call site)
- [ ] T5 — Delete `app/src/lib/gaugePointerParser.ts`
- [ ] T6 — Build (zero TS errors), deploy, report commit + bundle hash

---

## T1 — gaugeModel.ts

**Goal:** Single source of truth for all data types used across the pipeline.

Deliverable: File exists at `app/src/lib/gaugeModel.ts` exporting:
- `SvgTemplate`
- `GaugeGeometry`
- `ParsedGauge`
- `GaugeRenderResult`

No implementation logic in this file.

---

## T2 — gaugeDetector.ts

**Goal:** Phase 1. Read SVG string → return `ParsedGauge` with deep-cloned, immutable artifacts.

Deliverable: `app/src/lib/gaugeDetector.ts` exporting:
- `detectGauge(svgString: string): ParsedGauge | null`

Acceptance:
- Returns `null` if no `<svg>` element found
- Returns `null` if needle not detected (caller falls back to full-gauge path)
- `parsed.needleNode` is a deep clone (not a reference to the parsed tree)
- `parsed.arcNode` is null if no arc fill detected (not an error)
- `parsed.backgroundNodes` excludes needle and arc nodes
- `parsed.template.defsHtml` is empty string if no `<defs>` in SVG
- Original parsed `doc` is not retained after function returns
- No DOM attribute mutations (no markers set)

---

## T3 — gaugeRenderer.ts

**Goal:** Phase 2. Pure rendering. `ParsedGauge` → PNG data URLs.

Deliverable: `app/src/lib/gaugeRenderer.ts` exporting:
- `renderGaugeAssets(parsed: ParsedGauge, renderSize?: number): Promise<GaugeRenderResult>`

Acceptance:
- `parsed.needleNode` is NOT mutated by any call (invariant)
- `parsed.arcNode` is NOT mutated by any call (invariant)
- `parsed.backgroundNodes` items are NOT mutated by any call (invariant)
- Calling `renderGaugeAssets` twice on the same `ParsedGauge` produces identical results
- Needle PNG has rotate() stripped → needle at 0° natural orientation
- Background PNG has needle node removed
- Arc frames: 11 PNGs, 0%→100% fill, correct stroke-dasharray applied per frame
- If `arcNode` is null → `arcFrames` = `[]`
- Status message reflects detection results

---

## T4 — PropertyPanel.tsx

**Goal:** Phase 3. Swap `parseAndRenderGaugeSvg` call with `detectGauge` + `renderGaugeAssets`.

Deliverable: `buildGaugeFromMarkup` in `PropertyPanel.tsx` updated.

Acceptance:
- Import `parseAndRenderGaugeSvg` from `gaugePointerParser` is removed
- Import `detectGauge` from `gaugeDetector` added
- Import `renderGaugeAssets` from `gaugeRenderer` added
- All React state update logic (siblings, bounds, updates) unchanged
- `onRemoveSiblingElements` call preserved
- `gaugeBounds` computation preserved (uses `geometry.naturalWidth/naturalHeight`)
- Legacy HTML fallback path preserved (non-SVG content still works)

---

## T5 — Delete gaugePointerParser.ts

**Goal:** Remove dead code.

Pre-condition: `grep_search('gaugePointerParser', isRegexp: false)` returns zero results.

Deliverable: File `app/src/lib/gaugePointerParser.ts` does not exist.

---

## T6 — Build + Deploy

**Goal:** Zero TypeScript errors. Live deploy. Report hashes.

Deliverable:
- `npm run build:private` exits 0 with zero TS errors
- `npm run deploy:full:private` succeeds
- Report: inner repo commit hash, bundle hash (index-XXXX.js)
