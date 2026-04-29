# Tasks: Calibration and Flicker Pipeline Decoupling

## Clarification (C)
- [x] C001 Confirm calibration and anti-flicker should be independently toggleable.
- [x] C002 Confirm flicker analysis must evaluate pre-calibration pixels.
- [x] C003 Confirm overlay is visualization-only and not warning logic.
- [x] C004 Confirm requirement to avoid duplicated restrictions between systems.

## Implementation (T)
- [x] T001 Add separate Studio states for calibrationEnabled, flickerAnalysisEnabled, flickerOverlayEnabled.
- [x] T002 Update Studio control labels and enablement rules for new toggle model.
- [x] T003 Update InteractiveCanvas prop contract to accept independent controls.
- [x] T004 Refactor draw flow to run analysis independent of calibration toggle.
- [x] T005 Split applyDeviceSimulation into calibration-only transform and optional overlay stage.
- [x] T006 Ensure warning payload visibility in ElementList depends on analysis toggle.
- [x] T007 Remove overlay-only recompute coupling from warning force-recompute logic.
- [x] T008 Keep existing effect parity logic unchanged and verify no regressions.

## Validation (V)
- [x] V001 App TypeScript build passes.
- [x] V002 Problems check passes for touched files.
- [x] V003 Toggle matrix behavior verified in code path.
- [x] V004 Warning list behavior matches analysis toggle semantics.
- [x] V005 Overlay dependency on analysis is enforced.
