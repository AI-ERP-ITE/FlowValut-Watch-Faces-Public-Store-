# Verification Strategy (062)

## Per-Task Stop Gates
1. Evidence of targeted task completion.
2. Localized non-regression checks for touched paths.
3. Updated risk notes before waiting for next approval.

## Final Verification Gates
1. Layered effect controllers: JSON mutation + SVG/render delta confirmed.
2. Element depth controls (including advanced params) produce measurable render differences.
3. Drop-shadow controls produce parity-consistent behavior across Parametric and Studio paths.
4. `npx tsc -b` passes.
5. `node scripts/verify.mjs` passes.

## Audit Matrix (Minimum)
1. textureLayers enabled/disabled changes visible output.
2. gradientLayers enabled/disabled changes visible output.
3. materialLayers enabled/disabled changes visible output.
4. element depth falloff/whiteBalance/spread each changes output.
5. drop shadow opacity/blur/offset changes output in preview and export path checks.
6. subtle preset and aggressive preset both visibly distinct.
