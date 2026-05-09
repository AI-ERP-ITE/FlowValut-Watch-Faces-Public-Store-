# 05 - Test Plan

## Scope
Validate scheduling/reuse performance changes while preserving visual parity.

## Test Matrix

### TP-001 Edit Mode Preview Switching
1. Start drag/paint/resize/slider interaction.
2. Assert `renderQualityMode === "preview"` while editing.
3. End interaction.
4. Assert transition to `idle` after 100ms debounce.
5. Assert one final-quality rerender is triggered.

### TP-002 Cache Reuse Behavior
1. Render element A with stable visual state.
2. Render same frame with unchanged element A.
3. Assert cache HIT and no rerender call.
4. Modify a hashed visual property.
5. Assert cache MISS and exactly one rerender.

### TP-003 Sibling Freeze
1. Scene with at least 3 layers.
2. Edit only layer 2 transform.
3. Assert layer 2 rerenders.
4. Assert layers 1 and 3 reused from cache.

### TP-004 Mask Edit Targeting
1. Apply mask edit to one element.
2. Assert only target element invalidated and rerendered.
3. Assert siblings remain frozen.

### TP-005 Large Scene Responsiveness
1. Scene with 20+ layers.
2. Perform drag and brush interactions.
3. Verify responsiveness improvement via rerender count reduction and timing metrics.
4. Verify final output parity when interaction ends.

## Visual Parity Checks
1. Compare final mode outputs before/after optimization for representative scenes.
2. Confirm no change in effect, mask, geometry, and snapshot visual outcomes.

## Instrumentation Expectations
1. Cache logs emit HIT or MISS per element.
2. Invalidation logs emit dirty element ids per frame.
3. Optional counters recorded for reused vs rerendered element counts.
