# Requirements (Extended Atomic Steps) — Mask Pipeline

Extends `requirements.detailed.md` with finer-grained steps and additional stages (Q–Z).
Each ID is independently checkable. New IDs are additive (no renumbering of A–P).

---

## A — Mask Enable (extended)

- A.19 Toggling enable OFF must keep `mask.strokes` intact (no destructive clear).
- A.20 Toggling enable OFF must remove the rendered `<mask>` def (renderer returns inactive).
- A.21 Toggling enable ON twice (idempotent) must not duplicate strokes.
- A.22 Enable on element with pre-existing `coordinateSpace:'global'` must NOT silently coerce to `'local'` (only a deliberate migration may rewrite).
- A.23 Enable must not alter `element.placement`, `element.params`, or any other element field.

## B — Edit Mode (extended)

- B.08 Switching edit mode OFF must persist the current `activeMaskStroke` if any (or discard it deterministically — pick one and document).
- B.09 Switching to a different element while painting must abort `activeMaskStroke` (no leak to the new element).
- B.10 Edit mode must be scoped per-element; switching elements resets edit-mode UI state.
- B.11 Disabling edit mode must clear cursor crosshair.

## C — Brush Stroke Capture (extended)

- C.13 Pointer events outside canvas bounds during a drag must be ignored (no extrapolated points).
- C.14 Touch events must be supported (or explicitly out of scope; pick one).
- C.15 Right-click / middle-click must NOT begin a stroke.
- C.16 If pointer goes outside element bbox during a stroke, points are still captured in element-local coords (clamped or not — pick one and document).
- C.17 Stroke `action` (hide/reveal) is captured at mousedown and locked for the stroke duration.
- C.18 Stroke `size`/`hardness`/`opacity` snapshot at mousedown (later UI changes don’t mutate in-progress stroke).
- C.19 Each captured point object is `{x:number, y:number}`; no extra fields, no `null`s.
- C.20 First and last point are always present even if user clicks without moving.

## D — Renderer Mask Build (extended)

- D.20 `<mask>` element must use unique `id` per element instance (no collisions across elements).
- D.21 `<mask>` ids must be SVG-safe (sanitized).
- D.22 Region must include the union of: body bbox + any primitive bbox in the same frame.
- D.23 Region must NOT depend on element rotation (rotation is applied via parent `<g transform>`, not via mask region).
- D.24 Mask def must be inside the element’s `<defs>` (locally scoped, not in document-level defs) to avoid cross-element ID collisions in cached renders.
- D.25 Mask def must be deterministic given the same input (no randomness in id generation across re-renders of identical input — note: current `allocId` is monotonic per render, OK).

## E — Coordinate Mapping (extended)

- E.12 Helper `mapPoint(p)` should be a single function shared between authoring (canvas→local) and rendering (local→pixel) inverses.
- E.13 Local coord `(50,50)` MUST map to element center pixel.
- E.14 Local coord `(0,0)` MUST map to element top-left in local frame (`-W/2,-H/2`).
- E.15 Local coord `(100,100)` MUST map to element bottom-right (`+W/2,+H/2`).
- E.16 Brush `size` semantic units must be documented (currently `[0,9999]/5.2 * scale`); should be expressed in element-local % of `min(W,H)`.
- E.17 Mapping must be pure (no side effects, no rounding that changes monotonicity).
- E.18 Mapping must accept legacy `'global'` mode and map `(50,50)` → element center too (not canvas center) when used inside element-local frame, OR migration must run before render.

## F — Effect Routing (extended)

- F.08 If `silhouettePath` is empty (no body left after mask), all dependent effects must render NOTHING — not garbage, not full-canvas overlays.
- F.09 If mask is inactive, effects must consume `geometryPath` indistinguishable from pre-mask behavior.
- F.10 Switching mask on/off must produce a re-render with no stale cached silhouette (cache key includes mask JSON).
- F.11 Per-overlay filter (blur, etc.) must apply AFTER overlay clip mask, not before, to avoid blur leaking past mask edge.

## G — Overlay Clipping (extended)

- G.09 If `clip.targetName` resolves to an element rendered LATER, the registry lookup returns empty body (registry is write-on-render order). Decide: error, fallback, or document the ordering constraint.
- G.10 If `clip.inheritPrevious` true and there is no previous element, fallback must be no-op (not crash, not full-canvas).
- G.11 Self-targeting clip (`targetName === currentElementName`) must fallback gracefully ([renderer.js L924-L926](app/engine/core/renderer.js#L924-L926) — current code does this).
- G.12 Overlay clip mask body must be expressed in the consumer element’s coordinate frame (not source element’s world frame) to avoid double-transform.

## H — Element Mask vs Overlays (extended)

- H.04 Element mask wrap must be applied to the entire effect+overlay group, not just overlays, when the user expects "element + its decorations" to all be clipped.
- H.05 Filter (`<filter>`) input must be the post-mask silhouette; current pipeline already does this via `silhouettePath` routing.
- H.06 Filter must not extend the visible area beyond mask + filter region. (Edge bleeding from blur/dilate is bounded by `<filter>` region attrs.)

## I — Editor Preview (extended)

- I.07 Preview overlay must transform with the element (rotation + offset).
- I.08 Preview opacity should reflect stroke opacity but be visually distinct from "real" rendered output (e.g., dashed outline) to avoid confusion.
- I.09 Preview must update on any mask data change (React re-render keyed off element identity + mask serial).
- I.10 Preview must clear when element deselected.
- I.11 Preview MUST be derived via the same `mapPoint` helper as the renderer (single source of truth).

## J — Global Mask Guides (extended)

- J.10 Toggle must not affect rendering output, only overlay UI.
- J.11 Toggle must work even when no element is selected.
- J.12 Toggle must work even when zero elements have masks (renders empty overlay).
- J.13 Guides for rotated elements must be rotated to match.
- J.14 Guides must be color-coded by hide/reveal action.
- J.15 Guides must not leak pointer events (overlay must be `pointer-events: none`).

## K — Migration (extended)

- K.06 Migration must be idempotent (running twice produces same result).
- K.07 Migration must be per-stroke, not whole-element (preserve other element fields).
- K.08 Migration must run on document load, not lazily on first paint.
- K.09 Migration must log/record what was migrated for audit.
- K.10 Templates with mixed local+global strokes (rare) must migrate global only.

## L — Robustness (extended)

- L.07 No crash if `element.mask` is an array (wrong type).
- L.08 No crash if `mask.strokes[i]` is `null`.
- L.09 No crash if `mask.brush` missing entirely.
- L.10 No crash if SVG mask id collides (sanitization defends).
- L.11 No infinite loop on huge strokes (`points.length > 10000` should be capped or warned).
- L.12 No crash on Unicode element names (sanitizer defends id token).

## M — Cross-Element Isolation (extended)

- M.05 Mask cache for element A must key off element A’s data only.
- M.06 Removing element A must not leave dangling mask defs in the DOM/output.
- M.07 Duplicating an element copies the mask but allocates new mask id.
- M.08 Reordering elements changes z-order but not mask outcome.

## N — Backwards Compatibility (extended)

- N.05 Read schema must accept old `coordinateSpace` values: `'global'`, `'local'`, missing.
- N.06 Write schema must always emit one canonical value (`'local'`) post-migration.
- N.07 Old `mask.brush` shapes (with extra fields) must be normalized, not rejected.

## O — Observability (extended)

- O.04 Debug log must include: elementId, maskId, region attrs, primitive count, silhouette body length.
- O.05 A dev-only assertion mode must throw if INV3 is violated.
- O.06 Production mode must never throw; assertion only in dev/test.

## P — Validation (extended)

- P.06 Snapshot test for `<mask>` region attrs (origin, w, h).
- P.07 Snapshot test for tiny brush stroke (1 point) → primitive count == 1, polyline width small.
- P.08 Property test: malformed point objects → 0 primitives, no exception.
- P.09 Visual diff test: rotated rect with hide stroke → silhouette pixel area approx body area minus brush footprint.
- P.10 Live-route smoke test: load `?p=/studio/parametric`, enable mask, paint stroke, expect element still visible.

---

## Q — Performance

- Q.01 Mask def build per element per render: O(strokes * pointsPerStroke).
- Q.02 Cache key includes mask JSON, so unchanged masks reuse silhouette.
- Q.03 Re-render on text/time tick must not re-compute mask defs (cache hit).
- Q.04 Mask defs must not allocate beyond input proportional memory.
- Q.05 SVG output size must remain bounded (no exponential growth from mask wrapping).

## R — Determinism

- R.01 Same input + same context → byte-identical SVG output.
- R.02 Mask id allocation deterministic per render pass (monotonic counter).
- R.03 Cache hit produces identical strings to cache miss.

## S — Security / Sanitization

- S.01 Element name → id token sanitized to `[a-zA-Z0-9_-]+` ([renderer.js L1067-L1070](app/engine/core/renderer.js#L1067-L1070)).
- S.02 No raw user strings injected into SVG without escaping (mask uses computed numbers; OK).
- S.03 No `dangerouslySetInnerHTML` of mask data in editor preview without escape.

## T — Multi-Element Scenarios

- T.01 Element A masked + Element B unmasked → B unaffected.
- T.02 Element A masked + Element B masked → both render correctly, independent.
- T.03 Element A masked + Element B has `clip.targetName=A` → B’s overlay clipped to A’s **post-mask** silhouette OR A’s **pre-mask** body — pick one and document. (Current: pre-mask via `worldBody`.)
- T.04 Two elements with the same `name` → registry collision; second overwrites first. Document or warn.

## U — Symmetry / Repeat

- U.01 Element with symmetry (`positions[]` > 1) — mask def is reused per position via cache (signature based on body+mask+layout).
- U.02 Each symmetric instance gets a unique mask id (counter-allocated).
- U.03 Mask local-coord points map identically into each instance’s local frame (rotation-aware).

## V — Save / Load Round-Trip

- V.01 Saving template preserves mask.strokes verbatim.
- V.02 Loading template applies migration (Q1.b) before first render.
- V.03 Round-trip equality: load → save without edits produces identical (or migrated-canonical) JSON.

## W — Export

- W.01 Generated `.zpk` / engine output may not need mask info if rasterized; pick policy.
- W.02 If exporting SVG, mask defs must be self-contained (no document-level dependencies).

## X — Undo / Redo

- X.01 Each `appendSelectedMaskStroke` is one undo step.
- X.02 Undo restores previous strokes array exactly.
- X.03 Redo re-applies stroke deterministically.
- X.04 Undo of "enable mask" restores prior `mask.enabled` and `coordinateSpace`.
- X.05 Undo across element switches still navigates to the correct element.

## Y — Accessibility / Input

- Y.01 Keyboard-only mask painting is out of scope (or document if required).
- Y.02 Brush size adjustable via numeric input (already present).
- Y.03 Color-blind safe overlay color choices for guides.

## Z — Lifecycle / Teardown

- Z.01 Removing element must remove its mask entry from any caches.
- Z.02 Switching template must reset all mask caches.
- Z.03 Hot reload (Vite dev) must not leak stale mask defs.
