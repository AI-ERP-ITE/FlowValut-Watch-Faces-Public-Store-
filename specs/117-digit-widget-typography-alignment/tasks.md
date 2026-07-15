# Spec 117 — Dependency-Ordered Tasks

## Documentation gate

- [x] T001 Create specification, restrictions, plan, tasks, tests, validation, and history audit.
- [x] T002 Commit Spec 117 files as a docs-only commit (`3fa8df53`).

## Baseline and pure utilities

- [x] T010 Add centralized numeric fit-sample/range policy.
- [x] T011 Add pure alignment normalization shared by preview and generators where appropriate.
- [x] T012 Add pure anchor-preserving frame-fit geometry.
- [x] T013 Add unit tests for left/center/right anchor preservation and immutability.

## UI and state

- [x] T020 Add `TEXT_IMG` alignment selector.
- [x] T021 Replace Reset to frame height with Reset Frame to Content/Range.
- [x] T022 Guarantee reset updates only the selected element and preserves `fontSize`.
- [x] T023 Verify legacy files without `alignH` retain existing defaults.

## Rendering and export

- [x] T030 Make InteractiveCanvas consume the shared policies.
- [x] T031 Make V2 `TEXT_IMG` export consume the stored alignment.
- [x] T032 Make V3 `TEXT_IMG` export consume the stored alignment.
- [x] T033 Audit time/date sample-derived X behavior and change only behavior proven safe under the native Zepp contract.
- [x] T034 Add source guards banning fixed-cell padding, glyph distortion, and preview-only pair correction.

## Persistence and AOD

- [x] T040 Add FVWF roundtrip assertions for `alignH`, `fontSize`, and bounds.
- [x] T041 Add MAIN/AOD scope-isolation assertions.
- [x] T042 Verify separate MAIN/AOD digit families use identical geometry policy.

## Automated validation

- [x] T050 Create `scripts/verifyDigitTypography.mjs`.
- [x] T051 Add representative font and value fixtures.
- [x] T052 Add automated image/geometry assertions for `11`, `18`, `31`, `58`, and `88`.
- [x] T053 Add alignment and frame-fit assertions for STEP, CAL, BATTERY, and HEART.
- [x] T054 Add generated widget-code assertions for V2/V3 and MAIN/AOD.
- [x] T055 Write JSON and Markdown reports to `.verify-output/spec117/`.
- [x] T056 Run the test script in the background and require zero failures.

## Build and deployment

- [x] T060 Run `npx tsc --noEmit` or the repository TypeScript build gate.
- [x] T061 Load `.env.private.local` and run private Firebase preflight.
- [x] T062 Run `npm run build:private`.
- [x] T063 Commit implementation/tests separately from specs.
- [x] T064 Run `npm run deploy:full:private`.
- [x] T065 Verify origin hash, live bundle hash, asset HTTP 200, root/Studio parity, and deep-link redirect flow.
- [x] T066 Complete validation and deployment reports.

## Time-only tabular centering follow-up

- [x] T070 Amend the approved design to permit tabular cells only for fixed two-digit `IMG_TIME` components.
- [ ] T071 Add a pure common-cell/pair-width and center-to-left-origin geometry utility.
- [ ] T072 Generate equal-width 0–9 PNG cells for MAIN/AOD `IMG_TIME` only and persist the generated cell width in export state.
- [ ] T073 Force hour/minute/second preview layout to the center of each component frame while preserving variable numeric alignment controls.
- [ ] T074 Convert each centered time frame to a deterministic Zepp left origin in V2 export.
- [ ] T075 Add unit tests for equal pair widths, glyph non-distortion, legacy alignment override, centered origins, and MAIN/AOD parity.
- [ ] T076 Update the background verification script to require time-only tabularization and natural-width non-time digits.
- [ ] T077 Run focused tests, full TypeScript/build validation, and the Spec 117 background verifier.
- [ ] T078 Commit implementation separately, deploy private Pages, and verify live bundle/hash parity.
