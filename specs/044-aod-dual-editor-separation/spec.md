# Feature Specification: Dual MAIN/AOD Editor Separation

**Feature Branch**: `[044-aod-dual-editor-separation]`  
**Created**: 2026-04-27  
**Status**: Draft

## Problem Statement
Current editor keeps one shared element array for both normal watchface and AOD. Any edit affects both layouts, which blocks building a minimal, battery-optimized AOD design.

## Goal
Implement a fully separate AOD editor workflow that:
1. Starts from an on-demand deep copy of main layout.
2. Allows fully independent editing after copy.
3. Exports AOD in ZPK from AOD layout data, not from main layout duplication.

## Conceptual Model
The system must maintain two independent element states:
1. `MAIN_ELEMENTS` (normal watchface editor data).
2. `AOD_ELEMENTS` (AOD editor data).

After AOD initialization, no live or implicit synchronization is allowed.

## Functional Requirements
1. Editor mode must support `MAIN` and `AOD`.
2. Canvas, inspector, element list, and add/remove/edit actions must bind to active mode elements only.
3. Initial state must treat AOD as uninitialized (empty/undefined) until user requests creation.
4. User action `Create AOD from current design` must deep-copy `MAIN_ELEMENTS` into `AOD_ELEMENTS`.
5. After copy, edits in `AOD_ELEMENTS` must not mutate `MAIN_ELEMENTS`.
6. After copy, edits in `MAIN_ELEMENTS` must not mutate `AOD_ELEMENTS`.
7. In AOD mode, each element must support:
   - visibility toggle in AOD
   - position changes
   - size changes
   - color/style changes
   - deletion (AOD-only)
   - new element creation (AOD-only)
8. No shared-reference linking is allowed between corresponding main/aod elements.
9. No auto-sync, no inheritance refresh, and no partial-override model is allowed after copy.

## Export and Generation Requirements
1. ZPK generation must consume `MAIN_ELEMENTS` for normal widgets.
2. ZPK generation must consume `AOD_ELEMENTS` for AOD widgets.
3. Generator must not synthesize AOD by duplicating main layout when `AOD_ELEMENTS` is initialized.
4. If `AOD_ELEMENTS` is not initialized, generation behavior must fail with explicit guidance or use a clearly defined fallback (to be decided in implementation).
5. Source metadata serialization (`source.json`) must persist both main and AOD element sets to enable deterministic regeneration.

## UX Requirements
1. Provide clear mode switch in preview/adjust workspace: `MAIN` | `AOD`.
2. Provide one explicit action to initialize/sync once: `Create AOD from current design`.
3. Show AOD initialization status (not created vs created).
4. Mode switch must preserve independent selection state where practical to avoid accidental cross-mode edits.

## Non-Goals
1. Live bi-directional sync between main and AOD.
2. Linked elements with per-field override inheritance.
3. Automatic post-copy updates from main to AOD.

## Acceptance Criteria
1. User can complete full main layout without affecting AOD state.
2. Clicking `Create AOD from current design` creates deep-copied AOD layout once.
3. In AOD mode, move/resize/color/add/remove only affects AOD data.
4. Returning to MAIN mode shows untouched main layout.
5. Generating ZPK outputs normal widgets from main and AOD widgets from AOD.
6. Generated watchface does not mirror main into AOD when user customized AOD.
7. Round-trip regeneration from saved source data preserves both independent layouts.

## Test Scenarios
1. Main-only edit before AOD init: verify AOD remains uninitialized.
2. Initialize AOD: verify element identity/data is deep-copied.
3. AOD delete element X: verify X remains in main.
4. Main recolor element Y: verify AOD Y color unchanged.
5. Add AOD-only element Z: verify Z absent in main and present in AOD export.
6. ZPK runtime check: AOD screen reflects AOD editor configuration, not duplicated main configuration.
