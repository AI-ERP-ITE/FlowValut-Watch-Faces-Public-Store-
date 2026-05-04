# Audit T012: Controller-Order Regression Validation (066)

## Scope
1. Validate no controller stack reordering after T006-T011.
2. Confirm source-routing refactor changed source selection only, not pass order.

## Expected Order Contract
1. Style tone/hue/contrast stage
2. Optional sharpen stage
3. Depth stage
4. Drop shadow stage
5. Tint stage
6. Final merge/composite stage

## Static Evidence
1. Controller stack remains implemented in [app/engine/core/renderer.js](app/engine/core/renderer.js#L530).
2. Depth stage still executes before drop-shadow stage in [app/engine/core/renderer.js](app/engine/core/renderer.js#L565) and [app/engine/core/renderer.js](app/engine/core/renderer.js#L623).
3. Tint stage still executes after depth/drop-shadow in [app/engine/core/renderer.js](app/engine/core/renderer.js#L651).
4. Final merge/composite remains terminal stage in [app/engine/core/renderer.js](app/engine/core/renderer.js#L661).
5. Source-routing additions are outside filter-stage sequencing and only select controller input bodies in [app/engine/core/renderer.js](app/engine/core/renderer.js#L1098).

## Executed Check
1. Command:
```powershell
node .\\node_modules\\vitest\\vitest.mjs run engine/core/layered-effects-parity.test.js
```
2. Result:
- pass: engine/core/layered-effects-parity.test.js (4/4)

## T012 Conclusion
1. No controller-order regression found.
2. Current changes preserve execution order and only make controller-source routing explicit.