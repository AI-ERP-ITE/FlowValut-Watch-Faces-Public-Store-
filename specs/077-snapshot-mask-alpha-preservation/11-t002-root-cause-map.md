# 11 - T-002 Root-Cause Map

## Task

T-002 Pinpoint frame mismatch points

## Root-Cause Summary

Alpha collapse is caused by mask interpretation not staying tied to the same effective frame when render source transitions between snapshot image and live procedural geometry.

## Exact Mismatch Points

### M1 - Snapshot capture dimensions are layout-sized

File: `engine/snapshot/snapshotRenderer.ts`

1. Capture size is resolved from template layout width/height, not element-local bounds.
2. Snapshot payload persists this layout-sized width/height.

Key points:
- `resolveTemplatePixelSize(...)` (layout dimensions)
- `size = resolveTemplatePixelSize(input.template)`
- returned `snapshot.width` / `snapshot.height`

Effect:
- Snapshot source image frame is tied to layout pixel size.

### M2 - Mask primitives are also built from layout-sized metrics

File: `engine/core/renderer.js`

1. `buildElementMaskPrimitives(...)` uses `layoutMetrics.width` / `layoutMetrics.height`.
2. `buildElementMaskDef(...)` mask region also uses layout-sized dimensions.

Effect:
- Mask intent is interpreted in layout-sized frame regardless of live vs snapshot source geometry nuances.

### M3 - Source switching changes rendered body source while mask contract remains static

File: `engine/core/renderer.js`

1. `resolveElementRenderSourceDecision(...)` switches effective mode to `live-fallback` when snapshot is not fresh.
2. `renderElement(...)` then switches body from `<image ...>` snapshot source to procedural `definition.render(...)` source.
3. Same mask pipeline still applies via `renderLayer(..., elementMask)`.

Effect:
- Same mask definition gets applied while body source representation changed, exposing frame mismatch as alpha loss.

### M4 - Deleting snapshot forces live mode transition

File: `engine/snapshot/snapshotStorage.ts`

1. `deleteElementSnapshot(...)` sets `sourceMode: 'live'` and clears snapshot payload.

Effect:
- Immediate transition from snapshot image body to live body path with existing mask intent, revealing mismatch.

### M5 - Mask excluded from snapshot freshness hash (design choice)

File: `engine/snapshot/snapshotHash.ts`

1. `mask` is in `NON_VISUAL_KEYS`.

Effect:
- Mask edits alone do not stale snapshot. This is intentional for workflow flexibility, but it means transition points (stroke edits, delete snapshot) become the main mismatch exposure points.

## Why Effects-Only Appearance Can Happen

File: `engine/core/renderer.js`

1. Filter chain and external shadow blending can still leave visible effect remnants.
2. When base alpha is heavily clipped by mismatched mask interpretation, effect remnants can visually dominate.

## T-002 Conclusion

Done criteria met:

1. Exact divergence points identified.
2. Root-cause mapped across capture, mask, source switch, and delete transitions.
3. File-level references documented for implementation planning.
