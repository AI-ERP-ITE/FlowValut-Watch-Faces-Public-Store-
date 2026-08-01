# Feature Specification: Zepp Data and Representation Authority

**Created:** 2026-07-31  
**Status:** Design approved; implementation requires task-by-task approval  
**Domain:** Zepp system — widgets, data binding, assets, preview, FVWF, and ZPK generation

## Problem

The editor currently treats a data type and its visual representation as though
they were the same choice. That has produced duplicated choices, invalid widget
combinations, conflicting weather-code tables, preview/export divergence, and
runtime bindings that do not match Zepp OS.

The running application must remain usable while this is corrected. Existing
working pipelines are to be reused, and each behavioral change must be isolated,
tested, approved, and executed separately.

## Model

Every live element is defined by three independent decisions:

1. **Data source** — what value Zepp supplies.
2. **Representation** — numeric digits, bounded progress, pointer, fixed-code
   image, range image, time reading, status, or decoration.
3. **Runtime adapter** — the Zepp widget/sensor contract that can legally render
   that source using that representation.

A combination is allowed only when:

1. its semantics fit the representation;
2. its range/code/time contract is documented or otherwise proven;
3. the Zepp runtime adapter is supported and tested.

## Final editor categories

| Category | Purpose | Allowed examples | Explicit exclusions |
|---|---|---|---|
| Numeric Values | Scalar values rendered with baked image digits | temperature, humidity, wind level, training load, BioCharge, UV, AQI | weather conditions, moon phases, sunrise/sunset |
| Arc Progress | Meaningful bounded progress | humidity 0–100, wind 0–12, BioCharge 0–100, supported UV/AQI scales | temperature, training load, times, conditions |
| Gauge Pointer Sets | Meaningful bounded scale | humidity, wind level, BioCharge, supported UV/AQI scales | temperature, training load, times, conditions |
| Image Switcher | Fixed codes, fixed phases, or explicit numeric ranges | weather condition, moon phase, humidity level, BioCharge ranges | raw temperature digits and times |
| Time Readings | Non-clock times of day | sunrise and sunset initially | current clock, scalar values, durations |
| Digital Clock | Current device clock | current hours/minutes/seconds | sunrise/sunset |
| Clock Pointers | Current device clock | current clock hands | sunrise/sunset |
| Static Images | Non-live decoration | sun, moon, weather, thermometer art | live values and live states |

## Approved compatibility matrix

| Data | User-facing name | Numeric | Arc | Gauge | Switcher | Time Readings | Contract |
|---|---|---:|---:|---:|---:|---:|---|
| Current temperature | Current Temperature | Yes | No | No | No | No | `WEATHER_CURRENT`, up to three digits plus sign/unit |
| Low temperature | Low Temperature | Yes | No | No | No | No | `WEATHER_LOW` |
| High temperature | High Temperature | Yes | No | No | No | No | `WEATHER_HIGH` |
| Weather condition | Weather Condition | No | No | No | Yes | No | weather sensor index 0–28 |
| Humidity value | Humidity (%) | Yes | Yes | Yes | — | No | `HUMIDITY`, 0–100 |
| Humidity ranges | Humidity Level | — | — | — | Yes | No | explicit non-overlapping ranges |
| Wind force | Wind Level | Yes | Yes | Yes | Deferred | No | `WIND`, 0–12; not wind speed |
| Sunrise | Sunrise Time | No | No | No | No | Yes | `SUN_RISE`, `HH:MM` |
| Sunset | Sunset Time | No | No | No | No | Yes | `SUN_SET`, `HH:MM` |
| Current sun event | Time Until Sun Event | Deferred | No | No | No | No | duration, not a time of day |
| Moon | Moon Phase | No | No | No | Yes | No | ordered 7/13/30 phase set; runtime adapter must be proven |
| Training load | Training Load | Yes | No | No | No | No | up to three digits; no documented progress maximum |
| HybridCharge / BioCharge | BioCharge | Yes | Yes | Yes | Yes | No | fixed 0–100; Image Switcher uses explicit ranges expanded to 101 indexed references; all bind `BIO_CHARGE` with supported-firmware warning |
| UV index | UV Index | Yes | Yes | Yes | Yes | No | documented level/range contract |
| Air quality | Air Quality | Yes | Yes | Yes | Yes | No | documented numeric domain; region warning required |

## Temperature contract

1. Replace all temperature choices with one Numeric Values choice named
   **Current Temperature**.
2. Generate a `TEXT_IMG` numeric display bound to `WEATHER_CURRENT`.
3. Require digit assets 0–9, a negative-sign asset, and one degree-symbol asset.
4. Use the same degree asset for metric and imperial units; do not add `C`/`F`.
5. Fit the maximum display `-000°` (five glyphs).
6. Add Low Temperature and High Temperature through the same representation
   contract when those sources are exposed.
7. Prohibit temperature from Arc, Gauge, and Image Switcher.

## Weather-condition contract

1. The only editor placement is Image Switcher → **Weather Condition**.
2. The set contains exactly 29 images explicitly mapped to codes 0–28.
3. The authoritative order is the current Zepp weather sensor index table:

| Code | Condition | Code | Condition |
|---:|---|---:|---|
| 0 | Cloudy | 15 | Thunderstorm |
| 1 | Showers | 16 | Snowstorm |
| 2 | Snow Showers | 17 | Floating Dust |
| 3 | Sunny | 18 | Extreme Rainstorm |
| 4 | Overcast | 19 | Rain and Hail |
| 5 | Light Rain | 20 | Thunderstorm and Hail |
| 6 | Light Snow | 21 | Heavy Rainstorm |
| 7 | Moderate Rain | 22 | Dust |
| 8 | Moderate Snow | 23 | Heavy Sandstorm |
| 9 | Heavy Snow | 24 | Rainstorm |
| 10 | Heavy Rain | 25 | Unknown |
| 11 | Sandstorm | 26 | Cloudy Night |
| 12 | Rain and Snow | 27 | Showers Night |
| 13 | Fog | 28 | Clear Night |
| 14 | Haze |  |  |

4. Preserve the watch-proven `hmUI.data_type.WEATHER` firmware binding for the
   29-frame condition switcher. Its omission from the current public data-type
   page is not evidence that the working binding is invalid.
5. Built-in and custom sets use the same manifest, preview resolver, and export
   resolver.

## Humidity, wind, training load, and BioCharge

| Data | Numeric contract | Progress/pointer contract | Switcher contract |
|---|---|---|---|
| Humidity | digits plus optional `%`, fit `100%` | fixed 0–100 | explicit ranges; default Dry 0–30, Comfortable 31–60, Humid 61–100 |
| Wind Level | digits, fit 0–12 | fixed 0–12 | deferred until an intentional 13-code asset contract exists |
| Training Load | digits, up to three | prohibited until a documented maximum exists | prohibited |
| BioCharge | digits 0–100 plus optional `%` | fixed 0–100 | explicit ranges; proposed defaults Low 0–30, Medium 31–70, High 71–100 |

## Time Readings contract

1. Add a separate top-level widget named **Time Readings**.
2. Initial sources are Sunrise Time and Sunset Time.
3. Initial display mode is Digital only.
4. Reuse the existing digit-style, alignment, spacing, sizing, and baking
   capabilities, but use a separate time-source adapter.
5. Require digits 0–9 and a colon; render `HH:MM`.
6. Keep Digital Clock and Clock Pointers current-time-only.
7. Reserve Analog as a future option; hide or mark it unavailable until custom
   source-to-angle behavior is implemented and verified.
8. Do not place durations such as Time Until Sun Event into this time-of-day
   widget.

## Moon contract

1. Keep Moon Phase in Image Switcher only.
2. Keep the implemented 7, 13, and 30 ordered resolutions.
3. Do not expose numeric ranges or editable codes.
4. Before altering the generator, prove the supported runtime adapter using an
   official Maker-generated reference and/or a physical-watch test. Current
   Zepp documents describe moon support inconsistently across API generations.

## Central authority requirement

One data descriptor must drive:

- chooser availability and labels;
- property-panel editing;
- default values and preview fixtures;
- digit width and symbol requirements;
- range/code/phase policies;
- asset validation;
- FVWF migration and serialization;
- canvas preview;
- generated watchface code;
- ZPK asset packaging;
- device/API compatibility warnings.

The descriptor must record semantic kind, supported representations, Zepp
source/identifier, range or fixed codes, digit count, required symbols,
switcher policy, asset count, device/API gate, and invalid-data behavior.

## Compatibility and safety requirements

1. Existing valid projects must continue to open and generate.
2. Migration must preserve uploaded assets and filenames wherever possible.
3. Ambiguous legacy elements must be flagged rather than silently guessed.
4. Preview and generated ZPK must use the same resolver.
5. This implementation stage changes System A only. System B synchronization
   requires a later dedicated, explicitly approved stage.
6. No deployment occurs until all approved implementation tasks, private build,
   verification suite, generated-ZPK inspection, and physical-device tests pass.

## Official references

- Zepp data types: https://docs.zepp.com/docs/watchface/api/hmUI/widget/data_type/
- Zepp `TEXT_IMG`: https://docs.zepp.com/docs/v2/reference/device-app-api/hmUI/widget/TEXT_IMG/
- Zepp weather sensor/index: https://docs.zepp.com/docs/reference/device-app-api/newAPI/sensor/Weather/
- Zepp watchface specification: https://docs.zepp.com/docs/watchface/specification/
- Zepp design specification: https://docs.zepp.com/docs/designs/customization/watchface/
- Zepp Watchface Maker FAQ: https://docs.zepp.com/docs/v2/guides/faq/watchface-maker/
- Zepp Watchface Maker release history: https://docs.zepp.com/docs/v2/guides/tools/watchface/release-note/
