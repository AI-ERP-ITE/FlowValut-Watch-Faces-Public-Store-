# Feature Specification: Strict Gap Audit + Pointer Coverage Extension

**Feature Branch**: `[036-pointer-gap-coverage]`  
**Created**: 2026-04-24  
**Status**: Draft

## Objective
Close the confirmed Zepp capability gap where `IMG_POINTER` has no element representation, while keeping existing architecture and generator logic stable.

## Scope
- Keep existing behavior unchanged for:
  - `ELEMENT_TO_DATA`
  - `DATA_TO_ELEMENT`
  - UI logic
  - `generateWidgetCode`
- Extend only with deterministic capability completion:
  - Add new element `GAUGE_POINTER`
  - Map `GAUGE_POINTER` -> `IMG_POINTER` in audit model
  - Add strict supported data set for `GAUGE_POINTER`
  - Ensure reverse mapping includes `GAUGE_POINTER` for those data types

## Zepp Pointer Rules (Confirmed)
- `TIME_POINTER`: time-only analog hands (hour/minute/second)
- `IMG_POINTER`: data-driven rotating gauge needle
- These are distinct systems and must not be merged.

## Required Data Set for `GAUGE_POINTER`
Allowed:
- `BATTERY`
- `STEP`
- `CAL`
- `DISTANCE`
- `STAND`
- `PAI`
- `FAT_BURN`
- `STRESS`
- `SPO2`
- `HUMIDITY`
- `UVI`
- `AQI`
- `HEART`

Excluded:
- `WEATHER_CURRENT`
- `WEATHER_STATUS`
- `MOON`
- boolean/status types
- time/date types

## Validation Note (Documentation-Only)
`GAUGE_POINTER` uses Zepp rotational mapping fields:
- `start_angle`
- `end_angle`
- normalized value handled by Zepp runtime

No custom angle math is introduced in this feature.

## Acceptance Criteria
- `ELEMENT_TO_WIDGET.GAUGE_POINTER = "IMG_POINTER"` exists.
- `ELEMENT_TO_DATA.GAUGE_POINTER` matches required data set exactly.
- `DATA_TO_ELEMENT` contains `GAUGE_POINTER` for all supported types.
- Gap audit result changes from:
  - `missingElementForWidget: ["IMG_POINTER"]`
  to:
  - `missingElementForWidget: []`
- Build passes with no TypeScript errors in changed files.

## Process Compliance (specsmd-mater)
- Full Zepp flow:
  - ANALYZE -> LOCATE -> CLARIFY -> PLAN -> CONFIRM -> IMPLEMENT -> BUILD -> DEPLOY -> VERIFY
- Execution guard:
  - no code before approval
  - no continuation after PLAN without approval
  - approval keywords: `approve` or `proceed`
