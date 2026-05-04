# Audit T011: Pivot/Transform Regression Validation (066)

## Scope
1. Validate pivot/transform behavior is unchanged after source-routing tasks T006-T010.
2. Confirm placement/symmetry pipelines are intact.

## Static Evidence
1. Placement resolution remains sourced from [app/engine/core/placement.js](app/engine/core/placement.js) and called unchanged in [app/engine/core/renderer.js](app/engine/core/renderer.js#L1303).
2. Symmetry expansion remains sourced from [app/engine/core/symmetry.js](app/engine/core/symmetry.js) and called unchanged in [app/engine/core/renderer.js](app/engine/core/renderer.js#L1304).
3. World transform composition still applies `translate(x y) rotate(rotation)` in [app/engine/core/renderer.js](app/engine/core/renderer.js#L1325).
4. Layer transform wrapper remains `translate + rotate` in [app/engine/core/renderer.js](app/engine/core/renderer.js#L1228).
5. Source-routing changes are confined to controller source selection and clip-mask fallback routing in [app/engine/core/renderer.js](app/engine/core/renderer.js#L1068).

## Executed Checks
1. Command:
```powershell
node .\node_modules\vitest\vitest.mjs run engine/core/placement-symmetry.test.js engine/core/layered-effects-parity.test.js engine/core/drop-shadow-parity.test.js
```
2. Results:
- `engine/core/placement-symmetry.test.js`: pass (5/5)
- `engine/core/layered-effects-parity.test.js`: pass (4/4)
- `engine/core/drop-shadow-parity.test.js`: fail (3/8 failed)

## T011 Conclusion
1. Pivot/transform validation passed based on static transform-path review and passing placement/symmetry tests.
2. No evidence of pivot semantics change introduced by T006-T010.

## Residual Risk (Outside T011 Scope)
1. Drop-shadow parity assertions currently fail because tests expect `feDropShadow` tokens, while renderer output uses Gaussian/offset/composite pipeline in failing cases.
2. This affects drop-shadow parity coverage and should be addressed under later parity/regression tasks, not pivot/transform semantics.