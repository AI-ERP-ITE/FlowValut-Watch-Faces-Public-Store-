# Plan: Dual-Shape Controller Source Routing (066)

## Execution Rule (Locked)
1. Execute one task at a time.
2. Stop after each task.
3. Report changed files, checks run, result, and residual risk.
4. Continue only after explicit user approval.

## Phase A — Analysis and Routing Contract
1. Confirm current controller groups and source reads in renderer and panel contract.
2. Create explicit controller-to-source matrix.
3. Identify edge-sensitive reads currently bound to pre-mask geometry.

## Phase B — Source Surface Introduction
1. Add silhouette computation (`silhouettePath`, optional `silhouetteAlpha`) from masked output in local space.
2. Keep original `geometryPath` immutable for layout/material source needs.
3. Add cache/invalidation boundaries.

## Phase C — Controller Input Redirection
1. Route edge-sensitive controllers to silhouette source.
2. Keep geometry-dependent controllers pinned to geometry source.
3. Keep post-composite controllers unchanged.

## Phase D — Guardrails and Regression Controls
1. Verify no stack reordering occurred.
2. Verify pivot/transform behavior unchanged.
3. Verify texture/gradient/material visual placement parity.

## Phase E — Verification and Deployment
1. Run type/build checks.
2. Run focused visual verification for masked edge response.
3. Deploy using Speckit deployment invariants and parity gates.
