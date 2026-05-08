# 04 - Detailed Tasks

Task status values:
1. Not Started
2. In Progress
3. Done
4. Blocked

Execution rule:
Run exactly one task at a time.
After each task: report evidence and wait for approval.

## Gate A - Baseline Math

### T-001 Prove current recurrence and failure modes
Inputs: current renderer mask primitives and brush payload flow
Output: equation-level proof and reproducible collapse matrix
Done criteria: written proof mapping code behavior to recurrence
Status: Done

### T-002 Define scalar-field contract and invariants
Inputs: T-001
Output: strict contract for mask buffer semantics
Done criteria: contract approved and testable
Status: Done

## Gate B - Engine Design

### T-010 Design mask buffer data model
Inputs: T-002
Output: storage schema + migration notes
Done criteria: model documented with compatibility path
Status: Done

### T-011 Design brush update kernel
Inputs: T-002, T-010
Output: hide/reveal update formulas and falloff integration
Done criteria: deterministic kernel documented
Status: Done

## Gate C - Implementation

### T-020 Implement mask buffer and update operations
Inputs: T-010, T-011
Output: direct edit operations replacing accumulation model
Done criteria: hide/reveal use add/subtract clamp only
Status: Done

### T-021 Integrate final render alpha multiply-once path
Inputs: T-020
Output: render path consumes buffer directly once
Done criteria: no repeated mask accumulation in final alpha
Status: Done

### T-022 Remove legacy accumulation workarounds
Inputs: T-020, T-021
Output: remove floor/tone/multiplicative fallbacks
Done criteria: old workaround logic deleted
Status: Done

## Gate D - Validation

### T-030 Add recurrence tests (hide/reveal/restore/hard-cut)
Inputs: T-020 to T-022
Output: deterministic tests for required equations
Done criteria: all five validation tests pass
Status: Done

### T-031 Preview/export parity validation
Inputs: T-030
Output: parity checks for editor and output
Done criteria: no divergence in masked alpha behavior
Status: Done

## Gate E - Deploy

### T-040 Build and deploy private bundle
Inputs: validated changes
Output: deployed bundle hash and commit evidence
Done criteria: deploy protocol complete
Status: Done

### T-041 Live repro verification
Inputs: T-040
Output: user repro path passes without alpha collapse
Done criteria: issue not reproducible in live route
Status: Done
