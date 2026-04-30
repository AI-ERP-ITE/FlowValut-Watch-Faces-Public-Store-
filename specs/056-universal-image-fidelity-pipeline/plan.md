# Plan: Universal Image Fidelity Pipeline (056)

## Why
Current flow validates schema well but can still miss visual equivalence due to renderer capability gaps and lack of end-to-end visual scoring.

## Approach
1. Upgrade renderer to cover fidelity-critical primitives.
2. Add deterministic visual fidelity checks in validator pipeline.
3. Add source-image verification workflow in CompilerPage.
4. Update speckit master/agents to enforce universal renderability and fidelity gates.
5. Verify end-to-end with local compile flow.

## Work Breakdown
1. Spec Scaffolding
   - Create spec/plan/tasks files for 056.
2. Renderer
   - Add circle clipping.
   - Add image shape rendering.
   - Add filter rendering support.
3. Validator
   - Add reusable image fidelity scoring utility.
   - Add pass/fail fidelity gate configuration.
4. Compiler UI
   - Add source image upload.
   - Add render-vs-source comparison metrics panel.
5. Speckit Contracts
   - Update master + compile agents with renderability/fidelity gates.
6. Verification
   - Structural validation.
   - Visual metric validation.
   - End-to-end operator workflow validation.

## Risks
1. Browser-dependent rendering differences can affect strict pixel checks.
2. Overly strict thresholds may reject acceptable output.

## Mitigations
1. Use deterministic canvas-based metrics with conservative thresholds.
2. Report per-metric scores and allow configurable threshold tuning.
3. Keep implementation minimal and tied to existing architecture.

## Stop Condition
All tasks complete locally with verification evidence. No deploy/push actions.
