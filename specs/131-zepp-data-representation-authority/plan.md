# Implementation Plan

## Execution rule

This plan does not authorize application-code changes. Under the repository
constitution, execute exactly one task from `tasks.md`, report its diff and
validation, and wait for explicit approval before the next task.

## Approach

1. Freeze the intended semantics in characterization tests and immutable test
   fixtures before changing production behavior.
2. Introduce a richer data descriptor alongside the existing rule tables.
3. Move one consumer at a time to the descriptor: chooser, property panel,
   preview, asset validation, generator, then migrations.
4. Deliver behavior in isolated release slices ordered by current-user risk.
5. Keep existing project generation/admin staging/publishing workflow unchanged.

## Planned slices

### Slice A — Authority without behavior change

- Add authoritative descriptors and the official weather manifest.
- Keep implementation scoped to System A; synchronize System B only in a later dedicated stage.
- Snapshot existing FVWF and generated-ZPK behavior.
- Do not change visible choices or generated output yet.

### Slice B — Weather correctness

- Correct every weather label/art mapping to the official 0–28 manifest.
- Consolidate Weather Condition as the only condition-icon choice.
- Replace `hmUI.data_type.WEATHER` with the proven weather sensor/index adapter.
- Validate built-in and custom sets through the same resolver.
- Test all 29 codes and a real custom-set ZPK on a physical watch.

### Slice C — Numeric semantics

- Consolidate Current Temperature into Numeric Values.
- Add minus and degree assets, metric/imperial degree configuration, and five-
  glyph fitting.
- Add/enable Low and High Temperature only through the same numeric contract.
- Correct Humidity `%` fitting, Wind Level 0–12 fitting, and Training Load
  eligibility.
- Add idempotent legacy migrations.

### Slice D — Bounded representations

- Lock Humidity Arc/Gauge to 0–100.
- Lock Wind Arc/Gauge to 0–12.
- Make range-switcher definitions drive generated runtime behavior.
- Verify boundary values in preview and generated ZPK.

### Slice E — Time Readings

- Add the isolated Time Readings element/source schema.
- Add Sunrise and Sunset Digital display using existing digit visuals.
- Keep current Digital Clock and Clock Pointers unchanged.
- Keep Analog unavailable.

### Slice F — BioCharge

- Obtain an official Maker-generated reference and identify the exact runtime
  constant, invalid state, API/device gate, and packaged structure.
- Add Numeric 0–100 first.
- Add Arc and Gauge 0–100 after numeric verification.
- Add Image Switcher ranges only after range-runtime parity is proven.

### Slice G — Moon evidence gate

- Characterize current 7/13/30 output.
- Compare with official Maker-generated Moon output.
- Test current and candidate adapters on a physical watch.
- Change the generator only if evidence shows the current adapter is wrong.

## Validation layers

| Layer | Required checks |
|---|---|
| Static rules | TypeScript and compatibility-matrix tests |
| Assets | count, mapping, symbols, dimensions, filenames, missing/duplicate detection |
| Preview | boundary fixtures and all fixed codes |
| Persistence | new and legacy FVWF round trips, idempotent migration |
| Generator | exact widget/source parameters and no undocumented identifiers |
| Package | referenced assets exist exactly once in ZPK |
| Device | weather custom set, negative/Fahrenheit temperature, range boundaries, Time Readings, BioCharge |
| Build | private target with required Firebase environment preflight |
| Deploy | canonical `npm run deploy:full:private` only, followed by live hash/route verification |

## Rollback controls

1. Commit specs separately from implementation.
2. Commit each implementation slice separately.
3. Do not delete legacy fields until migrations have shipped and round-trip tests
   prove preservation.
4. Prefer compatibility aliases on load and canonical values on new save.
5. Do not deploy a slice whose physical-watch gate fails.
