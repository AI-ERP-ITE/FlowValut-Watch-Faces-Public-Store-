# Spec 075 — Mask + FX + Mirror Surgical Fixes

**Status:** IN PROGRESS — May 4, 2026
**Predecessor:** Spec 074 (mask pipeline surgical fix, deployed bundle index-BMKIVjr9.js)
**Reporter:** End user (live test post-074 deploy)

## Problem Statement

After Spec 074 deployed live and old masks migrated correctly, three new bugs surfaced when creating fresh masks/FX on the live build:

### Bug A — Brush mask on `base` element hides the entire base
- Adding a brush mask stroke to the `base` element causes the whole base body to disappear.
- Style FX on the same element still render fine (highlight, shadows, etc.).
- Brush masks on other element types (e.g. `middle-rect-metal`) work as expected.
- **Status:** root cause not yet known. Cannot reproduce from static reading. Need live state dump to diagnose.

### Bug B — Selection-shape mirror H is rendered as mirror V on rotated elements
- On `middle-rect-metal` (which is internally rotated), drawing a rectangle/circle/oval mask shape with mirror-horizontal enabled produces mirrors along the canvas vertical axis instead.
- **Root cause (confirmed by static reading):** `mirrorSelectionStroke` (app/src/ParametricPage.tsx ~line 4394) mirrors stroke coordinates in **mask-local space** (the element's rotated frame). For a 90°-rotated element, local-X maps to canvas-Y, so mirror-H-in-local renders as mirror-V-on-canvas.

### Bug C — "Element Style FX (All Types)" panel has no effect on `middle-rect-metal`
- Highlight, shadows, sharpness, hue, tint sliders work on `base` but produce no visible change on `middle-rect-metal`.
- **Root cause (suspected, high confidence):** in `app/engine/core/renderer.js` `renderElement` (~line 1486):
  ```js
  normalizeStyleAdjust({
    ...safeElement.styleAdjust,    // FX panel writes here
    ...renderParams.styleAdjust,    // shadows the above
  }, ...)
  ```
  `renderParams = { ...definition.defaultParams, ...safeElement.params }`. If the `middle-rect-metal` template (or `safeElement.params`) carries a `styleAdjust` field, it silently overrides every FX panel write. `base` has no `params.styleAdjust` so the panel works there.

## Constraints

- F12 DevTools blocked on live site by Firebase auth gate. Cannot read browser state directly.
- Active template (layers, masks, FX) lives **only in `localStorage['parametric-template-elements-v1']`** — not in Firestore.
- Therefore Bug A diagnosis requires an in-app way to export current state.

## Goals

1. Provide a one-click in-app **Debug Export** that dumps current template JSON, selected element id, and rendered preview SVG, copies to clipboard. (T0)
2. Fix Bug B by mirroring strokes in canvas space, not local space. (T1)
3. Fix Bug C by reversing the styleAdjust merge order so element-level overrides win over params. (T2)
4. Use the T0 debug data to identify Bug A root cause and fix it. (T3)
5. Deploy and live-verify all three bug fixes. (T4)

## Non-Goals

- No changes to Spec 074's mask-frame math, region computation, or polyline cache.
- No changes to the namespace rewriter.
- No new mask features.

## Acceptance Criteria

- [ ] Debug Export button visible in studio, copies template JSON + selected element id + rendered SVG to clipboard.
- [ ] Mirror H on rotated elements visually mirrors along canvas X axis.
- [ ] FX panel sliders visibly change `middle-rect-metal` rendering.
- [ ] Brush mask stroke on `base` hides only the painted region, not the whole base.
- [ ] All Spec 074 mask regression tests still pass (15/15 + 11/11).
- [ ] Live deploy verified at https://ai-erp-ite.github.io/Watch-Faces/ with new bundle hash.
