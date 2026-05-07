# 17 - T-030 Recurrence Tests

## Added Tests
File: src/lib/maskFieldKernel.test.ts

Covered:
1. TEST 1 repeated hide: linear convergence to zero.
2. TEST 2 repeated reveal: linear convergence to one.
3. TEST 3 hide then reveal: stable restoration.
4. TEST 4 hard cut: full-strength hide reaches exact zero.
5. Strength formula sanity: opacity * falloff * pressure.

## Supporting Integration
1. ParametricPage now uses shared kernel function applyMaskValueU8.
2. This keeps runtime update rule aligned with tested equations.

## Command
npx vitest run src/lib/maskFieldKernel.test.ts engine/core/render-source-snapshot-mode.test.js engine/snapshot/snapshotRenderer.test.ts

Result:
1. 3 files passed
2. 16 tests passed

## Done Criteria Check
1. Required recurrence tests added: PASS.
2. No regression in existing snapshot/mask tests: PASS.
