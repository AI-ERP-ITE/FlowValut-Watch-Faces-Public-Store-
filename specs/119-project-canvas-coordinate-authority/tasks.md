# Spec 119 — Dependency-Ordered Tasks

## Documentation and approval gate

- [x] T001 Record the widget-by-widget canvas/asset geometry audit.
- [x] T002 Define the saved-config coordinate authority and explicit HTML-workflow exclusion.
- [x] T003 Record TIME_POINTER as a protected, excluded pipeline.
- [ ] T004 Receive explicit user approval before runtime implementation.

## Baseline and pure geometry

- [ ] T010 Capture baseline project, MAIN/AOD, TIME_POINTER, and GAUGE_POINTER fixtures plus an unchanged-HTML-workflow guard.
- [ ] T011 Locate and reuse an existing coordinate helper or add the smallest pure position-only helper.
- [ ] T012 Implement resolution comparison and alignment-aware anchor transformation without width/height scaling.
- [ ] T013 Add an explicit TIME_POINTER no-op guard and protected-field regression assertions.

## Canvas authority and editor

- [ ] T020 Make saved `config.resolution` authoritative after a project exists.
- [ ] T021 Keep Firebase model/spec resolution as new-project initialization and mismatch metadata only.
- [ ] T022 Replace generic Property Panel 480 clamps with project width/height while leaving TIME_POINTER behavior untouched.
- [ ] T024 Verify new widget defaults use actual project geometry where applicable.

## Import, load, and rearrangement UX

- [ ] T031 Detect FVWF saved-resolution versus selected-model mismatch without overriding the saved project.
- [ ] T032 Add `Keep original positions`, `Rearrange positions`, and `Cancel` choices.
- [ ] T033 Apply rearrangement to cloned MAIN/AOD configurations and commit only after validation.
- [ ] T034 Recalculate derived digit alignment positions after rearrangement.

## Export consistency

- [ ] T040 Replace V2 exact-480 background recognition with semantic/config-resolution recognition.
- [ ] T041 Verify V2/V3 use the same project coordinates as Interactive Canvas.
- [ ] T042 Confirm TIME_POINTER, gauge, digit, image/frame, and IMG_PROGRESS specialized geometry is unchanged.

## Validation, deployment, and closure

- [ ] T050 Add focused tests from `tests.md`.
- [ ] T051 Run TypeScript and focused/full relevant tests.
- [ ] T052 Run `node scripts/verify.mjs` and an explicit private build with Firebase environment preflight.
- [ ] T053 Commit implementation/tests separately from specification files.
- [ ] T054 Deploy using `npm run deploy:full:private` only.
- [ ] T055 Verify origin commit, live bundle hashes/assets, and root/Studio/Parametric route parity.
- [ ] T056 Close the spec and update the project issue log.
