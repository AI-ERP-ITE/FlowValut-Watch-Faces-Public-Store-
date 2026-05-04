# Detailed Checklist — Per-Step Verification Against Current Code

Statuses: ✅ pass · ⚠️ partial · ❌ fail · ❓ not verified.
Citations are workspace-relative.

## A — Mask Enable

| ID | Status | Evidence |
|---|---|---|
| A.01 | ✅ | Selection state via `selectedElement` in [app/src/ParametricPage.tsx](app/src/ParametricPage.tsx). |
| A.02 | ✅ | Mask controls keyed off `selectedElement.id`. |
| A.03 | ✅ | UI calls `setSelectedMaskEnabled(true)`. |
| A.04 | ✅ | `deepClone(element.mask)` ([app/src/ParametricPage.tsx L3042](app/src/ParametricPage.tsx#L3042)). |
| A.05 | ✅ | `enabled` written ([app/src/ParametricPage.tsx L3053](app/src/ParametricPage.tsx#L3053)). |
| A.06 | ✅ | `mode: typeof mask.mode === 'string' ? mask.mode : 'brush'` ([L3056](app/src/ParametricPage.tsx#L3056)). |
| A.07 | ✅ | `invert: mask.invert === true` ([L3057](app/src/ParametricPage.tsx#L3057)). |
| A.08 | ✅ | `brush.size` defaulted ([L3059](app/src/ParametricPage.tsx#L3059)). |
| A.09 | ✅ | `brush.hardness` defaulted ([L3060](app/src/ParametricPage.tsx#L3060)). |
| A.10 | ✅ | `brush.opacity` defaulted ([L3061](app/src/ParametricPage.tsx#L3061)). |
| A.11 | ✅ | `strokes: Array.isArray(mask.strokes) ? mask.strokes : []` ([L3063](app/src/ParametricPage.tsx#L3063)). |
| A.12 | ⚠️ | Newly enabled defaults to `'local'` only when no existing strokes. If preexisting global strokes present, keeps `'global'` ([L3046-L3048](app/src/ParametricPage.tsx#L3046-L3048)). |
| A.13 | ✅ | `updateTemplateElements` invoked. |
| A.14 | ✅ | Renderer reads element. |
| A.15 | ✅ | Early-return path in `buildElementMaskDef` ([app/engine/core/renderer.js L1013-L1018](app/engine/core/renderer.js#L1013-L1018)). |
| A.16 | ✅ | No defs returned. |
| A.17 | ⚠️ | True if no malformed leftover strokes. |
| A.18 | ✅ | No crash path on empty enable. |

## B — Edit Mode

| ID | Status | Evidence |
|---|---|---|
| B.01 | ✅ | Toggle `showMaskCanvasEditor`. |
| B.02 | ✅ | UI panel renders when active. |
| B.03 | ✅ | `cursor-crosshair` class ([app/src/ParametricPage.tsx L5333](app/src/ParametricPage.tsx#L5333)). |
| B.04 | ✅ | Overlay shows `selectedMaskStrokes`. |
| B.05 | ✅ | `maskBrushAction` toggle present. |
| B.06 | ✅ | brush size/hardness/opacity controls. |
| B.07 | ✅ | `selectedMaskSelectionShape` toggle. |

## C — Capture

| ID | Status | Evidence |
|---|---|---|
| C.01 | ✅ | onMouseDown handler ([L5336](app/src/ParametricPage.tsx#L5336)). |
| C.02 | ✅ | `getBoundingClientRect`. |
| C.03 | ✅ | x/y % computed. |
| C.04 | ✅ | `ensureSelectedMaskLocalCoordinateSpace()` invoked ([L5339](app/src/ParametricPage.tsx#L5339)). |
| C.05 | ✅ | `canvasToSelectedMaskLocalPoint` ([L5344](app/src/ParametricPage.tsx#L5344)). |
| C.06 | ✅ | `setActiveMaskStroke` populated. |
| C.07 | ✅ | 0.6% sampling threshold ([L5430](app/src/ParametricPage.tsx#L5430)). |
| C.08 | ✅ | Same conversion on each move. |
| C.09 | ✅ | `finishMaskStroke` on mouseup. |
| C.10 | ✅ | `points.length > 0` guard ([L4295](app/src/ParametricPage.tsx#L4295)). |
| C.11 | ✅ | `appendSelectedMaskStroke` writes `coordinateSpace:'local'` ([L3201](app/src/ParametricPage.tsx#L3201)). |
| C.12 | ✅ | Persisted via `updateTemplateElements`. |

## D — Renderer Mask Build

| ID | Status | Evidence |
|---|---|---|
| D.01 | ✅ | `renderSvg` iterates elements. |
| D.02 | ✅ | `localId = el-${elementIndex}-${positionIndex}` ([app/engine/core/renderer.js L1431](app/engine/core/renderer.js#L1431)). |
| D.03 | ✅ | `buildLayerMaskBaseId` + `allocId('mask')` ([L1075-L1083](app/engine/core/renderer.js#L1075-L1083)). |
| D.04 | ✅ | `computeLocalSilhouetteSources` called in `renderLayer` ([L1134](app/engine/core/renderer.js#L1134)). |
| D.05 | ✅ | Cache check via `silhouetteSurfaceCacheByLayer`. |
| D.06 | ✅ | `buildElementMaskDef` invoked ([L1052](app/engine/core/renderer.js#L1052)). |
| D.07 | ✅ | enabled !== true → inactive ([L1004-L1006](app/engine/core/renderer.js#L1004-L1006)). |
| D.08 | ✅ | width/height from layout. |
| D.09 | ✅ | `baseFill` correct. |
| D.10 | ✅ | primitives via `buildElementMaskPrimitives`. |
| D.11 | ✅ | empty + non-invert returns inactive ([L1013-L1015](app/engine/core/renderer.js#L1013-L1015)). |
| D.12 | ✅ | `<mask>` def constructed. |
| **D.13** | ❌ | **Region attrs `x="0" y="0" width=W height=H` ([L1015](app/engine/core/renderer.js#L1015)).** |
| **D.14** | ❌ | **Body is origin-centered post element transform; region is NOT origin-centered.** |
| D.15 | n/a | Body is not top-left. |
| D.16 | ✅ | SVG spec behavior (informational). |
| D.17 | ✅ | active flag set. |
| D.18 | ✅ | silhouette wrap ([L1052](app/engine/core/renderer.js#L1052)). |
| D.19 | ✅ | Cache write. |

## E — Coordinate Mapping

| ID | Status | Evidence |
|---|---|---|
| E.01 | ✅ | `resolveMaskCoordinateSpace` ([L937-L941](app/engine/core/renderer.js#L937-L941)). |
| E.02 | ✅ | `toLocalX/Y` map to `[-W/2,+W/2]` ([L949-L950](app/engine/core/renderer.js#L949-L950)). |
| E.03 | ✅ | `toGlobalX/Y` map to `[0,W]` ([L946-L947](app/engine/core/renderer.js#L946-L947)). |
| E.04 | ❌ | Body+region NOT both origin-centered → fail. |
| E.05 | ❌ | Global mode in element-local frame shifts +W/2,+H/2. |
| E.06 | ❌ | `clamp(value, 0, 100, 0)` defaults NaN to 0 instead of skipping ([L946-L950](app/engine/core/renderer.js#L946-L950)). |
| E.07 | ❌ | Same clamp for selection w/h. |
| E.08 | ❌ | No skip on zero-area selection. |
| E.09 | ✅ | `points.length >= 3` guard for free polygon. |
| E.10 | ✅ | `points.length > 0` guard for polyline. |
| E.11 | ✅ | `scale = min(W,H)/100` applied ([L953](app/engine/core/renderer.js#L953)). |

## F — Effect Routing

| ID | Status | Evidence |
|---|---|---|
| F.01 | ✅ | `resolveLayerControllerSources` ([L1085-L1115](app/engine/core/renderer.js#L1085-L1115)). |
| F.02 | ✅ | styleFx → silhouette. |
| F.03 | ✅ | depthFx → silhouette. |
| F.04 | ✅ | dropShadow → silhouette. |
| F.05 | ✅ | globalLight → silhouette. |
| F.06 | ✅ | uvLocal → geometryPath. |
| F.07 | ❌ | True — and silhouette IS broken because of D.13/D.14 → all of F.02–F.05 cascade fail. |

## G — Overlay Clipping

| ID | Status | Evidence |
|---|---|---|
| G.01 | ✅ | per-overlay mask ids ([L1213-L1218](app/engine/core/renderer.js#L1213-L1218)). |
| G.02 | ✅ | `resolveClipMaskBody` invoked. |
| G.03 | ✅ | falls back to `localUvInputBody`. |
| G.04 | ✅ | registry lookup ([L915-L935](app/engine/core/renderer.js#L915-L935)). |
| G.05 | ✅ | `worldBody` written ([L1356-L1361](app/engine/core/renderer.js#L1356-L1361)). |
| G.06 | ✅ | overlay rect inside element transform ([renderLayer wrap L1257](app/engine/core/renderer.js#L1257)). |
| **G.07** | ❌ | **Double-transform bug confirmed.** |
| G.08 | ✅ | Independent of element mask system. |

## H — Element Mask vs Overlays

| ID | Status | Evidence |
|---|---|---|
| H.01 | ✅ | overlay group wrapped when active ([L1252-L1255](app/engine/core/renderer.js#L1252-L1255)). |
| H.02 | ✅ | unwrapped otherwise. |
| H.03 | ✅ | filter input is silhouette body ([L1135-L1144](app/engine/core/renderer.js#L1135-L1144)). |

## I — Editor Preview

| ID | Status | Evidence |
|---|---|---|
| I.01 | ✅ | `selectedMaskStrokes` IIFE ([app/src/ParametricPage.tsx L4251-L4264](app/src/ParametricPage.tsx#L4251-L4264)). |
| I.02 | ✅ | `selectedMaskLocalToCanvasPoint` mapping. |
| I.03 | ✅ | React SVG overlay. |
| I.04 | ✅ | width = `size/5.2`. |
| I.05 | ⚠️ | Only true if renderer math matches; today it doesn’t (D.13). |
| I.06 | ❌ | Math duplicated; no shared helper. |

## J — Global Mask Guides

| ID | Status | Evidence |
|---|---|---|
| J.01 | ✅ | toggle present. |
| J.02 | ✅ | flatMap over elements ([L4022-L4051](app/src/ParametricPage.tsx#L4022-L4051)). |
| J.03 | ✅ | filter on `enabled === true`. |
| J.04 | ✅ | `getMaskCoordinateSpace`. |
| J.05 | ✅ | `convertMaskStrokePoints` + `elementMaskLocalToCanvasPoint`. |
| J.06 | ✅ | overlay SVG render. |
| **J.07** | ❌ | **IIFE at L4019, helpers declared at L4101 / L4191 / L4214.** |
| **J.08** | ❌ | **TDZ ReferenceError on render.** |
| **J.09** | ❌ | **Page crash confirmed.** |

## K — Migration

| ID | Status | Evidence |
|---|---|---|
| K.01 | ✅ | legacy data possible. |
| K.02 | ⚠️ | `ensureSelectedMaskLocalCoordinateSpace` runs only on selected element on first paint ([L4251-L4279](app/src/ParametricPage.tsx#L4251-L4279)); not template-wide on load. |
| K.03 | ✅ | rewritten when migration runs. |
| K.04 | ❌ | Renderer still hits `global` branch for unmigrated elements. |
| K.05 | ❌ | Confirmed shift. |

## L — Robustness

| ID | Status | Evidence |
|---|---|---|
| L.01 | ✅ | `mask = null` guards. |
| L.02 | ✅ | `Array.isArray` guards. |
| L.03 | ✅ | `points` guarded as array; missing → empty. |
| L.04 | ❌ | NaN points clamp to 0 (E.06). |
| L.05 | ✅ | `=== true` strict comparison. |
| L.06 | ✅ | `Math.max(1, Number(layoutMetrics?.width) || 100)` defaults. |

## M — Cross-Element Isolation

| ID | Status | Evidence |
|---|---|---|
| M.01 | ✅ | element mask scope per-element. |
| M.02 | ⚠️ | True unless `clip.targetName` set. |
| M.03 | ❌ | Double-transform (G.07) violates intended overlap. |
| M.04 | ✅ | Mask doesn’t reorder paint. |

## N — Backcompat

| ID | Status | Evidence |
|---|---|---|
| N.01 | ✅ | renderers gate on `mask` truthy. |
| N.02 | ✅ | enabled !== true → inactive. |
| N.03 | ❌ | Global strokes shift due to E.05. |
| N.04 | ✅ | Schema additions only. |

## O — Observability

| ID | Status | Evidence |
|---|---|---|
| O.01 | ✅ | published via context ([L1170-L1182](app/engine/core/renderer.js#L1170-L1182)). |
| O.02 | ✅ | `context.maskDebug` log block ([L1145-L1151](app/engine/core/renderer.js#L1145-L1151)). |
| O.03 | ⚠️ | Useful, but no automated assertion. |

## P — Validation

| ID | Status | Evidence |
|---|---|---|
| P.01 | ❌ | No snapshot test exists yet. |
| P.02 | ❌ | No assertion. |
| P.03 | ❌ | No automated scenario. |
| P.04 | ❌ | No automated scenario. |
| P.05 | ❌ | No automated scenario. |

---

## Failure Summary

**Hard failures (block acceptance):**
- D.13, D.14 — mask region origin mismatch.
- E.04, E.05 — coordinate frame mismatch.
- E.06, E.07, E.08 — NaN/zero-area not skipped.
- F.07 — cascading silhouette fail.
- G.07 — overlay clip double-transform.
- I.05, I.06 — preview/render math drift.
- J.07, J.08, J.09 — TDZ crash on guide toggle.
- K.04, K.05 — legacy global strokes wrong.
- L.04 — NaN handling unsafe.
- M.03 — clip overlap broken.
- N.03 — backcompat shift.
- P.01–P.05 — no validation harness.

**Partial:**
- A.12, A.17, K.02, M.02, O.03.

**Pass:** the rest.
