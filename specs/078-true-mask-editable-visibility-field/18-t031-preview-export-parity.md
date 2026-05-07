# 18 - T-031 Preview/Export Parity Validation

## Validation Target
Ensure renderer output path uses authoritative field-backed mask data consistently.

## Added Test
File: engine/core/mask-field-render-parity.test.js

Checks:
1. Renderer emits field-backed mask image in mask definition.
2. Output layer references element mask id.
3. Field-backed mask path is active in generated SVG.

## Command
npx vitest run engine/core/mask-field-render-parity.test.js src/lib/maskFieldKernel.test.ts engine/core/render-source-snapshot-mode.test.js

## Result
All targeted files/tests passed.

## Done Criteria Check
1. Parity check added and passing: PASS.
2. No divergence introduced in existing snapshot path tests: PASS.
