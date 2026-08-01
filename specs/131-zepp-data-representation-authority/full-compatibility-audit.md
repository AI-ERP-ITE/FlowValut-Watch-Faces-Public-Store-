# T025 — Full System A Compatibility Audit

**Date:** 2026-08-01  
**Scope:** Existing System A choices, runtime identifiers, semantics, and representations  
**Behavior changes:** None

## Verdict legend

- **A** — allowed and backed by a coherent System A runtime contract.
- **R** — rejected because the representation does not fit the data.
- **L** — legacy-visible but not yet safe: identifier, scale, symbols, or runtime
  threshold behavior is incomplete or unproven.
- **D** — deliberately deferred/not offered.

## Complete data/representation matrix

| System A data type | Correct user-facing meaning | Numeric | Arc | Gauge | Image Switcher | Time Reading | Audit verdict / required follow-up |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| `BATTERY` | Battery Level | A | A | A | L | R | Fixed 0–100. Switcher exposes editable ranges but does not export those thresholds. |
| `STEP` | Step Count | A | L | L | L | R | New widgets are Numeric-only; legacy bounded/switcher elements remain warned and preserved pending `STEP_TARGET` semantics. |
| `CAL` | Calories | A | L | L | L | R | New widgets are Numeric-only; legacy bounded/switcher elements remain warned and preserved pending `CAL_TARGET` semantics. |
| `DISTANCE` | Distance | A | L | L | L | R | T025D added decimal bitmap generation and strict packaging. New bounded widgets are gated because no universal goal exists. |
| `STAND` | Standing Count | A | A | A | L | R | Official fixed 0–12 domain supports bounded visuals. Switcher thresholds are not exported. |
| `PAI_DAILY` | Daily PAI | A | A | A | L | R | Canonical identifier completed in T025A. Switcher thresholds remain gated by T025C. |
| `PAI_WEEKLY` | Weekly PAI | A | A | D | L | R | Official 0–525. Gauge is currently absent. Switcher thresholds are not exported. |
| `FAT_BURNING` | Fat Burning Time | A | A | A | L | R | Canonical identifier completed in T025A. Switcher thresholds remain gated by T025C. |
| `HEART` | Heart Rate | A | L | L | L | R | New widgets are Numeric-only because the maximum depends on user age; legacy bounded/switcher elements remain warned and preserved. |
| `STRESS` | Stress Level | A | A | A | L | R | Official 0–100. Switcher thresholds are not exported. |
| `SPO2` | Blood Oxygen | A | A | A | L | R | T025D centralized the official integer domain as 51–100; Switcher remains legacy-only. |
| `HUMIDITY` | Humidity (%) | A | A | A | A | R | Complete 0–100 numeric, bounded, and explicit-range runtime contract. |
| `WIND` | Wind Level | A | A | A | D | R | Complete 0–12 numeric/bounded contract; switcher intentionally deferred. |
| `UVI` | UV Index | A | A | A | L | R | Official 1–5. Switcher thresholds are not exported through the proven range adapter. |
| `AQI` | Air Quality | A | A | A | L | R | Official 1–999; T025D adds the mainland-China compatibility warning. Switcher remains legacy-only. |
| `SLEEP` | Sleep Duration | L | R | R | R | R | Legacy Numeric elements remain readable and warned; new creation is deferred until a dedicated `H:MM` Duration Reading exists. |
| `ALTIMETER` | Air Pressure | A | A | A | D | R | Corrected in T025B with official 1–1200 semantics. Separate `ALTITUDE` remains unavailable. |
| `VO2MAX` | VO₂ Max | A | A | D | D | R | Official fixed 15–65 domain. Arc is currently offered; Gauge/Switcher are absent. |
| `TRAINING_LOAD` | Training Load | A | R | R | R | R | Up to three digits, with no documented maximum. Correctly Numeric-only after T012. |
| `BIO_CHARGE` | HybridCharge / BioCharge | A | A | A | A | R | Complete fixed 0–100 contract with firmware compatibility warning and exported custom ranges. |
| `WEATHER_CURRENT` | Current Temperature | A | R | R | R | R | Correct Numeric-only temperature contract with sign and degree assets. |
| `WEATHER_LOW` | Low Temperature | A | R | R | R | R | Correct Numeric-only temperature contract. |
| `WEATHER_HIGH` | High Temperature | A | R | R | R | R | Correct Numeric-only temperature contract. |
| `WEATHER_STATUS` | Weather Condition | R | R | R | A | R | Correct fixed 29-code icon contract using the user-proven runtime binding. |
| `MOON` | Moon Phase | R | R | R | A | R | Preserved fixed 7/13/30 phase sets by the T023/T024 verdict. |
| `SUN_RISE` | Sunrise Time | R | R | R | R | A | Correct isolated digital `HH:MM` Time Reading. |
| `SUN_SET` | Sunset Time | R | R | R | R | A | Correct isolated digital `HH:MM` Time Reading. |
| `SUN_CURRENT` | Time Until Sun Event | R | R | R | R | D | Duration, not time-of-day; requires a future Duration Reading category. |

## Non-data widget categories

| Widget | Authority |
|---|---|
| Digital Hours / Minutes / Seconds | Current device clock only; never Sunrise/Sunset. |
| Clock Pointers | Current device clock only; never Sunrise/Sunset until a separate proven analog Time Reading exists. |
| Date digits / Weekday names | Calendar-specific sources only; excluded from generic data types. |
| Status Indicator | Fixed status sources only: Alarm, Notification, DND, Lock, Bluetooth. |
| Static Image / Shape | Decoration only; no live data source. |

## Confirmed gaps, ordered by risk

| ID | Priority | Finding | Required later task |
|---|---|---|---|
| C1 | Completed T025A | `PAI_DAILY` is canonical; legacy `PAI` loads through a narrow alias migration. | Asset-preservation and defensive-generator tests pass. |
| C2 | Completed T025A | `FAT_BURNING` is canonical; legacy `FAT_BURN` loads through a narrow alias migration. | Asset-preservation and defensive-generator tests pass. |
| C3 | Completed T025B | `ALTIMETER` is now consistently Air Pressure with a 1–1200 contract. | Existing runtime binding/assets preserved; `ALTITUDE` remains a separate unapproved source. |
| C4 | Completed T025C | New switchers are limited to proven Humidity/BioCharge ranges and fixed Weather/Moon sets. | Legacy definitions/elements remain asset-preserving and visibly warned; no preview-only range type can be newly selected. |
| C5 | Completed T025D | Sleep is hidden from new scalar creation pending a dedicated Duration Reading. | Legacy elements remain readable and visibly warned. |
| C6 | Completed T025D | Steps/Calories/Heart are Numeric-only for new widgets. | Existing Arc/Gauge elements remain preserved and warned until target/user-scale evidence exists. |
| C7 | Completed T025D | Distance Numeric now has generated/scoped decimal assets and strict package validation. | Existing bounded elements preserved; new bounded creation gated. |
| C8 | Completed T025D | SpO₂ uses explicit 51–100 authority for Numeric/Arc/Gauge. | Switcher remains legacy-only under T025C. |
| C9 | Completed T025D | AQI uses 1–999 authority and an FVWF/new-element mainland-China warning. | Switcher remains legacy-only under T025C. |
| C10 | P2 | Some logically bounded sources are inconsistently offered (for example Weekly PAI/VO₂ Max Gauge). | Do not add merely for symmetry; add only after UX need and runtime tests. |

## Runtime and source facts used

- Zepp v3+ documents: Battery 0–100, Steps 0–99999, Calories 0–9999,
  Heart `[min, 220-age]`, Daily PAI 0–75, Weekly PAI 0–525, Distance
  0–99, Stand 0–12, UVI 1–5, AQI 1–999, Humidity 0–100, Stress
  0–100, SpO₂ >50–100, Wind 0–12, Air Pressure 1–1200, VO₂ Max
  15–65, and value-only Training Load up to three digits.
- Official runtime names include `PAI_DAILY`, `FAT_BURNING`, `ALTIMETER`
  (air pressure), and `ALTITUDE` (altitude).
- `IMG_POINTER` officially accepts a `data_type` progress binding.
- Public `IMG_LEVEL` documents an explicit numeric `level`; it does not
  document arbitrary user threshold definitions. System A currently expands
  thresholds into live indices only for Humidity and BioCharge.
- `ARC_PROGRESS` publicly documents a `level` from 0–100. Existing direct
  `data_type` auto-binding is retained during this audit but target-dependent
  semantics remain evidence-gated.

## Official sources

- https://docs.zepp.com/docs/watchface/api/hmUI/widget/data_type/
- https://docs.zepp.com/docs/v2/watchface/api/hmUI/widget/IMG_POINTER/
- https://docs.zepp.com/docs/1.0/watchface/api/hmUI/widget/IMG_LEVEL/
- https://docs.zepp.com/docs/1.0/watchface/api/hmUI/widget/ARC_PROGRESS/
- https://docs.zepp.com/docs/watchface/api/hmUI/widget/edit_watchface/

## T025 boundary

This audit adds documentation and characterization coverage only. It does not
change choosers, descriptors, migrations, preview, generator output, FVWF,
System B, or deployment behavior. C1–C10 require separately approved tasks.

## T025C Image Switcher disposition

The `L` Switcher cells above now mean **legacy preservation only**, not a new
creation choice. Battery, Steps, Calories, Distance, Stand, Daily/Weekly PAI,
Fat Burning, Heart, Stress, SpO₂, UVI, and AQI definitions/elements still load
with their exact assets and thresholds. The Lab and Property Panel display a
preview-only warning and offer only the existing legacy type plus the four safe
destinations. New creation is restricted to Humidity, BioCharge, Weather
Condition, and Moon Phase.
