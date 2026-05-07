# 04 - Detailed Tasks

Task status values:

1. Not Started
2. In Progress
3. Done
4. Blocked

Every task is approval-gated.
After each task: stop, report evidence, wait for user approval.

## Gate A - Baseline

### T-001 Reproduce alpha-loss matrix

Inputs: current renderer and snapshot flows
Output: baseline repro notes for three target flows
Done criteria: deterministic repro steps documented
Status: Done

### T-002 Pinpoint frame mismatch points

Inputs: T-001 notes
Output: exact transition points where mask/frame diverge
Done criteria: root-cause map with file references
Status: Done

## Gate B - Non-Destructive Contract

### T-010 Define aligned mask-frame contract

Inputs: T-002 map
Output: explicit mask alignment contract for live and snapshot
Done criteria: contract documented and approved
Status: Done

### T-011 Implement contract in renderer path

Inputs: T-010
Output: renderer uses aligned contract across source modes
Done criteria: no alpha collapse in target flows
Status: Done

### T-012 Preserve procedural record invariants

Inputs: snapshot storage and transition code
Output: safeguards preventing destructive procedural loss
Done criteria: delete snapshot returns to intact procedural state
Status: Done

## Gate C - Transition Safety

### T-020 Fix stale fallback alignment

Inputs: snapshot stale transition path
Output: consistent mask behavior on fresh -> live-fallback transition
Done criteria: stroke edit after mask does not remove base alpha
Status: Done

### T-021 Fix delete-snapshot alignment

Inputs: snapshot delete transition path
Output: consistent mask behavior on snapshot -> live transition
Done criteria: delete snapshot does not produce effects-only rendering
Status: Done

## Gate D - Validation

### T-030 Add regression tests for alpha preservation

Inputs: T-011 to T-021
Output: focused tests covering all target flows
Done criteria: tests fail before fix and pass after fix
Status: Done

### T-031 Verify undo/redo for snapshot+mask transitions

Inputs: history and keyboard undo path
Output: verified undo behavior for affected actions
Done criteria: Ctrl+Z and UI undo restore expected visual state
Status: Done

## Gate E - Deploy

### T-040 Build and deploy private bundle

Inputs: validated code
Output: deployed bundle with new hash
Done criteria: deploy script success and commit evidence logged
Status: Done

### T-041 Live verification on parametric route

Inputs: deployed URL
Output: route and bundle verification notes
Done criteria: live hash matches deployment and issue no longer reproducible
Status: Blocked
