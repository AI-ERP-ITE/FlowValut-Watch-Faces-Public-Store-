# 16 - T-021 Delete-Snapshot Alignment

## Task

T-021 Fix delete-snapshot alignment

## Implementation Summary

### 1. Preserve transition frame metadata across snapshot delete

File: `engine/snapshot/snapshotStorage.ts`

1. Extended `SnapshotState` with optional `lastSnapshotFrame`.
2. Updated `normalizeRenderState(...)` to parse, validate, and retain `lastSnapshotFrame` when present.
3. Updated `setElementSnapshot(...)` to cache snapshot dimensions into `lastSnapshotFrame`.
4. Updated `deleteElementSnapshot(...)` to carry frame metadata into `lastSnapshotFrame` while setting:
- `sourceMode: 'live'`
- `snapshotStatus: 'missing'`
- `snapshot: null`

### 2. Use preserved frame metadata in renderer alignment resolver

File: `engine/core/renderer.js`

1. Updated `resolveSnapshotMaskFrameMetrics(...)` to read frame dimensions from:
- `renderState.snapshot.width/height` when snapshot payload exists
- fallback `renderState.lastSnapshotFrame.width/height` when snapshot payload is absent

This keeps mask frame dimensions stable after delete-transition when renderer is back on live source.

## Why This Solves T-021

Delete-snapshot transitions previously dropped direct snapshot frame metadata once payload was removed. With `lastSnapshotFrame` cached and consumed by mask frame resolver, mask generation remains aligned during snapshot -> live switch, preventing effects-only output caused by frame jump/misalignment.

## Regression Coverage

### File: `engine/snapshot/snapshotStorage.test.ts`

Added/updated checks:
1. `keeps procedural fields intact when deleting snapshot`
- now asserts `lastSnapshotFrame` is retained after delete.

2. `retains last snapshot frame through render-state normalization`
- verifies non-destructive retention of cached frame metadata.

### File: `engine/core/render-source-snapshot-mode.test.js`

Added test:
1. `keeps delete-transition live rendering mask frame aligned via lastSnapshotFrame cache`
- verifies live rendering after delete-transition uses cached frame dimensions in mask def.
- verifies snapshot image source is not used in this path.

## Validation

Command:
- `npx vitest run engine/snapshot/snapshotStorage.test.ts engine/core/render-source-snapshot-mode.test.js`

Result:
- 2 files passed
- 13 tests passed

## T-021 Conclusion

Done criteria met:
1. Snapshot -> live delete transition keeps consistent mask alignment.
2. Behavior is covered by focused regressions.
3. No failures in targeted validation run.
