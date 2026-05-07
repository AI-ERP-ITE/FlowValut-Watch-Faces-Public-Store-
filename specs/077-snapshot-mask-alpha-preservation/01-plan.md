# 01 - Execution Plan

## Goal

Fix alpha disappearance in a non-destructive and flexible way for snapshot and live render modes.

## Approval Protocol

- Stop after each task.
- Present result and evidence.
- Wait for explicit user approval before next task.

## Phases

1. Phase A - Baseline and Scope Lock
2. Phase B - Data Contract for Non-Destructive Masking
3. Phase C - Renderer Alignment Across Modes
4. Phase D - Transition and Recovery Behavior
5. Phase E - Validation and Deployment

## Gate Summary

### Gate A

- Reproduce issue in controlled cases.
- Document exact failing transitions.

### Gate B

- Define mode-invariant mask coordinate model.
- Preserve procedural source as canonical record.

### Gate C

- Ensure mask interpretation remains stable in both live and snapshot paths.
- Eliminate frame mismatch causing alpha collapse.

### Gate D

- Ensure stroke edits and snapshot delete do not drop base alpha.
- Ensure undo/redo remains intact.

### Gate E

- Pass focused tests.
- Build and deploy.
- Verify live hash and route behavior.
