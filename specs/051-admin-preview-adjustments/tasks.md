# Tasks: Admin + Preview Adjustment Suite

## Clarification (C)
- [x] C001 Confirm store deletion policy uses soft delete (offline), not hard delete.
- [x] C002 Confirm edit-existing flow needs QR retention toggle.
- [x] C003 Confirm transforms required for both main and AOD backgrounds.
- [x] C004 Confirm AOD flicker parity required across all AOD background modes.

## Implementation (T)
- [x] T001 Add Firebase admin endpoint: list full catalog with status (enabled/offline).
- [x] T002 Add Firebase admin endpoint: set catalog status (enabled/offline).
- [x] T003 Add frontend API bindings for admin catalog status list/update.
- [x] T004 Add Admin Ops UI for lifecycle status management.
- [x] T005 Add watchface config fields for main background transforms.
- [x] T006 Add watchface config fields for AOD background transforms.
- [x] T007 Add main background transform controls (slider/input/presets/flips).
- [x] T008 Add AOD background transform controls (slider/input/presets/flips).
- [x] T009 Wire background transform preview parity for main and AOD canvases.
- [ ] T010 Add edit-existing watchface load + republish mode (keep QR vs regenerate all).
- [x] T011 Expand custom HTML creator support for static image elements.
- [x] T012 Expand custom HTML creator support for weather status sets/weather current.
- [x] T013 Expand custom HTML creator support for gauge pointer data type paths.
- [ ] T014 Extend hue controls to all supported image-like element types.
- [x] T015 Fix engrave property panel mapping so controls always render.
- [x] T016 Unify pointer and element shadow normalization path.
- [x] T017 Extend erase-flickery-shadows + warning logic to AOD background modes matrix.

## Validation (V)
- [ ] V001 Firebase functions build passes.
- [ ] V002 App build:private passes.
- [ ] V003 Admin lifecycle smoke test passes (offline/exposed split).
- [ ] V004 Preview parity checks pass for transform + shadow updates.
- [ ] V005 AOD mode matrix verifies flicker controls and warnings in all modes.
