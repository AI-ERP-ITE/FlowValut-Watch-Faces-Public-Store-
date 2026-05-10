# 22 — Comprehensive Review: Snapshot Quality + Effects-On-Snapshot

> Goal: end the snapshot regression saga. One pass. Identify every moving part still touching snapshot rendering, classify each as KEEP / REMOVE / FIX, and answer explicitly whether the alpha-preservation logic is still needed after the latest changes.

---

## 0. Symptoms reported by user

1. Baked snapshot looks like "low-bit" / pixelated / noisy.
2. After making a snapshot, no post effects (depth, drop shadow, texture, gradient overlay, material, style adjust) visibly affect the snapshot layer.
3. Reload sometimes restores an older stage (covered separately — quota saturation, not part of this spec).

---

## 1. Code surfaces that participate in the snapshot pipeline

| # | File | Symbol | Purpose |
|---|------|--------|---------|
| A | [app/engine/snapshot/snapshotRenderer.ts](app/engine/snapshot/snapshotRenderer.ts) | `createElementSnapshot`, `rasterizeSvg`, `sanitizeElementForEngine` | Capture: render element through engine → rasterize SVG → PNG/WebP data URL. |
| B | [app/engine/snapshot/snapshotStorage.ts](app/engine/snapshot/snapshotStorage.ts) | `getSnapshotStatus`, helpers | Determine `fresh` / `outdated` / `missing`. |
| C | [app/engine/snapshot/snapshotHash.ts](app/engine/snapshot/snapshotHash.ts) | `generateElementRenderHash` | Hash of canonical element state → `sourceHash`. |
| D | [app/engine/core/renderer.js](app/engine/core/renderer.js#L1437) | `resolveSnapshotRenderSource`, `resolveElementRenderSourceDecision`, `resolveSnapshotMaskFrameMetrics`, `resolveElementMaskFrameMetrics`, snapshot branch around [renderer.js#L1598-L1606](app/engine/core/renderer.js#L1598-L1606) | Decide live vs snapshot per element, build `<image>` body, hand to `renderLayer`. |
| E | [app/engine/core/renderer.js](app/engine/core/renderer.js#L1213) | `renderLayer` | Apply mask, filter (depth+dropShadow+styleAdjust), texture/gradient/material overlays. Receives `bodyRaw` regardless of source mode. |
| F | [app/src/ParametricPage.tsx](app/src/ParametricPage.tsx#L2263) | `createSnapshotForSelectedElement`, `createBakedLayerFromSelectedSnapshot` (~L2304), `bakeLayerFromSelected` | UI workflows that call A and assemble the new layer. |
| G | [app/src/ParametricPage.tsx](app/src/ParametricPage.tsx#L4736) | `buildMaskFieldDataUrl`, `decodeMaskFieldValues` | Editable mask field PNG (alpha channel only, white RGB). |

---

## 2. What each piece does NOW

### 2.1 Capture (A)
- Builds a stripped clone of element (drops `id`, `visible`; drops `mask` unless `bakeMaskIntoSnapshot`; forces `renderState.sourceMode` to `live` unless `preserveRenderSourceMode`).
- Calls `runEngine` for the full template with `elements: [singleElement]`.
- Rasterizes SVG via `<img>` → `<canvas>` of size `layout.width × layout.height` (clamped 1..2048; default 480×480).
- `canvas.toDataURL(mimeType, quality)` with default `image/png`, no quality arg → lossless PNG.

### 2.2 Renderer source decision (D)
- If element `renderState.sourceMode === "snapshot"` AND `snapshotStatus === "fresh"` → returns `effectiveMode = "snapshot"` and `snapshotSource` (URL + W/H + opacity).
- Otherwise: `live` (or `live-fallback`).
- `maskFrameMetrics` is set to snapshot W/H when a snapshot exists, so mask region matches captured raster.

### 2.3 Layer body when snapshot is used (D, around L1598-L1606)

```js
const useSnapshotSource = renderSourceDecision.effectiveMode === "snapshot" && snapshotSource !== null;
const bodyRaw = useSnapshotSource
  ? `<image x="${-snapshotSource.width / 2}" y="${-snapshotSource.height / 2}" width="${snapshotSource.width}" height="${snapshotSource.height}" preserveAspectRatio="none" href="..." opacity="..." />`
  : definition.render(renderParams, position, context);
// reshape (rect-layout scaling) wraps body; then translate(x y) rotate(r); then renderLayer(...)
```

`renderLayer` is called with this `bodyRaw` for BOTH source modes — this is the path that applies effects/filters/overlays/masks. So effects are wired in on paper.

### 2.4 Effects pipeline in `renderLayer` (E)
Standard SVG `<filter>` chain via `buildLayerFilterDef`:
- depth → `feMorphology` + `feGaussianBlur` + `feComposite` operating on `SourceAlpha`.
- dropShadow → uses `SourceAlpha` (optionally `dsSpreadAlpha`).
- styleAdjust (contrast/highlight/shadows/sharpness/hue/colorOpacity) → color matrices.
- texture/gradient/material → `<feImage>` + blend, clipped via `feComposite ... in2="SourceAlpha" operator="in"`.

> KEY POINT: the entire effect chain is **alpha-driven** (`SourceAlpha`). When the source body is a rectangular `<image>` of a 480×480 PNG, `SourceAlpha` is a full opaque rectangle (transparent only where the captured PNG has alpha gaps). So:
> - depth/dropShadow rim falls on the rectangle edge → invisible because rim is offset off-canvas or behind opaque rectangle.
> - texture/gradient/material clip-in to the full rectangle → they DO render but tile across the full snapshot bounds, not the visible silhouette → looks like nothing changed if the snapshot already fills the layer.
> - styleAdjust still works (color matrix) — but on a pre-baked image whose tonal range was already fixed → small visible delta.

This is why "no effects on snapshot" feels true even though the chain runs. Effects are not skipped; they are applied to a flat rectangular alpha and therefore visually disappear or look identical to the bake.

---

## 3. Diagnosis

### 3.1 "Low-bit" snapshot quality
Causes ranked by likelihood:
1. **Raster size = layout pixel size only (480×480) with no DPR multiplier.** On Hi-DPI screens the editor canvas displays the snapshot at >480 CSS px → bilinear upscale → mush. Repeated snapshot-of-snapshot chains compound the softness.
2. **Snapshot is positioned via centered-on-element-world rectangle.** When the element is far from canvas center, the 480×480 raster is drawn off-center; viewport shows the offset half. Not a quality issue, but contributes to "looks wrong".
3. Optional `image/webp` path with low quality could degrade — currently default is `image/png`, so this is dormant. Keep the path but document the default.

### 3.2 "Effects do not affect snapshot layer"
Root cause is **alpha source mismatch**, not a suppression branch:
- `SourceAlpha` of an `<image>` element is the alpha plane of the embedded PNG.
- The captured PNG's alpha plane equals the element's silhouette only if the engine output for that element had transparent background. It does today (engine renders a single element, no clear fill), so theoretically alpha is preserved.
- BUT some reshape/translate wrapping introduces full-rect bounding behavior, AND when the snapshot includes a baked mask (`bakeMaskIntoSnapshot=true`), the mask alpha is already burned in → re-applying SVG mask + effects on top can either no-op or visibly cancel.
- Net effect to user: effects appear to do nothing, especially after baking.

### 3.3 Alpha preservation logic (FR-3) — still needed?

**YES, partially. Reframe required.**

The original FR-3 protected against base alpha disappearing in `snapshot → mask → stroke edit`, `snapshot → mask → delete snapshot`, `live → mask → snapshot → live`. The fixes that landed (canonical procedural source, mask-frame metrics, stale fallback) DO solve those flows — those alpha collapses are gone.

What is NOT solved is the **inverse problem**: when source is the snapshot rectangle, the alpha plane is the captured image's alpha — not a recomputed silhouette. So:
- Alpha-preservation invariant for live → mask: ✅ keep current logic.
- Alpha-preservation invariant for snapshot → effects: 🆕 needs an explicit silhouette source for effect chains, e.g. a `feComposite ... in="SourceGraphic" in2="<silhouettePath>" operator="in"` layered before the effect filter, or pre-rendering the snapshot through an alpha-preserving fragment that effects can key off.

Bottom line: keep the alpha logic, but it is currently **insufficient** for the snapshot-effects case. Math is correct for live source; for snapshot source the chain inputs are wrong.

---

## 4. KEEP / REMOVE / FIX matrix

| Area | Verdict | Notes |
|------|---------|-------|
| `createElementSnapshot` core flow | KEEP | Capture pipeline is clean. |
| `sanitizeElementForEngine` strip of `id/visible/mask`, sourceMode forced to `live` | KEEP | Prevents recursive snapshot bake. |
| `bakeMaskIntoSnapshot` option | KEEP | Needed for "bake to new layer" flow. |
| `preserveRenderSourceMode` option | REMOVE (already removed at rebake call site) | Dead path elsewhere — audit and delete. |
| `image/webp` + `quality` capture path | KEEP, document default | Low risk. |
| Raster size = `layout.width × layout.height` only | FIX | Multiply by `Math.min(2, devicePixelRatio || 1)` when capturing for the editor; store native size separately so pack export still uses canonical pixels. |
| Snapshot `<image>` width/height in render body uses captured pixels in template-units coord | FIX | Use `layoutMetrics.width/height` (template space), let the SVG scale the image — then resolution loss only happens on the browser's final raster, no double resample. |
| Centered-on-element placement (`x = -W/2`) | FIX | Place snapshot at template origin (0..W) since the captured image already encodes element world position. |
| `resolveElementRenderSourceDecision` fresh/stale gating | KEEP | Correct. |
| `renderLayer` receiving snapshot `bodyRaw` and running full effect chain | KEEP, FIX | Wiring is correct; alpha source is wrong (see below). |
| Alpha source for filter chain when snapshot is the body | FIX | Either (a) feed the captured silhouette (alpha plane) as a separate `<feImage>` and use it as `in2` for effect masking, or (b) re-derive a vector silhouette and clip the snapshot through it before the filter. |
| Mask frame metrics (`resolveSnapshotMaskFrameMetrics`) | KEEP | Required for mask alignment continuity. |
| `snapshotRevisionHash` storage and freshness | KEEP | Already simplified. |
| Local persistence of snapshot in template draft | FIX (separate spec) | Quota-saturation regression — covered by reload-rollback work. |

---

## 5. Math check

Snapshot capture math:
- `width = clamp(round(layout.width), 1..2048)` → 480 in default ZeppOS small. ✅
- `ctx.drawImage(image, 0, 0, width, height)` with the SVG's native pixel size already = `width` after engine rendered to `layoutMetrics`. ✅
- `canvas.toDataURL(mimeType, quality)` with no quality + PNG = lossless. ✅

Snapshot replay math (current):
- World position: `x = (position.x/100) * layoutMetrics.width`. ✅
- Snapshot body: `<image x=-W/2 y=-H/2 w=W h=H>` where `W = snapshot.width = 480`, drawn under transform `translate(x y) rotate(r)`. ❌ when `layoutMetrics.width !== snapshot.width` and ❌ for off-center elements (image gets centered on the element instead of overlaying the canvas).

Recommended math:
- Use `W = layoutMetrics.width`, `H = layoutMetrics.height`.
- Body: `<image x="${-x}" y="${-y}" width="${W}" height="${H}" preserveAspectRatio="none" ...>`. The outer `translate(x y)` cancels, image lands at `0..W,0..H` template space — matches what was captured. Captured PNG already encodes element placement, so no shift required.

Filter alpha math (proposed):
1. Compute silhouette path for the element type when snapshot source is active (same vector path used for live `definition.render`).
2. Use silhouette as a `<clipPath>` wrapping the `<image>` so `SourceAlpha` becomes the silhouette, not the rectangle.
3. Filter chain unchanged → depth rim, drop shadow, overlays now key off true silhouette.

Alternative if vector silhouette unavailable for arbitrary baked layers:
- Use the captured PNG itself as the silhouette via `<feImage>` + `feColorMatrix` to extract alpha → store as filter primitive `silhouetteAlpha` → swap `SourceAlpha` references in the depth/dropShadow/material chain to `silhouetteAlpha`. Slightly heavier filter graph but works for any opaque-on-transparent capture.

---

## 6. Concrete change list (proposed, not yet applied — awaiting approval)

1. **Renderer snapshot body (D, ~L1598-L1606)**: rewrite `<image>` to use `layoutMetrics` size and offset by `-x/-y` so outer transform yields an aligned full-canvas placement.
2. **Renderer filter alpha (E, `buildLayerFilterDef` callers)**: when `useSnapshotSource`, derive `silhouetteAlpha` filter primitive from `<feImage>` of the snapshot PNG and feed it everywhere `SourceAlpha` is consumed.
3. **Snapshot capture (A, `createElementSnapshot`)**: add optional `pixelRatio` arg (default 1, editor uses `min(2, devicePixelRatio)`); multiply canvas W/H by ratio, keep stored `width/height` = logical pixels for downstream geometry.
4. **Capture sanitizer (A)**: delete the dead `preserveRenderSourceMode` option (and the call sites that pass `false`).
5. **No changes** to `snapshotStorage`, `snapshotHash`, mask frame metrics, persistence layer.

---

## 7. Validation plan

1. Targeted tests:
   - `app/engine/core/render-source-snapshot-mode.test.js` — update expectations: snapshot body uses layout-size and `silhouetteAlpha` filter primitive.
   - New: `render-source-snapshot-effects.test.js` — assert depth/dropShadow/overlay primitives are present in serialized SVG when source mode is snapshot.
   - `snapshotRenderer.test.ts` — assert rasterization respects `pixelRatio` arg.
2. Manual flow matrix (per [10-t001-repro-matrix.md](app/specs/077-snapshot-mask-alpha-preservation/10-t001-repro-matrix.md)):
   - live → effect ✅ (regression check)
   - live → snapshot → effect (must now show effect on silhouette)
   - live → mask → snapshot → effect
   - snapshot → bake to new layer → effect on baked layer
   - chain: snapshot → bake → snapshot of baked → effect
3. Visual quality check: Hi-DPI canvas screenshot before/after `pixelRatio` change.

---

## 8. Risk

| Risk | Mitigation |
|------|------------|
| `<feImage>` silhouette extraction increases filter cost per layer | Cache per-snapshot in `context.silhouetteSurfaceCacheByLayer` (already exists). |
| Pixel-ratio bump increases stored data URL size and worsens localStorage quota issue | Cap at 2×; keep export rasterization at logical size; coordinate with persistence fix. |
| Math change to `<image>` placement could shift legacy captured snapshots | Snapshots store `width/height` — fall back to old centered behavior only when captured `width != layout.width` (size mismatch path). |

---

## 9. Open question for user (need answer before implementation)

1. Approve the placement+silhouette+pixel-ratio change set above? (yes / partial / propose alternative)
2. Acceptable to bump editor capture to 2× DPR (≈4× data size) given the persistence quota concern is being tackled separately?
3. Keep `image/webp` capture path or remove entirely?

> Nothing in this document touches code yet. Awaiting explicit approval per workflow rule.
