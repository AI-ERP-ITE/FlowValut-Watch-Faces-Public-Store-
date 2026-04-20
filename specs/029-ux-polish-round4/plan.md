# Spec 029 — UX Polish Round 4

## Overview
17-task polish sprint addressing bugs, missing UI, element renaming, data type correctness, and engrave frame enhancements discovered during testing of Spec 027/028.

## Goals
1. Fix all known UI bugs (duplicate shadow, IMG_STATUS wrong data, icon effects missing)
2. Align all data type dropdowns to official Zepp OS hmUI.data_type registry
3. Improve engrave/emboss frame: depth slider, light direction, custom colors, shapes
4. Improve element discoverability: rename labels, add tooltips, add missing elements
5. Fix canvas interaction bugs (TIME_POINTER blocking, selection opacity)

## Source of Truth
- Manual Guide (local) = docs.zepp.com mirror
- Official hmUI.data_type: BATTERY, STEP, CAL, DISTANCE, HEART, PAI_WEEKLY, SPO2, STRESS, SUN_RISE, UVI, AQI, ALTIMETER, VO2MAX, SLEEP, TRAINING_LOAD
- Official hmUI.system_status: DISCONNECT, CLOCK, DISTURB, LOCK

## Files Affected
- src/components/PropertyPanel.tsx — most tasks
- src/components/InteractiveCanvas.tsx — T4, T5, T11, T12
- src/StudioApp.tsx — T13, T14, T15
- src/types/index.ts — T9, T10, T11, T14, T15
- src/lib/jsCodeGenerator.ts + jsCodeGeneratorV2.ts — T14, T15, T17
