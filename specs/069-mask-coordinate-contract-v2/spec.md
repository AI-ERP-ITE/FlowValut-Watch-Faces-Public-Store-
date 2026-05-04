# Spec 069 - Mask Coordinate Contract V2

## Summary
Define one canonical authoring contract for masks while preserving backward compatibility.

## Canonical Contract
1. Canonical persisted mask coordinate space is element-local.
2. Field: `mask.coordinateSpace` with allowed values:
   - `local` (canonical)
   - `global` (legacy compatibility only)
3. Renderer must honor `mask.coordinateSpace` when generating mask primitives.
4. Each rendered element instance must use unique mask IDs.

## Non-goals
- No route/auth/backend changes.
- No UI feature additions.

## Acceptance
1. New edits always persist `mask.coordinateSpace = "local"`.
2. Renderer produces aligned output for local and legacy global masks.
3. No mask-id cross-instance collisions.
