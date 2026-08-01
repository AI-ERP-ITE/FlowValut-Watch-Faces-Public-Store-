# Tasks — Approval Gated

Every task is intentionally unchecked. Execute one task only after the user
approves that exact task; then stop and report before continuing.

## Slice A — Safety foundation

- [x] **T001 Characterization baseline:** Add read-only regression fixtures for current chooser rules, preview values, generated widgets, FVWF round trips, and the three conflicting weather mappings. No production behavior change.
- [x] **T002 Semantic descriptor:** Add the System A data/representation descriptor and official 0–28 weather manifest alongside legacy rules. No visible behavior change.
- [x] **T003 Consumer migration — validation only:** Make chooser/property validation read the descriptor while preserving the currently visible behavior; prove snapshot parity.

## Slice B — Weather correctness (P0)

- [x] **T004 Weather manifest correction:** Move Switcher Lab labels, built-in weather drawings, previews, and asset validators to the official manifest. Test all 29 slots.
- [x] **T005 Weather runtime audit:** Preserve the existing watch-proven System A `hmUI.data_type.WEATHER` condition binding. The proposed manual sensor adapter was rejected and fully reverted.
- [x] **T006 Weather migration:** Remove Weather Current from new Image Switcher choices and migrate legacy 29-icon elements to Weather Condition without renaming or losing custom assets.

## Slice C — Numeric corrections (P0/P1)

- [x] **T007 Temperature consolidation:** Expose Current Temperature only under Numeric Values and migrate legacy TEXT/TEXT_IMG temperature elements to the canonical model.
- [x] **T008 Temperature assets and fit:** Add digits 0–9, negative, shared degree unit, and `-000°` fitting/package validation; test Celsius, Fahrenheit over 100, and negative values.
- [x] **T009 Low/High Temperature:** Add Low Temperature and High Temperature through the same numeric descriptor and symbol pipeline, if still desired at execution time.
- [x] **T010 Humidity numeric correction:** Add optional `%` asset/format and fit `100%`; verify numeric preview/ZPK parity.
- [x] **T011 Wind Level correction:** Rename and constrain Wind to 0–12 fixtures; remove `888/999` assumptions; verify Numeric and existing Arc behavior.
- [x] **T012 Training Load restriction:** Remove Training Load from new Arc choices, preserve Numeric, and add a warning migration for existing Training Load arcs.

## Slice D — Bounded representations (P1)

- [x] **T013 Gauge eligibility:** Add Wind 0–12 and later BioCharge 0–100 only after descriptor-driven Gauge validation; verify pointer endpoint parity. Wind completed; BioCharge remains evidence-gated for T019–T021.
- [x] **T014 Range-switcher runtime:** Make Humidity configured ranges control device output, not only preview; test 0/30/31/60/61/100.
- [x] **T015 Range-switcher migration:** Validate, preserve, and repair existing definitions without silently changing user thresholds.

## Slice E — Time Readings (P1)

- [x] **T016 Time Readings schema and chooser:** Add the isolated widget category, source field, Digital display mode, and Sunrise/Sunset choices. Do not alter current clock widgets.
- [x] **T017 Time Readings render/export:** Reuse digit visuals, add colon asset, and render/export `HH:MM` with official Sunrise/Sunset bindings. Static/runtime-contract verification is complete; physical-watch verification remains in T026 because no deployment was authorized.
- [x] **T018 Time Readings persistence:** Add FVWF round-trip and migration tests; keep Analog unavailable.

## Slice F — BioCharge (P1, evidence gate)

- [x] **T019 BioCharge contract discovery:** Public docs omitted the identifier, but targeted community/editor evidence established `hmUI.data_type.BIO_CHARGE`; `BIOCHARGE` is invalid. Findings are recorded in `biocharge-contract-evidence.md`.
- [x] **T020 BioCharge Numeric:** Added HybridCharge/BioCharge 0–100 to Numeric Values using `BIO_CHARGE`, three-digit fit, generated 0–9 assets, FVWF/ZPK coverage, and a supported-firmware warning. Physical-watch verification remains in T026 because no deployment was authorized.
- [x] **T021 BioCharge Arc/Gauge:** Added fixed 0–100 Arc and Gauge support with direct `BIO_CHARGE` bindings, compatibility warning, midpoint preview, and exact 0/50/100 normalization/angle tests. Physical-watch verification remains in T026 because no deployment was authorized.
- [x] **T022 BioCharge Image Switcher:** Added explicit 0–100 range definitions, boundary audit/repair, preview resolution, 101-index runtime expansion, direct `BIO_CHARGE` binding, and package reference reuse through the proven T014/T015 pipeline. Physical-watch verification remains in T026 because no deployment was authorized.

## Slice G — Moon evidence gate

- [x] **T023 Moon characterization:** Confirmed the official fixed 7/13/30 asset-count contract, characterized chooser/validation/FVWF/generator output, and froze the current System A behavior with regression tests. The user explicitly chose to leave Moon Phases as-is.
- [x] **T024 Moon correction if required:** Closed with no implementation change. No proven defect or user-reported watch failure justifies replacing the existing runtime adapter; the fixed 7/13/30 behavior is preserved.

## Final integration

- [x] **T025 Full compatibility audit:** Classified every existing System A data type across Numeric, Arc, Gauge, Image Switcher, Time Reading, and non-data widgets. Recorded ten gaps in `full-compatibility-audit.md`; no runtime behavior changed.
- [x] **T025A Canonical Zepp identifiers:** Migrated System A `PAI` → `PAI_DAILY` and `FAT_BURN` → `FAT_BURNING` across chooser, aliases, FVWF, preview, generator, pipeline prompts/assets, and tests. Legacy files normalize narrowly without changing filenames or asset fields.
- [x] **T025B Air Pressure/Altitude correction:** Corrected existing `ALTIMETER` semantics to Air Pressure with the official 1–1200 range, four-digit fit, chooser/preview parity, unchanged runtime binding, and asset-preserving FVWF coverage. Separate `ALTITUDE` remains unavailable.
- [x] **T025C Legacy Image Switcher truthfulness:** New creation now offers only proven Humidity/BioCharge range contracts and fixed Weather/Moon contracts. Existing Battery/Steps/Stress/etc. switchers remain loadable and editable without asset loss, show a preview-only warning, and cannot be changed into another unsafe legacy type.
- [x] **T025D Remaining semantic corrections:** Made Sleep legacy-only pending Duration Readings; made Steps/Calories/Heart/Distance Numeric-only for new widgets while preserving warned legacy bounded elements; added Distance decimal generation/strict packaging; set SpO₂ to 51–100; and added AQI 1–999 plus mainland-China warnings.
- [x] **T026 Full regression:** Spec 131 passed 104/104 focused tests, TypeScript, 57/57 headless checks, private Firebase/Vite build, FVWF fixtures, and nested-ZPK reference inspection. Full-suite unrelated baseline failures are classified in `t026-regression-report.md`; the physical-watch matrix is prepared and remains pending after T027 deployment.
- [x] **T027 Private deployment:** Used only `npm run deploy:full:private` after explicit approval. Deployment commit `4dbba314` published System A `index-DL69yRev.js` / `index-wLIbbYR0.css` and rebuilt System B `index-CyynwCBB.js` / `index-jiNJ2ex5.css` to private `origin/main`. Root, Studio query, parametric query, System B HTML, and all referenced assets returned HTTP 200 with no development entrypoint. Physical-watch verification remains user-operated.

## Next verification

Run the physical-watch checklist in `t026-regression-report.md` against the
deployed private build. No further deployment approval is pending.
