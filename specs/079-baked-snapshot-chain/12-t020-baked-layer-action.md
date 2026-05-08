# 12 - T-020 Baked Layer Action

Date: 2026-05-08
Task: T-020 Add Snapshot -> New Baked Layer action
Status: Done

## Behavior
1. Captures selected element snapshot with `bakeMaskIntoSnapshot: true`.
2. Creates a new layer from selected element baseline.
3. Clears mask and overlay effect metadata on new layer.
4. Applies snapshot as render source on new layer and marks fresh.
5. Selects the new layer after creation.

## Files
1. `src/ParametricPage.tsx`
