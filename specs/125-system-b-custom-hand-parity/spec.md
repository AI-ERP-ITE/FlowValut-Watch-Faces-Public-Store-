# Spec 125 — System B Custom Hand Parity

## Requirement

System B must render and export every imported FVWF element with the same custom
TIME_POINTER resolution used by System A. A `custom_hand:*` style must never
silently fall back to a built-in pointer.

## Scope and restrictions

- Modify only `system-b-editable/` and this specification.
- Do not modify System A source or shared application behavior.
- Load System A-compatible custom hand records from the existing same-origin
  IndexedDB store.
- Pass the records to every System B `InteractiveCanvas`.
- Embed only referenced custom hand records in FVWC so saved composer projects
  remain portable.
- Hydrate imported pointer elements with the baked device assets and geometry
  required by the existing System B ZPK pipeline.
- Reject an import with an explicit message when its referenced custom hand pack
  is unavailable; never substitute a standard pointer.

## Plan

1. Add a System B custom-hand hydration module.
2. Load and merge local/embedded hand records in the composer.
3. Hydrate main and AOD pointer elements during FVWF import.
4. Pass the resolved records to all visible and export canvases.
5. Persist referenced records in FVWC and normalize legacy FVWC files.
6. Add unit coverage for hydration, missing packs, and FVWC round-trip.

## Validation

- System B unit tests pass.
- System B TypeScript/Vite production build passes.
- An imported `custom_hand:*` pointer retains its four real PNG assets, pivot
  positions, and hub dimensions.
- Saving and reopening FVWC retains the custom hand record and pointer assets.
- All System B canvases receive the resolved custom hand collection.

## Test cases

1. Hydrate a main TIME_POINTER from a matching custom hand record.
2. Hydrate an AOD TIME_POINTER from the same record.
3. Leave built-in pointer styles unchanged.
4. Throw a descriptive error for a missing `custom_hand:*` record.
5. Round-trip embedded custom hand records through FVWC serialization.
