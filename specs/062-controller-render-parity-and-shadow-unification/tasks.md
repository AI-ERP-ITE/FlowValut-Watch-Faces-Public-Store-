# Tasks: Controller Render Parity + Shadow Unification (062)

## Execution Rule (Locked)
- Complete one task only.
- Stop immediately after completion.
- Wait for explicit user approval before next task.

## Phase A — Pipeline Repair
- [ ] T001 Audit and document controller write-path vs renderer read-path mismatches.
- [ ] T002 Fix pipeline transfer so layered effect fields reach renderer.
- [ ] T003 Add regression checks proving layered effect controllers mutate JSON and render output.

## Phase B — Shadow Logic Unification
- [ ] T004 Introduce shared shadow normalization utility for Parametric + Studio surfaces.
- [ ] T005 Integrate shared normalization into Parametric render/effect control flow.
- [ ] T006 Verify Studio preview/export still matches shared normalization behavior.

## Phase C — Parametric 3D Coverage Expansion
- [ ] T007 Add missing element depth controls (falloff, whiteBalance, spread) to Parametric element FX.
- [ ] T008 Add full element drop-shadow controls to Parametric element FX.
- [ ] T009 Wire new controls to model updates + render pipeline with undo/redo compatibility.

## Phase D — Range and Perceptibility Tuning
- [ ] T010 Tune control ranges/steps where visual impact is currently too subtle or saturated.
- [ ] T011 Add subtle preset and aggressive preset validation checks for audited controls.

## Phase E — Verification + Notes
- [ ] T012 Run `npx tsc -b` and resolve regressions in scope.
- [ ] T013 Run `node scripts/verify.mjs` and record outcomes.
- [ ] T014 Write verification report for controller parity + shadow parity evidence.
