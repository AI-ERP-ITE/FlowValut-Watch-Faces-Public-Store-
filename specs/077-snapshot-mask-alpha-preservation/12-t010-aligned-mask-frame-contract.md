# 12 - T-010 Aligned Mask-Frame Contract

## Task

T-010 Define aligned mask-frame contract

## Contract Objective

Keep mask visual intent stable regardless of render source mode (live procedural or snapshot image).

## Canonical Contract

### C1 - Canonical Frame

Mask geometry is interpreted in a canonical element-local frame that is mode-invariant.

Definition:
1. Origin-centered local frame.
2. Width and height derived from the active render surface frame contract for the element.
3. Coordinate mapping must not depend on whether body source is procedural geometry or snapshot image.

### C2 - Render Surface Contract

Each render pass resolves an explicit `surfaceFrame` per element:
1. `surfaceFrame.width`
2. `surfaceFrame.height`
3. `surfaceFrame.originX`
4. `surfaceFrame.originY`

All mask primitives and mask regions use `surfaceFrame`, never ambiguous layout-only fallbacks.

### C3 - Snapshot Surface Binding

Snapshot payload must preserve and expose surface frame metadata captured at bake time:
1. `snapshot.surfaceFrame.width`
2. `snapshot.surfaceFrame.height`
3. `snapshot.surfaceFrame.originX`
4. `snapshot.surfaceFrame.originY`

If absent (legacy payload), runtime adapter derives deterministic fallback and marks source as adapted.

### C4 - Live Surface Binding

Live procedural render path resolves the same `surfaceFrame` contract for the element body in the same coordinate domain as snapshot path.

### C5 - Transition Adapter

On source transitions (`snapshot -> live`, `fresh -> live-fallback`, `live -> snapshot`), mask intent is interpreted through canonical frame semantics.
No implicit frame jump is allowed.

### C6 - Non-Destructive Data Rule

Procedural source fields remain canonical and untouched.
Snapshot frame metadata augments state but must not overwrite procedural intent.

### C7 - Legacy Compatibility Rule

Legacy mask data and legacy snapshot payloads are accepted.
Adapter upgrades runtime interpretation to canonical frame without destructive migration.

## Implementation Constraints

1. Additive changes only.
2. No forced schema migration for existing projects.
3. Undo/redo semantics unchanged.
4. Hash/freshness semantics remain flexible for mask edits unless explicitly changed in later approved tasks.

## Acceptance for T-010

1. Contract explicitly defines one canonical frame model.
2. Contract covers live path, snapshot path, and transitions.
3. Contract defines legacy adapter expectations.
4. Contract approved before implementation task T-011.
