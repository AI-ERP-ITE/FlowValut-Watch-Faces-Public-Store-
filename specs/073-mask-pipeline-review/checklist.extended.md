# Extended Checklist — Atomic IDs A.19+ through Z.03

Citations relative to workspace. Status: ✅ ⚠️ ❌ ❓.

## A — Enable extended

| ID | Status | Evidence |
|---|---|---|
| A.19 | ✅ | `setSelectedMaskEnabled(false)` keeps strokes ([app/src/ParametricPage.tsx L3037-L3068](app/src/ParametricPage.tsx#L3037-L3068)). |
| A.20 | ✅ | Renderer early-return when `enabled !== true` ([app/engine/core/renderer.js L1004-L1006](app/engine/core/renderer.js#L1004-L1006)). |
| A.21 | ✅ | Idempotent: function reads → writes back same shape. |
| A.22 | ⚠️ | Logic preserves coordinateSpace if hasCoordinateSpace; OK ([L3046-L3048](app/src/ParametricPage.tsx#L3046-L3048)) but only on enable, not deeper. |
| A.23 | ✅ | Spread preserves other fields. |

## B — Edit Mode extended

| ID | Status | Evidence |
|---|---|---|
| B.08 | ❌ | No explicit policy for `activeMaskStroke` on toggle off. |
| B.09 | ❌ | No abort on element switch — may strand `activeMaskStroke`. |
| B.10 | ⚠️ | Edit-mode UI state is shared, may persist across elements. |
| B.11 | ✅ | Cursor class conditional on `showMaskCanvasEditor`. |

## C — Capture extended

| ID | Status | Evidence |
|---|---|---|
| C.13 | ⚠️ | Mousemove unrestricted to canvas bounds. |
| C.14 | ❌ | No touch handlers, undocumented. |
| C.15 | ❌ | No button check on mousedown. |
| C.16 | ⚠️ | Local point clamped to `[0,100]` ([app/src/ParametricPage.tsx L4185-L4188](app/src/ParametricPage.tsx#L4185-L4188)). |
| C.17 | ✅ | `action` snapshot at mousedown. |
| C.18 | ✅ | Size/hardness/opacity captured at mousedown. |
| C.19 | ✅ | Points only `{x,y}`. |
| C.20 | ✅ | Initial point pushed at mousedown. |

## D — Renderer Mask Build extended

| ID | Status | Evidence |
|---|---|---|
| D.20 | ✅ | `allocId('mask')` per render. |
| D.21 | ✅ | `sanitizeSvgIdToken` ([app/engine/core/renderer.js L1067-L1070](app/engine/core/renderer.js#L1067-L1070)). |
| D.22 | ❌ | Region only covers canvas bbox at `(0,0)`; not body+primitive bbox union. |
| D.23 | ✅ | Rotation applied via parent transform, not in mask region. |
| D.24 | ✅ | Mask def emitted inside element’s `<defs>` ([app/engine/core/renderer.js L1217](app/engine/core/renderer.js#L1217)). |
| D.25 | ✅ | Deterministic per render (monotonic `uid`). |

## E — Mapping extended

| ID | Status | Evidence |
|---|---|---|
| E.12 | ❌ | Editor and renderer have separate mapping helpers (no shared module). |
| E.13 | ❌ | Currently `(50,50)` in local maps to `(0,0)` in element-local pixel — but mask region is `(0,0)..(W,H)`, so `(50,50)` lands at top-left corner of mask region, not center. |
| E.14 | ❌ | `(0,0)` maps to `(-W/2,-H/2)` (correct in local frame) but mask region excludes negative coords (region origin = 0). |
| E.15 | ❌ | `(100,100)` maps to `(+W/2,+H/2)` (correct) but mask region only extends to `(W,H)`, so primitive partly outside region. |
| E.16 | ⚠️ | Brush size scaling formula present but not documented as % of element. |
| E.17 | ✅ | Pure functions. |
| E.18 | ❌ | No migration before render; legacy global strokes mis-rendered. |

## F — Effect Routing extended

| ID | Status | Evidence |
|---|---|---|
| F.08 | ⚠️ | If silhouette is empty, `silhouettePath` becomes `<g mask=…>body</g>` with body invisible; downstream filter sees empty alpha — desired behavior but only because of bug, not by design. |
| F.09 | ✅ | Inactive mask routes `geometryPath`. |
| F.10 | ✅ | Cache key includes `JSON.stringify(elementMask)` ([app/engine/core/renderer.js L1027-L1031](app/engine/core/renderer.js#L1027-L1031)). |
| F.11 | ⚠️ | Per-overlay filter has its own filter region; precedence not explicitly enforced. |

## G — Overlay Clipping extended

| ID | Status | Evidence |
|---|---|---|
| G.09 | ❌ | Registry write-on-render order — forward refs return empty; no warning. |
| G.10 | ⚠️ | `inheritPrevious` falls back to fallbackBody, not crash. |
| G.11 | ✅ | Self-target fallback ([app/engine/core/renderer.js L924-L926](app/engine/core/renderer.js#L924-L926)). |
| G.12 | ❌ | Body stored in source-world frame, consumed in consumer-local frame → double transform. |

## H — Element Mask vs Overlays extended

| ID | Status | Evidence |
|---|---|---|
| H.04 | ⚠️ | Mask wraps overlays but body is also independently rendered with mask via silhouettePath; layered correctly. |
| H.05 | ✅ | `filterInputBody = silhouette body`. |
| H.06 | ⚠️ | `<filter x="-25% y="-25%" width=150% height=150%">` allows 25% bleed; usually fine. |

## I — Editor Preview extended

| ID | Status | Evidence |
|---|---|---|
| I.07 | ✅ | `selectedMaskLocalToCanvasPoint` rotation-aware. |
| I.08 | ⚠️ | Color/style of preview overlay similar to render; may confuse. |
| I.09 | ✅ | React key on element + mask data. |
| I.10 | ✅ | Conditional render on `selectedPanelTarget === 'element'`. |
| I.11 | ❌ | Not derived from shared helper. |

## J — Global Guides extended

| ID | Status | Evidence |
|---|---|---|
| J.10 | ✅ | Overlay only. |
| J.11 | ❌ | TDZ crash before this matters. |
| J.12 | ❌ | Same crash. |
| J.13 | ⚠️ | Mapping rotation-aware; but only renders if no crash. |
| J.14 | ⚠️ | Color set in code; verify hide=red, reveal=green or similar. |
| J.15 | ⚠️ | Need to confirm `pointer-events: none` on overlay SVG. |

## K — Migration extended

| ID | Status | Evidence |
|---|---|---|
| K.06 | ✅ | `ensureSelectedMaskLocalCoordinateSpace` checks `space === 'local'` and skips. |
| K.07 | ✅ | Per-stroke conversion. |
| K.08 | ❌ | Runs lazily on first paint, not load-time. |
| K.09 | ❌ | No log/audit. |
| K.10 | ⚠️ | Migrates all strokes at once when triggered, even if partially local. |

## L — Robustness extended

| ID | Status | Evidence |
|---|---|---|
| L.07 | ⚠️ | `mask` array with `typeof === 'object'` passes; downstream `mask.strokes` array OK; mask.enabled would be undefined → inactive. |
| L.08 | ✅ | Filter on `entry && typeof === 'object'`. |
| L.09 | ✅ | brush defaulted on enable. |
| L.10 | ✅ | sanitization. |
| L.11 | ❌ | No cap on points. |
| L.12 | ✅ | Sanitizer collapses non-ASCII. |

## M — Cross-Element Isolation extended

| ID | Status | Evidence |
|---|---|---|
| M.05 | ✅ | Cache key includes element-specific data. |
| M.06 | ✅ | Removing element drops its render entry; cache by `localId` may stale but no DOM leak. |
| M.07 | ✅ | New `localId` for new instance allocates new mask id. |
| M.08 | ✅ | z-order independent. |

## N — Backwards Compat extended

| ID | Status | Evidence |
|---|---|---|
| N.05 | ✅ | `resolveMaskCoordinateSpace` accepts both. |
| N.06 | ⚠️ | Writes `'local'` only on appendStroke; not enforced on enable. |
| N.07 | ✅ | Spread merge in setSelectedMaskEnabled. |

## O — Observability extended

| ID | Status | Evidence |
|---|---|---|
| O.04 | ⚠️ | Debug log includes elementId, transform, coordinateSpace, maskId — missing region attrs and silhouette length. |
| O.05 | ❌ | No assertion mode. |
| O.06 | ✅ | No throws in current code. |

## P — Validation extended

| ID | Status | Evidence |
|---|---|---|
| P.06 | ❌ | No test exists. |
| P.07 | ❌ | No test. |
| P.08 | ❌ | No test. |
| P.09 | ❌ | No test. |
| P.10 | ❌ | No test. |

## Q — Performance

| ID | Status | Evidence |
|---|---|---|
| Q.01 | ✅ | Linear in points. |
| Q.02 | ✅ | Cache key includes mask JSON. |
| Q.03 | ✅ | Time tick re-render cache hit (mask unchanged). |
| Q.04 | ✅ | No allocation explosion. |
| Q.05 | ✅ | SVG output bounded. |

## R — Determinism

| ID | Status | Evidence |
|---|---|---|
| R.01 | ✅ | Pure functions over input. |
| R.02 | ✅ | Monotonic `uid`. |
| R.03 | ✅ | Cache returns identical structure. |

## S — Sanitization

| ID | Status | Evidence |
|---|---|---|
| S.01 | ✅ | sanitizer present. |
| S.02 | ✅ | Numeric coords only. |
| S.03 | ⚠️ | Need to verify React preview doesn’t HTML-inject user names; current code uses props, OK. |

## T — Multi-Element

| ID | Status | Evidence |
|---|---|---|
| T.01 | ✅ | Per-element scope. |
| T.02 | ⚠️ | Each works individually but both depend on D.13 fix. |
| T.03 | ❌ | Uses pre-mask `worldBody`; documented decision needed. |
| T.04 | ❌ | Registry overwrite silent on duplicate names. |

## U — Symmetry

| ID | Status | Evidence |
|---|---|---|
| U.01 | ✅ | Cache by signature. |
| U.02 | ✅ | `localId = el-${elementIndex}-${positionIndex}`. |
| U.03 | ⚠️ | Each instance’s rotation comes from positions[].rotation; mapping OK once D.13 fixed. |

## V — Save / Load

| ID | Status | Evidence |
|---|---|---|
| V.01 | ✅ | strokes preserved verbatim. |
| V.02 | ❌ | No load-time migration hook. |
| V.03 | ❌ | Round-trip will diverge if migration runs lazily. |

## W — Export

| ID | Status | Evidence |
|---|---|---|
| W.01 | ❓ | Export policy for mask in zpk not audited here. |
| W.02 | ✅ | SVG defs are inline in `<g>`. |

## X — Undo / Redo

| ID | Status | Evidence |
|---|---|---|
| X.01 | ✅ | `updateTemplateElements` is undo-tracked. |
| X.02 | ✅ | Strokes restored. |
| X.03 | ✅ | Redo reapplies. |
| X.04 | ✅ | Enable change is one undo step. |
| X.05 | ❓ | Element switch undo behavior not audited. |

## Y — Accessibility

| ID | Status | Evidence |
|---|---|---|
| Y.01 | n/a | Out of scope. |
| Y.02 | ✅ | Numeric input for size. |
| Y.03 | ❓ | Color choices not audited. |

## Z — Lifecycle

| ID | Status | Evidence |
|---|---|---|
| Z.01 | ⚠️ | Cache key includes localId; stale entries possible but harmless on next render. |
| Z.02 | ⚠️ | No explicit cache reset on template switch. |
| Z.03 | ✅ | Vite HMR drops module state. |

---

## New Hard Failures (extended)

- B.08, B.09 — abort policy missing.
- C.13, C.14, C.15 — input edge cases.
- D.22 — region not body+primitive bbox.
- E.12, E.13–E.15, E.18 — mapping shared helper + canonical mapping.
- G.09, G.12 — overlay clip ordering / frame.
- I.11 — preview/render shared helper.
- J.11, J.12 — guides crash regardless of state.
- K.08, K.09 — load-time migration missing.
- L.11 — point cap missing.
- O.05 — assertion mode missing.
- P.06–P.10 — full validation harness missing.
- T.03, T.04 — multi-element clip semantics undefined.
- V.02, V.03 — round-trip / load-time migration missing.
