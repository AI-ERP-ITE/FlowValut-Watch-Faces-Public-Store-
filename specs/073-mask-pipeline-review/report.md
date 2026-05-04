# Report — Mask Pipeline Review (Spec 073)

**Status:** Audit complete. No code changed.
**Inputs:** [requirements.md](./requirements.md), [checklist.md](./checklist.md), [comparison.md](./comparison.md), [clarify.md](./clarify.md), [propose.md](./propose.md).

---

## TL;DR

The mask pipeline architecture in this repo is **mostly correct** — the wiring between mask, silhouette, filters, and overlays is sound. There is **one structural bug** at the heart of the system that makes everything downstream look broken in random ways, **one editor bug** that crashes the page on a guides toggle, and **one unrelated bug** in a different feature (`overlay.clip.targetName`) that visually mimics cross-element mask leakage.

| Tier | Bug | Effect |
|---|---|---|
| Critical | **Mask region origin mismatch (D1)** | Tiny stroke deletes whole element OR does nothing. Effects look broken because they depend on a wrong silhouette. |
| High | **TDZ in `globalMaskGuideStrokes` (D2)** | Page crash on guides toggle. |
| Medium | **NaN-tolerant clamp produces ghost primitives (D3)** | Random black artifacts on bad data. |
| Medium | **Double-transform in overlay clip (D4)** | Other elements appear punched in mask-like shapes. Wrongly attributed to mask. |
| Low | **Legacy `'global'` strokes shift in element-local frame (D5)** | Old templates render off-position. |
| Low | **Preview math diverges from renderer math (D6)** | What you paint isn’t what you get, especially under rotation. |

---

## Why prior fix attempts kept failing

Each previous attempt (≥15 trials per user) tried to address a *symptom*:

- "tiny stroke hides whole element" → patch the stroke math.
- "rotation off" → patch rotation handling.
- "preview drifts" → patch the preview.
- "page crashes" → patch the IIFE.
- "global guide does the wrong thing" → patch the guide.

None of them fixed **D1** (the region/frame mismatch), so every "fix" recreated the same downstream chaos in a different shape. Once D1 is fixed, D3 and D5 become trivial; D2 is unrelated and a one-line move; D4 is a separate feature bug.

This is why the overall picture looked unfixable: the contract was never restated and re-enforced, only individual code paths were patched.

---

## Root causes (definitive)

1. **Frame contract violation in `buildElementMaskDef`.** Mask region uses canvas-origin `(0,0)` while element body lives in an origin-centered local frame. SVG masks treat outside-region pixels as alpha=0 → silhouette is empty → all downstream effects (texture, gradient, material, depth, drop shadow) inherit the broken silhouette and look broken in their own way.
   - Location: [app/engine/core/renderer.js L1003-L1018](app/engine/core/renderer.js#L1003-L1018).
   - Invariant violated: INV3 (mask region must be a superset of body bbox in same frame).

2. **TDZ in `globalMaskGuideStrokes` IIFE.** Helper consts declared after the IIFE that uses them.
   - Location: [app/src/ParametricPage.tsx L4019-L4051](app/src/ParametricPage.tsx#L4019-L4051) (declared) vs L4101 / L4191 / L4214 (helpers).

3. **Double-transform in `resolveClipMaskBody` consumer.** `worldBody` (already transformed) is rendered inside another element’s already-transformed group → overlay clipping lands offset/rotated. Looks like cross-element mask leakage; isn’t.
   - Location: registry write [app/engine/core/renderer.js L1356-L1361](app/engine/core/renderer.js#L1356-L1361); consumption inside `<g transform=translate rotate>` of another element ([app/engine/core/renderer.js L1129-L1258](app/engine/core/renderer.js#L1129-L1258)).

4. **Legacy `'global'` runtime branch left in place.** Two coordinate spaces interpreted at render time → 50/50 chance of being wrong in one of them after any change.
   - Location: [app/engine/core/renderer.js L946-L952](app/engine/core/renderer.js#L946-L952).

5. **Preview overlay and renderer share no coordinate helper.** Their math is independently maintained → drift.

---

## What works today (do NOT touch)

- Per-instance unique mask IDs (`buildLayerMaskBaseId`).
- Silhouette caching by signature.
- Routing of `silhouettePath` into styleFx / depthFx / dropShadow / globalLight (architecture is exactly what the user wants for "effects follow the new shape").
- `<g mask="url(elementMaskId)">` wrapping of overlay group.
- Editor authoring math (`canvasToSelectedMaskLocalPoint`, rotation-inverse).
- Empty-mask early-return (no-op render path).

These are the structural reasons the architecture is salvageable without redesign.

---

## Recommended path

Adopt **two-step plan from `propose.md`:**

1. **Spec 074 — Surgical fix (Option 1):**
   - D1 region fix.
   - D2 TDZ move.
   - D3 NaN-safe primitives.
   - D5 mark legacy strokes for migration (no immediate behavior change).
   - Acceptance: snapshot test on `<mask>` region geometry + manual screenshot matrix on `?p=/studio/parametric` (rotated rect with texture and depth).

2. **Spec 075 — Contract hardening (Option 2):**
   - Shared `maskFrame` helper used by both renderer and editor preview.
   - One-shot legacy migration on document open.
   - Debug-mode assertions: silhouette non-empty when primitives non-empty; region superset of bbox.
   - Acceptance: removed `coordinateSpace` runtime branch from renderer; preview/render parity test.

3. **Spec 076 (optional) — Overlay clip frame fix (D4):**
   - Decide Q5 (is `clip.targetName` actually used?).
   - Either remove the feature or rewrite it to operate in canvas world space (overlay outside element transform) or to back-transform `worldBody` to local.

4. **Spec 077 (optional) — Cut-edge stroke (R3.5):**
   - `feMorphology` derived edge stroke from silhouette alpha, color from element’s `stroke` attribute.

---

## Open decisions (must be answered before Spec 074 starts)

From `clarify.md`:

- **B1 (Q1.a/b):** Local-only at the renderer boundary? Migration on load?
- **B2 (Q2.a):** Origin-centered frame for body and mask? (Recommended.)
- **B3 (Q5.a):** Is `clip.targetName` used in any saved template?

If the user accepts the recommended defaults (yes / yes / TBD-ignore), the surgical fix in Spec 074 is unblocked.

---

## Acceptance for this review spec (073)

- ✅ Requirements documented.
- ✅ Per-requirement checklist with code citations.
- ✅ Stage-by-stage comparison.
- ✅ Open questions listed with recommended defaults.
- ✅ Fix options enumerated with trade-offs.
- ✅ Recommendation single-paragraph clear.

**Spec 073 status: COMPLETE — awaiting decisions on B1/B2/B3 to schedule Spec 074.**
