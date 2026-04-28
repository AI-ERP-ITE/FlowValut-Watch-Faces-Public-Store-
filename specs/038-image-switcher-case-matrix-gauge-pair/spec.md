# Feature Specification: Image Switcher Case Matrix + Gauge Pair Composition

**Feature Branch**: `[038-image-switcher-case-matrix-gauge-pair]`  
**Created**: 2026-04-26  
**Status**: Draft

## Problem Statement
Current image-switcher behavior is partially hardcoded:
- `WEATHER_CURRENT` / `WEATHER_STATUS` expects 29 assets (correct for Zepp weather code coverage).
- `HEART` currently expects fixed count (6).
- Most other image-switcher types default to fixed count (10).

This does not satisfy user-controlled cases where heart-rate switcher should use custom frame sets (for example 4 or 5 images), and it does not explicitly define strict-vs-flexible rules for each data type.

For gauge visuals, pointer and range curve must remain Zepp-distinct widgets:
- Pointer = `IMG_POINTER`
- Curve/range = `ARC_PROGRESS`

The editor needs a clear composition rule so users can build one visual gauge from two runtime entities without merging runtime semantics.

## Goal
1. Define a deterministic case matrix for image-switcher asset counts by data type.
2. Allow user-defined frame counts for non-weather switchers (including `HEART`).
3. Preserve strict 29 weather requirement.
4. Define gauge composition as a linked pair (pointer + arc), emitted as two Zepp widgets.

## Scope
### In Scope
1. New image-switcher count policy and validation matrix.
2. `HEART` image-switcher custom frame count support (user-supplied list size, e.g. 4/5).
3. Fallback behavior when configured assets are missing/invalid.
4. Gauge pair composition model:
   - `GAUGE_POINTER` (`IMG_POINTER`)
   - `ARC_PROGRESS` (range/track)
   - optional logical linkage via shared center/angles/data type.
5. Build/export verification rules for asset presence and count consistency.

### Out of Scope
- Changing Zepp runtime widget contracts.
- Merging `IMG_POINTER` and `ARC_PROGRESS` into one runtime widget.
- Rewriting unrelated pipeline stages.

## Image Switcher Case Matrix
1. Weather status/current:
   - Required count: exactly 29
   - Reason: Zepp weather code set coverage
   - Validation: fail if count != 29
2. Heart rate (`HEART`) and other non-weather image-switchers:
   - Required count: user-defined (`N`), where `N >= 2`
   - Typical accepted sets: 4, 5, 6, 10, etc.
   - Validation: use exact supplied count, no forced conversion to 6/10
3. Missing user assets:
   - If strict mode enabled: fail build/export with descriptive error
   - If fallback mode enabled: generate deterministic placeholder set of size `N`

## Functional Requirements
1. The system MUST enforce `29` images for weather image-switchers.
2. The system MUST allow `HEART` image-switcher to use user-provided count (e.g., 4 or 5).
3. The system MUST preserve frame ordering exactly as supplied by user.
4. The system MUST emit the same image list into final generated config/export.
5. Gauge visuals MUST be represented as two widgets in generated code:
   - one `IMG_POINTER`
   - one `ARC_PROGRESS`
6. Optional gauge linkage MUST not alter underlying runtime widget types.

## Non-Functional Requirements
- Deterministic validation and fallback output.
- Backward compatibility for existing projects with 10-frame defaults.
- Build must fail fast on strict count violations with clear diagnostics.

## Acceptance Criteria
1. Weather image-switcher with non-29 list is rejected (strict) or auto-corrected with explicit warning (fallback mode).
2. Heart image-switcher with 4/5 frames exports successfully and uses exactly 4/5 assets.
3. Generated watchface config references only packaged frame filenames.
4. Gauge pair exports as two widgets (`IMG_POINTER` + `ARC_PROGRESS`) with aligned center/angle semantics when linked.
5. Existing faces without custom counts continue to work via compatibility defaults.
