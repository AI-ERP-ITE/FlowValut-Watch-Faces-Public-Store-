# 08 - Risk and Rollback

## Risks

1. Mask migration may alter legacy visuals unexpectedly.
2. Transition fixes may impact unrelated effect pipelines.
3. Undo stack interactions may regress if transition logic bypasses command history.

## Mitigations

1. Add explicit legacy adapter tests.
2. Keep changes additive and localized.
3. Verify undo/redo in target actions before deploy.

## Rollback Plan

1. Revert implementation commit only.
2. Rebuild and redeploy previous stable hash.
3. Validate route and bundle hash rollback.
