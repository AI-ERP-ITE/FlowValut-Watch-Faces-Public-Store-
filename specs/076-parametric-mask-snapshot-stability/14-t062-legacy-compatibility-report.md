# 14 - T-062 Legacy Project Compatibility Validation

## Task

T-062 Legacy project compatibility validation.

## Goal

Verify older saved project payloads (without snapshot/renderState fields) can still load, edit, and save without schema break.

## Validation Method

Used executable compatibility smoke test with a synthetic legacy payload shaped like older project data:

1. Legacy payload contains no `renderState` on elements.
2. Load simulation: deep clone via JSON parse/stringify.
3. Render baseline with engine to confirm payload still renders.
4. Edit simulation: mutate a visual property (`params.fill`).
5. Apply new snapshot-state operations (`setElementRenderSourceMode`, `refreshElementSnapshotStatus`) to validate schema upgrade path.
6. Save simulation: JSON stringify and parse reload.
7. Re-render after reload to confirm no break.

## Command

`npx vitest run engine/snapshot/.tmp-t062-legacy-compat.test.ts --reporter=verbose`

## Observed Result

1. 1 file passed.
2. 1 test passed.
3. Post-save reloaded payload contains valid `renderState` with:
   - `sourceMode: "snapshot"`
   - `snapshotStatus: "missing"`
4. Engine rendered SVG before and after load/edit/save flow.

## T-062 Conclusion

T-062 acceptance met.

1. Legacy payloads without snapshot fields remain loadable.
2. Edit/save flow remains operational after schema extension.
3. No schema-break regression observed in controlled compatibility smoke.
