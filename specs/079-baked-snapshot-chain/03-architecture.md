# 03 - Architecture

## Snapshot Renderer
Add optional input flag:
- bakeMaskIntoSnapshot?: boolean

Behavior:
1. Default false: sanitize drops mask (existing behavior).
2. True: sanitize keeps mask so rasterized output includes current mask result.

## Parametric Editor
Add action handler:
- createBakedLayerFromSelectedSnapshot()

Flow:
1. Capture snapshot for selected element with bakeMaskIntoSnapshot=true.
2. Build new layer from selected element baseline.
3. Clear mask + effect overlay stacks on new layer.
4. Attach snapshot as render source on new layer.
5. Append new layer and select it.

## Compatibility
1. Existing snapshot mode and tests remain valid.
2. New action is additive and UI-local.
