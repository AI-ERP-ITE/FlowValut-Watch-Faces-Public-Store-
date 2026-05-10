# 05 — Validation

## Phase 1 unit tests (DONE)

File: `app/engine/core/sourceResolver.test.ts` — **17 / 17 passing**.

| Group | Coverage |
|---|---|
| STATE A: procedural | Mode classification; surface = procedural; silhouette procedural-vector; live mask key intersection |
| STATE B: baked-live-mask | Mode classification; surface = baked-image; silhouette = baked-alpha + additional live mask key |
| STATE C: baked-baked-mask | Mode classification; surface = baked-image; silhouette = baked-alpha; later-added live mask exposed via `additionalLiveMaskKey` |
| Migration | No snapshot → `procedural`+false; snapshot+mask → `baked-live-mask`+false; snapshot+no mask → `baked-baked-mask`+true; idempotency |
| Transitions | `toBakedLiveMask` / `toBakedBakedMask` / `toProcedural` stamp the right canonical pair |
| Geometry ignorance | Resolver ignores ghost params / `__previousSilhouette` when mode is baked-*; degrades safely if pixels missing |

## Phase 2 acceptance criteria (target)

A1. Element with `renderSourceMode = baked-live-mask`, mask enabled,
    `dropShadow.enabled = true` → drop shadow IS visible in both preview
    and full-quality render. Shadow alpha matches snapshot alpha ∩ mask.

A2. Element with `renderSourceMode = baked-baked-mask` → no live mask
    needed for shadow; shadow alpha matches snapshot alpha.

A3. Element with `renderSourceMode = procedural` (existing path) →
    behaviour unchanged from pre-085.

A4. Mask edit on `baked-live-mask` element → silhouette overlay and
    shadow update on the next frame WITHOUT re-baking the snapshot.

A5. No regression in: existing snapshot tests, mask regression tests,
    layered-effects parity tests (8 currently-failing tests are
    pre-existing from Spec 077/079 work and are NOT introduced by 085).

## Failure budget
- Zero new test failures introduced by Phase 2.
- Pre-existing 8 failing tests remain pre-existing (out of scope here).

## Live verification (Phase 2)
1. Hard-refresh https://ai-erp-ite.github.io/Watch-Faces/studio/parametric/
2. Add a baked element + live mask + drop shadow.
3. Observe shadow is rendered.
4. Move/resize mask → shadow follows mask edge.
5. Delete snapshot (transition back to procedural) → shadow follows
   procedural geometry again.
