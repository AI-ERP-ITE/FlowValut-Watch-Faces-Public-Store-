# Spec 117 — Dependency-Ordered Tasks

## Documentation gate

- [x] T001 Create specification, restrictions, plan, tasks, tests, validation, and history audit.
- [ ] T002 Commit Spec 117 files as a docs-only commit.

## Baseline and pure utilities

- [ ] T010 Add centralized numeric fit-sample/range policy.
- [ ] T011 Add pure alignment normalization shared by preview and generators where appropriate.
- [ ] T012 Add pure anchor-preserving frame-fit geometry.
- [ ] T013 Add unit tests for left/center/right anchor preservation and immutability.

## UI and state

- [ ] T020 Add `TEXT_IMG` alignment selector.
- [ ] T021 Replace Reset to frame height with Reset Frame to Content/Range.
- [ ] T022 Guarantee reset updates only the selected element and preserves `fontSize`.
- [ ] T023 Verify legacy files without `alignH` retain existing defaults.

## Rendering and export

- [ ] T030 Make InteractiveCanvas consume the shared policies.
- [ ] T031 Make V2 `TEXT_IMG` export consume the stored alignment.
- [ ] T032 Make V3 `TEXT_IMG` export consume the stored alignment.
- [ ] T033 Audit time/date sample-derived X behavior and change only behavior proven safe under the native Zepp contract.
- [ ] T034 Add source guards banning fixed-cell padding, glyph distortion, and preview-only pair correction.

## Persistence and AOD

- [ ] T040 Add FVWF roundtrip assertions for `alignH`, `fontSize`, and bounds.
- [ ] T041 Add MAIN/AOD scope-isolation assertions.
- [ ] T042 Verify separate MAIN/AOD digit families use identical geometry policy.

## Automated validation

- [ ] T050 Create `scripts/verifyDigitTypography.mjs`.
- [ ] T051 Add representative font and value fixtures.
- [ ] T052 Add automated image/geometry assertions for `11`, `18`, `31`, `58`, and `88`.
- [ ] T053 Add alignment and frame-fit assertions for STEP, CAL, BATTERY, and HEART.
- [ ] T054 Add generated widget-code assertions for V2/V3 and MAIN/AOD.
- [ ] T055 Write JSON and Markdown reports to `.verify-output/spec117/`.
- [ ] T056 Run the test script in the background and require zero failures.

## Build and deployment

- [ ] T060 Run `npx tsc --noEmit` or the repository TypeScript build gate.
- [ ] T061 Load `.env.private.local` and run private Firebase preflight.
- [ ] T062 Run `npm run build:private`.
- [ ] T063 Commit implementation/tests separately from specs.
- [ ] T064 Run `npm run deploy:full:private`.
- [ ] T065 Verify origin hash, live bundle hash, asset HTTP 200, root/Studio parity, and deep-link redirect flow.
- [ ] T066 Complete validation and deployment reports.

