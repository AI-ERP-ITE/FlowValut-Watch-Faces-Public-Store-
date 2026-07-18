# Spec 123 — Moon Image Switcher Resolution

## Goal

Support Zepp moon-phase image sets at the documented 7, 13, or 30 image resolutions while preserving the existing saved Image Switcher workflow.

## Requirements

1. `MOON` uses a dedicated `LUNAR_CYCLE` policy, not weather-style fixed status codes or user-authored numeric ranges.
2. New Moon definitions default to 7 ordered slots.
3. The Switcher Lab exposes Moon-only resolution choices: 7, 13, and 30.
4. Moon slots are fixed, chronological positions. Users may upload/bake images but may not edit codes, min/max values, add slots, or remove slots.
5. Existing `ImageSwitcherDefinition.slotCount` stores the selected resolution; no IndexedDB or Firestore schema migration is required.
6. Validation rejects Moon definitions whose policy/count is not `LUNAR_CYCLE` plus 7, 13, or 30 ordered slots.
7. Linking a saved Moon definition applies its slot count to the `IMG_LEVEL` element and export preserves slot order.
8. V2 and V3 generators continue emitting `IMG_LEVEL` with `hmUI.data_type.MOON` and the selected `image_length`.

## UX Contract

- Label: `Moon Resolution`.
- Options: `7 phases`, `13 phases`, `30 phases`.
- Default: `7 phases`.
- Resolution changes rebuild the slot list. If populated slots would be discarded, require confirmation.
- Saved definition choices display their resolution.

## Non-Goals

- Exposing undocumented Zepp numeric phase codes.
- Allowing arbitrary Moon frame counts.
- Calculating lunar age in application JavaScript.
- Changing non-Moon Image Switcher behavior.

## Acceptance Criteria

1. A 7-slot Moon definition can be created, saved, reloaded, linked, previewed, and exported.
2. The same workflow succeeds for 13 and 30 slots.
3. Invalid Moon counts fail validation.
4. Moon slot rows contain no Code or Min/Max controls.
5. Weather remains fixed at 29 codes and all numeric switcher policies retain their existing behavior.
6. Private target build and focused regression tests pass.

