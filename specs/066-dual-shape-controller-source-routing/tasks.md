# Tasks: Dual-Shape Controller Source Routing (066)

## Execution Rule (Locked)
- Complete one task only.
- Stop after each task.
- Wait for explicit approval before next task.

## Phase A — Contract and Mapping
- [ ] T001 Audit current controller read sources and document mismatches.
- [ ] T002 Create explicit controller-source matrix in code/docs.

## Phase B — Silhouette Surface
- [ ] T003 Implement masked local-space silhouette computation.
- [ ] T004 Expose `geometryPath` + `silhouettePath` (+ `silhouetteAlpha` when applicable).
- [ ] T005 Add silhouette cache/invalidation rules.

## Phase C — Source Routing
- [ ] T006 Redirect Style FX edge-sensitive reads to silhouette source.
- [ ] T007 Redirect Depth FX and Drop Shadow reads to silhouette source.
- [ ] T008 Redirect Global Light boundary/edge reads to silhouette source.
- [ ] T009 Keep Texture/Gradient/Material reads on geometry source.
- [ ] T010 Confirm post-composite grading remains post-composite.

## Phase D — Regression and Safety
- [ ] T011 Validate no pivot/transform regressions.
- [ ] T012 Validate no controller-order changes.
- [ ] T013 Validate texture/gradient/material parity with baseline.

## Phase E — Build, Verify, Deploy
- [ ] T014 Run `npx tsc -b`.
- [ ] T015 Run `node scripts/verify.mjs`.
- [ ] T016 Execute deploy parity checks and push deployment artifacts.
