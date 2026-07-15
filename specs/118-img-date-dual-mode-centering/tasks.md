# Spec 118 — Dependency-Ordered Tasks

## Documentation

- [x] T001 Record the supplied FVWF diagnosis and dual-mode contract.
- [x] T002 Commit specification files separately from runtime code.

## Data and geometry

- [ ] T010 Add optional `dayImageMode` with legacy-safe normalization.
- [ ] T011 Add deterministic scoped complete-day filenames.
- [ ] T012 Extend fixed two-cell geometry to numeric day widgets only.

## Asset generation and codegen

- [ ] T020 Generate ten tabular digits for numeric mode.
- [ ] T021 Generate 31 same-canvas complete day images for complete mode.
- [ ] T022 Emit correct V2 numeric/complete contracts.
- [ ] T023 Emit correct V3 numeric/complete contracts.
- [ ] T024 Preserve independent MAIN/AOD and duplicate-layer families.

## Studio UI and persistence

- [ ] T030 Add the day-only mode toggle and explanatory copy.
- [ ] T031 Add an Effects-tab navigation action without claiming unsupported baked effects.
- [ ] T032 Keep preview centered for both modes and required samples.
- [ ] T033 Verify FVWF roundtrip and legacy default behavior.

## Validation and deployment

- [ ] T040 Add focused mode, generator, geometry, and isolation tests.
- [ ] T041 Run focused tests and TypeScript.
- [ ] T042 Run repository verifier and explicit private build with Firebase env preflight.
- [ ] T043 Commit implementation/tests separately from specs.
- [ ] T044 Deploy using `npm run deploy:full:private` only.
- [ ] T045 Verify origin commit, bundle hash, live assets, and route parity.
- [ ] T046 Close the spec and update the issue log.
