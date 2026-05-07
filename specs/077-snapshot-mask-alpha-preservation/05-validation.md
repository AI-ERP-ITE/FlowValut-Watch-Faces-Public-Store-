# 05 - Validation Plan

## Test Matrix

### Scenario S1

Flow: live -> mask -> snapshot -> live
Expected: base alpha preserved at every step.

### Scenario S2

Flow: live -> snapshot -> mask -> stroke edit
Expected: no effects-only result, base alpha remains visible.

### Scenario S3

Flow: live -> snapshot -> mask -> delete snapshot
Expected: returns to procedural rendering without alpha collapse.

### Scenario S4

Flow: any scenario above + undo/redo
Expected: Ctrl+Z and Redo recover expected visual states.

## Evidence Requirements

1. Before/after screenshots or deterministic render assertions.
2. Focused test outputs.
3. Commit references for implementation and deploy.
4. Live bundle hash confirmation.
