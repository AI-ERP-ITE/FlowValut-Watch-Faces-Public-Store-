# Spec 072 - Mask Validation and Observability

## Summary
Standardize mask validation warnings and debug diagnostics without blocking rendering.

## Requirements
1. Keep non-blocking validation in geometry/composer.
2. Include coordinateSpace in renderer mask debug logs when enabled.
3. Verify build/deploy/live hash checks before completion.

## Acceptance
1. Invalid masks emit actionable warnings.
2. Debug logs show element id, mask id, and coordinateSpace.
