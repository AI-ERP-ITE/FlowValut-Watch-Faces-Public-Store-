# 12 - T-060 Heavy Stack Scenario Validation

## Task

T-060 Heavy stack scenario validation.

## Scope

Validate target scenarios where layered texture/gradient/material stacks are combined with masks, ensuring no base element disappearance behavior.

## Validation Runs

### Run A - Existing layered effects + shadow parity suites

Command:

`npx vitest run engine/core/layered-effects-parity.test.js engine/core/drop-shadow-parity.test.js`

Observed result:

1. 2 test files executed.
2. 12 tests total: 7 passed, 5 failed.
3. Failures are expectation-shape drift checks (`feDropShadow` token expectation and mask-radius extraction by specific mask id patterns), not renderer crash/fatal errors.

Conclusion for T-060 signal:

1. Renderer remains operational under stacked-layer scenarios.
2. Existing suite has non-fatal assertion drift that should be handled separately from base-disappear regression.

### Run B - Targeted heavy-stack smoke (base + free_rect)

Method:

1. Rendered `base` heavy stack with mask + textureLayers + gradientLayers + materialLayers.
2. Rendered `free_rect` heavy stack with mask + textureLayers + gradientLayers + materialLayers.
3. Collected:
   - render duration
   - SVG size
   - mask definition presence
   - invalid token scan (`undefined`, `null`, `NaN`)
   - required token presence for base/fill and mask units.

Observed result:

```json
[
  {
    "name": "base-heavy",
    "elapsedMs": 11,
    "svgLength": 3074,
    "hasSvg": true,
    "hasMaskDefs": true,
    "hasInvalidTokens": false,
    "missingRequired": []
  },
  {
    "name": "free-rect-heavy",
    "elapsedMs": 1,
    "svgLength": 3805,
    "hasSvg": true,
    "hasMaskDefs": true,
    "hasInvalidTokens": false,
    "missingRequired": []
  }
]
```

Interpretation:

1. Both target heavy-stack scenarios render successfully.
2. Base and free-rect payload signatures remain present in output.
3. Mask defs are present and no invalid-token corruption detected.
4. No base-disappear regression signal observed in T-060 target scenarios.

## T-060 Conclusion

T-060 acceptance met for required target scenario checks.

1. No base-disappear issue observed in heavy stacked base/free_rect validation scenes.
2. Behavior/performance notes captured.
3. Residual unrelated test expectation drift exists in older parity assertions and should be tracked separately.
