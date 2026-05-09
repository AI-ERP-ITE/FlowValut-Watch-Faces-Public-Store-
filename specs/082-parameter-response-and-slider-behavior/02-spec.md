# 02 - Specification

## Objective
Fix harsh and unstable parameter interaction behavior without changing renderer architecture or internal effect math.

## Core Principle
Current (disallowed):
1. `UI value === render value`

Required:
1. `UI value -> perceptual mapping -> render value`

## Stage 1 - Parameter Response Definitions

Create:
1. `app/engine/ui/parameterProfiles.ts`

Required types:
1. `type ParameterCurve = "linear" | "exponential" | "gamma" | "soft-knee" | "logarithmic"`
2. `type ParameterProfile = { uiMin; uiMax; renderMin; renderMax; curve; precision; debounceMs?; adaptiveStep? }`

## Stage 2 - Parameter Mapping Functions

Create:
1. `app/engine/ui/parameterMapping.ts`

Required APIs:
1. `mapUiValueToRenderValue(uiValue, profile)`
2. `mapRenderValueToUiValue(renderValue, profile)`

Required curves:
1. linear
2. exponential: `Math.pow(normalized, 1.8)`
3. gamma: `Math.pow(normalized, 2.2)`
4. soft-knee: `normalized / (normalized + 0.5)` then normalized
5. logarithmic: `Math.log10(1 + normalized * 9)`

## Stage 3 - Real Parameter Profiles

Define required profiles:

1. `shadowOpacity`
2. `shadowBlur`
3. `shadowSpread`
4. `shadowOffset`

Required profile constraints:
1. UI ranges and render ranges must be separated.
2. Mapping curves must match requested behavior.
3. Debounce and adaptive stepping flags must be supported.

## Stage 4 - Remove Raw Float Display

Requirements:
1. No raw float spam in UI.
2. Show rounded values, percentages, simplified units.
3. Example style: `47%`, not `0.4676003`.

## Stage 5 - Adaptive Step System

Create:
1. `app/engine/ui/adaptiveSteps.ts`

Requirements:
1. Finer movement near low ranges.
2. Faster traversal near high ranges.
3. Profile-aware adaptive behavior.

## Stage 6 - Slider Event Throttling

Requirements:
1. Add requestAnimationFrame throttling for drag updates.
2. Enforce 16ms minimum debounce for slider drag updates.
3. Avoid per-mouse-event rerender writes.

## Stage 7 - Internal Precision Normalization

Requirements:
1. Clamp mapped renderer values to sane precision before write.
2. Reduce float noise and cache invalidation churn.

## Stage 8 - Parameter Inspector Debug Panel

Requirements:
1. Optional dev-only panel.
2. Show UI value, mapped render value, curve type.

## Stage 9 - Validation Tests

Required tests:
1. Blur near zero smoothness.
2. Opacity no abrupt disappearance.
3. Spread stability at small values.
4. Slider drag rerender spam reduction.
5. Large-scene interaction responsiveness improvement.

## Stage 10 - Review Process

For each stage:
1. Run tests.
2. Print changed files.
3. Summarize UX impact.
4. Summarize performance impact.
5. Verify renderer visuals unchanged except parameter behavior.
6. Commit stage scope separately.

## Required Commit Names
1. `feat: add perceptual parameter response system`
2. `feat: add nonlinear parameter mapping curves`
3. `feat: add adaptive slider stepping`
4. `fix: reduce slider rerender spam`
5. `fix: normalize parameter precision`
6. `test: add parameter behavior validation coverage`
