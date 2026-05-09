# Spec 084 – Watchface-Safe Effect Parameter Overhaul

## Scope

ONLY touch:
- Element Style FX: `highlight`, `shadows`, `contrast`, `sharpness`, `hue`, `colorOpacity`
- Element Depth FX: `intensity`, `opacity`, `light.x`, `light.y`, `light.z`, `distance`, `falloff`, `whiteBalance`, `spread`

DO NOT touch:
- Texture controls
- Renderer / filter logic
- Masks / geometry / snapshots
- Drop Shadow (already has profiles)

## Problem Statement

1. Style FX and Depth FX sliders expose raw renderer float range directly (e.g. `highlight` -1..1 when only ±0.20 is perceptually useful on a watchface).
2. No throttle / debounce → slider drags spam re-renders on every `mousemove` tick.
3. Display shows raw floats (e.g. `0.091347772`) via `formatSignedPercent` when the stored value leaks fractional precision.
4. No adaptive step → slider jumps feel coarse at low values.

## Solution Strategy

1. Add `app/engine/ui/effectProfiles.ts` — watchface-safe profile registry for all 14 effect keys.
2. Add `app/engine/ui/effectMapping.ts` — re-exports `mapUiValueToRenderValue` / `mapRenderValueToUiValue` bound to the effect registry.
3. Extend `app/engine/ui/parameterProfiles.ts` re-export.
4. Update `ParametricPage.tsx`:
   - Change slider min/max to clean UI units (−100..100 or 0..100 integer).
   - On `onChange`: UI → render via profile, store render value (no stored format break — render value is still stored in `styleAdjust` / `effect3d`).
   - On controlled `value`: render → UI via profile.
   - Display: `Math.round(uiValue)` so display is always a clean integer.
   - Wrap `onChange` in `queueThrottledSliderUpdate` (16 ms gate) for all affected sliders.
   - Apply `resolveAdaptiveRenderStep` to dynamic `step` prop.
5. Add test file `app/scripts/test/effectProfiles.test.mjs`.

## Render Range Envelopes (Watchface-Safe)

| key | UI range | renderMin | renderMax | curve |
|-----|----------|-----------|-----------|-------|
| highlight | −100..100 | −0.20 | 0.20 | soft-knee |
| shadows | −100..100 | −0.20 | 0.20 | soft-knee |
| contrast | −100..100 | −0.18 | 0.18 | gamma |
| sharpness | 0..100 | 0 | 0.35 | exponential |
| colorOpacity | 0..100 | 0 | 1.00 | linear |
| depthIntensity | 0..100 | 0 | 0.45 | gamma |
| depthOpacity | 0..100 | 0 | 0.50 | gamma |
| lightX | −100..100 | −1.00 | 1.00 | soft-knee |
| lightY | −100..100 | −1.00 | 1.00 | soft-knee |
| lightZ | 0..100 | 0.20 | 1.00 | soft-knee |
| depthDistance | 0..100 | 0.60 | 1.60 | soft-knee |
| depthFalloff | 0..100 | 0.60 | 1.50 | soft-knee |
| depthWhiteBalance | −100..100 | −0.25 | 0.25 | soft-knee |
| depthSpread | 0..100 | 0 | 0.25 | soft-knee |

Note: `hue` stays as-is (−180..180 integer, no profile needed).

## Backward Compatibility

- Stored values remain in render space (no stored format change).
- Clamping at new renderMin/renderMax caps extreme legacy values — intended "watchface-safe" behaviour.
- Depth presets still write render values directly; slider just reverse-maps for display.

## Required Commits

```
feat: add watchface-safe effect parameter profiles
feat: add perceptual mapping for style and depth controls
fix: compress contrast sharpness and depth ranges
fix: reduce effect slider rerender spam
test: add effect parameter behavior coverage
```
