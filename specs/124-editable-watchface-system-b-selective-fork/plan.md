# System B V2-Only Plan

## Phase 1 — Current-state specification

- Audit the current V2 workflow.
- Record the protection baseline.
- Produce this specification set and copy manifest.
- Stop for copy-boundary approval.

## Phase 2 — Standalone scaffold and exact copy

- Create only `app/system-b-editable/**`.
- Add a standalone Vite application with base `/editable-watchfaces/`.
- Copy approved modules without changing their initial contents.
- Record original paths and SHA-256 hashes.
- Copy required tests and fixtures.
- Rebind imports only inside System B.
- Audit all remaining live imports.

Exit: both System A and System B build; System A hashes are unchanged.

## Phase 3 — Normal V2 parity

Run one approved FVWF V1 through both systems and compare:

- Parsed configuration.
- Canonical model selection.
- Canvas rendering.
- Element bounds and order.
- Main/AOD state.
- Generated V2 manifest/runtime code.
- Extracted ZPK structure and asset hashes.
- QR payload.

Exit: semantic parity report approved.

## Phase 4 — FVWC foundation

- Multiple immutable imports.
- Content hashing and duplicate detection.
- Base-build selection.
- Source and overlay canvas modes.
- Multi-layer selection.
- Component groups and ownership.
- Slots and variants.
- FVWC save/reopen.
- Composer validation.

## Phase 5 — First editable V2 vertical slice

- Select one physical target.
- Verify its editable capabilities.
- Compile one slot and two or three variants.
- Generate editable runtime code and manifest.
- Package ZPK.
- Generate preview, QR, metadata, and validation report.
- Verify on the physical watch.

## Phase 6 — Individually approved extensions

- Multiple slots and combination validation.
- Gauge-pointer groups.
- Editable backgrounds.
- Editable pointers.
- Additional AOD modes.
- Additional V2 devices.

## Deployment

Deployment is excluded until the user separately approves a private host, production base URL, and exact deployment commands.

