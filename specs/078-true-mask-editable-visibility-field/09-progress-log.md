# 09 - Progress Log

## P1 - T-001 completed
Date: 2026-05-07
Task: T-001 Prove current recurrence and failure modes
Status: Done
Evidence: see 10-t001-recurrence-audit.md
Notes:
1. Current behavior mapped to compositing recurrence.
2. Exponential hide-overlap collapse documented.
3. Scalar-field replacement requirement confirmed.

## P2 - T-002 completed
Date: 2026-05-07
Task: T-002 Define scalar-field contract and invariants
Status: Done
Evidence: see 11-t002-scalar-field-contract.md
Notes:
1. Scalar-field semantics formalized (0 hidden, 1 visible).
2. Hide/reveal direct-write equations fixed as core contract.
3. Testable invariants defined for deterministic behavior.

## P3 - T-010 completed
Date: 2026-05-07
Task: T-010 Design mask buffer data model
Status: Done
Evidence: see 12-t010-mask-buffer-data-model.md
Notes:
1. Added authoritative field schema (u8 scalar values).
2. Defined derived image cache role.
3. Documented migration/replay path from legacy strokes.

## P4 - T-011 completed
Date: 2026-05-07
Task: T-011 Design brush update kernel
Status: Done
Evidence: see 13-t011-brush-update-kernel.md
Notes:
1. Strength formula locked: opacity * falloff * pressure.
2. Hide/reveal equations mapped for scalar and u8 storage.
3. Determinism constraints defined for replay stability.

## P5 - T-020 completed
Date: 2026-05-07
Task: T-020 Implement mask buffer and update operations
Status: Done
Evidence: see 14-t020-mask-buffer-implementation.md
Notes:
1. Editor now updates mask field via direct u8 add/subtract clamp.
2. Stroke clear resets field deterministically.
3. Existing targeted suites remain passing.

## P6 - T-021 completed
Date: 2026-05-07
Task: T-021 Integrate final render alpha multiply-once path
Status: Done
Evidence: see 15-t021-render-alpha-once.md
Notes:
1. Renderer now prefers field-backed mask image cache.
2. Field-backed path avoids edit-state compositing recurrence.
3. Legacy primitive mask path retained as fallback only.

## P7 - T-022 completed
Date: 2026-05-07
Task: T-022 Remove legacy accumulation workarounds
Status: Done
Evidence: see 16-t022-workaround-removal.md
Notes:
1. Temporary gray/floor workaround removed from runtime path.
2. Legacy fallback remains true-black semantics.
3. Scalar-field path remains primary for edited masks.

## P8 - T-030 completed
Date: 2026-05-07
Task: T-030 Add recurrence tests (hide/reveal/restore/hard-cut)
Status: Done
Evidence: see 17-t030-recurrence-tests.md
Notes:
1. Added dedicated recurrence test suite for hide/reveal field math.
2. Wired ParametricPage kernel calls to tested shared function.
3. Existing renderer snapshot tests remained green.

## P9 - T-031 completed
Date: 2026-05-07
Task: T-031 Preview/export parity validation
Status: Done
Evidence: see 18-t031-preview-export-parity.md
Notes:
1. Added renderer parity test for field-backed mask output path.
2. Targeted recurrence + snapshot suites stayed green.

## P10 - T-040 completed
Date: 2026-05-07
Task: T-040 Build and deploy private bundle
Status: Done
Evidence: see 19-t040-deploy-private-bundle.md
Notes:
1. Ran npm run deploy:docs:private after temporary root/studio entry reset to /src/main.tsx.
2. Deploy sync produced bundle hash index-DTSnu2uU.js and updated docs + root mirrors.
3. Pushed deploy artifacts to origin/main in commit 13c24fe.

## P11 - T-041 completed
Date: 2026-05-07
Task: T-041 Live repro verification
Status: Done
Evidence: see 20-t041-live-repro-verification.md
Notes:
1. Verified live routes /Watch-Faces/, ?p=/studio, and ?p=/studio/parametric serve index-DTSnu2uU.js.
2. Verified HEAD 200 for index-DTSnu2uU.js, index-CrlChUe_.css, tablerIconRenderer-DYZseAfo.js.
3. Initial stale hash read resolved after cache-busted verification, confirming propagation.

Next task: None. Gate E complete.
