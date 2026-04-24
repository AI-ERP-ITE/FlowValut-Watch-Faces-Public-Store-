# Feature Specification: Shadow Clamp (Black Threshold)

**Feature Branch**: `[033-shadow-clamp-black-threshold]`  
**Created**: 2026-04-24  
**Status**: Draft  
**Input**: User request to add hardware-aware near-black clamp in BackgroundPhotoEditor before flicker analysis.

## Goal
Add a new Detail control called Shadow Clamp that clamps unsafe near-black channel values on the final pixel buffer before flicker analysis.

## Functional Requirements

- FR-001: Add a new control named Shadow Clamp in BackgroundPhotoEditor under the Detail section.
- FR-002: Shadow Clamp range must be 30 to 60, step 1, default 47.
- FR-003: Add state field for shadowClamp with default 47.
- FR-004: Apply hard clamp per channel on final RGBA pixel buffer after all existing adjustments and before analyzeFlicker.
- FR-005: Clamp logic must skip fully transparent pixels via alpha check.
- FR-006: Clamp logic must use per-channel threshold, not luminance.
- FR-007: Flicker results must update in real time on slider movement.
- FR-008: Do not modify flickerEngine internals.

## Clamp Logic
For each non-transparent pixel:
- if 0 < R < threshold then R = 0
- if 0 < G < threshold then G = 0
- if 0 < B < threshold then B = 0

## Validation Cases
- VC-001: With clamp disabled/low, risk can appear.
- VC-002: At threshold 47, near-black unsafe values are reduced and risk should drop.
- VC-003: At threshold 60, clamp is aggressive and may reduce shadow detail while reducing risk.

## Non-Goals
- No changes to flickerEngine thresholds or forbidden-band definitions.
- No smoothing mode in initial implementation.
