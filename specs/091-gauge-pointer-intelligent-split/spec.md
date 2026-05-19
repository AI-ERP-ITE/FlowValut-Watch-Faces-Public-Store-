# Spec 091 — Gauge Pointer Intelligent HTML Splitter + Guide Arc + Arc Frame Generator

**Feature Branch**: `091-gauge-pointer-intelligent-split`
**Created**: 2026-05-19
**Status**: In Progress
**Phase 1 scope**: SVG splitter, guide arc, library angle storage
**Phase 2 scope**: Arc frame generator (IMG_LEVEL, deferred)

---

## Problem Statement

The current GAUGE_POINTER system treats a full-gauge SVG (background + needle) as a single rotatable image. This causes:

1. The entire gauge (bezel, arc track, ticks, labels) rotates with the needle on canvas and on the watch — visually broken.
2. `startAngle`/`endAngle` default to -90/90 regardless of the actual arc geometry in the SVG.
3. No visual feedback for calibrating needle arc range against the background arc track.
4. `CustomGaugePointerRecord` stores no angle data — applying a saved needle from library doesn't set the correct arc range.
5. No support for curved-arc style gauges (progress-arc that fills/empties, no rotating needle).

---

## Architecture

### Two-library concept

| Library | Content | Store |
|---|---|---|
| Gauge Needle Library | Needle-only PNG, 0° natural orientation, pivot at hub center | `customGaugePointerStore` (existing, enhanced) |
| Gauge Background | Static full-gauge-minus-needle PNG | Created as `IMG` element on canvas; no separate store |

### Workflow

1. User pastes full gauge HTML/SVG in the PropertyPanel Gauge Creator textarea
2. "Build Gauge Pointer" → auto-splits into needle + background
3. Needle PNG → assigned to GAUGE_POINTER `src`; auto-detected pivot + arc range applied
4. Background PNG → new `IMG` element created at the same canvas position, z-index below GAUGE_POINTER
5. User can refine `Start°` / `End°` using guide arc overlay
6. Guide arc shows arc sweep on canvas; toggle button shows/hides it; never bakes into ZPK or preview
7. Saving to "My Gauge Pointers" library stores needle + angles + pivot together

### Phase 2: Arc frame generator (curved-arc gauges, deferred)

For gauges where data is shown via a varying arc (not a rotating needle):
- Detect `stroke-dasharray` on the arc path in the SVG
- Render N frames (default 11) with dasharray varying 0%→100%
- Create `IMG_LEVEL` element with resulting frames
- This is an ADDITIONAL button "Generate Arc Frames" — does not replace Phase 1

---

## Functional Requirements

### R1 — SVG parser (Phase 1)
- R1.1: MUST detect needle group by scanning direct children of the main `translate(cx,cy)` wrapper for `<g>` elements that (a) have a `transform` attribute containing `rotate(`, AND (b) contain at least one `<path>` element. If multiple candidates, prefer the one also containing `<circle>` elements.
- R1.2: MUST detect arc range by collecting all `transform="rotate(N)"` values from `<line>` elements excluding the needle group. Return `{ startAngle: min, endAngle: max }`. If fewer than 2 ticks found, return null (no detection).
- R1.3: MUST detect pivot center from the first direct child of `<svg>` that has a `translate(cx,cy)` transform. Return `pivotX = cx/viewBoxW`, `pivotY = cy/viewBoxH`.
- R1.4: MUST render needle-only PNG: same SVG structure, only needle group visible, rotate transform stripped from needle group so needle points at 0° (12PM natural orientation).
- R1.5: MUST render background PNG: same SVG structure, needle group hidden (`display:none`).
- R1.6: If needle group NOT detected, fall back to legacy behavior (whole SVG as GAUGE_POINTER src) and emit a warning status message. Still attempt R1.2 arc range detection.

### R2 — Enhanced `buildGaugeFromMarkup` (Phase 1)
- R2.1: On successful parse, update GAUGE_POINTER element with: needle PNG `src`, detected `pivotX`/`pivotY`, detected `startAngle`/`endAngle` (or existing values if detection failed).
- R2.2: Call `onAddSiblingElement` with a new `IMG` element containing background PNG, same bounds as GAUGE_POINTER element, zIndex = GAUGE_POINTER.zIndex - 1 (placed below). If GAUGE_POINTER zIndex = 1, use zIndex = 1 and bump GAUGE_POINTER to 2.
- R2.3: Status message MUST distinguish between: (a) "Needle auto-detected — arc range -120°→120°", (b) "Needle not found — full image used (check pivot + angles manually)", (c) render failure.
- R2.4: `onAddSiblingElement` is optional prop — if absent (e.g. no element selected), skip background creation silently.

### R3 — PropertyPanel prop (Phase 1)
- R3.1: Add optional prop `onAddSiblingElement?: (partialEl: Partial<WatchFaceElement> & { type: string; bounds: Bounds; src: string }) => void` to PropertyPanelProps.
- R3.2: Existing prop interface must not break — prop is optional.

### R4 — StudioApp wiring (Phase 1)
- R4.1: Pass `onAddSiblingElement` to PropertyPanel that calls `addActiveElement` with generated element (auto-assigned `id`, `name`, `visible: true`, `zIndex`).
- R4.2: Do NOT auto-select the new background element — keep GAUGE_POINTER selected.

### R5 — Guide arc overlay (Phase 1)
- R5.1: Add `guideArcVisible?: boolean` to `WatchFaceElement` type (optional, default undefined = false).
- R5.2: Canvas MUST draw guide arc overlay when `el.guideArcVisible === true` for GAUGE_POINTER elements. Guide arc: dashed stroke, semi-transparent cyan/white, drawn at the element's center using `startAngle`/`endAngle`, radius = half of min(bounds.width, bounds.height).
- R5.3: Guide arc MUST show angular tick markers at the start angle and end angle endpoints.
- R5.4: Guide arc MUST NOT appear in ZPK-generated code (code generator reads no visual-only fields).
- R5.5: Guide arc MUST NOT appear in ZPK preview thumbnail image. Preview render path must skip guide arc draw. Check: `zpkBuilder.ts` preview render — ensure guide arc is skipped OR that `guideArcVisible` is force-false during preview capture.
- R5.6: PropertyPanel GAUGE_POINTER section MUST have a toggle button "Guide Arc" that flips `guideArcVisible`.

### R6 — CustomGaugePointerRecord angles (Phase 1)
- R6.1: Add optional `startAngle?: number` and `endAngle?: number` to `CustomGaugePointerRecord`.
- R6.2: `saveCustomGaugePointer` MUST accept and store `startAngle`/`endAngle` parameters.
- R6.3: When user clicks a saved custom gauge pointer in PropertyPanel, apply `startAngle`/`endAngle` from record if they exist (alongside existing `src`/`pivotX`/`pivotY`).
- R6.4: Records saved before this feature (no angle fields) MUST still load cleanly — optional fields, no migration needed.

---

## Acceptance Criteria

### AC1 — SVG split
- [ ] Pasting the Fleming MK-2 gauge HTML and clicking "Build Gauge Pointer": needle group detected, needle-only PNG applied as GAUGE_POINTER src, background PNG creates companion IMG element below it.
- [ ] Canvas now shows static background gauge + rotating needle independently.
- [ ] GAUGE_POINTER `startAngle` = -120, `endAngle` = 120 (auto-detected from ticks rotating -120→120).
- [ ] GAUGE_POINTER `pivotX` = 0.5, `pivotY` = 0.5 (hub at center of 400×400 viewBox).

### AC2 — Fallback
- [ ] Pasting an SVG with NO detectable needle group: status shows warning, full SVG used as pointer, no background IMG created.

### AC3 — Guide arc
- [ ] Toggling "Guide Arc" on a GAUGE_POINTER shows a dashed arc overlay on canvas.
- [ ] Changing `Start°` / `End°` while guide arc is visible immediately updates the arc overlay.
- [ ] Generating ZPK: guide arc not visible in device-facing code.
- [ ] ZPK preview thumbnail: no guide arc dashes visible.

### AC4 — Library
- [ ] Saving a custom gauge pointer records `startAngle`/`endAngle` alongside pivot.
- [ ] Applying that saved pointer to a GAUGE_POINTER element sets all four values (src, pivotX, pivotY, startAngle, endAngle).

### AC5 — No regressions
- [ ] Standard (default needle) GAUGE_POINTER elements still work — no pivot or angle corruption.
- [ ] ARC_PROGRESS, TIME_POINTER, IMG elements unaffected.
- [ ] ZPK export still builds for watch face with GAUGE_POINTER.
- [ ] `buildGaugeFromMarkup` fallback (no `onAddSiblingElement` prop) does not throw.

---

## Files Affected

| File | Change |
|---|---|
| `app/src/lib/gaugePointerParser.ts` | **NEW** — full SVG parsing logic |
| `app/src/components/PropertyPanel.tsx` | `buildGaugeFromMarkup` rewrite; add `onAddSiblingElement` prop; guide arc toggle button |
| `app/src/StudioApp.tsx` | Pass `onAddSiblingElement` to PropertyPanel |
| `app/src/types/index.ts` | Add `guideArcVisible?: boolean` to `WatchFaceElement` |
| `app/src/components/InteractiveCanvas.tsx` | Draw guide arc overlay for GAUGE_POINTER when `guideArcVisible` |
| `app/src/lib/customGaugePointerStore.ts` | Add `startAngle`/`endAngle` to record; update `saveCustomGaugePointer` signature |
| `app/src/lib/jsCodeGeneratorV2.ts` | Verify `guideArcVisible` is NOT read (no change needed) |
| `ISSUE_LOG.md` | Add issue #31 for gauge pointer arc display bugs |

---

## Tasks

### Phase 1 (implement now)

- [x] T1: Create `gaugePointerParser.ts` with `detectNeedleGroup`, `detectArcRange`, `detectPivotCenter`, `renderNeedleOnlyPng`, `renderBackgroundPng`
- [x] T2: Rewrite `buildGaugeFromMarkup` in PropertyPanel; add `onAddSiblingElement` prop to `PropertyPanelProps`
- [x] T3: Wire `onAddSiblingElement` in StudioApp
- [x] T4: Add `guideArcVisible?: boolean` to WatchFaceElement in `types/index.ts`
- [x] T5: Implement `drawGuideArc` in InteractiveCanvas + call when `guideArcVisible` true
- [x] T6: Add guide arc toggle button in PropertyPanel GAUGE_POINTER section
- [x] T7: Update `customGaugePointerStore.ts` — add angle fields, update save signature, apply angles from library click
- [x] T8: Verify ZPK generators don't reference `guideArcVisible`
- [x] T9: Build check — `npm run build`
- [x] T10: Deploy — `npm run deploy:full:private`
- [x] T11: Update `ISSUE_LOG.md`

### Phase 2 (deferred)

- [ ] T12: Arc frame generator — detect `stroke-dasharray`, render N frames, create `IMG_LEVEL`
- [ ] T13: "Generate Arc Frames" button in gauge creator

---

## Tests / Verification

1. **Visual test**: Paste Fleming MK-2 HTML → Build → canvas shows static gauge background + needle rotatable at 0° (pointing up). Expected: background does not rotate when needle is dragged/previewed.
2. **Arc range test**: GAUGE_POINTER properties show Start°=-120, End°=120 after build.
3. **Pivot test**: GAUGE_POINTER Pivot X=0.50, Pivot Y=0.50 after build.
4. **Guide arc test**: Enable guide arc → dashed arc visible at -120→120 sweep. Change Start° to -90 → arc narrows. Toggle off → arc gone.
5. **ZPK build test**: Build ZPK → open zip → `watchface/index.js` → no reference to `guideArcVisible`, no guide arc drawing code.
6. **Library test**: Save pointer → pivot + angles stored → apply to another element → all 4 values applied.
7. **Fallback test**: Paste SVG with only `<rect>` elements (no paths in rotated group) → warning shown, full image used, no crash.
8. **Regression test**: Open a watchface with existing standard GAUGE_POINTER (default needle) → still renders, ZPK builds.
