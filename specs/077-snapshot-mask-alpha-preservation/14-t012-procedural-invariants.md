# 14 - T-012 Procedural Invariants

## Task

T-012 Preserve procedural record invariants

## Changes Implemented

### 1. Source mode toggle safety

File: `engine/snapshot/snapshotStorage.ts`

- Updated `setElementRenderSourceMode(...)` to compute snapshot status when switching to snapshot mode.
- This prevents stale/invalid snapshot mode from being marked implicitly fresh while preserving procedural fields.

### 2. Snapshot delete safety

File: `engine/snapshot/snapshotStorage.ts`

- Updated `deleteElementSnapshot(...)` to refresh and preserve `sourceHash` using current procedural state before clearing snapshot payload.
- Keeps live procedural baseline coherent after delete.

## Invariants Preserved

1. Procedural params are not removed or mutated by snapshot delete.
2. Mask payload remains intact through snapshot delete.
3. Snapshot removal only affects snapshot fields and source mode.
4. Live hash baseline is preserved after delete for stable subsequent status evaluation.

## Tests Added

File: `engine/snapshot/snapshotStorage.test.ts`

1. Delete snapshot preserves procedural fields and mask payload.
2. Switching to snapshot mode computes status without mutating procedural fields.

## Validation Run

Command:
- `npx vitest run engine/snapshot/snapshotStorage.test.ts engine/core/render-source-snapshot-mode.test.js`

Result:
- 2 files passed
- 10 tests passed

## T-012 Conclusion

Done criteria met for procedural invariants:

1. Delete snapshot returns to live with intact procedural record.
2. Snapshot mode toggles do not destruct procedural source fields.
3. Guard behavior is test-backed.
