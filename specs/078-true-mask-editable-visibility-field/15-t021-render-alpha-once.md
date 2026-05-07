# 15 - T-021 Render Alpha Multiply-Once

## Goal
Ensure renderer consumes authoritative mask field once as final alpha gate for layer body.

## Implemented Path
In renderer mask definition:
1. If mask.field.imageDataUrl is present and valid, renderer builds element mask from that image directly.
2. Element body is masked through a single element mask reference in the layer composition path.

## Behavior
1. Edit-state accumulation is not performed in renderer for field-backed masks.
2. Render stage consumes already-updated field state.
3. Alpha gate is applied through one mask evaluation against source body path.

## Notes
1. Legacy primitive path remains as fallback for malformed/missing field data.
2. Field-backed path is primary for edited masks produced by T-020.

## Done Criteria Check
1. Render uses field-backed mask for final gating: PASS.
2. No iterative lerp-based update in render-stage state: PASS.
