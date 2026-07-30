# Feature Specification: Watch-Safe Week/Month Export Toggle

**Created:** 2026-07-30  
**Status:** Approved for implementation

## Problem

Browser-antialiased weekday and month PNG labels can look correct in the Studio
preview but show pale or offset edge artifacts on an Amazfit watch. Spec 129
isolated the first divergence to transparent-canvas `fillText()` alpha masks and
validated a coverage-and-centroid-preserving binary-alpha workaround on the
physical watch.

## Goal

Add an opt-in, per-layer export compatibility toggle for `IMG_WEEK` and
month-name `IMG_DATE` elements.

## Requirements

1. The toggle defaults to off for existing and new elements.
2. The toggle persists in FVWF project data.
3. The browser preview remains unchanged.
4. When enabled, only final exported label PNGs receive the Spec 129 transform.
5. Main and AOD layers remain independently configurable.
6. Font fitting, dimensions, coordinates, alignment, arrays, naming, colors,
   and every numeric/image pipeline remain unchanged.

## Acceptance Criteria

1. Disabled output retains its original antialiased alpha.
2. Enabled output contains only alpha 0/255.
3. Coverage error is below 0.5 pixel.
4. Centroid shift is below 0.01 pixel.
5. Output dimensions and dominant text RGB are preserved.
6. FVWF serialization round-trips the toggle.
7. Tests, verification suite, and private production build pass.

