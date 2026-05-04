# Spec 074 — Mask Pipeline Surgical Fix (v1)

**Depends on:** Spec 073 review.
**Goal:** restore deterministic mask behavior matching Spec 073 requirements without architectural redesign.

## Decisions assumed (from `073/clarify.md`)

- B1 (Q1.a/b): mask `coordinateSpace` is **'local'** at the renderer boundary. Legacy `'global'` strokes are **migrated on document load** and at first edit.
- B2 (Q2.a): element body and mask region share the **origin-centered local frame** `[-W/2,+W/2]`.
- B3 (Q5): `clip.targetName` overlay-clip is **out of scope for this spec** (tracked as a separate fix in a follow-up).

## Scope (in)

- `app/engine/core/renderer.js` — mask region geometry, NaN-safe primitives.
- `app/src/ParametricPage.tsx` — TDZ ordering, document-load migration hook.
- New `app/src/lib/maskFrame.ts` (tiny shared helper) — single mapping function reused by editor preview.
- New `app/scripts/test/maskRegression.test.mjs` — snapshot + property tests.

## Scope (out)

- `clip.targetName` double-transform (Spec 076).
- Cut-edge stroke (Spec 077).
- Schema redesign / mask op redesign (Spec 075 if needed).

## Acceptance criteria (mapped to 073 IDs)

Hard pass required:

- D.13, D.14, E.04, E.05 — mask region origin-centered.
- E.06, E.07, E.08, L.04 — NaN/zero-area skip.
- F.07 — silhouette-fed effects look correct after fix.
- I.05, I.11 — preview math comes from the same helper as renderer.
- J.07–J.09 — no TDZ crash on global guides toggle.
- K.04, K.05, K.08, V.02 — migration runs on document load (or at next render fall-back path is correct).
- N.03 — legacy templates render at correct visual position post-migration.
- P.06–P.10 — validation harness present.

Soft pass acceptable:

- O.04 — debug log includes region attrs and silhouette length.
- L.11 — points cap warning (≤10000 hard cap; warn at 5000).
- B.08–B.09 — abort policy documented (discard `activeMaskStroke` on element switch / edit-mode-off).
