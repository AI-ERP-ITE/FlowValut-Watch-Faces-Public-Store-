# Tasks — Spec 074 Mask Pipeline Surgical Fix

**STATUS: ✅ COMPLETED & DEPLOYED LIVE (May 4, 2026)**
- Live bundle: `index-BMKIVjr9.js` on https://ai-erp-ite.github.io/Watch-Faces/
- Commit: `5b69e51` on `main`
- Tests: maskFrame 15/15, maskRegression 11/11
- Live verification by user: PASSED for old (migrated) masks
- ⚠️ Follow-up bug discovered for newly-created masks → see Spec 075

Execution one-by-one. Each task ends with verification before next starts.

## T1 — Add shared coordinate helper

**File:** `app/src/lib/maskFrame.ts` (new), and a parallel `app/engine/core/maskFrame.js` (CommonJS-compatible re-export).

- T1.1 Create `getMaskFrame(layoutMetrics) → { width, height, originX:-W/2, originY:-H/2 }`.
- T1.2 Create `mapLocalPointToFrame({x,y}, frame) → { px, py }` mapping `[0,100]→[-W/2,+W/2]` with NaN-safe `null` propagation.
- T1.3 Create `mapCanvasPointToLocal({xPct,yPct}, elementTransform) → {x,y}` (rotation-aware, identical to current `canvasToElementMaskLocalPoint`).
- T1.4 Create `mapLocalPointToCanvas({x,y}, elementTransform) → {xPct,yPct}` (inverse).
- T1.5 Pure functions, no side effects, no imports outside math.

**Acceptance:** unit test on the helper (3 cases: center, top-left corner, rotated 45°).

## T2 — Renderer: origin-centered mask region

**File:** `app/engine/core/renderer.js`.

- T2.1 Replace `buildElementMaskDef` mask region attrs to `x="-W/2" y="-H/2" width="W" height="H"`.
- T2.2 Replace base `<rect>` attrs to match same origin/size.
- T2.3 Keep `enabled !== true` early-return.
- T2.4 Keep no-primitives + non-invert early-return.
- T2.5 Add region attrs into `context.maskDebug` log (O.04).

**Acceptance:** `app/scripts/test/maskRegression.test.mjs` snapshot test on region attrs.

## T3 — Renderer: NaN-safe primitives

**File:** `app/engine/core/renderer.js` `buildElementMaskPrimitives`.

- T3.1 Replace `clamp(value, 0, 100, 0)` defaults with explicit `Number.isFinite` check + `null` propagation per coordinate.
- T3.2 Drop primitives whose mapped point is null.
- T3.3 Drop selection rect with `w<=0 || h<=0`.
- T3.4 Keep free polygon `length>=3`, polyline `length>0` guards.
- T3.5 Cap stroke points at 10000 (warn in dev when > 5000).

**Acceptance:** property test in `maskRegression.test.mjs`: malformed strokes → 0 primitives, no exception.

## T4 — Renderer/editor: use shared helper for mapping

**Files:** `app/engine/core/renderer.js`, `app/src/ParametricPage.tsx`.

- T4.1 Replace inline `toLocalX/Y`, `toGlobalX/Y` in renderer with calls to `mapLocalPointToFrame`.
- T4.2 For legacy `'global'` mode, route through `mapLegacyGlobalPointToLocal` (a one-off helper that maps `[0,100]` canvas-space → element-local `[0,100]` using a known element transform); but in v1, just convert `'global'` to `'local'` at the renderer boundary by treating `(50,50) = element center` (matches new contract).
- T4.3 Replace `canvasToElementMaskLocalPoint` body with a call to `mapCanvasPointToLocal`.
- T4.4 Replace `elementMaskLocalToCanvasPoint` body with a call to `mapLocalPointToCanvas`.

**Acceptance:** preview overlay and renderer agree visually on a rotated element (manual screenshot).

## T5 — Editor: TDZ fix for global mask guides

**File:** `app/src/ParametricPage.tsx`.

- T5.1 Move `globalMaskGuideStrokes` IIFE definition immediately AFTER the last helper it depends on (`convertMaskStrokePoints`).
- T5.2 No semantic change.

**Acceptance:** toggle global mask guides on with at least one masked element. No crash.

## T6 — Editor: load-time migration

**File:** `app/src/ParametricPage.tsx`.

- T6.1 Add `useEffect` on `workingTemplate` identity change → walk all elements, run `ensureMaskCoordinateSpaceLocal(element)` (extracted helper).
- T6.2 Migration is per-element, idempotent.
- T6.3 Migration uses shared `mapCanvasPointToLocal`.
- T6.4 Migration logs to console.debug for audit (O.06 — dev only).

**Acceptance:** load a legacy template (synthetic with `coordinateSpace:'global'`); confirm strokes rewritten to local on first render.

## T7 — Editor: stroke abort policy

**File:** `app/src/ParametricPage.tsx`.

- T7.1 On element switch (selectedElement.id change), set `activeMaskStroke = null`, `activeMaskSelectionShape = null`, `isMaskPainting = false`.
- T7.2 On edit-mode toggle off, same reset.
- T7.3 Document policy in code comment.

**Acceptance:** start a stroke, switch element mid-drag — no leak to new element.

## T8 — Validation harness

**File:** `app/scripts/test/maskRegression.test.mjs` (new).

- T8.1 Test: empty mask → no `<mask>` def emitted.
- T8.2 Test: enabled mask + 0 strokes + invert false → no def.
- T8.3 Test: tiny hide stroke (1 polyline, 2 points) → exactly 1 polyline primitive in def.
- T8.4 Test: malformed point `{x:'x',y:null}` → 0 primitives, no throw.
- T8.5 Test: mask region attrs `x = -W/2`, `y = -H/2`.
- T8.6 Test: invert true + 0 strokes → active def with all-black region.
- T8.7 Snapshot: serialized SVG for known scenario stays stable across runs.

**Acceptance:** all tests pass.

## T9 — Build + local verify

- T9.1 `cd app && npm run build`.
- T9.2 Verify build exit 0.
- T9.3 Search new `dist/assets/index-*.js` for `"layerMask-"` and confirm origin-centered region literal present.

**Acceptance:** unique build hash in `dist/`, presence check pass.

## T10 — Deploy to docs

- T10.1 `Copy-Item dist/assets/* docs/assets/ -Force`.
- T10.2 `Copy-Item dist/index.html docs/index.html -Force`.
- T10.3 `Copy-Item dist/index.html docs/studio/index.html -Force`.
- T10.4 Remove old hashed assets from `docs/assets/`.

**Acceptance:** both `docs/index.html` and `docs/studio/index.html` reference identical new asset hashes.

## T11 — Commit + push

- T11.1 `git add app/src app/engine app/scripts/test app/specs/074-* app/docs`.
- T11.2 Commit message: `Spec 074: surgical mask region + NaN-safe + TDZ fix + migration`.
- T11.3 `git push origin main`.

**Acceptance:** push succeeds, GitHub Pages picks up new bundle.

## T12 — Live verification

- T12.1 Hard refresh `https://ai-erp-ite.github.io/Watch-Faces/?p=/studio/parametric`.
- T12.2 Add rect element, give it texture + depth + drop shadow.
- T12.3 Enable mask, paint tiny hide stroke near center.
- T12.4 Confirm: only brushed area hidden, texture/depth/shadow follow new silhouette.
- T12.5 Toggle global mask guides — no crash.
- T12.6 Save template, reload, confirm mask renders identically (round-trip).

**Acceptance:** screenshots collected; all behaviors match the contract.

## Rollback

If T12 fails:
- Revert last commit: `git revert HEAD`.
- Redeploy previous `docs/` from `git checkout HEAD~1 -- docs/`.
- File a follow-up under Spec 074 with failing scenario.
