# Spec 119 — Implementation Plan

## Minimal file plan

1. `src/StudioApp.tsx`
   - Resolve active canvas dimensions from saved `config.resolution` after project creation.
   - Retain Firebase model/spec resolution only as the new-project initializer and mismatch reference.
   - Add the guarded mismatch prompt and position-only rearrangement orchestration for MAIN/AOD.
2. `src/components/PropertyPanel.tsx`
   - Accept active project width/height.
   - Replace generic 480-based bounds clamps and non-pointer fixed canvas-center defaults.
   - Leave the TIME_POINTER center controls and behavior unchanged.
3. `src/lib/projectCanvasGeometry.ts` (only if an existing helper cannot be extended)
   - Provide pure resolution comparison and alignment-aware position-only transformation.
   - Explicitly return TIME_POINTER elements unchanged.
4. `src/lib/jsCodeGeneratorV2.ts` and, only where needed, `src/lib/jsCodeGenerator.ts`
   - Remove exact-480 background recognition.
   - Preserve every time-pointer and specialized asset-local calculation.
5. Existing FVWF load helpers, only if required
   - Surface the saved-project/model resolution mismatch without changing HTML paths.
6. Focused Vitest and repository-verifier coverage
   - Cover coordinate authority, mismatch choices, rectangular canvases, and protected geometry.

## Execution order after approval

1. Capture baseline fixtures for 480×480, 466×466, rectangular, MAIN/AOD, TIME_POINTER, and GAUGE_POINTER, plus an unchanged-HTML-workflow guard.
2. Add pure failing tests for resolution authority and position-only transformations.
3. Implement the smallest reusable coordinate helper or extend an existing equivalent.
4. Wire project resolution into Property Panel and project creation paths.
5. Add the guarded FVWF mismatch prompt and cloned-config commit behavior.
6. Fix background recognition and verify V2/V3 coordinate parity.
7. Run protected-geometry regression comparisons.
8. Run TypeScript, focused tests, full relevant tests, verifier, and explicit private build.
9. Commit specs separately from implementation/tests.
10. Deploy privately only after all gates pass, then verify bundle and route parity.

## Safe transformation model

For a rearrangeable bounds-based element, transform its alignment anchor from source canvas to target canvas and reconstruct X/Y with unchanged width/height. Explicit center-based widgets transform only their project-space center. Asset-local fields are excluded.

`TIME_POINTER` bypasses this transformation entirely.

## Rollback

- The transformation is opt-in and operates on a clone.
- `Keep original positions` is a no-op.
- Removing the prompt/helper restores current persistence because no mandatory schema migration is introduced.
- If one legacy widget cannot be transformed safely, preserve it unchanged and report it rather than applying a guessed conversion.
