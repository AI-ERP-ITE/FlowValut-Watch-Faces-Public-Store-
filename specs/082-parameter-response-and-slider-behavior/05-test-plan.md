# 05 - Test Plan

## Scope
Validate parameter behavior, control quality, and interaction performance improvements without renderer-internal rewrites.

## Required Matrix

### TP-001 Blur Near Zero Smoothness
1. Drag blur from 0 upward in low range.
2. Confirm response is gradual and controllable.
3. Confirm no sudden jump in visual intensity.

### TP-002 Opacity Stability
1. Sweep opacity across low-to-mid region.
2. Confirm no abrupt disappear behavior.
3. Confirm displayed value is rounded/percent style.

### TP-003 Spread Stability
1. Sweep spread in low-to-mid range.
2. Confirm no visual explosion at small deltas.

### TP-004 Slider Spam Reduction
1. Perform rapid drag interactions.
2. Compare raw slider events vs applied mapped writes.
3. Confirm significant reduction in rerender/update spam.

### TP-005 Large Scene Responsiveness
1. Test in 20+ layer scene.
2. Validate smoother slider interaction and reduced stutter.
3. Confirm final visual output remains consistent with mapped behavior intent.

## Regression Guard
1. No renderer architecture changes.
2. No filter math redesign.
3. No snapshot architecture modification.
