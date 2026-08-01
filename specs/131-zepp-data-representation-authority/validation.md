# Validation Log

## T001 — Characterization baseline

**Completed:** 2026-07-31  
**Production behavior changed:** No

### Added evidence

- `fixtures/current-baseline.json`
- `src/lib/spec131CurrentBaseline.test.ts`

### Characterized behavior

1. Current Temperature is exposed as both Numeric and Image Switcher.
2. Weather Status and Weather Current both use the fixed 29-slot policy.
3. Training Load is exposed as Arc Progress.
4. Wind and Current Temperature use `888` preview-width assumptions.
5. Switcher Lab weather labels differ from the official Zepp manifest.
6. Built-in weather drawing order differs from both the Lab and official order.
7. Generated Weather Condition emits `hmUI.data_type.WEATHER`.
8. Generated Current Temperature has no negative or degree-unit resources.
9. FVWF serialization preserves ambiguous legacy combinations exactly and does
   not currently migrate them.

### Commands and results

```text
npx.cmd vitest run src/lib/spec131CurrentBaseline.test.ts
1 file passed; 6 tests passed

npx.cmd vitest run src/lib/spec131CurrentBaseline.test.ts src/lib/imageSwitcherResolver.test.ts src/lib/projectFileArtifact.test.ts
3 files passed; 14 tests passed
```

PowerShell blocked the `npx.ps1` wrapper under the machine execution policy.
The same local command was executed successfully through `npx.cmd`; no network
access or dependency installation was required.

### Scope verification

T001 changed only:

- Spec 131 documentation/fixture files;
- one test file excluded from production TypeScript builds.

No runtime source, generated bundle, deployment artifact, FVWF payload, or ZPK
generator behavior was changed.

## T002 — Semantic descriptor

**Completed:** 2026-07-31  
**Visible behavior changed:** No

### Added authority

- `src/lib/dataRepresentationAuthority.ts`
- `src/lib/dataRepresentationAuthority.test.ts`

The additive authority records semantic kind, allowed representations, Zepp
source/identifier, bounded ranges, digit/glyph limits, required symbols,
switcher policy, fixed asset counts, evidence status, and deferred runtime gates.

It also defines the official contiguous 29-code Zepp weather manifest for
System A. System B is deferred to a later dedicated stage.

### Non-behavior guarantee

No production consumer imports the new authority yet. The legacy chooser,
property panel, preview, generator, FVWF, and ZPK paths therefore retain their
T001-characterized behavior. A regression assertion explicitly confirms that
Weather Current remains in the legacy switcher list and Training Load remains
in the legacy Arc list until later approved tasks.

### Commands and results

```text
npx.cmd vitest run src/lib/dataRepresentationAuthority.test.ts src/lib/spec131CurrentBaseline.test.ts src/lib/imageSwitcherResolver.test.ts src/lib/projectFileArtifact.test.ts
4 files passed; 20 tests passed

npx.cmd tsc -p tsconfig.app.json --noEmit
passed

npx.cmd tsc -p system-b-editable/tsconfig.app.json --noEmit
passed
```

No build or deployment was performed.

## T003 — Consumer migration, validation only

**Completed:** 2026-07-31  
**Visible choices changed:** No

### Implementation

- Added explicit `legacyRepresentations` to scoped descriptors.
- Routed System A `getAllowedDataTypesForElement()`, reverse validation, and
  normalization through descriptor eligibility.
- Preserved the exact existing arrays and ordering through legacy mode.
- Added ordered parity assertions for Text, Numeric, Arc, Gauge, and Image
  Switcher plus reverse data-to-element validation.

### Commands and results

```text
Focused Vitest: 4 files passed; 22 tests passed
Main Studio TypeScript: passed
System B TypeScript: passed
```

The full repository Vitest run was also attempted. It exposed existing failures
outside Spec 131 in parameter/effect behavior, radial tick behavior, snapshot
effect tests, and pre-existing System A/System B byte-parity checks. T003 did not
modify any failing file. These failures are recorded as repository baseline
debt and were not silently fixed or added to this task's scope.

No build or deployment was performed.

## T004 — Weather manifest correction

**Completed:** 2026-07-31  
**Watch runtime adapter changed:** No

- Switcher Lab labels and fixed-code validation now use the shared official
  Zepp manifest.
- Built-in artwork uses 29 explicit manifest-keyed System A recipes.
- Preview image accessibility labels now name the official conditions.
- The original T001 fixture remains historical evidence of both bad orders.

```text
npx.cmd vitest run src/lib/dataRepresentationAuthority.test.ts src/lib/spec131CurrentBaseline.test.ts src/lib/imageSwitcherResolver.test.ts
3 files passed; 21 tests passed

npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false
passed

npx.cmd tsc -p system-b-editable/tsconfig.app.json --noEmit --pretty false
passed
```

No build, ZPK generation, runtime-adapter change, or deployment was performed.

## T005 — Weather runtime audit and correction

**Completed:** 2026-07-31  
**Final runtime change:** None

The initial audit incorrectly treated omission from Zepp's current public
`data_type` page as proof that `hmUI.data_type.WEATHER` was invalid. Git history
then showed commit `d03c986f` deliberately introduced it to fix Weather Status,
and the user confirmed that binding already worked on-watch with custom sets.

The manual `hmSensor.id.WEATHER` → `forecastData.data[0].index` → `level`
replacement was therefore fully reverted in System A and System B. The proven
firmware binding remains:

```text
Weather Status IMG_LEVEL → hmUI.data_type.WEATHER
Current Temperature TEXT_IMG → hmUI.data_type.WEATHER_CURRENT
```

The lesson recorded for subsequent tasks is strict: when working behavior uses
an API omitted from current public documentation, inspect Git history and ask
whether it works on-device before classifying or replacing it.

System B changes from T002–T004 were also reverted after the user clarified the
scope boundary. Spec 131 implementation now targets System A only; System B
synchronization is deferred to a later explicitly approved stage.

No deployment was performed.

## T006 — Weather migration

**Completed:** 2026-07-31  
**Scope:** System A only

### Implemented behavior

- New Image Switcher and Switcher Lab choices no longer expose Current
  Temperature; Weather Condition remains the single condition-icon choice.
- FVWF loading canonicalizes only `IMG_LEVEL + WEATHER_CURRENT` to
  `IMG_LEVEL + WEATHER_STATUS` in main and AOD elements.
- Numeric `TEXT_IMG + WEATHER_CURRENT` remains unchanged.
- Legacy switcher definitions normalize to Weather Condition in memory while
  preserving their IDs, ranges, PNG/HTML sources, baked URLs, and cloud links.
- Migration changes only `dataType`, is idempotent, and does not rename files or
  alter image arrays.
- The proven generated `hmUI.data_type.WEATHER` binding is unchanged.
- No System B source file was modified.

### Validation

```text
npx.cmd vitest run src/lib/dataRepresentationAuthority.test.ts src/lib/spec131CurrentBaseline.test.ts src/lib/imageSwitcherResolver.test.ts src/lib/projectFileArtifact.test.ts
4 files passed; 26 tests passed

npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false
passed

git diff --check
passed (line-ending warnings only)
```

No build or deployment was performed.

## T007 — Current Temperature consolidation

**Completed:** 2026-07-31  
**Scope:** System A only

- Current Temperature is no longer offered for plain Text.
- It remains available under Numeric Display (`TEXT_IMG`) and continues to bind
  to `hmUI.data_type.WEATHER_CURRENT`.
- FVWF loading converts legacy `TEXT + WEATHER_CURRENT`,
  `TEXT + WEATHER_STATUS`, and `TEXT_IMG + WEATHER_STATUS` to canonical
  `TEXT_IMG + WEATHER_CURRENT`.
- Existing canonical temperature digits are returned unchanged.
- Main/AOD migration preserves IDs, bounds, names, text styling, digit arrays,
  source fields, filenames, and all unrelated properties.
- Migration is idempotent.
- T008 minus/degree resources and fitting were not implemented early.
- System B was not modified.

```text
npx.cmd vitest run src/lib/dataRepresentationAuthority.test.ts src/lib/spec131CurrentBaseline.test.ts src/lib/imageSwitcherResolver.test.ts src/lib/projectFileArtifact.test.ts
4 files passed; 28 tests passed

npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false
passed
```

No build or deployment was performed.

## T008 — Current Temperature assets and five-glyph fit

**Completed:** 2026-07-31  
**Scope:** System A only

- Kept Current Temperature as `TEXT_IMG` bound to
  `hmUI.data_type.WEATHER_CURRENT`.
- Preserved the normal generation flow: build-time digit regeneration now adds
  a scoped negative-sign PNG and a scoped degree-sign PNG beside each element's
  scoped 0–9 digit family.
- Generated `negative_image` plus `unit_sc/en/tc` and
  `imperial_unit_sc/en/tc` properties exactly as documented by Zepp OS.
- All six unit properties reference the same degree PNG. No `C` or `F` asset is
  generated; the watch's metric/imperial setting remains authoritative.
- Updated the fit policy and add-widget sizing sample to `-888°`, representing
  the maximum `-000°` five-glyph envelope while retaining three numeric slots.
- Updated canvas temperature preview to include the degree sign.
- Added a pre-build manifest check that rejects any Current Temperature widget
  whose referenced digits, negative sign, or degree sign are absent.
- Covered negative Celsius (`-20°`), Fahrenheit above 100 (`104°`), and the
  three-digit negative envelope (`-128°`).
- The proven Weather Condition `hmUI.data_type.WEATHER` binding is unchanged.
- No System B source file was modified.

Official contract checked before implementation:
`https://docs.zepp.com/docs/v2/reference/device-app-api/hmUI/widget/TEXT_IMG/`

```text
npx.cmd vitest run src/lib/temperatureNumericContract.test.ts src/lib/spec131CurrentBaseline.test.ts src/lib/dataRepresentationAuthority.test.ts src/lib/digitAlignment.test.ts
3 files passed; 17 tests passed

npx.cmd tsc -b --pretty false
passed
```

No deployment was performed.

## T009 — Low and High Temperature

**Completed:** 2026-07-31  
**Scope:** System A only

- Added **Low Temperature** and **High Temperature** only to Numeric Display.
- Bound them to the official `hmUI.data_type.WEATHER_LOW` and
  `hmUI.data_type.WEATHER_HIGH` identifiers.
- Generalized the T008 temperature contract so Current, Low, and High all use
  scoped 0–9 digits, a scoped negative sign, and one shared degree resource for
  all metric/imperial locale properties.
- Applied the same `-000°` five-glyph fit and package-manifest validation to all
  three temperature sources.
- Kept all three temperature sources out of Text, Arc, Gauge, and Image
  Switcher representations.
- The proven Weather Condition binding is unchanged.
- No System B source file was modified.

Official identifiers and limits checked before implementation:
`https://docs.zepp.com/docs/watchface/api/hmUI/widget/data_type/`

```text
npx.cmd vitest run src/lib/temperatureNumericContract.test.ts src/lib/spec131CurrentBaseline.test.ts src/lib/dataRepresentationAuthority.test.ts src/lib/digitAlignment.test.ts
3 files passed; 19 tests passed

npx.cmd tsc -b --pretty false
passed
```

No deployment was performed.

## T010 — Humidity percent asset and fit

**Completed:** 2026-07-31  
**Scope:** System A only

- Preserved Humidity as Numeric Display bound to `hmUI.data_type.HUMIDITY`.
- Build-time numeric regeneration now creates one scoped `%` PNG matching the
  element's digit color, font, size, and watch-safe alpha setting.
- Generated all metric/imperial locale unit properties from that same percent
  resource; no duplicate percent artwork is created.
- Updated numeric fitting, add-widget sizing, and canvas preview to the official
  four-glyph `100%` contract.
- Extended the pre-build manifest check to reject missing Humidity digits or
  percent resources before ZPK creation.
- Temperature and Weather Condition runtime bindings are unchanged.
- No System B source file was modified.

Official display contract checked before implementation:
`https://docs.zepp.com/docs/designs/customization/watchface/`

```text
npx.cmd vitest run src/lib/humidityNumericContract.test.ts src/lib/temperatureNumericContract.test.ts src/lib/spec131CurrentBaseline.test.ts src/lib/dataRepresentationAuthority.test.ts
4 files passed; 22 tests passed

npx.cmd tsc -b --pretty false
passed
```

No deployment was performed.

## T011 — Wind Level 0–12 correction

**Completed:** 2026-07-31  
**Scope:** System A only

- Renamed the user-facing data type from Wind to **Wind Level** and corrected
  the AI guidance from wind speed to wind force level.
- Replaced the invalid `888/999` numeric assumptions with the official maximum
  and preview value `12`, using a two-digit fit policy.
- Updated add-widget sizing and canvas numeric preview to `12`.
- Exposed Wind Level for Numeric Display and Arc Progress, matching the approved
  descriptor while leaving Gauge Pointer eligibility for T013.
- Preserved the existing direct Arc and Numeric runtime binding to
  `hmUI.data_type.WIND`; no manual sensor adapter or scaling code was added.
- Arc preview now uses a deterministic midpoint of 6 on the 0–12 domain.
- Temperature, Humidity, and Weather Condition bindings are unchanged.
- No System B source file was modified.

Official range checked against:
`https://docs.zepp.com/docs/watchface/api/hmUI/widget/data_type/`

```text
npx.cmd vitest run src/lib/windLevelContract.test.ts src/lib/humidityNumericContract.test.ts src/lib/temperatureNumericContract.test.ts src/lib/spec131CurrentBaseline.test.ts src/lib/dataRepresentationAuthority.test.ts
5 files passed; 25 tests passed

npx.cmd tsc -b --pretty false
passed
```

No deployment was performed.

## T012 — Training Load restriction and legacy warning

**Completed:** 2026-07-31  
**Scope:** System A only

- Preserved Training Load under Numeric Display with its existing
  `hmUI.data_type.TRAINING_LOAD` runtime binding.
- Removed Training Load from new Arc Progress choices because Zepp documents no
  meaningful progress maximum for this source.
- Added an idempotent FVWF compatibility annotation for existing main and AOD
  `ARC_PROGRESS + TRAINING_LOAD` elements.
- Legacy arcs are not converted, deleted, renamed, resized, or stripped of
  runtime binding; the warning is displayed in the selected element's property
  panel and recommends Numeric Display for new designs.
- Wind Level Arc eligibility from T011 remains intact.
- No System B source file was modified.

```text
npx.cmd vitest run src/lib/trainingLoadContract.test.ts src/lib/windLevelContract.test.ts src/lib/projectFileArtifact.test.ts src/lib/spec131CurrentBaseline.test.ts src/lib/dataRepresentationAuthority.test.ts
5 files passed; 26 tests passed

npx.cmd tsc -b --pretty false
passed
```

No deployment was performed.

## T013 — Descriptor-driven Wind Gauge eligibility

**Completed:** 2026-07-31  
**Scope:** System A only

- Added Wind Level to Gauge Pointer choices through the descriptor eligibility
  gate, using its official range `0–12` and proven `WIND` runtime identifier.
- Added shared bounded-range normalization used by the Wind Gauge preview.
- Verified exact pointer mapping: `0 → start`, `6 → midpoint`, and `12 → end`,
  including clamping beyond the documented range.
- Preserved the generator's direct Zepp `IMG_POINTER` contract with unchanged
  `start_angle`, `end_angle`, and `hmUI.data_type.WIND`.
- BioCharge was deliberately not exposed: its descriptor still has
  `zeppDataType: null`, a pending source adapter, and no proven runtime binding.
  It remains gated behind T019 discovery and T020/T021 implementation.
- No System B source file was modified.

```text
npx.cmd vitest run src/lib/gaugeEligibilityContract.test.ts src/lib/windLevelContract.test.ts src/lib/trainingLoadContract.test.ts src/lib/dataRepresentationAuthority.test.ts src/lib/spec131CurrentBaseline.test.ts
5 files passed; 21 tests passed

npx.cmd tsc -b --pretty false
passed
```

No deployment was performed.

## T014 — Humidity range-switcher runtime

**Completed:** 2026-08-01  
**Scope:** System A only

- Preserved the proven `IMG_LEVEL + hmUI.data_type.HUMIDITY` firmware binding.
- Export now expands linked Humidity range definitions into a 101-entry image
  array indexed directly by live humidity values `0–100`.
- Each entry references one of the existing slot filenames; repeated references
  do not duplicate PNG bytes, add Firebase downloads, or create 101 image files.
- Verified exact boundaries: `0/30 → Dry`, `31/60 → Comfortable`, and
  `61/100 → Humid` for both preview resolution and generated runtime indexing.
- Export rejects frame-count mismatches and uncovered integer values before ZPK
  generation rather than silently falling back to the wrong image.
- No manual humidity sensor API, network fetch, or timer was introduced.
- No System B source file was modified.

Official humidity domain checked against:
`https://docs.zepp.com/docs/watchface/api/hmUI/widget/data_type/`

```text
npx.cmd vitest run src/lib/humidityRangeRuntime.test.ts src/lib/imageSwitcherResolver.test.ts src/lib/humidityNumericContract.test.ts src/lib/spec131CurrentBaseline.test.ts
4 files passed; 21 tests passed

npx.cmd tsc -b --pretty false
passed
```

No deployment was performed.

## T015 — Humidity range preservation and explicit repair

**Completed:** 2026-08-01  
**Scope:** System A only

- Definition loading remains non-mutating: valid user thresholds and all slot
  assets/source fields are preserved exactly.
- Humidity validation now detects missing `0/100` coverage, gaps, overlaps,
  out-of-domain values, reversed ranges, and non-integer boundaries.
- Invalid definitions cannot be saved or exported into the T014 runtime array.
- Switcher Lab displays the audit findings and a complete boundary-only repair
  proposal before any values change.
- Repair requires an explicit **Apply boundary repair** click, remains local for
  review, and still requires the normal Save action before persistence/cloud
  synchronization.
- Repair preserves slot order, labels, PNG/HTML data, hashes, storage paths,
  download URLs, and baked versions; only `slotIndex`, `min`, and `max` may be
  corrected.
- No System B source file was modified.

```text
npx.cmd vitest run src/lib/humidityRangeRepair.test.ts src/lib/humidityRangeRuntime.test.ts src/lib/imageSwitcherResolver.test.ts src/lib/humidityNumericContract.test.ts
4 files passed; 18 tests passed

npx.cmd tsc -b --pretty false
passed
```

No deployment was performed.

## T016 — Isolated Time Readings schema and chooser

**Completed:** 2026-08-01  
**Scope:** System A only

- Added a separate **Time Readings** element type rather than overloading the
  current clock's digital digits or analog hands.
- The chooser sequence is Time Readings → Sunrise Time / Sunset Time → Digital
  (`HH:MM`). Analog is intentionally unavailable.
- Removed Sunrise/Sunset from new generic Text and Numeric Display choices.
- Existing `IMG_TIME` hours/minutes/seconds and `TIME_POINTER` choices remain
  unchanged and accept no Sunrise/Sunset source.
- Added persisted `timeReadingDisplay: 'DIGITAL'` schema state.
- Until T017 implements rendering/export, a visible compatibility notice is
  attached and ZPK generation explicitly stops if a Time Reading exists; it is
  never silently omitted from a package.
- No System B source file was modified.

```text
npx.cmd vitest run src/lib/timeReadingSchema.test.ts src/lib/dataRepresentationAuthority.test.ts src/lib/spec131CurrentBaseline.test.ts src/lib/projectFileArtifact.test.ts
4 files passed; 25 tests passed

npx.cmd tsc -b --pretty false
passed
```

No deployment was performed.

## T017 — Time Readings preview and export

**Completed:** 2026-08-01  
**Scope:** System A only

- Added build-time `0–9` digit baking and a scoped colon PNG for each Sunrise or
  Sunset Time Reading, using the same selected font, color, size, spacing, and
  watch-safe edge option as the existing digit pipeline.
- Canvas preview now composes the five `HH:MM` glyphs from those generated
  assets, including the colon, with the existing bitmap layout engine.
- ZPK generation no longer blocks Time Readings. It exports the isolated editor
  element as `hmUI.widget.TEXT_IMG`, directly bound to the official
  `hmUI.data_type.SUN_RISE` or `SUN_SET`, with the colon supplied through
  `dont_path`.
- Package validation requires all ten digits plus the colon to exist before a
  build may continue; a Time Reading cannot be silently omitted.
- Existing `IMG_TIME` and `TIME_POINTER` generation paths were not changed.
- No System B source file was modified.
- Physical-watch verification is explicitly deferred to T026 because this task
  did not authorize deployment. The generated runtime contract was verified for
  both Sunrise and Sunset.

Official references checked:
`https://docs.zepp.com/docs/watchface/api/hmUI/widget/data_type/`
`https://docs.zepp.com/docs/v2/reference/device-app-api/hmUI/widget/TEXT_IMG/`

```text
.\node_modules\.bin\vitest.cmd run src/lib/timeReadingSchema.test.ts src/lib/timeReadingRuntime.test.ts
2 files passed; 6 tests passed

.\node_modules\.bin\tsc.cmd -b --pretty false
passed
```

No deployment was performed.

## T018 — Time Readings FVWF persistence and migration

**Completed:** 2026-08-01  
**Scope:** System A only

- FVWF round trips preserve `TIME_READING`, Sunrise/Sunset source, Digital mode,
  geometry, style, spacing, watch-safe edge setting, ten custom digit filenames,
  and the custom colon filename in both main and AOD layouts.
- Legacy generic `TEXT`/`TEXT_IMG` elements bound to `SUN_RISE` or `SUN_SET`
  migrate to the isolated `TIME_READING` model without renaming assets or
  changing visual fields.
- T016-era Time Readings lose only the exact obsolete “pending T017” warning;
  unrelated compatibility warnings remain untouched.
- Missing or invalid legacy Analog presentation state is normalized to Digital,
  so Analog remains unavailable and current `IMG_TIME`/`TIME_POINTER` elements
  are not affected.
- The migration is idempotent for both main and AOD element collections.
- No System B source file was modified.

```text
.\node_modules\.bin\vitest.cmd run src/lib/projectFileArtifact.test.ts src/lib/timeReadingSchema.test.ts src/lib/timeReadingRuntime.test.ts
3 files passed; 17 tests passed

.\node_modules\.bin\tsc.cmd -b --pretty false
passed
```

No deployment was performed.

## T019 — BioCharge contract discovery

**Completed:** 2026-08-01  
**Scope:** Evidence only; System A product behavior unchanged

- Official Amazfit support proves BioCharge is a dynamic `0–100` score.
- The current public Zepp v3+ watch-face registry exposes
  `hmUI.data_type.READINESS` at `[0,100]`; it exposes no BioCharge-named runtime
  identifier. The v2 registry does not contain Readiness.
- Zepp design rules permit Readiness numbers, pointers, and progress, specify up
  to three digits, and specify `--` as its empty presentation.
- Official older Balance material calls its feature Readiness, while current
  BioCharge-capable device material calls the newer energy metric BioCharge.
  Similar descriptions and equal ranges do not prove firmware equivalence.
- A follow-up targeted internet audit found community/editor runtime evidence
  for the exact `hmUI.data_type.BIO_CHARGE` identifier; the no-underscore
  `BIOCHARGE` form fails. This evidence is not misrepresented as public Zepp
  documentation.
- Numeric Values were reopened by explicit user approval. The invalid sentinel,
  universal device/API matrix, and Image Switcher binding remain unpublished.
- Complete evidence and the acquisition checklist are recorded in
  `biocharge-contract-evidence.md`.
- No source code, System B file, generated asset, or deployment artifact changed
  during T019.

No test run was required because T019 changed specification evidence only.
No deployment was performed.

## T020 — HybridCharge / BioCharge Numeric Values

**Completed:** 2026-08-01  
**Scope:** System A Numeric Values only

- Added **HybridCharge / BioCharge** to the Numeric Values chooser only.
- The semantic/runtime contract is fixed `0–100`, maximum three digits, preview
  and fit sample `100`, direct `hmUI.data_type.BIO_CHARGE` binding.
- ZPK generation reuses the normal `TEXT_IMG` pipeline and generates scoped
  digit PNGs `0–9`; no percent asset is added because the watch value is a score,
  not a displayed percentage requirement.
- New elements carry a visible compatibility warning because community reports
  require a supported watch/firmware around API level 4.2+ and the public Zepp
  compatibility matrix has not caught up.
- FVWF round-trip preserves the type, ten custom digit filenames, geometry, and
  compatibility warning.
- BioCharge remains unavailable in Arc, Gauge, and Image Switcher pending T021
  and T022. Existing PAI behavior was not reused or changed.
- Current clocks, weather, other numeric values, System B, and deployment paths
  were not changed.
- Physical-watch verification remains in T026 because no deployment was
  authorized for T020.

```text
.\node_modules\.bin\vitest.cmd run src/lib/bioChargeNumericContract.test.ts src/lib/dataRepresentationAuthority.test.ts src/lib/gaugeEligibilityContract.test.ts src/lib/spec131CurrentBaseline.test.ts src/lib/projectFileArtifact.test.ts
5 files passed; 31 tests passed

.\node_modules\.bin\tsc.cmd -b --pretty false
passed
```

No deployment was performed.

## T021 — HybridCharge / BioCharge Arc and Gauge

**Completed:** 2026-08-01  
**Scope:** System A Arc and Gauge only

- Added `BIO_CHARGE` to Arc Progress and Gauge Pointer choices while preserving
  Numeric Values and keeping Image Switcher excluded.
- Both representations consume the descriptor’s fixed `0–100` range.
- Verified normalization `0 → 0`, `50 → 0.5`, `100 → 1`, including clamping
  below zero and above 100.
- Verified a `-120°..120°` Gauge maps `0 → -120°`, `50 → 0°`, and
  `100 → 120°` exactly.
- Arc preview and Gauge preview use the bounded midpoint rather than a generic
  unrelated fixture.
- Generated Arc uses `hmUI.widget.ARC_PROGRESS`; generated Gauge uses
  `hmUI.widget.IMG_POINTER`; both bind directly to
  `hmUI.data_type.BIO_CHARGE` and preserve configured Gauge endpoints.
- Newly added Numeric/Arc/Gauge BioCharge elements carry the same supported-
  firmware/API compatibility warning.
- Image Switcher, other data types, System B, and deployment paths were not
  changed. Physical-watch verification remains in T026.

```text
.\node_modules\.bin\vitest.cmd run src/lib/bioChargeBoundedVisuals.test.ts src/lib/bioChargeNumericContract.test.ts src/lib/dataRepresentationAuthority.test.ts src/lib/gaugeEligibilityContract.test.ts src/lib/spec131CurrentBaseline.test.ts
5 files passed; 24 tests passed

.\node_modules\.bin\tsc.cmd -b --pretty false
passed
```

No deployment was performed.

## T022 — HybridCharge / BioCharge explicit-range Image Switcher

**Completed:** 2026-08-01  
**Scope:** System A Image Switcher only

- Added BioCharge to Image Switcher with `ABSOLUTE_RANGES`; no automatic
  firmware scaling assumption was introduced.
- Default ranges are `Low 0–30`, `Balanced 31–70`, and `High 71–100`.
- The Lab audits integer boundaries, full `0/100` coverage, gaps, overlaps,
  reversed/out-of-domain values, and offers the same explicit boundary-only
  repair used by Humidity. Repair preserves labels, order, and asset fields and
  remains local until the user saves.
- Preview and export share the same resolver. Verified boundaries:
  `0/30 → Low`, `31/70 → Balanced`, `71/100 → High`.
- Export expands configured slots into a 101-entry array indexed by live
  BioCharge values `0–100`. Repeated filenames do not duplicate PNG files or
  Firebase downloads.
- Generated `IMG_LEVEL` binds directly to `hmUI.data_type.BIO_CHARGE` and emits
  `image_length: 101`.
- Existing Humidity validation/repair/runtime tests still pass after extracting
  the shared 0–100 audit logic.
- Wind remains Numeric/Arc/Gauge only. Other widgets, System B, and deployment
  paths were not changed. Physical-watch verification remains in T026.

```text
.\node_modules\.bin\vitest.cmd run src/lib/bioChargeRangeRuntime.test.ts src/lib/bioChargeBoundedVisuals.test.ts src/lib/bioChargeNumericContract.test.ts src/lib/humidityRangeRuntime.test.ts src/lib/humidityRangeRepair.test.ts src/lib/dataRepresentationAuthority.test.ts src/lib/imageSwitcherResolver.test.ts
7 files passed; 34 tests passed

.\node_modules\.bin\tsc.cmd -b --pretty false
passed
```

No deployment was performed.

## T023/T024 — Moon characterization and preserve-as-is verdict

**Completed:** 2026-08-01  
**Scope:** System A Moon Image Switcher characterization only

- Confirmed the official asset-count choices are exactly `7`, `13`, or `30`;
  `15` and arbitrary range/code definitions remain unsupported.
- Verified the chooser/resolver default, strict count policy, ordered FVWF
  round-trip, and generated output for all three supported counts.
- Froze the existing generated `IMG_LEVEL + hmUI.data_type.MOON` adapter in a
  characterization test; no production runtime code was changed.
- The user explicitly directed that Moon Phases remain as-is. T024 is closed
  with no correction and may be reopened only for concrete watch/package proof.
- System B and deployment paths were not touched.

```text
.\node_modules\.bin\vitest.cmd run src/lib/moonCharacterization.test.ts src/lib/imageSwitcherResolver.test.ts src/lib/projectFileArtifact.test.ts src/lib/dataRepresentationAuthority.test.ts
4 files passed; 33 tests passed

.\node_modules\.bin\tsc.cmd -b --pretty false
passed
```

No deployment was performed.

## T025 — Full System A compatibility audit

**Completed:** 2026-08-01  
**Scope:** Read-only behavior audit plus characterization tests

- Classified all 27 generic live-data choices across Numeric, Arc, Gauge,
  Image Switcher, and Time Reading, plus clock/calendar/status/decorative types.
- Confirmed three direct naming defects: `PAI` versus official `PAI_DAILY`,
  `FAT_BURN` versus official `FAT_BURNING`, and `ALTIMETER` being air pressure
  rather than altitude.
- Confirmed custom Image Switcher thresholds reach runtime only for Humidity
  and BioCharge. Other legacy custom-range choices are not preview/device safe.
- Recorded target-dependent/user-dependent bounded cases and the incorrectly
  scalar Sleep `H:MM` duration for separately approved remediation.
- Added coverage that fails if a new generic data type is exposed without being
  included in the audit inventory.
- Updated one stale pre-T022 assertion to recognize already-approved BioCharge
  Image Switcher support.
- No chooser, preview, generator, FVWF, runtime, System B, or deployment behavior
  was changed.

```text
.\node_modules\.bin\vitest.cmd run src/lib/fullCompatibilityAudit.test.ts src/lib/dataRepresentationAuthority.test.ts src/lib/imageSwitcherResolver.test.ts src/lib/gaugeEligibilityContract.test.ts src/lib/spec131CurrentBaseline.test.ts
5 files passed; 28 tests passed

.\node_modules\.bin\tsc.cmd -b --pretty false
passed
```

No deployment was performed.

## T025A — Canonical PAI and Fat Burning identifiers

**Completed:** 2026-08-01  
**Scope:** System A identifier/schema/FVWF/generator migration only

- New choices use official `PAI_DAILY` and `FAT_BURNING` identifiers everywhere.
- Legacy `PAI` and `FAT_BURN` remain accepted aliases and migrate on FVWF load
  in both main and AOD layouts.
- Migration changes only `dataType`; tests preserve custom digit filenames,
  image arrays, definition IDs, geometry, and background data.
- Generator defensively canonicalizes legacy in-memory elements before every
  widget path, preventing obsolete constants in generated ZPK code.
- Existing asset prefixes remain `pai_digit` and `fatburn_digit`, avoiding file
  renames or package churn.
- AI/HTML import normalization and asset pipelines now emit canonical values.
- System B and deployment paths were not changed.

```text
.\node_modules\.bin\vitest.cmd run src/lib/canonicalZeppIdentifiers.test.ts src/lib/fullCompatibilityAudit.test.ts src/lib/dataRepresentationAuthority.test.ts src/lib/projectFileArtifact.test.ts src/lib/imageSwitcherResolver.test.ts
5 files passed; 33 tests passed

.\node_modules\.bin\tsc.cmd -b --pretty false
passed
```

The repository-wide suite was also sampled. Its unrelated pre-existing effects,
tick-rendering, and intentionally deferred System B parity failures remain; no
T025A-focused test failed.

No deployment was performed.

## T025B — Air Pressure semantics

**Completed:** 2026-08-01  
**Scope:** System A labels, descriptor, preview/fit, and preservation tests only

- Corrected user-facing `ALTIMETER` terminology from Altitude to Air Pressure.
- Added the official 1–1200 bounded-scalar descriptor for Numeric, Arc, and
  Gauge representations.
- Numeric fitting and preview now use `1200`, matching the documented four-digit
  maximum rather than the generic `8888/9999` fixture.
- Preserved runtime `hmUI.data_type.ALTIMETER`, asset prefix `alt_digit`, custom
  digit filenames, geometry, and FVWF structure.
- Did not add or alias the separate official `ALTITUDE` source.
- System B and deployment paths were not changed.

```text
.\node_modules\.bin\vitest.cmd run src/lib/airPressureSemantics.test.ts src/lib/fullCompatibilityAudit.test.ts src/lib/dataRepresentationAuthority.test.ts src/lib/spec131CurrentBaseline.test.ts src/lib/projectFileArtifact.test.ts
5 files passed; 31 tests passed

.\node_modules\.bin\tsc.cmd -b --pretty false
passed
```

No deployment was performed.

## T025C — Truthful Image Switcher creation gate

**Completed:** 2026-08-01  
**Scope:** System A chooser/Lab truthfulness and legacy preservation only

- New Image Switcher elements and definitions offer exactly Humidity,
  BioCharge, Weather Condition, and Moon Phase.
- Humidity/BioCharge keep arbitrary explicit-range editing and their proven
  runtime expansion. Weather remains fixed at 29; Moon remains fixed at 7/13/30.
- Legacy Battery/Steps/Calories/Distance/Stand/PAI/Fat Burning/Heart/Stress/
  SpO₂/UVI/AQI definitions and FVWF elements remain loadable with unchanged
  data type, definition ID, frame count, filenames, geometry, and thresholds.
- Editing a legacy switcher visibly explains that its thresholds are preview-
  only. The selector preserves its current legacy type but does not offer other
  unsafe legacy types.
- No legacy data was silently converted or deleted; generator behavior for an
  existing face remains unchanged.
- System B and deployment paths were not changed.

```text
.\node_modules\.bin\vitest.cmd run src/lib/legacyImageSwitcherTruthfulness.test.ts src/lib/imageSwitcherResolver.test.ts src/lib/fullCompatibilityAudit.test.ts src/lib/humidityRangeRuntime.test.ts src/lib/bioChargeRangeRuntime.test.ts src/lib/projectFileArtifact.test.ts
6 files passed; 35 tests passed

.\node_modules\.bin\tsc.cmd -b --pretty false
passed
```

No deployment was performed.

## T025D — Remaining semantic corrections

**Completed:** 2026-08-01  
**Scope:** System A creation gates, descriptors, Distance assets, and AQI warnings

- Sleep is modeled as an `H:MM` duration with no new representation until a
  dedicated Duration Reading exists. Legacy Numeric elements remain readable.
- Steps, Calories, Heart, and Distance remain Numeric for new widgets. Their
  legacy Arc/Gauge elements remain loadable and show an evidence warning.
- Distance now generates a scoped decimal-point PNG, persists `decimalImage`,
  emits the documented Zepp `dont_path`, and participates in strict pre-build
  asset validation alongside its ten digit images.
- SpO₂ uses an explicit integer domain of 51–100 for Numeric/Arc/Gauge.
- AQI uses 1–999 and receives the official mainland-China warning on new
  Numeric/Arc/Gauge elements and loaded main/AOD FVWF elements, without
  overwriting an existing warning.
- T025C legacy Switcher preservation remains unchanged for all these sources.
- System B and deployment paths were not changed.

```text
.\node_modules\.bin\vitest.cmd run src/lib/remainingSemanticCorrections.test.ts src/lib/dataRepresentationAuthority.test.ts src/lib/fullCompatibilityAudit.test.ts src/lib/projectFileArtifact.test.ts src/lib/gaugeEligibilityContract.test.ts src/lib/legacyImageSwitcherTruthfulness.test.ts src/lib/humidityNumericContract.test.ts src/lib/temperatureNumericContract.test.ts
8 files passed; 46 tests passed

.\node_modules\.bin\tsc.cmd -b --pretty false
passed
```

No deployment was performed.

## T026 — Full regression, private build, and package audit

**Completed:** 2026-08-01  
**Scope:** Verification only; no deployment

- Clean Spec 131 gate: 23 files and 104 tests passed.
- TypeScript build passed.
- Private Firebase environment preflight and Vite production build passed;
  8,235 modules transformed.
- Headless verification passed 57/57 checks.
- Nested generated-ZPK inspection verified canonical bindings, 101-index range
  arrays, Distance decimal, and exactly one packaged entry for every PNG runtime
  reference.
- Full unfiltered suite: 311 tests passed, 16 failed, and 8 suites failed to
  load. All failures are classified as unrelated effects/tick baseline drift,
  deliberately deferred/broken-path System B parity, standalone scripts
  collected as suites, missing Vitest globals, or obsolete imports of removed
  `jsCodeGeneratorV2.ts`. No Spec 131 test failed.
- Digit typography verifier is blocked only by the same obsolete V2 generator
  import. Current generator package inspection passed.
- Physical-watch matrix is recorded in `t026-regression-report.md` and remains
  pending because no deployment/install was authorized.

```text
Spec 131: 23 files passed; 104 tests passed
Headless verifier: 57 passed; 0 failed
Private build: passed
TypeScript: passed
Private index SHA-256: EA9AFC343AB7EF0605BD7CE94BD6B4E05E5FD0C0E068F3DF146F385E51C10C11
```

No deployment was performed.
