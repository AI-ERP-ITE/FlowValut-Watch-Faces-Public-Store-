# 03 - Architecture

## Current Pipeline (To Replace)
1. Stroke payload is converted into SVG primitives.
2. Primitive color/opacity compositing in mask graph indirectly mutates alpha outcome.
3. Overlap depends on compositing recurrence, not direct scalar field updates.

## Target Pipeline
1. Maintain explicit editable mask buffer per element.
2. Apply brush operation directly to stored mask values.
3. Convert mask buffer to renderable mask representation for preview/export parity.
4. Apply mask alpha exactly once during final composition.

## Data Model
Per element:
1. maskBuffer: scalar field, shape aligned to mask frame.
2. maskMeta: frame size, coordinate space, version/hash.
3. strokeHistory: optional, for undo/redo and audit.

## Operations
1. Paint hide: value subtraction with clamp.
2. Paint reveal: value addition with clamp.
3. Render: sourceAlpha multiplied by maskValue once.

## Compatibility
1. Existing stroke payload can remain as input events.
2. Renderer must no longer treat composited primitive output as authoritative editable state.
3. Snapshot and live modes both consume same scalar mask semantics.
