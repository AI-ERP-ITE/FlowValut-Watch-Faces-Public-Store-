# 03 - Architecture

## Design Principle

Additive integration. Keep current procedural renderer path as default baseline.

## Integration Surfaces

1. Editor state and element schema (Parametric page types/state).
2. Snapshot utilities in engine snapshot module.
3. Core renderer source selection logic.
4. Parametric UI controls.

## Proposed Modules

1. `engine/snapshot/snapshotHash.ts`
2. `engine/snapshot/snapshotRenderer.ts`
3. `engine/snapshot/snapshotStorage.ts`

## Data Flow

1. User edits element visual properties.
2. Live visual hash computed from deterministic visual input set.
3. User creates snapshot.
4. Snapshot capture stores image + hash + metadata.
5. Render source switch selects live or snapshot per element.
6. If hash differs, stale flag appears for user awareness.

## Safety Boundaries

1. Geometry and mapping logic remains unchanged.
2. Existing mask coordinate contract remains unchanged.
3. Snapshot path must fail safe to live mode when unavailable.

## Compatibility Notes

1. Old projects default to live mode.
2. Missing snapshot metadata must not throw.
3. Existing progress snapshot mechanism remains separate namespace.
