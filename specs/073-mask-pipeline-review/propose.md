# Propose — Fix and Redesign Options

Three tracks. Each one is internally consistent. Pick one.

Numbering uses the divergence IDs from `comparison.md` (D1–D6).

---

## Option 1 — Surgical fix (smallest diff, keeps current architecture)

**Goal:** make current pipeline correct without redesign.

### Changes

1. **Mask region origin-centered** (fixes D1). [renderer.js L1003-L1018](app/engine/core/renderer.js#L1003-L1018)
   - Region: `x=-W/2 y=-H/2 width=W height=H`.
   - Base rect uses same origin/size.
2. **Coordinate-space normalization** (fixes D5).
   - `toLocalX/Y` unchanged.
   - `toGlobalX/Y` rewritten to also map `[0,100]` into the **element-local origin-centered** frame: `((v/100)*W) - W/2`. Legacy strokes will drift slightly (toward element center) but render predictably.
3. **NaN-safe primitives** (fixes D3).
   - Replace `clamp(value, 0, 100, 0)` defaults with explicit `null` propagation; drop primitives whose mapped points are not finite.
4. **TDZ fix** (fixes D2). [ParametricPage.tsx L4019-L4051](app/src/ParametricPage.tsx#L4019-L4051)
   - Move `globalMaskGuideStrokes` IIFE below `convertMaskStrokePoints`.
5. **Defer overlay-clip double-transform (D4)** behind a feature gate or fix in a follow-up spec.

### Pros
- ~80 LOC total. Low risk.
- No data migration.
- All effect routing already correct, just becomes alive once silhouette is right.

### Cons
- Legacy `'global'` strokes shift on first re-render.
- Preview/renderer math still maintained in two places (D6 latent).
- Overlay clip cross-element bug still there (D4) but unrelated to mask scope.

### Risk: Low.

---

## Option 2 — Contract-tightening refactor (medium diff)

**Goal:** lock invariants in code so future regressions are impossible.

### Changes
- Everything in Option 1, plus:
- Introduce a single helper module `app/engine/core/maskFrame.js` exporting:
  - `getElementMaskFrame(layoutMetrics)` → `{originX, originY, width, height, mapPoint(p)}`.
  - Used by **both** the renderer and the editor preview (via a thin TS shim).
- Convert `coordinateSpace` from runtime branching to a one-shot **load-time normalizer**:
  - Editor: on document open, walk elements, convert `'global'` strokes to local using the same helper as canvas-pointer→local. Rewrite `coordinateSpace:'local'` and drop the branch from renderer.
- Add `renderSurfaceSourceDebug` validation: when `mask.enabled && primitives.length>0`, assert at runtime (debug builds only) that `silhouettePath` is non-empty.
- Add per-element bbox assertion (development only): `region.contains(body.bbox)` warning.

### Pros
- One source of truth for coordinate math → preview = render guaranteed.
- Renderer simplifies (no `coordinateSpace` branch).
- Self-validating in dev.

### Cons
- Editor must touch each element on load (one-time cost).
- More files to change (~3).
- Requires Q1.b decision.

### Risk: Medium.

---

## Option 3 — Mask redesign as "Composable Silhouette Layer"

**Goal:** treat mask as a first-class compositing stage, separate from per-element overlay clip, with explicit semantics.

### Changes
- New element-level subtree:
  ```
  <g element>
    <defs> elementMask, effects, overlay defs </defs>
    <g geometry-frame transform="translate(x,y) rotate(r)">
      <g mask="url(elementMask)">
        body
        overlays
      </g>
    </g>
  </g>
  ```
  - Single mask wraps body + overlays inside the element’s transform.
  - No more `silhouettePath` vs `geometryPath` split for downstream filters; filters point at the whole `<g mask>` group.
- Mask object schema:
  ```ts
  mask: {
    enabled: boolean,
    invert: boolean,
    operations: Array<MaskOp>   // ordered hide/reveal ops
  }
  type MaskOp =
    | { kind:'brushPath', points, size, opacity, action }
    | { kind:'shape', shape:'rect'|'circle'|'oval'|'polygon', geom, action }
  ```
  - One canonical local-frame coordinate system. No `coordinateSpace`.
- `clip.targetName` overlay-clip removed from this spec; reintroduced later as `overlay.clipToElement` with a clearly-defined frame contract (or removed entirely if unused).
- Editor preview is the engine renderer at low resolution, on every mask change (debounced).

### Pros
- Single coordinate frame. No drift. No runtime branching.
- Schema clean and forward-compatible.
- Preview = render by construction.

### Cons
- Schema migration: existing `mask.strokes` → `mask.operations`. Needs a one-shot script over saved templates.
- Larger blast radius; touches editor mask UI plumbing.
- Some lost flexibility (cross-element clip removed until redesigned).

### Risk: High (more code, more migration), but lowest long-term complexity.

---

## Comparison matrix

| Criterion | Option 1 | Option 2 | Option 3 |
|---|---|---|---|
| Effort | S | M | L |
| Risk | Low | Med | High |
| Fixes D1 | ✅ | ✅ | ✅ |
| Fixes D2 | ✅ | ✅ | ✅ |
| Fixes D3 | ✅ | ✅ | ✅ |
| Fixes D4 | ❌ (deferred) | ⚠️ (gated) | ✅ (removed/reframed) |
| Fixes D5 | ⚠️ shifts | ✅ migrate | ✅ |
| Fixes D6 | ❌ | ✅ shared helper | ✅ engine preview |
| Schema migration needed | No | No | Yes |
| Time to deploy | Same day | Few days | Multi-step |
| Future-proof | Low | Medium | High |

---

## Recommendation

**Two-step plan:**

1. **Now:** Option 1 to stop the bleeding (D1, D2, D3 fixed; D5 acceptable shift; restores the contract enough for tiny strokes, effects propagation, and guides toggle).
2. **Next spec:** Option 2 to harden invariants (shared helper, one-shot legacy migration, debug assertions). Resolves D5 cleanly and prevents future drift.
3. **Later (only if needed):** Option 3 if user wants schema-clean masks + cross-element compositing redesign.

This recommendation depends on Q1, Q2, Q5 from `clarify.md`. Default answers (Q1.a + load-time migrate, Q2.a, Q5.a TBD/probably unused) make the two-step plan viable.
