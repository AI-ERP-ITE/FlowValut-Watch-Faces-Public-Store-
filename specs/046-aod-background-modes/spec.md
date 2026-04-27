# Feature Specification: AOD Background Modes

**Feature Branch**: `[046-aod-background-modes]`  
**Created**: 2026-04-27  
**Status**: Draft

## Problem Statement
AOD layout is now independently editable, but users cannot explicitly choose a dedicated AOD background strategy. Current generation flow still treats main background file as globally required, and users need a clear way to set AOD background behavior without polluting the main flow.

## Product Decision
AOD background controls MUST live in AOD editor context (not in initial main background upload flow).

Rationale:
1. AOD choices are advanced/optional and should appear when user is editing AOD.
2. Initial upload must remain fast for users who do not customize AOD.
3. Future AOD-only options (dimming, tint, battery-friendly variants) can extend the same section.

## Goal
Add explicit AOD background strategy selection with four modes:
1. `USE_MAIN_BACKGROUND`
2. `UPLOAD_AOD_BACKGROUND`
3. `SOLID_COLOR`
4. `NONE_BLACK`

## Functional Requirements
1. AOD panel MUST provide a dedicated “AOD Background” section visible only in AOD mode.
2. User MUST be able to switch background strategy among four modes.
3. `USE_MAIN_BACKGROUND`:
   - AOD uses main background asset at runtime/export.
4. `UPLOAD_AOD_BACKGROUND`:
   - User can upload a separate AOD image.
   - User can crop/edit this AOD image via existing background tooling path.
   - AOD background asset must be exported separately and referenced only by AOD widgets.
5. `SOLID_COLOR`:
   - User can pick a color.
   - Export must generate deterministic full-screen AOD background representation (battery-safe approach).
6. `NONE_BLACK`:
   - No AOD background image/widget is emitted.
   - AOD screen defaults to black.
7. Main background flow remains unchanged and required for current package pipeline compatibility unless a later spec changes global requirement.
8. Validation must distinguish:
   - design validation errors (e.g., missing required main background)
   - upload backend errors (e.g., backend bridge required)

## Data Model Requirements
1. Add persistent AOD background settings in source metadata/config:
   - mode
   - aodBackgroundImage (optional)
   - aodBackgroundFileRef (optional)
   - aodSolidColor (optional)
2. Round-trip regeneration from `source.json` MUST preserve AOD background mode and payload.

## Export/Generation Requirements
1. Generation pipeline MUST resolve AOD background behavior before widget emission.
2. AOD background asset naming MUST be deterministic and collision-safe.
3. When `NONE_BLACK`, generator MUST not inject fallback background image for AOD.
4. Existing main mode rendering/export MUST remain behaviorally unchanged.

## UX Requirements
1. AOD background controls appear only when editor mode is `AOD` and AOD is initialized.
2. Controls must include concise descriptions for each mode.
3. Mode switch should immediately update AOD canvas preview.
4. Upload controls should be hidden unless `UPLOAD_AOD_BACKGROUND` is selected.
5. Color picker should be hidden unless `SOLID_COLOR` is selected.

## Non-Goals
1. Replacing global main background requirement in this feature.
2. Designing a dual-upload requirement in the initial onboarding step.
3. Introducing automatic sync rules between main and AOD backgrounds after selection.

## Acceptance Criteria
1. User can configure AOD background independently from main background.
2. User can upload a dedicated AOD background and see it only in AOD preview/export.
3. User can select solid color and see full-screen color in AOD preview/export.
4. User can select no background and exported AOD has black background behavior.
5. Main preview/export remains unchanged by AOD background operations.
6. Generation error messages clearly separate validation issues from backend bridge upload issues.
