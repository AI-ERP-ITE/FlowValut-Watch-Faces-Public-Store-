# 05 - Validation Matrix

## Validation Scope

1. Core mask/composite bug fixes.
2. Snapshot correctness and stale detection.
3. Compatibility and route verification.

## Scenario Matrix

### V-001 Base Element Mask Integrity

Setup: base element with local/global mask and multiple overlays.
Expectation: base and overlays remain consistent; no base disappearance.
Evidence: screenshot or render output note.

### V-002 Free Rectangle Mask Integrity

Setup: free rectangle with same layered stack pattern.
Expectation: behavior matches base integrity rules.
Evidence: screenshot or render output note.

### V-003 Heavy Layer Stability

Setup: multi-texture, blend, and effects stack.
Expectation: no branch divergence artifact; interaction remains predictable.
Evidence: user-perceived stability notes and timing snapshot if available.

### V-004 Contrast Fallback Safety

Setup: element with missing contrast value and element with explicit contrast value.
Expectation: missing value path uses neutral fallback; explicit saved value unchanged.
Evidence: serialized state diff and visual check.

### V-005 Snapshot Create and Use

Setup: create snapshot for selected element and switch to snapshot mode.
Expectation: snapshot mode matches visual baseline within acceptable tolerance.
Evidence: side-by-side notes.

### V-006 Snapshot Stale Detection

Setup: edit visual property after snapshot creation.
Expectation: stale indicator flips to outdated without deleting snapshot.
Evidence: UI state check.

### V-007 Use Live Render Recovery

Setup: switch from snapshot mode back to live mode.
Expectation: live path restores procedural source output.
Evidence: UI and render parity check.

### V-008 Snapshot Missing/Corrupt Fallback

Setup: snapshot mode with missing or malformed snapshot data.
Expectation: safe fallback to live rendering, no crash.
Evidence: error handling log and rendered output.

### V-009 Legacy Project Compatibility

Setup: load older project with no snapshot fields.
Expectation: opens and saves successfully with default live mode.
Evidence: load/save log.

### V-010 Route-Level Live Verification

Setup: deployed app checks on private pages route set.
Expectation: root and deep links load and current asset hashes resolve.
Evidence: URL checks and hash response notes.

## Exit Criteria

1. No P0 or P1 regressions in targeted scenarios.
2. All scenarios V-001 to V-010 have recorded outcomes.
3. Unresolved residual risks are explicitly accepted.
