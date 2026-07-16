# Spec 120 — Dependency-Ordered Tasks

## Specification

- [x] T001 Record the corrected meaning of protected widget engines versus project-space rearrangement.
- [x] T002 Record the verified 480-config/466-background export mismatch.
- [x] T003 Receive user approval for implementation and private deployment.

## Rearrangement core

- [ ] T010 Transform project-space placement for every widget type.
- [ ] T011 Transform TIME_POINTER center/pointerCenter while preserving all engine-local geometry.
- [ ] T012 Add conservative safe-size transformation for generated/native layout types.
- [ ] T013 Convert MAIN and AOD once from the same source resolution.

## Model and background transaction

- [ ] T020 Carry selected target model identity through confirmed rearrangement.
- [ ] T021 Normalize the dedicated MAIN background raster to target resolution.
- [ ] T022 Normalize a dedicated AOD background when available without touching HTML assets.
- [ ] T023 Keep background element metadata consistent with the normalized canvas.

## Export parity

- [ ] T030 Add a background-dimension preflight/normalization gate before ZPK packaging.
- [ ] T031 Prove V2/V3 consume rearranged coordinates exactly once.
- [ ] T032 Prove selected target model/spec metadata reaches the build path.

## Validation and deployment

- [ ] T040 Add focused regression tests for 480↔466, rectangular, MAIN/AOD, pointers, and backgrounds.
- [ ] T041 Run TypeScript, focused tests, full relevant tests, and repository verifier.
- [ ] T042 Commit runtime/tests separately from this specification.
- [ ] T043 Run Firebase private-env preflight and canonical private build.
- [ ] T044 Deploy with `npm run deploy:full:private` only.
- [ ] T045 Verify origin hash, root/Studio/Parametric parity, and live JS/CSS assets.
- [ ] T046 Close Spec 120 and update the project issue log.

