# 11 - T-011 Sanitize Mode Tests

Date: 2026-05-08
Task: T-011 Add tests for default sanitize and mask-bake sanitize modes
Status: Done

## Added tests
1. Default sanitize path removes `mask` and forces `renderState.sourceMode = live`.
2. Bake mode keeps `mask` while still forcing `renderState.sourceMode = live`.

## Files
1. `engine/snapshot/snapshotRenderer.test.ts`
