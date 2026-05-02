# T006 Verification: Studio Preview/Export Shadow Parity

Date: 2026-05-03
Task: T006 (verification)
Status: Completed

## Objective
Verify Studio preview and export continue to use the same shared shadow normalization behavior after T004/T005 changes.

## Evidence
1. Shared normalization source remains centralized in `src/lib/effectNormalization.ts`:
   - `normalizeDropShadowForBake(...)`
   - `dropShadowPaddingForBake(...)`

2. Studio export path uses shared helper(s):
   - Import in `src/StudioApp.tsx:59` includes both `normalizeDropShadowForBake` and `dropShadowPaddingForBake`.
   - Export bake helper `shadowPadding(...)` delegates to `dropShadowPaddingForBake` in `src/StudioApp.tsx:1480-1481`.
   - Export draw helper `applyShadowToCtx(...)` uses `normalizeDropShadowForBake` in `src/StudioApp.tsx:1484-1485`.
   - All drop-shadow PNG export builders call the same helpers:
     - `renderImgWithShadowToPng` (`src/StudioApp.tsx:1497`)
     - `renderFillRectWithShadowToPng` (`src/StudioApp.tsx:1515`)
     - `renderStrokeRectWithShadowToPng` (`src/StudioApp.tsx:1531`)
     - `renderCircleWithShadowToPng` (`src/StudioApp.tsx:1548`)
   - Export baking loop routes eligible elements through those builders in `src/StudioApp.tsx:3390-3438`.

3. Studio preview path uses shared normalization:
   - `InteractiveCanvas` imports `normalizeDropShadowForBake` in `src/components/InteractiveCanvas.tsx:14`.
   - Preview helper `applyShadow(...)` normalizes each element shadow before canvas application in `src/components/InteractiveCanvas.tsx:714-721`.

## Regression Checks Run
1. `npx vitest run src/lib/effectNormalization.test.ts engine/core/layered-effects-parity.test.js`
   - Result: pass (5 tests)

## Conclusion
1. Studio preview and export are both bound to the same shared shadow normalization utility.
2. No divergence found in audited shadow normalization flow for T006 scope.
3. T006 acceptance satisfied for verification scope.
