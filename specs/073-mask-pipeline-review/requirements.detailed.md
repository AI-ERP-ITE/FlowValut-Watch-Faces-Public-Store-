# Requirements (Detailed) — Mask Pipeline

Every step is one atomic checkable point. Group prefix = stage. Suffix `.N` = step.

---

## A — Mask Enable (metadata only)

- A.01 User selects an element in the editor.
- A.02 Selected element id is exposed to mask controls.
- A.03 User clicks "Enable mask".
- A.04 System reads existing `element.mask` (if any), deep-clones it.
- A.05 System sets `mask.enabled = true`.
- A.06 System sets `mask.mode = 'brush'` (default if absent).
- A.07 System sets `mask.invert = false` (default if absent).
- A.08 System sets `mask.brush.size` to default (16) if absent.
- A.09 System sets `mask.brush.hardness` to default (0.8) if absent.
- A.10 System sets `mask.brush.opacity` to default (1) if absent.
- A.11 System sets `mask.strokes = []` if absent (does NOT clear existing strokes).
- A.12 System sets `mask.coordinateSpace = 'local'` for newly enabled masks.
- A.13 System persists element through `updateTemplateElements`.
- A.14 Renderer receives the updated element.
- A.15 Renderer detects `mask.enabled === true` and `strokes.length === 0` and `invert === false` → returns `active:false`.
- A.16 Renderer emits no `<mask>` def for this element.
- A.17 Element renders identically to its pre-enable state.
- A.18 No console error. No crash.

## B — Mask Edit Mode

- B.01 User toggles "Edit mask" on selected element.
- B.02 Editor shows mask brush controls.
- B.03 Canvas pointer cursor switches to crosshair over canvas.
- B.04 Editor shows current mask preview overlay (existing strokes).
- B.05 Editor exposes hide/reveal action toggle.
- B.06 Editor exposes brush size, hardness, opacity controls.
- B.07 Editor exposes selection-shape mode (rect/circle/oval/free).

## C — Brush Stroke Capture

- C.01 User mousedown on canvas.
- C.02 Editor reads pointer canvas-relative coords.
- C.03 Editor converts to canvas % `(x_pct, y_pct)`.
- C.04 Editor calls `ensureSelectedMaskLocalCoordinateSpace` (migrate legacy if needed).
- C.05 Editor converts canvas % → element-local % via `canvasToSelectedMaskLocalPoint` (account for placement + rotation).
- C.06 Editor opens `activeMaskStroke` with `{action, size, hardness, opacity, points:[localPoint]}`.
- C.07 On mousemove: editor samples each point ≥0.6% apart.
- C.08 Each sampled point converted same way (canvas → local).
- C.09 On mouseup: editor calls `finishMaskStroke`.
- C.10 `finishMaskStroke` validates `points.length > 0`.
- C.11 `appendSelectedMaskStroke` deep-clones element, appends stroke to `mask.strokes`, sets `mask.coordinateSpace = 'local'`.
- C.12 Persisted via `updateTemplateElements`.

## D — Renderer Mask Build (per element)

- D.01 Renderer iterates elements.
- D.02 For each element, computes `localId` unique per element instance.
- D.03 Computes `elementMaskId = '<maskId>-element'` via `buildLayerMaskBaseId` + `allocId`.
- D.04 Calls `computeLocalSilhouetteSources(localId, body, elementMaskId, elementMask, layoutMetrics)`.
- D.05 Function checks cache by signature `(width|height|body|maskJson)`.
- D.06 On miss, calls `buildElementMaskDef(elementMaskId, elementMask, layoutMetrics)`.
- D.07 If `mask.enabled !== true` → return `{defs:'', active:false, primitives:''}`.
- D.08 Compute `width, height` from layout.
- D.09 Compute `baseFill = mask.invert ? 'black' : 'white'`.
- D.10 Build primitives via `buildElementMaskPrimitives(mask, layoutMetrics)`.
- D.11 If primitives empty AND `invert !== true` → return inactive.
- D.12 Else build `<mask id=…>` with base rect + primitives.
- **Region contract (CRITICAL):**
  - D.13 Mask region MUST cover the same coordinate frame as `body`.
  - D.14 If body is origin-centered, region MUST be `(-W/2, -H/2, W, H)`.
  - D.15 If body is top-left, region MUST be `(0, 0, W, H)`.
  - D.16 Pixels outside region → SVG renders alpha 0. (Hard rule.)
- D.17 Returned `active:true, defs, primitives`.
- D.18 `silhouettePath = active ? <g mask=url(elementMaskId)>body</g> : body`.
- D.19 Cached by signature.

## E — Primitive Coordinate Mapping

- E.01 `resolveMaskCoordinateSpace(mask)` returns `'local'` or `'global'`.
- E.02 Local mode mapping: `[0,100] → [-W/2, +W/2]`.
- E.03 Global mode mapping: `[0,100] → [0, W]` (current).
- E.04 If body is origin-centered AND region is origin-centered, local mapping is correct.
- E.05 If global mapping is used inside an origin-centered region, primitives shift by `+W/2,+H/2` (off-screen possibly).
- E.06 NaN / non-finite point coordinate → primitive should be skipped, NOT clamped to 0.
- E.07 NaN / non-finite stroke `width`/`height` for selection rect → primitive should be skipped.
- E.08 Selection rect with `w<=0 || h<=0` → primitive should be skipped.
- E.09 Free polygon with `<3` valid points → primitive should be skipped.
- E.10 Brush polyline with `0` valid points → primitive should be skipped.
- E.11 Brush polyline `stroke-width` derived from `stroke.size` and a `scale = min(W,H)/100` factor.

## F — Effect Routing (downstream)

- F.01 `resolveLayerControllerSources(silhouetteSources)` returns mapping.
- F.02 `styleFx.body = silhouettePath`.
- F.03 `depthFx.body = silhouettePath`.
- F.04 `dropShadow.body = silhouettePath`.
- F.05 `globalLight.body = silhouettePath`.
- F.06 `uvLocal.body = geometryPath`.
- F.07 If `silhouettePath` is empty/garbage, all listed effects render incorrectly.

## G — Overlay Clipping (per overlay)

- G.01 Each texture/gradient/material has its own `<mask id=…>` (texture/gradient/material specific id).
- G.02 The mask body is `resolveClipMaskBody(clip, context, localUvInputBody, currentElementName)`.
- G.03 If `clip.enabled !== true` → mask body is `localUvInputBody` (own element’s UV body).
- G.04 If `clip.targetName` set and present in `layerMaskRegistry` → mask body becomes the **other element’s `worldBody`**.
- G.05 `worldBody = translate(x,y) rotate(r) body` of source element.
- G.06 Overlay rect is rendered inside the current element’s `<g transform=translate(x,y) rotate(r)>` group.
- **Cross-element double-transform issue:**
  - G.07 If consumer element’s transform ≠ source element’s transform, the registry body lands offset/rotated relative to the source on screen.
  - G.08 This is independent of the element-mask system but visually mistakable for cross-element mask leakage.

## H — Element Mask vs Overlays

- H.01 If `elementMaskDef.active` and overlays present → wrap overlays in `<g mask=url(elementMaskId)>` ([renderer L1252-L1255](app/engine/core/renderer.js#L1252-L1255)).
- H.02 Otherwise overlays painted unmasked.
- H.03 Element body is rendered as `<g filter=…>silhouettePath</g>` (filter input already from masked silhouette).

## I — Editor Preview Overlay

- I.01 Editor computes `selectedMaskStrokes` for visualization.
- I.02 If element has local-space strokes → maps them via `selectedMaskLocalToCanvasPoint` to canvas % for overlay.
- I.03 Overlay drawn as React SVG separate from engine renderer.
- I.04 Overlay polyline width = `Number(stroke.size)/5.2`.
- I.05 Overlay must visually align with what the renderer eventually produces.
- I.06 Overlay coordinate math is duplicated from renderer math (drift risk).

## J — Global Mask Guides Toggle

- J.01 User toggles "Show global mask guides".
- J.02 `globalMaskGuideStrokes` IIFE walks all elements.
- J.03 Filters elements where `mask.enabled === true`.
- J.04 Resolves coordinate space via `getMaskCoordinateSpace`.
- J.05 Maps each stroke to canvas % using `convertMaskStrokePoints` + `elementMaskLocalToCanvasPoint`.
- J.06 Renders all guide strokes in one overlay SVG.
- **Crash condition:**
  - J.07 IIFE is declared at line ~4019. Helpers (`getMaskCoordinateSpace`, `elementMaskLocalToCanvasPoint`, `convertMaskStrokePoints`) declared at lines ~4101 / 4191 / 4214.
  - J.08 React executes IIFE during render BEFORE helpers are initialized → TDZ ReferenceError.
  - J.09 Page crashes whole React tree.

## K — Coordinate Migration (legacy)

- K.01 Pre-existing templates may carry `coordinateSpace:'global'` strokes.
- K.02 On enable / on edit, `ensureSelectedMaskLocalCoordinateSpace` walks strokes and converts each via `canvasToElementMaskLocalPoint`.
- K.03 Strokes rewritten with `coordinateSpace:'local'`.
- K.04 If migration not run before render, renderer falls into `global` branch.
- K.05 Renderer global branch maps `[0,100]→[0,W]` inside element-local frame → primitive lands offset.

## L — Robustness

- L.01 No code path crashes on `mask = null`.
- L.02 No code path crashes on `mask.strokes` not an array.
- L.03 No code path crashes on a stroke object missing `points`.
- L.04 No code path crashes on a point with NaN/string `x` or `y`.
- L.05 No code path crashes on `mask.invert` not boolean.
- L.06 No code path crashes on missing `layoutMetrics`.

## M — Cross-Element Isolation

- M.01 Mask painted on element A must not change rendered geometry of element B.
- M.02 Mask painted on element A must not change overlays of element B (unless B has explicit `clip.targetName === A`).
- M.03 If clip.targetName is set, the consumer must render the source body in a frame where it visually overlaps the source element on canvas.
- M.04 Z-order is independent of mask state.

## N — Backwards Compatibility

- N.01 Templates without `mask` field render unchanged.
- N.02 Templates with `mask.enabled === false` render unchanged.
- N.03 Templates with `mask.coordinateSpace === 'global'` must render at correct visual position OR be migrated on load.
- N.04 Schema additions only (no removals) for v1.

## O — Observability

- O.01 `renderSurfaceSourceDebugByLayer` exposes per-layer cache hit + controller sources.
- O.02 `context.maskDebug === true` logs `{elementId, elementTransform, coordinateSpace, maskId}` per active mask.
- O.03 Sufficient to diagnose silhouette emptiness and frame mismatches.

## P — Validation Hooks (target)

- P.01 Snapshot test for `<mask>` region attributes (x, y, width, height) for a known input.
- P.02 Snapshot test that `silhouettePath` is non-empty when primitives non-empty.
- P.03 Manual scenario: rotated rect + tiny hide stroke + texture + depth — verify silhouette propagates.
- P.04 Manual scenario: global mask guides toggle ON with at least one masked element — no crash.
- P.05 Manual scenario: malformed stroke `{points:[{x:'x',y:null}]}` — no crash, no ghost primitive.
