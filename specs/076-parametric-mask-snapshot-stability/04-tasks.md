# 04 - Detailed Tasks

Task status values:

1. Not Started
2. In Progress
3. Done
4. Blocked

All tasks require explicit user approval to proceed to next gate.

## Gate 1 - Spec Finalization

### T-001 Confirm scope and non-goals

Inputs: `02-spec.md`
Output: scope sign-off
Done criteria: user approves scope
Status: Not Started

### T-002 Confirm approval-gated execution protocol

Inputs: `01-plan.md`
Output: gate policy sign-off
Done criteria: user confirms stop-after-each-step workflow
Status: Not Started

## Gate 2 - Core Bug Fixes

### T-010 Body vs overlay mask-path audit

Inputs: renderer layer assembly
Output: mismatch inventory
Done criteria: documented mismatches and intended fixes
Status: Done

### T-011 Implement compositing consistency patch

Inputs: T-010
Output: consistent mask/composite behavior
Done criteria: base and overlays respect aligned mask semantics
Status: Done

### T-012 Clip target guardrails

Inputs: current clip target resolution flow
Output: fail-safe rules for invalid inheritance targets
Done criteria: no self/invalid target crash or undefined clipping behavior
Status: Done

### T-013 Contrast fallback neutral baseline

Inputs: style fallback code path
Output: neutral fallback for absent values only
Done criteria: explicit saved values remain untouched
Status: Done

### T-014 Core regression checks

Inputs: T-011 to T-013
Output: verification notes for base and freeRect mask behavior
Done criteria: no base-disappear regression under target scenarios
Status: Done

## Gate 3 - Snapshot Model + Hash

### T-020 Extend schema for render source state

Inputs: element type definitions
Output: live/snapshot source mode + metadata fields
Done criteria: types compile and old payloads remain valid
Status: Done

### T-021 Implement deterministic visual hash

Inputs: visual property inventory
Output: stable hash function
Done criteria: visual-only changes impact hash, non-visual changes do not
Status: Done

### T-022 Hash tests

Inputs: T-021
Output: test coverage for stability/change behavior
Done criteria: all hash tests pass
Status: Done

## Gate 4 - Snapshot Capture + Storage

### T-030 Create snapshot capture utility

Inputs: renderer element output path
Output: alpha-preserving element snapshot image
Done criteria: capture result visually matches live output baseline
Status: Done

### T-031 Create snapshot storage utility

Inputs: snapshot payload
Output: create/read/delete helpers and metadata persistence
Done criteria: storage lifecycle works end-to-end
Status: Done

### T-032 Stale detection utility

Inputs: live hash + stored hash
Output: fresh/outdated status helper
Done criteria: stale status accurate on visual edits
Status: Done

## Gate 5 - Renderer Source Switch

### T-040 Live mode pass-through

Inputs: existing renderer path
Output: unchanged live procedural behavior
Done criteria: parity with baseline in live mode
Status: Done

### T-041 Snapshot mode rendering

Inputs: snapshot storage and metadata
Output: snapshot source rendering branch
Done criteria: snapshot mode renders correctly with current transforms/opacity/masks
Status: Done

### T-042 Renderer fallback chain

Inputs: T-041
Output: safe fallback to live mode when snapshot missing/corrupt
Done criteria: no hard failure when snapshot data invalid
Status: Done

## Gate 6 - UI Controls

### T-050 Add per-element snapshot actions

Inputs: parametric editor controls
Output: create/use snapshot/use live/delete snapshot actions
Done criteria: actions visible and functional in element panel
Status: Done

### T-051 Add snapshot status indicator

Inputs: stale detection
Output: fresh/outdated/missing indicator
Done criteria: status updates correctly after edits
Status: Done

### T-052 UX safety states

Inputs: action state machine
Output: disable invalid actions and add user feedback
Done criteria: no invalid-action confusion or destructive accidental flow
Status: Done

## Gate 7 - Validation

### T-060 Heavy stack scenario validation

Inputs: layered effects test scenes
Output: behavior and performance notes
Done criteria: no base-disappear issue in target scenarios
Status: Done

### T-061 Mask parity live vs snapshot

Inputs: snapshot mode and mask scenarios
Output: parity report
Done criteria: acceptable parity in controlled test cases
Status: Done

### T-062 Legacy project compatibility validation

Inputs: old saved project files
Output: load/edit/save verification notes
Done criteria: no schema break
Status: Done

## Gate 8 - Deploy + Live Verification

### T-070 Production build verification

Inputs: app build pipeline
Output: generated hashed assets and build proof
Done criteria: build success and new hash assets present
Status: Done

### T-071 Deploy sync for docs and studio entry

Inputs: build artifacts
Output: updated docs assets/index and studio index
Done criteria: deployed files reference new hashes
Status: Done

### T-072 Live route verification

Inputs: deployed URLs
Output: verification report for root, SPA deep link, and parametric route
Done criteria: all target routes load and asset URLs return 200
Status: Done

### T-073 Deployment evidence capture

Inputs: git history and asset hash
Output: commit hashes + bundle hash report
Done criteria: evidence documented in deployment report
Status: Done

## Gate 9 - Final Review

### T-080 Final review pass

Inputs: all previous outputs
Output: consolidated completion report
Done criteria: residual risks documented and accepted
Status: Done

## Gate 10 - Snapshot/Mask Order Completion

### T-090 Define snapshot-after-mask and mask-after-snapshot semantics

Inputs: FR-10
Output: explicit behavior rules for all authoring orders
Done criteria: specification documents all three supported flows without ambiguity
Status: Done

### T-091 Keep snapshot fresh on mask-only edits

Inputs: stale detection hash rules
Output: mask edits do not mark snapshot outdated
Done criteria: snapshot status remains fresh after mask-only edit
Status: Done

### T-092 Allow runtime masking on baked snapshot layer

Inputs: renderer snapshot branch
Output: element mask can clip baked snapshot image source
Done criteria: snapshot mode supports post-snapshot mask edits without procedural fallback
Status: Done

### T-093 Remove duplicate layer mask application path

Inputs: renderer layer assembly
Output: single effective mask application on base layer path
Done criteria: no base disappear regression from duplicate mask compounding
Status: Done

### T-094 Regression tests for order flexibility and stale behavior

Inputs: T-091 to T-093
Output: tests covering snapshot maskability and mask-only freshness
Done criteria: focused tests pass and cover required flows
Status: Done
