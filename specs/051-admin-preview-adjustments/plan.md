# Plan: Admin + Preview Adjustment Suite

## Clarification Steps (4)
1. Clarification 1: Deletion from store uses soft-delete (`published=false` / `storeStatus=OFFLINE`), not hard-delete.
2. Clarification 2: Existing watchface edit flow keeps two modes (keep QR vs regenerate all assets).
3. Clarification 3: Main/AOD background transforms are editor transforms first, then export parity.
4. Clarification 4: Engrave controls require explicit panel mapping and fallback-safe rendering path.

## Implementation Steps
1. Add admin lifecycle backend endpoints (admin list all + set status enabled/offline).
2. Add admin lifecycle UI section in Admin Ops page with filters and status actions.
3. Add config schema for background transforms (main + AOD) and wire preview rendering.
4. Add transform controls UI (slider + numeric + quick rotate + h/v flip) for main and AOD backgrounds.
5. Add edit-existing watchface admin flow with QR retention toggle.
6. Expand custom HTML creator routes for IMG/weather status set/weather current/gauge pointer.
7. Extend hue controls to all relevant image-like element editors and export parity path.
8. Fix engrave panel tab mapping and ensure controls render for engrave frame elements.
9. Unify pointer shadow and element shadow normalization path for preview/export parity.
10. Extend AOD flicker control/warning support to all AOD background modes.

## Validation Steps (5)
1. Validation 1: Functions TypeScript build passes after admin lifecycle endpoints.
2. Validation 2: App TypeScript/Vite build passes with new admin + editor controls.
3. Validation 3: Manual admin lifecycle test (enable/offline visibility split).
4. Validation 4: Manual preview parity test for background transforms and shadow behavior.
5. Validation 5: AOD mode matrix test confirms flicker options/warnings in all four modes.
