# Spec 070 - Legacy Mask Migration

## Summary
Convert selected-element legacy global masks to local before editing; keep untouched masks renderable.

## Requirements
1. If selected mask has no coordinateSpace or `global`, convert strokes to local before first edit write.
2. Mark converted mask as `coordinateSpace = "local"`.
3. Conversion is idempotent per element state.

## Acceptance
1. Editing a legacy mask no longer causes drift after save.
2. Non-edited legacy masks still render correctly.
