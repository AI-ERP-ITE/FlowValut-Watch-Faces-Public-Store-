# Audit T013: Texture/Gradient/Material Parity Validation (066)

## Scope
1. Validate texture, gradient, and material layer behavior parity is preserved after source-routing refactor.
2. Validate clip target fallback behavior remains stable.

## Static Evidence
1. Texture/gradient/material clip fallback now routes through explicit UV-local geometry source selector in [app/engine/core/renderer.js](app/engine/core/renderer.js#L1111).
2. Clip resolution logic itself is unchanged and still resolved by `resolveClipMaskBody` in [app/engine/core/renderer.js](app/engine/core/renderer.js#L955).
3. Texture, gradient, and material masks still build via per-layer mask bodies in [app/engine/core/renderer.js](app/engine/core/renderer.js#L1151), [app/engine/core/renderer.js](app/engine/core/renderer.js#L1158), and [app/engine/core/renderer.js](app/engine/core/renderer.js#L1165).

## Executed Check
1. Command:
```powershell
node .\\node_modules\\vitest\\vitest.mjs run engine/core/layered-effects-parity.test.js
```
2. Result:
- pass: engine/core/layered-effects-parity.test.js (4/4)

## Covered Parity Assertions
1. Layer arrays survive geometry and compose stages.
2. SVG output changes when each effect family (texture/gradient/material) is toggled.
3. Named clip target behavior remains intact.
4. `inheritPrevious` clip fallback behavior remains intact.

## T013 Conclusion
1. Texture/gradient/material parity is preserved for current regression matrix.
2. No parity regression observed in validated layered-effects path.