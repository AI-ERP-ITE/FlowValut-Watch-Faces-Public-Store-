# Spec 138 — Watch-Test Export Values

**Status:** Approved for implementation  
**Created:** 2026-08-05  
**Domain:** System A ZPK test generation

## Goal

Allow designers to use maximum-width alignment samples such as `88` on the
interactive canvas while producing a watch-test ZPK with controlled realistic
values.

## Boundary

- Canvas and FVWF values remain user-controlled and unchanged.
- Only the temporary element snapshot passed into the watch-test ZPK pipeline
  receives test values.
- The generator emits static `TEXT_IMG` content for overridden digit widgets;
  static text disables the live data binding for that test package.
- Analog hands are unchanged.
- Time Reading widgets for Sunrise, Sunset, and Sleep remain unchanged and receive
  no automatic values.
- Main and AOD snapshots receive the same policy.

## Approved Values

| Source | Test value |
|---|---:|
| Date day | 31 |
| Digital hour / minute / second | 16 / 49 / 15 |
| Battery | 78 |
| Steps | 12000 |
| Calories | 650 |
| Distance | 8.5 |
| Stand | 10 |
| Heart Rate | 70 |
| Blood Oxygen | 98 |
| Stress | 32 |
| PAI Daily / Weekly | 45 / 125 |
| Fat Burning Time | 45 |
| Humidity | 55 |
| Wind Level | 3 |
| UV Index | 5 |
| Air Quality | 42 |
| Air Pressure | 1013 |
| VO2 Max | 48 |
| Training Load | 125 |
| BioCharge | 75 |
| Current / Low / High Temperature | 24° / 18° / 30° |

Percentage-based values contain digits only. Temperature retains its independent
degree-unit resource. Sunrise, Sunset, and Sleep are explicitly excluded.

## Acceptance Criteria

1. A canvas date preview set to `88` remains `88` before and after generation.
2. The generated test code contains static day `31` and time `16`, `49`, `15`.
3. Numeric Values use the approved static values without live `data_type` binding.
4. Humidity, battery, and blood oxygen test values contain no percent symbol.
5. Time Reading generation remains live and unchanged.
6. The persisted FVWF contains no export-only test-value metadata.

