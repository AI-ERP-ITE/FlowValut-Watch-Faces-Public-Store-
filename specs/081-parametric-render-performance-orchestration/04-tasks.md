# 04 - Detailed Tasks

Task status values:
1. Not Started
2. In Progress
3. Done
4. Blocked

Every task is approval-gated.
After each task: stop, show evidence, wait for user approval.

## Gate A - Spec Baseline

### T-001 Create strict performance spec package
Inputs: user constraints and required systems
Output: complete spec docs under `081-parametric-render-performance-orchestration`
Done criteria: all stages and constraints documented without architecture rewrite
Status: Done

## Gate B - Stage 1 Interaction-Aware Quality

### T-010 Add render interaction state module
Inputs: Stage 1 requirements
Output: `renderInteractionState.ts` with mode state and debounce helpers
Done criteria: transitions between `editing` and `idle` wired and testable
Status: Done

### T-011 Wire interaction handlers to mode transitions
Inputs: existing editor interaction handlers
Output: begin/end hooks for drag, resize, brush, transform, slider
Done criteria: mode enters editing on start and returns idle with debounce
Status: Done

### T-012 Add preview/final quality branch in scheduler
Inputs: renderer scheduling entry points
Output: `renderQualityMode` branch for expensive-pass simplification in preview
Done criteria: final render still uses exact full-quality path
Status: Done

### T-013 Validate Stage 1 behavior
Inputs: T-010 to T-012
Output: tests for edit-mode preview and single final rerender
Done criteria: passing tests and no visual parity regressions
Status: Done

## Gate C - Stage 2 Element Hash Cache

### T-020 Add deterministic element hash generator
Inputs: visual determinants list
Output: `renderHash.ts` and `generateElementRenderHash`
Done criteria: stable hash changes only when visual inputs change
Status: Done

### T-021 Add element render cache store
Inputs: cache contract
Output: `renderCache.ts` with per-element cache operations
Done criteria: hit/miss path reusable by scheduler
Status: Done

### T-022 Integrate cache hit/miss orchestration
Inputs: T-020 and T-021
Output: renderer scheduling checks hash before rerender
Done criteria: unchanged element reuses cached output
Status: Done

### T-023 Validate Stage 2 behavior
Inputs: T-020 to T-022
Output: cache reuse tests and hit/miss debug logs
Done criteria: unchanged elements not rerendered; changed elements rerender once
Status: Done

## Gate D - Stage 3 Selective Invalidation

### T-030 Add dirty-layer invalidation module
Inputs: dirty reasons contract
Output: `renderInvalidation.ts` with dirty set tracking
Done criteria: per-element dirty marking and consumption works
Status: Done

### T-031 Wire targeted invalidation from edits
Inputs: edit/mask/effect/transform/snapshot update points
Output: target-element invalidation only for local changes
Done criteria: sibling layers remain clean unless explicitly dependent
Status: Done

### T-032 Integrate freeze untouched layers policy
Inputs: cache and dirty tracking
Output: rerender dirty only + reuse untouched frozen layers
Done criteria: no full-scene rerender on local edits
Status: Done

### T-033 Validate Stage 3 behavior
Inputs: T-030 to T-032
Output: sibling freeze tests and mask-target rerender tests
Done criteria: only affected elements rerender
Status: Done

## Gate E - Validation And Finalization

### T-040 Add large-scene responsiveness validation
Inputs: staged implementation complete
Output: test coverage for 20+ layer interactions and responsiveness evidence
Done criteria: measurable responsiveness improvement without visual drift
Status: Done

### T-041 Final review and staged commits
Inputs: all prior tasks
Output: staged commit set using required commit names
Done criteria: one commit per required scope, checks passed each stage
Status: Done

## Required Commit Names
1. `feat: add interaction-aware preview render mode`
2. `feat: add element render cache by state hash`
3. `feat: add selective layer invalidation and freezing`
4. `test: add render performance validation coverage`
