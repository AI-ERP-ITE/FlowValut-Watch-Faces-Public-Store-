# 03 - Architecture

## Design Intent
Introduce a UI-side Parameter Response System that maps user-space controls to render-space values without modifying renderer internals.

## New UI Engine Modules

### A. Parameter Profiles
File:
1. `app/engine/ui/parameterProfiles.ts`

Responsibilities:
1. Define canonical profile metadata per parameter.
2. Capture UI ranges, render ranges, curve, precision, and interaction hints.

### B. Mapping Engine
File:
1. `app/engine/ui/parameterMapping.ts`

Responsibilities:
1. Convert user values into render values.
2. Convert render values into user-space values for editor display.
3. Keep mapping deterministic and reversible within precision bounds.

### C. Adaptive Step Engine
File:
1. `app/engine/ui/adaptiveSteps.ts`

Responsibilities:
1. Compute dynamic slider step size based on current position and profile.
2. Preserve micro control near low end while enabling fast traversal near high end.

## Integration Boundaries
1. Parametric controls emit user-space values.
2. Parameter Response System maps to render-space values.
3. Existing update methods receive mapped render-space values only.
4. Renderer internals remain unchanged.

## Interaction Pipeline
1. User drags slider.
2. Slider update is throttled (rAF + debounce).
3. UI value mapped via profile curve.
4. Result rounded by profile precision policy.
5. Render-space value applied.

## Observability
1. Optional debug panel:
   - uiValue
   - mappedRenderValue
   - curve
2. Optional counters:
   - sliderEventsRaw
   - sliderEventsApplied
   - mappedWrites
