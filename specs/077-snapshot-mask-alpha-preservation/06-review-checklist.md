# 06 - Review Checklist

## Implementation Review

1. Non-destructive procedural source preserved.
2. Mask contract consistent between live and snapshot.
3. No duplicate mask application causing compound clipping.
4. Transition behavior stable for stale and delete-snapshot paths.

## Test Review

1. New regressions added for target scenarios.
2. Existing related tests still pass.
3. Undo/redo behavior validated.

## Deployment Review

1. Build succeeded.
2. Docs and studio entries updated.
3. Live bundle hash confirmed.
