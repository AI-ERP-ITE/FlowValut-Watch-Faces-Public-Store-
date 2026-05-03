# Tasks: Spec 064

- [ ] T1 Define canonical silhouette contract and mask semantics in renderer context.
- [ ] T2 Refactor layer filter pipeline to consume canonical alpha for depth/shadow/stroke edge logic.
- [ ] T3 Rewire texture/gradient/material overlay clipping to canonical silhouette.
- [ ] T4 Apply same logic to invert + reveal workflows and verify parity across element types.
- [ ] T5 Add/adjust edge-band treatment so mask-created boundaries get proper stroke-like and shadow behavior.
- [ ] T6 Validate with typecheck, private build, deploy sync, and acceptance matrix visual pass.
