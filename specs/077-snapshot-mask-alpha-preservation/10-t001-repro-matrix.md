# 10 - T-001 Repro Matrix

## Task

T-001 Reproduce alpha-loss matrix

## Environment

1. Route: /Watch-Faces/studio/parametric/
2. Element used for repro: free_rect (or equivalent shape with fill + stroke + drop shadow/effects)
3. Mask mode: local coordinate space

## Preconditions

1. Shape has visible base fill and stroke.
2. Shape has at least one external-looking effect (shadow/depth/material) so effect-only state is obvious.
3. Snapshot controls enabled.

## Repro Scenario A

Flow: live -> snapshot -> mask -> stroke edit

Steps:
1. Create shape with visible fill and stroke.
2. Add visible effect stack.
3. Click Create Snapshot.
4. Click Use Snapshot.
5. Apply mask stroke/selection over part of shape.
6. Change stroke-related value (for example thickness or stroke color).

Observed baseline:
1. Base alpha can collapse in masked region.
2. Visual appears as effects-only or mostly effects-dominant remnants.

Deterministic trigger:
- Post-mask visual edit makes snapshot no longer fresh and can trigger live fallback path while mask intent remains in prior frame assumptions.

## Repro Scenario B

Flow: live -> snapshot -> mask -> delete snapshot

Steps:
1. Create shape with visible fill and stroke.
2. Add visible effect stack.
3. Click Create Snapshot.
4. Click Use Snapshot.
5. Apply mask over shape.
6. Click Delete Snapshot.

Observed baseline:
1. Shape can switch to an effects-only appearance.
2. Base body alpha appears missing or heavily clipped.

Deterministic trigger:
- Deleting snapshot forces source mode to live while existing mask intent is interpreted under a different rendered frame behavior.

## Repro Scenario C

Flow: live -> mask -> snapshot -> live

Steps:
1. Create shape with visible fill and stroke.
2. Apply mask in live mode.
3. Create snapshot and use snapshot.
4. Return to live source mode.

Observed baseline:
1. Mask visual alignment can drift across mode transitions.
2. In affected states, base alpha can appear unexpectedly reduced while effects remain visible.

Deterministic trigger:
- Repeated source-mode transitions with mask present expose frame interpretation mismatch.

## Baseline Conclusion

T-001 done criteria met:
1. Three target flows documented.
2. Deterministic user-action steps documented.
3. Baseline failure signature captured: base alpha loss with effects-only remnants.
