# 15 - T-020 Stale Fallback Alignment

## Task

T-020 Fix stale fallback alignment

## Implementation Summary

File: `engine/core/renderer.js`

1. Added `resolveSnapshotMaskFrameMetrics(element, layoutMetrics)`.
- Reads snapshot metadata frame (`snapshot.width`, `snapshot.height`) when available.
- Produces explicit mask frame metrics object.

2. Extended `resolveElementRenderSourceDecision(...)` to return `maskFrameMetrics`.
- For `snapshot`, `live-fallback`, and `live` decisions, includes fallback snapshot frame when present.

3. Updated `renderElement(...)` mask frame selection.
- Prefers `renderSourceDecision.maskFrameMetrics`.
- Falls back to existing resolver when explicit decision metrics absent.

## Why This Solves T-020

When snapshot status becomes outdated and renderer switches to `live-fallback`, mask generation now stays aligned to the same snapshot-bound frame metadata when available, preventing implicit frame jump during stale transition.

## Regression Coverage

File: `engine/core/render-source-snapshot-mode.test.js`

Added test:
- `keeps stale-fallback mask frame aligned to snapshot dimensions when snapshot metadata exists`

Assertion:
- stale fallback does not use snapshot image source
- mask definition width/height follow snapshot metadata frame

## Validation

Command:
- `npx vitest run engine/core/render-source-snapshot-mode.test.js engine/snapshot/snapshotStorage.test.ts`

Result:
- 2 files passed
- 11 tests passed

## T-020 Conclusion

Done criteria met:
1. Stale fallback path now has explicit alignment behavior.
2. Behavior is regression-tested.
