# Current Implementation Gap Analysis

**Audit date:** 2026-07-31  
**Scope:** Read-only comparison of the running solution against `spec.md`

## Executive verdict

The solution already contains useful foundations: a partial element/data rule
table, generic `TEXT_IMG` digit generation, Arc and Gauge generators, a
configurable Image Switcher Lab, humidity range definitions, Moon 7/13/30
support, custom-set persistence, and preview components.

The implementation is not yet governed by one semantic authority. Several
layers independently encode names, allowed combinations, preview values,
weather codes, asset counts, and generated bindings. Some of those copies
conflict. The work is therefore mostly **controlled consolidation and repair**,
with two genuinely new features: Time Readings and BioCharge.

## Capability comparison

| Area | Existing implementation | Classification | Required work |
|---|---|---|---|
| Element/data compatibility | `src/lib/elementDataRules.ts` provides forward and reverse mappings | Adjust | Enrich it into semantic descriptors and remove invalid combinations |
| System B compatibility | A near-copy exists at `system-b-editable/src/lib/elementDataRules.ts` | Deferred | Do not modify during System A implementation; synchronize in a later dedicated stage |
| Numeric PNG symbols | Temperature minus/degree and Humidity percent now use scoped build assets and manifest validation | Completed T008–T010 | Add further symbols only when required by an approved data contract |
| Current/Low/High temperature | T007 consolidated Current; T008 completed its assets/fit; T009 exposes Low and High through the identical numeric contract | Completed T007–T009 | Physical-watch verification remains part of final regression |
| Plain text temperature binding | T007 removes Current Temperature because TEXT emits saved static text | Resolved T007 | Keep freeform Text static; audit other live TEXT choices in T025 |
| Temperature Image Switcher | T006 removes it from new choices and canonicalizes legacy IMG_LEVEL elements/definitions to Weather Condition | Resolved T006 | Preserve migration compatibility and assets |
| Weather Condition | `WEATHER_STATUS` exists as an internal editor value | Adjust | Keep semantic label but generate from weather sensor index |
| Generated weather binding | Existing `hmUI.data_type.WEATHER` is watch-proven for 29-frame Weather Status | Correct/preserve | Keep it; do not replace working firmware behavior merely because public docs omit it |
| Weather slot count | Fixed 29 validation exists | Reuse | Keep after correcting semantic type and mapping |
| Weather slot labels | T004 routes defaults and validation through the shared official manifest | Resolved T004 | Preserve exact code order through runtime migration |
| Built-in weather artwork | T004 adds 29 manifest-keyed System A recipes | Resolved T004 | Preserve code order through T006 migration |
| Spec 020 documentation | Contains a third, incompatible 29-code table and uses `WEATHER_CURRENT` for icons | Superseded | Mark Spec 131 as authority; do not implement Spec 020 mapping |
| Custom weather sets | T006 preserves definition IDs, ranges, filenames, baked URLs, and links while canonicalizing the semantic type | Reuse/resolved migration | Keep normal sync and packaging unchanged |
| Humidity numeric | Numeric prefix, preview, and 0–100 fit policy exist | Mostly reuse | Add `%` resource/format when enabled and fit `100%` |
| Humidity Arc/Gauge | Allowed by current rules | Reuse/verify | Lock scale 0–100 and test preview/device parity |
| Humidity Image Switcher | T014 supplies runtime indexing; T015 preserves valid definitions and adds explicit boundary-only audit/repair for invalid ones | Completed T014/T015 |
| Range-switcher export | Range definitions resolve preview assets; generic generator only emits `type` + image array | Broken/uncertain | Generate or prove runtime range selection; preview and device must share thresholds |
| Wind numeric | Present, but fit policy incorrectly assumes `999` | Adjust | Rename Wind Level and fit official 0–12 |
| Wind Arc/Gauge | T013 enables Gauge through the official fixed 0–12 descriptor and verifies exact pointer endpoints | Completed T013 |
| Sunrise/Sunset | T016 adds isolated Time Readings schema/chooser with Digital mode and removes them from generic Text/Numeric choices | Schema completed T016; rendering/export deferred T017 |
| Time Readings | No element/category/source model exists | New | Implement Digital Sunrise/Sunset using shared digit visuals plus time-source adapter |
| Analog external time | No custom time-source pointer exists | Deferred | Do not reuse `TIME_POINTER`; design later |
| Moon Lab | 7/13/30 `LUNAR_CYCLE` policy, UI, validator, and tests exist | Reuse | Preserve this work |
| Moon generator | Emits generic `IMG_LEVEL` with `hmUI.data_type.MOON` | Unproven | Characterize first; change only after official/reference/device proof |
| Training Load numeric | Numeric prefix and three-digit preview exist | Reuse | Keep Numeric only |
| Training Load Arc | Included in `PROGRESS_DATA_TYPES` | Wrong | Remove because no documented meaningful maximum |
| Training Load Gauge/Switcher | Not currently enabled | Correct | Keep disabled |
| BioCharge | No type, label, assets, rules, preview, persistence contract, or generator binding | New | Verify exact Zepp export identifier/API gate, then add 0–100 representations |
| Source import/AI mapping | Generic “weather” maps to `WEATHER_CURRENT`; sunrise/sunset map directly to numeric types | Wrong/ambiguous | Split temperature vs condition semantics and route times to Time Readings |
| Numeric preview fixtures | Temperature lacks degree; Wind uses 888; sunrise/sunset treated as numeric strings | Wrong | Derive fixtures from descriptors |
| FVWF persistence | Generic element fields serialize | Partial reuse | Add schema-safe representation/source fields and legacy migrations |
| Validation | Scattered count and element checks exist | Adjust | Centralize semantic validation and block invalid ZPK generation |

## Confirmed code evidence

| Finding | Evidence |
|---|---|
| Temperature and Weather Status are both legal Image Switcher types | `src/lib/elementDataRules.ts`, `IMAGE_SWITCHER` list |
| Both weather aliases are forced to an undocumented `WEATHER` type | `src/lib/jsCodeGenerator.ts`, `generateImgLevelWidget()` |
| Current Temperature symbols | T008 emits scoped minus/degree PNGs, binds one shared degree resource to metric/imperial locales, and validates the package manifest | Completed T008 |
| Live `TEXT` types are not actually bound | `generateTextWidget()` emits static `text` except date-format handling |
| Training Load | T012 preserves Numeric Display, removes new Arc eligibility, and annotates legacy main/AOD arcs without rewriting them | Completed T012 |
| Wind Level | Numeric/Arc use the corrected 0–12 contract; T013 adds Gauge with direct `WIND` binding and endpoint normalization | Completed T011/T013 |
| Weather labels conflict with official codes | `imageSwitcherResolver.ts` maps code 3 to Thunder; official mapping says Sunny |
| Built-in weather art conflicts too | `weatherIconSets.ts` maps code 0 to Sunny; official mapping says Cloudy |
| Moon resolution work already exists | Spec 123, `LUNAR_CYCLE`, lab UI, resolver tests |
| Main and System B duplicate core files | parallel `src/lib/*` and `system-b-editable/src/lib/*` copies |

## T004 implementation finding

The two editor mappings disagreed with each other and with Zepp's official
order. T004 now uses `ZEP_WEATHER_CONDITION_CODES` for Lab labels, validation,
preview accessibility labels, and built-in artwork recipes in System A. System B
is explicitly deferred to a later synchronization stage. The watch runtime
binding remains unchanged.

T005 established that the existing `hmUI.data_type.WEATHER` binding was
deliberately introduced by commit `d03c986f` and already proven on-watch by the
user. Absence from the current public `data_type` page is not evidence that a
firmware binding is fake. The proposed manual sensor adapter was fully reverted.

T017 established the System A Time Reading render/export path. Sunrise and
Sunset remain isolated from current-clock widgets in the editor, but reuse the
digit bitmap/layout pipeline and export through `TEXT_IMG` with the official
`SUN_RISE`/`SUN_SET` data type. Each instance owns a collision-safe colon PNG,
and package validation requires the complete 10-digit-plus-colon set. Public
documentation confirms the two data types and `TEXT_IMG` separator property;
physical firmware verification remains part of the final T026 watch matrix.

T018 closes the System A FVWF persistence gap for Time Readings. Complete
Sunrise/Sunset Digital state and custom asset references round-trip in main and
AOD layouts. Older generic Sunrise/Sunset text elements migrate narrowly to
`TIME_READING`; the obsolete T016 warning is removed by exact value only, and
unsupported legacy Analog state is normalized to Digital. The migration is
idempotent and does not inspect or alter current-clock elements.

T019 found that the official product score BioCharge is 0–100, but the public
watch-face registry contains only `READINESS`, also 0–100. Official Balance-era
material names Readiness while newer devices name BioCharge, so equal range and
similar descriptions are insufficient to prove a shared firmware identifier.
The initial public-doc audit found no BioCharge-named constant. Follow-up targeted
community/editor evidence established the exact underscore form
`hmUI.data_type.BIO_CHARGE`; `BIOCHARGE` fails. T020 now exposes only Numeric
Values with a fixed 0–100/three-digit contract, generated digits, and a firmware
compatibility warning. T021 adds Arc and Gauge through the same fixed 0–100
authority, with exact endpoint/midpoint normalization and direct `BIO_CHARGE`
bindings. T022 completes Image Switcher by reusing the Humidity-proven explicit
range pipeline: definitions cover every integer `0–100`, preview and export use
the same boundaries, export expands to 101 repeated filename references, and
repair remains explicit and boundary-only. The universal device/API matrix and
invalid firmware sentinel remain unpublished.
See `biocharge-contract-evidence.md`.

## Files expected to require implementation changes

This list is a planning inventory, not authorization to edit.

| Surface | Likely files |
|---|---|
| Semantic authority | `src/lib/elementDataRules.ts`, new descriptor module if needed, System B parity surface |
| Element schema | `src/types/index.ts`, pipeline types, FVWF migration/load code |
| Add-widget UX | `src/StudioApp.tsx`, `src/components/PropertyPanel.tsx` |
| Image Switcher Lab | `src/components/ImageSwitcherLab.tsx`, `src/lib/imageSwitcherResolver.ts`, types/store |
| Built-in weather assets | `src/lib/weatherIconSets.ts`, asset generation/export paths |
| Preview | `src/components/InteractiveCanvas.tsx`, numeric fit policy |
| Generator | `src/lib/jsCodeGenerator.ts` and synchronized System B generator if still independent |
| Import/analysis | `src/html/mapDomToElements.ts`, pipeline normalizer/prompts |
| Tests | resolver tests, generator tests, migration tests, verification script |

## What should be reused

1. Existing generic digit baking and `TEXT_IMG` layout controls.
2. Existing Arc and Gauge geometry/pointer asset pipelines.
3. Existing Image Switcher definition storage, custom upload, synchronization,
   and asset materialization.
4. Existing Moon 7/13/30 Lab controls and validation.
5. Existing FVWF serialization framework, extended through explicit migrations.
6. Existing normal ZPK generation → project build → admin staging/publishing flow.

## What must not be done

1. Do not rewrite all widgets at once.
2. Do not silently migrate ambiguous `WEATHER_CURRENT` elements without checking
   element type and asset shape/count.
3. Do not rename user asset files unless packaging requires a collision-safe copy.
4. Do not add BioCharge with a guessed Zepp constant.
5. Do not change Moon runtime behavior without evidence.
6. Do not let preview-only range logic masquerade as device behavior.
7. Do not deploy a partially migrated compatibility matrix.

## T023 Moon characterization verdict

Moon Phases is intentionally preserved as a fixed Image Switcher contract with
exactly **7, 13, or 30** chronologically ordered images. System A already
enforces these counts in the chooser, resolver, validation, FVWF persistence,
and generator. Regression tests now freeze all three variants. At the user's
direction, no runtime adapter change is required and T024 is closed without an
implementation change.

## T025 full compatibility audit finding

The complete matrix is recorded in `full-compatibility-audit.md`. Ten gaps were
found. The immediate P0 defects are non-canonical `PAI`/`FAT_BURN` runtime
identifiers, `ALTIMETER` being mislabeled as Altitude, and legacy configurable
Image Switchers whose thresholds do not reach device output. Sleep is also
misclassified as a scalar despite its `H:MM` duration shape. No production
behavior changed during the audit.

T025A closes the two runtime-identifier gaps. New System A elements now use
official `PAI_DAILY` and `FAT_BURNING` constants. Legacy `PAI`/`FAT_BURN`
elements in main and AOD layouts migrate only their `dataType`; custom digit
filenames, switcher definition IDs, images, geometry, background, and other
fields remain unchanged. The generator also canonicalizes legacy in-memory
values defensively. At that point Air Pressure/Altitude and switcher truthfulness remained open.

T025B closes the Air Pressure naming/semantic gap without changing saved data.
`ALTIMETER` remains the runtime key and existing `alt_digit`/custom filenames
remain intact, but every System A label and fit fixture now treats it as Air
Pressure with the official 1–1200 range. The separate official `ALTITUDE`
source was not added. Switcher truthfulness remains open for T025C.

T025C closes the misleading new-creation path. The full legacy switcher
inventory remains available internally so FVWF files, linked definitions,
filenames, and generator behavior are not silently rewritten. A separate safe
new-creation inventory contains only Humidity, BioCharge, Weather Condition,
and Moon Phase. Legacy types display a warning that configured thresholds are
preview-only and may be retained or changed only to a proven contract.

T025D closes the remaining semantic audit items. Sleep is explicitly a deferred
duration rather than a scalar. Steps, Calories, Heart, and Distance are
Numeric-only for new creation while their existing bounded elements remain
loadable and visibly warned. Distance now generates a scoped decimal bitmap,
emits Zepp's `dont_path`, and fails strict packaging if the bitmap is absent.
SpO₂ is centralized at 51–100. AQI is centralized at 1–999 and receives the
official mainland-China availability warning in new and loaded main/AOD data.
