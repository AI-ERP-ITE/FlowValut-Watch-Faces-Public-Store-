# Plan: Calibration and Flicker Pipeline Decoupling

## Clarification Steps (4)
1. Clarification 1: Device visual calibration and anti-flicker analysis are separate concerns and require independent toggles.
2. Clarification 2: Flicker warnings must be computed from pre-calibration pixels to avoid hidden risk.
3. Clarification 3: Flicker overlay should depend on analysis results but not force analysis recomputation by itself.
4. Clarification 4: Designers need side-by-side workflow control: raw design, calibrated display, and safety diagnostics.

## Implementation Steps
1. Add independent Studio states for calibration, flicker analysis, and flicker overlay toggles.
2. Update Studio controls UI labels/enablement to match the new three-toggle model.
3. Update InteractiveCanvas props to accept independent calibration and flicker-analysis controls.
4. Refactor canvas draw pipeline into ordered stages:
   - base render
   - optional flicker analysis
   - optional calibration transform
   - optional flicker overlay
5. Split existing device simulation logic so calibration transform and flicker overlay can run independently.
6. Preserve and route element warning payloads using flicker-analysis toggle (not calibration toggle).
7. Ensure overlay toggle does not trigger warning recompute unless analysis input changes.
8. Keep existing effect parity (shadow/engrave/icon effects) intact while introducing decoupling.

## Validation Steps (5)
1. Validation 1: App TypeScript build passes.
2. Validation 2: Toggle matrix behavior is correct for four key modes.
3. Validation 3: Element warning list appears when analysis enabled even if calibration disabled.
4. Validation 4: Calibration rendering works with analysis off.
5. Validation 5: Overlay only appears when analysis is enabled and overlay toggle is on.
