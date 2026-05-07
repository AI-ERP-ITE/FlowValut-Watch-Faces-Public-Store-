# 18 - T-031 Undo/Redo Verification

## Task

T-031 Verify undo/redo for snapshot+mask transitions

## Scope

Validate history behavior for the snapshot/mask transition chain using the same command history functions used by UI undo/redo handlers.

Relevant implementation path:
- `undoHistory(...)` and `redoHistory(...)` in `src/lib/history/commandHistory.ts`
- `runUndoCommand` / `runRedoCommand` keyboard path in `src/ParametricPage.tsx`

## Tests Added

File: `src/lib/history/commandHistory.test.ts`

### Test 1

`restores expected states for snapshot, mask edit, and delete snapshot sequence`

Coverage:
1. Push command chain for snapshot create -> snapshot source mode -> delete snapshot (with mask state present).
2. Undo three times and verify exact expected state each step.
3. Redo three times and verify exact expected state each step.

### Test 2

`clears future stack when new mask command is pushed after undo`

Coverage:
1. Undo from a snapshot+mask command stack.
2. Push a new mask edit command.
3. Verify redo stack is cleared.

### Test 3

`returns cloned template payloads from undo/redo operations`

Coverage:
1. Mutate undo result payload.
2. Redo and verify original command payload remains intact.

## Validation Run

Command:
- `npx vitest run src/lib/history/commandHistory.test.ts engine/core/render-source-snapshot-mode.test.js engine/snapshot/snapshotStorage.test.ts`

Result:
- 3 files passed
- 18 tests passed

## Notes

1. UI Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y handlers in `ParametricPage.tsx` call `runUndoCommand` and `runRedoCommand`, which rely on the same tested command history functions.
2. This task validates logical undo/redo integrity for affected snapshot+mask transitions at command-layer level.

## T-031 Conclusion

Done criteria met:
1. Undo/redo restore expected states for snapshot and mask transition commands.
2. Redo branch invalidation after new edit is validated.
3. Regression suite passes in focused run.
