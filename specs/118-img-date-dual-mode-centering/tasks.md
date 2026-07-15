# Spec 118 — Dependency-Ordered Tasks

## Documentation

- [x] T001 Record the supplied FVWF diagnosis and dual-mode contract.
- [x] T002 Commit specification files separately from runtime code.

## Data and geometry

- [x] T010 Add optional `dayImageMode` with legacy-safe normalization.
- [x] T011 Add deterministic scoped complete-day filenames.
- [x] T012 Extend fixed two-cell geometry to numeric day widgets only.

## Asset generation and codegen

- [x] T020 Generate ten tabular digits for numeric mode.
- [x] T021 Generate 31 same-canvas complete day images for complete mode.
- [x] T022 Emit correct V2 numeric/complete contracts.
- [x] T023 Emit correct V3 numeric/complete contracts.
- [x] T024 Preserve independent MAIN/AOD and duplicate-layer families.

## Studio UI and persistence

- [x] T030 Add the day-only mode toggle and explanatory copy.
- [x] T031 Add an Effects-tab navigation action without claiming unsupported baked effects.
- [x] T032 Keep preview centered for both modes and required samples.
- [x] T033 Verify FVWF roundtrip and legacy default behavior.

## Validation and deployment

- [x] T040 Add focused mode, generator, geometry, and isolation tests.
- [x] T041 Run focused tests and TypeScript.
- [x] T042 Run repository verifier and explicit private build with Firebase env preflight.
- [x] T043 Commit implementation/tests separately from specs.
- [x] T044 Deploy using `npm run deploy:full:private` only.
- [x] T045 Verify origin commit, bundle hash, live assets, and route parity.
- [x] T046 Close the spec and update the issue log.
