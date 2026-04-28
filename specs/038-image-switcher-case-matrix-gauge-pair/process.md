# Process: Image Switcher Count Matrix + Gauge Pair Through ZPK

## Objective
Implement deterministic, data-type-aware image-switcher asset count handling while preserving Zepp gauge runtime semantics (pointer and arc as distinct widgets).

## Process Rules
- Follow strict stage order from specsmd-mater.
- Do not begin implementation before explicit approval (`approve` or `proceed`).
- Execute tasks sequentially.

## Image Switcher Count Rules
1. Weather (`WEATHER_CURRENT`, `WEATHER_STATUS`):
   - Exactly 29 frames.
2. Non-weather image switcher (including `HEART`):
   - Use exact user-provided frame count (`N`).
   - Minimum allowed: 2.
3. Legacy fallback when no explicit frame list exists:
   - compatibility default can remain available, but must not override explicit user sets.

## Gauge Pair Rules
1. Gauge visual composition consists of:
   - `GAUGE_POINTER` -> Zepp `IMG_POINTER`
   - range curve -> Zepp `ARC_PROGRESS`
2. These remain distinct runtime widgets.
3. Optional editor linkage may sync:
   - center
   - start/end angle
   - data type intent

## Validation Matrix
1. Weather with 29 frames -> pass.
2. Weather with non-29 frames -> fail strict / warn + normalize in fallback mode.
3. Heart with 4 frames -> pass and export 4.
4. Heart with 5 frames -> pass and export 5.
5. Legacy face without explicit list -> compatibility path pass.

## Export Verification
1. Build passes.
2. Packaged assets count matches resolved list count per element.
3. Extracted watchface output preserves dual-widget gauge semantics:
   - one `IMG_POINTER`
   - one `ARC_PROGRESS`
