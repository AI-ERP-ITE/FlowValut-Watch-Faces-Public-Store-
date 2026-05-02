# Plan: Controller Render Parity + Shadow Unification (062)

## Execution Rule (Locked)
1. Execute exactly one task.
2. Stop immediately after that task.
3. Wait for explicit user approval (`proceed`) before next task.
4. At each stop report:
   - files changed
   - checks run
   - pass/fail status
   - residual risks

## Phase A — Pipeline Repair
1. Map current controller write paths and renderer read paths.
2. Patch pipeline transfer to preserve layered effect fields.
3. Validate layered controllers now affect render.

## Phase B — Shadow Logic Unification
1. Extract/shared shadow normalization for cross-UI reuse.
2. Route Parametric depth/drop-shadow logic through shared normalization.
3. Ensure Studio preview/export paths still use same logic.

## Phase C — Parametric 3D Coverage Expansion
1. Add missing element depth controls for full renderer support.
2. Add full drop-shadow control block in Parametric element FX.
3. Ensure values write to model and affect render predictably.

## Phase D — Range and Perceptibility Tuning
1. Identify dead-band/subtle-only controls.
2. Tune range/step/curve where necessary while preserving broad range.
3. Validate subtle/aggressive presets remain usable.

## Phase E — Verification + Documentation
1. Add/extend focused controller-render parity checks.
2. Run build/type and verify suite.
3. Record verification matrix and parity notes.
