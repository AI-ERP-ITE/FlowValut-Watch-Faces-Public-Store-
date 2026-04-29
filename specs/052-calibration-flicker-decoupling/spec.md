# Feature Specification: Calibration and Flicker Pipeline Decoupling

**Feature Branch**: `[052-calibration-flicker-decoupling]`  
**Created**: 2026-04-29  
**Status**: Draft

## Objective
Decouple device-display calibration simulation from anti-flicker analysis/overlay so designers can independently control visual parity and safety diagnostics without conflicts or duplicated restrictions.

## Product Decisions (Locked)
1. Calibration simulation and anti-flicker analysis are separate systems.
2. Flicker analysis always evaluates pre-calibration pixels.
3. Flicker overlay is a visualization layer and must not mutate warning logic.
4. Designers must be able to run anti-flicker analysis while calibration is disabled.

## Scope
1. Studio toggle model and control behavior.
2. Interactive canvas render pipeline ordering.
3. Element warning payload routing and visibility behavior.
4. Flicker overlay behavior and dependency rules.

## Functional Requirements

### FR-1 Independent Toggle Model
1. Studio MUST expose independent toggles for:
   - Calibration simulation
   - Anti-flicker analysis
   - Flicker overlay
2. Flicker overlay toggle MUST require analysis enabled.
3. Refresh warnings action MUST require analysis enabled.

### FR-2 Pipeline Stage Separation
1. Canvas rendering MUST run in deterministic stages:
   - Base render
   - Flicker analysis (optional)
   - Calibration transform (optional)
   - Flicker overlay (optional)
2. Flicker analysis MUST use the base-render image data.
3. Calibration transform MUST not alter warning computation.

### FR-3 Warning Consistency
1. Element warnings MUST be produced when analysis is enabled regardless of calibration toggle state.
2. Element warnings MUST be cleared when analysis is disabled.
3. Warning recomputation MUST depend on analysis inputs and manual refresh, not overlay-only toggle changes.

### FR-4 Overlay Behavior
1. Scene-level overlay mask MUST be generated from pre-calibration image data.
2. Overlay visualization MUST be applied on the currently displayed frame as final stage.
3. Overlay must remain optional and not affect exported assets.

### FR-5 Backward Safety
1. Existing effect parity behavior (shadow normalization, icon effects, engrave normalization) MUST remain unchanged.
2. Existing anti-flicker threshold semantics (forbidden range 1-46) MUST remain unchanged.

## Non-Goals
1. Per-model calibration profile UI in this feature.
2. Flicker threshold redesign.
3. Export pipeline behavior changes.

## Acceptance Criteria
1. Designers can run anti-flicker analysis with calibration off.
2. Designers can run calibration with anti-flicker analysis off.
3. Overlay only works when analysis is on.
4. Warning list in element panel follows analysis toggle (not calibration toggle).
5. TypeScript build succeeds and no new diagnostics appear in touched files.
