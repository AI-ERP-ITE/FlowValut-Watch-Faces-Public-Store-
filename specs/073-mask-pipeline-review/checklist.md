# Checklist — Requirements vs Current Code

Citations are file-relative. Status legend: ✅ pass · ⚠️ partial / risky · ❌ fail · ❓ unverified.

## R1 — Authoring

| ID | Status | Evidence |
|---|---|---|
| R1.1 No-op until stroke | ⚠️ | `setSelectedMaskEnabled` writes `enabled:true`, `strokes:[]`, `coordinateSpace:'local'` ([app/src/ParametricPage.tsx L3037-L3068](app/src/ParametricPage.tsx#L3037-L3068)). Renderer early-returns `active:false` when no primitives + invert false ([app/engine/core/renderer.js L1003-L1018](app/engine/core/renderer.js#L1003-L1018)). Holds **iff** primitives string is truly empty; if any malformed stroke exists it can produce a degenerate primitive instead. |
| R1.2 Default metadata | ✅ | Same lines as R1.1. |
| R1.3 Tiny stroke = tiny hide | ❌ | `buildElementMaskDef` defines mask region at `x="0" y="0" width=W height=H` ([app/engine/core/renderer.js L1015](app/engine/core/renderer.js#L1015)). Element body in `renderLayer` is drawn around origin then translated; in **local** mode, primitives are mapped into `[-W/2,+W/2]` ([app/engine/core/renderer.js L949-L952](app/engine/core/renderer.js#L949-L952)). Mask region and primitive frame disagree → primitive falls outside region OR body falls outside region → "tiny stroke hides everything" or "stroke does nothing". |
| R1.4 Reveal + invert | ⚠️ | Tone mapping correct (hide=black, reveal=white, baseFill flips on invert), but same region-mismatch as R1.3 makes outcome unpredictable. |
| R1.5 Local-coord storage | ✅ | `appendSelectedMaskStroke` stamps `coordinateSpace:'local'` ([app/src/ParametricPage.tsx L3189-L3207](app/src/ParametricPage.tsx#L3189-L3207)). `canvasToSelectedMaskLocalPoint` converts canvas % → local % with rotation inverse ([app/src/ParametricPage.tsx L4174-L4209](app/src/ParametricPage.tsx#L4174-L4209)). |
| R1.6 Undo/element switch | ❓ | Not directly audited; `updateTemplateElements` is the canonical mutator; assumed history-tracked. |

## R2 — Renderer

| ID | Status | Evidence |
|---|---|---|
| R2.1 Unique mask ID per instance | ✅ | `buildLayerMaskBaseId` uses `context.allocId('mask')` for a unique token ([app/engine/core/renderer.js L1075-L1083](app/engine/core/renderer.js#L1075-L1083)); element-mask suffix `-element` ([app/engine/core/renderer.js L1131](app/engine/core/renderer.js#L1131)). |
| R2.2 Region covers body frame | ❌ | Region origin `(0,0)` ([app/engine/core/renderer.js L1015](app/engine/core/renderer.js#L1015)) does not cover origin-centered body in local mode (and even global-mode primitives are in the local element frame after the wrapping `<g transform=translate>`). **INV3 violated.** |
| R2.3 Empty + non-invert → no-op | ✅ | Early return on no primitives + non-invert ([app/engine/core/renderer.js L1013-L1018](app/engine/core/renderer.js#L1013-L1018)). |
| R2.4 Malformed → no-op | ⚠️ | `clamp(value, 0, 100, 0)` defaults NaN to 0 ([app/engine/core/renderer.js L947-L948](app/engine/core/renderer.js#L947-L948)) → renders a primitive at corner instead of dropping it. Selection rect with zero w/h still emits `<rect width="0" height="0">`. No crash, but produces a misleading primitive. |
| R2.5 No cross-element bleed | ⚠️ | Direct mask scope is per element. **However** `layerMaskRegistry`/`resolveClipMaskBody` lets overlay `clip.targetName` reference another element’s **world body** ([app/engine/core/renderer.js L915-L935](app/engine/core/renderer.js#L915-L935), registry written at [L1360](app/engine/core/renderer.js#L1360)). The stored body is `worldBody = translate(x y) rotate(r) body` — but it is consumed inside *another* element’s already-transformed group → **double transform**, leading to overlay clip artifacts that look like cross-element mask leakage. |

## R3 — Effect propagation

| ID | Status | Evidence |
|---|---|---|
| R3.1 Overlay clipped to silhouette | ⚠️ | `visibleOverlayMarkup` wraps overlays in `<g mask="url(elementMaskId)">` only when `elementMaskDef.active` ([app/engine/core/renderer.js L1252-L1255](app/engine/core/renderer.js#L1252-L1255)). Wiring is correct in principle, but the broken mask region (R2.2) makes it useless or destructive. |
| R3.2 Drop shadow follows silhouette | ⚠️ | `dropShadow.body = silhouetteBody` via `resolveLayerControllerSources` ([app/engine/core/renderer.js L1095-L1115](app/engine/core/renderer.js#L1095-L1115)). Wiring correct; depends on silhouette being correct. |
| R3.3 Depth follows silhouette | ⚠️ | Same routing as R3.2; same dependency. |
| R3.4 Stroke clipped to surviving body | ✅ | Inherits from masked `<g>` wrapping. |
| R3.5 New cut-edge stroke | ❌ | Not implemented. Out of v1 scope. |

## R4 — Editor preview parity

| ID | Status | Evidence |
|---|---|---|
| R4.1 Preview = renderer output | ⚠️ | Preview overlay paints strokes in canvas % using `selectedMaskLocalToCanvasPoint` for display ([app/src/ParametricPage.tsx L4244-L4248](app/src/ParametricPage.tsx#L4244-L4248)). Renderer uses local % mapped into local frame. Different math → drift, especially for rotated elements. |
| R4.2 Global guides toggle never crashes | ❌ | `globalMaskGuideStrokes` IIFE at [app/src/ParametricPage.tsx L4019-L4051](app/src/ParametricPage.tsx#L4019-L4051) calls helpers declared later (`getMaskCoordinateSpace` L4101, `elementMaskLocalToCanvasPoint` L4191, `convertMaskStrokePoints` L4214). **TDZ ReferenceError** during render. |
| R4.3 Rotated/offset element preview | ⚠️ | `resolveMaskTransformForElement` honors rotation ([app/src/ParametricPage.tsx L4158-L4172](app/src/ParametricPage.tsx#L4158-L4172)), but renderer’s region/mapping bug (R2.2) means visual won’t match anyway. |

## R5 — Cross-element isolation

| ID | Status | Evidence |
|---|---|---|
| R5.1 Mask on A doesn’t alter B | ⚠️ | True for `elementMask`. False if overlay `clip.targetName` resolves to another element body (R2.5). |
| R5.2 Clip ≠ mask | ⚠️ | Architecturally separate; runtime double-transform makes them visually entangled (R2.5). |
| R5.3 Z-order independent | ✅ | Mask does not reorder. Image of "rect over bezel" is z-order, not mask. |

## R6 — Robustness

| ID | Status | Evidence |
|---|---|---|
| R6.1 No crash on any mask state | ❌ | Confirmed crash on global-guides toggle (R4.2). Otherwise OK. |
| R6.2 Debug observability | ✅ | `renderSurfaceSourceDebugByLayer` published at [app/engine/core/renderer.js L1170-L1182](app/engine/core/renderer.js#L1170-L1182). |

## R7 — Backwards compatibility

| ID | Status | Evidence |
|---|---|---|
| R7.1 Legacy global strokes render | ⚠️ | `toGlobalX/Y` map into `[0,W]` ([app/engine/core/renderer.js L946-L947](app/engine/core/renderer.js#L946-L947)) but consumed inside element-local transformed group → primitive lands relative to element origin, not canvas origin. Legacy data shifts. |
| R7.2 Schema preserved | ✅ | Only `coordinateSpace` was added; existing fields untouched. |

## Summary of failed / partial requirements

- ❌ R1.3, R2.2, R4.2, R6.1 (and R3.5 deferred).
- ⚠️ R1.1, R1.4, R2.4, R2.5, R3.1–R3.3, R4.1, R4.3, R5.1, R5.2, R7.1.
- ✅ R1.2, R1.5, R2.1, R2.3, R3.4, R5.3, R6.2, R7.2.
