# Comparison — Target Flow vs Actual Flow

For each pipeline stage: required behavior, actual behavior in current code, and the divergence.

---

## Stage A — Enable mask (no stroke yet)

| Aspect | Target | Actual |
|---|---|---|
| State written | `enabled:true`, defaults, `strokes:[]`, `coordinateSpace:'local'` | Same. ✅ |
| Element visual | Unchanged | Unchanged in *most* cases (early-return path), but a previously-stored malformed stroke would defeat this. ⚠️ |
| Mask region in DOM | Not emitted | Not emitted (early-return). ✅ |

**Divergence:** none material at this stage (assuming clean state).

---

## Stage B — Author a tiny hide stroke

### Target
1. Capture pointer in canvas %.
2. Convert to selected-element local % (account for placement + rotation).
3. Append to `mask.strokes` with `coordinateSpace:'local'`.
4. Renderer maps local % → element-local pixel coords.
5. Mask region covers the same element-local frame as `body`.
6. Resulting `<mask>` paints a small black ink stroke over the white base, exclusively in the brushed region.
7. Element body wrapped in `<g mask="url(#…)">` shows everything except the brushed area.

### Actual
1. Capture in canvas %. ✅
2. Conversion via `canvasToSelectedMaskLocalPoint` (placement + rotation aware). ✅
3. Append with `coordinateSpace:'local'`. ✅
4. Renderer’s `toLocalX/Y` maps `[0,100]` → `[-W/2,+W/2]`. ✅ in itself.
5. **Region is `(x=0,y=0,W,H)`, not `(-W/2,-H/2,W,H)`.** ❌ **INV3 violated.**
6. Black ink stroke is drawn at coordinates that lie partly/entirely outside the mask region. SVG masks treat outside-region pixels as alpha=0 → either the painted ink is clipped away OR the element body’s parts that fall outside the region become invisible.
7. Net visible result is unpredictable: tiny stroke can cause "whole element gone" (body outside region) or "no visible change" (ink outside region).

**Divergence:** mask region origin mismatch. Single biggest source of unpredictability.

---

## Stage C — Effect propagation after mask

### Target
- Texture/gradient/material overlays clipped to surviving silhouette.
- Drop shadow & depth filters consume silhouette alpha → cast from cut edge.
- Original stroke shows only on surviving outline (acceptable).

### Actual
- Wiring is correct: `silhouettePath = <g mask=url(M)>body</g>` ([renderer.js L1052](app/engine/core/renderer.js#L1052)) and `resolveLayerControllerSources` routes `silhouettePath` into styleFx, depthFx, dropShadow, globalLight ([renderer.js L1095-L1115](app/engine/core/renderer.js#L1095-L1115)).
- **However**: when mask region is broken (Stage B), `silhouettePath` is either empty or full, so the filters get garbage input → effects look broken in the same way the body looks broken.

**Divergence:** none in topology; total dependency on Stage B correctness.

---

## Stage D — Cross-element interaction (overlay clip)

### Target
- Mask of element A only affects A.
- Overlay `clip.targetName` is a separate, explicit choice.

### Actual
- Element-mask scope is correctly per-element.
- Overlay clip uses `layerMaskRegistry[name] = worldBody` (`worldBody = translate(x y) rotate(r) body`, [renderer.js L1356-L1361](app/engine/core/renderer.js#L1356-L1361)).
- Inside another element’s render, `resolveClipMaskBody` returns this **world** body and inserts it inside that other element’s **already transformed** `<g transform=translate rotate>` group ([renderer.js L1213-L1218](app/engine/core/renderer.js#L1213-L1218) where overlay rect uses `mask=url(textureMaskId)` whose body is the registry entry → **double transform**).
- Visually: an overlay clipped to "Rect1" while rendered inside "Bezel" lands offset/rotated relative to the actual Rect1 → looks like Bezel was punched by Rect1’s shape.

**Divergence:** double-transform bug independent of mask, but easily *attributed* to mask in user reports because rect-shaped holes appear on bezel/ticks.

---

## Stage E — Editor preview overlay

### Target
- Preview overlay shows the same affected region as renderer.
- Global guides toggle works.

### Actual
- Preview maps local→canvas via `selectedMaskLocalToCanvasPoint` (rotation/placement aware). Math is internally consistent for the editor.
- Renderer maps local→element-pixel via `toLocalX/Y` and then transforms with `translate(x y) rotate(r)`. **These two paths produce equivalent canvas positions only if the renderer’s mask region is also origin-centered**. With current `(0,0,W,H)` region, the rendered visible region drifts from the previewed brushed region.
- Global guides crash (TDZ). ❌

**Divergence:** preview math is right, render math is wrong → they disagree. Plus crash.

---

## Stage F — Layering / z-order

### Target
- Mask doesn’t change paint order.
- Higher-z element naturally covers lower-z if opaque.

### Actual
- ✅ Mask doesn’t reorder.
- The user-reported "bezel has a rect-shaped hole" is **z-order, not mask**: the rect element is painted later, on top of bezel/ticks, with full opacity. Rect appears unmasked because Stage B failed.

**Divergence:** none for z-order itself; user perception of "hole in bezel" is composition + failed mask + (possibly) overlay clip double-transform.

---

## Cross-cutting divergences ranked

| # | Divergence | Stage | Symptom user sees |
|---|---|---|---|
| D1 | Mask region origin mismatch (INV3) | B | Tiny stroke deletes whole element / no effect at all. |
| D2 | TDZ in `globalMaskGuideStrokes` | E | Page crash on guides toggle. |
| D3 | NaN-tolerant clamp produces ghost primitives | B | Random black corner on bad data. |
| D4 | Double-transform of `worldBody` in overlay clip | D | "Other elements have rect-shaped holes". |
| D5 | Legacy `global` strokes consumed inside element-local frame | B/G | Old templates render strokes off-position. |
| D6 | Preview/render coordinate math diverges | E | What you paint isn’t what you get. |
