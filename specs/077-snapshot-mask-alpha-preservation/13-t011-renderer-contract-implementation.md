# 13 - T-011 Renderer Contract Implementation

## Task

T-011 Implement contract in renderer path

## Scope Executed

Renderer-only implementation to align mask frame interpretation across live and snapshot source paths.

## Changes Implemented

File: `engine/core/renderer.js`

1. Added `resolveElementMaskFrameMetrics(element, layoutMetrics)`.

Behavior:
- If element has snapshot frame metadata (`snapshot.width`, `snapshot.height`), renderer uses that as mask frame dimensions.
- Otherwise renderer uses layout metrics fallback.

2. Extended `renderLayer(...)` signature with optional `maskFrameMetrics`.

Behavior:
- Mask silhouette and mask defs are built from `maskFrameMetrics` when provided.
- Overlay and other layer behaviors still use normal layout metrics where expected.

3. In `renderElement(...)`, resolved and passed `maskFrameMetrics` per element.

Behavior:
- Mask construction path now uses consistent per-element frame contract whether source is snapshot or live fallback.

## Why This Matches T-010 Contract

1. Canonical mask frame resolution is explicit.
2. Live and snapshot paths share the same mask-frame resolver for an element.
3. Transition path uses same mask-frame source when snapshot frame exists.
4. Change is additive and non-destructive.

## Validation Evidence

Command:
- `npx vitest run engine/core/render-source-snapshot-mode.test.js engine/core/render-source-live-pass-through.test.js engine/snapshot/snapshotStorage.test.ts`

Result:
- 3 files passed
- 9 tests passed

## Notes

This task implements renderer-side contract wiring only.
Transition-specific safety behaviors and delete-path alignment are handled in subsequent approved tasks.
