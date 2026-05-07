# 17 - T-030 Alpha Preservation Regressions

## Task

T-030 Add regression tests for alpha preservation

## Goal

Provide focused test coverage for FR-3 and FR-5 target flows and verify pass state after T-011 to T-021 implementation.

## Coverage Matrix

### S1

Flow: live -> mask -> snapshot -> live
Coverage file: `engine/core/render-source-snapshot-mode.test.js`
Test added:
- `preserves alpha-relevant rendering across live -> mask -> snapshot -> live flow`

Assertions:
1. Live masked render includes the element mask reference.
2. Snapshot render keeps same mask reference and uses snapshot image source.
3. Return-to-live render matches live masked baseline output.

### S2

Flow: live -> snapshot -> mask -> stroke edit
Coverage files:
- `engine/core/render-source-snapshot-mode.test.js`
- `engine/snapshot/snapshotStorage.test.ts` (existing status/hash safety)

Test added:
- `preserves snapshot rendering through mask stroke edit in live -> snapshot -> mask flow`

Assertions:
1. Snapshot image source remains active before and after mask stroke edit.
2. Mask application remains single and stable (`mask=...` reference count == 1).
3. SVG output changes between stroke revisions (edit applied), without effect-stack-only path.

### S3

Flow: live -> snapshot -> mask -> delete snapshot
Coverage files:
- `engine/core/render-source-snapshot-mode.test.js` (existing)
- `engine/snapshot/snapshotStorage.test.ts` (existing)

Existing assertions reused:
1. Delete-transition live render keeps aligned mask frame via `lastSnapshotFrame`.
2. Snapshot payload removed while procedural fields/mask remain intact.

## Validation Run

Command:
- `npx vitest run engine/core/render-source-snapshot-mode.test.js engine/snapshot/snapshotStorage.test.ts engine/core/render-source-live-pass-through.test.js`

Result:
- 3 files passed
- 16 tests passed

## T-030 Conclusion

Done criteria met:
1. Focused regressions now explicitly cover alpha-preservation target flows S1-S3.
2. Validation suite passes after implementation changes.
3. Task ready to hand off for T-031 approval gate.
