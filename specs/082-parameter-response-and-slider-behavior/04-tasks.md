# 04 - Detailed Tasks

Task status values:
1. Not Started
2. In Progress
3. Done
4. Blocked

Approval rule:
1. Every task is approval-gated.
2. Stop after each task, show evidence, wait for user approval.

## Gate A - Baseline

### T-001 Create strict spec package
Inputs: user request and non-negotiable constraints
Output: complete `082-parameter-response-and-slider-behavior` spec docs
Done criteria: all stages and commit rules captured accurately
Status: Done

## Gate B - Parameter Response Core

### T-010 Add parameter profile definitions
Inputs: required profile type contract
Output: `app/engine/ui/parameterProfiles.ts`
Done criteria: canonical type and profile registry created
Status: Done

### T-011 Add mapping curve engine
Inputs: required mapping formulas
Output: `app/engine/ui/parameterMapping.ts`
Done criteria: ui->render and render->ui mappings implemented for all curves
Status: Done

### T-012 Add concrete shadow parameter profiles
Inputs: required opacity/blur/spread/offset profile definitions
Output: profile entries wired for shadow parameters
Done criteria: requested ranges, curve choices, precision, debounce flags defined
Status: Done

## Gate C - UI Interaction Behavior

### T-020 Remove raw float parameter display
Inputs: existing control value presenters
Output: rounded/percent display behavior only
Done criteria: no raw renderer floats visible in parameter UI
Status: Done

### T-021 Add adaptive slider stepping
Inputs: profile metadata and slider controls
Output: `app/engine/ui/adaptiveSteps.ts` and control integration
Done criteria: fine low-end control and faster high-end traversal
Status: Done

### T-022 Add slider update throttling
Inputs: slider drag event path
Output: rAF throttle + minimum 16ms debounce behavior
Done criteria: no per-event rerender storm during drag
Status: Done

### T-023 Normalize mapped precision writes
Inputs: mapped render-space values
Output: precision clamping before state writes
Done criteria: float-noise churn removed from update stream
Status: Done

## Gate D - Validation And Debug

### T-030 Add dev parameter inspector
Inputs: mapping outputs and profile metadata
Output: optional debug panel for ui/mapped/curve triplet
Done criteria: panel available in dev mode and hidden by default
Status: Done

### T-031 Add validation coverage
Inputs: required five tests
Output: behavior/performance test suite updates
Done criteria: all required tests implemented and passing
Status: Done

## Gate E - Review And Commit Sequence

### T-040 Stage-by-stage review and commit packaging
Inputs: completed implementation and tests
Output: separate commits using required commit names
Done criteria: all commit names used exactly and scopes separated
Status: Not Started

## Required Commit Names
1. `feat: add perceptual parameter response system`
2. `feat: add nonlinear parameter mapping curves`
3. `feat: add adaptive slider stepping`
4. `fix: reduce slider rerender spam`
5. `fix: normalize parameter precision`
6. `test: add parameter behavior validation coverage`
