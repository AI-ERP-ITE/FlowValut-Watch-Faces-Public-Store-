# Spec 118 — Regression Tests

## Pure contracts

- Missing/invalid mode normalizes to `digits`.
- Complete mode creates 31 unique filenames per element/scope.
- MAIN/AOD and duplicate element IDs do not collide.
- Numeric day pair start is `frameCenterX - pairWidth / 2`.

## Generator contracts

- V2/V3 numeric mode: 10 assets, `day_zero: 1`, `day_is_character: false`, native LEFT origin at computed centered start.
- V2/V3 complete mode: 31 assets, `day_is_character: true`, stored frame origin.
- Simplified Chinese, traditional Chinese, and English arrays remain identical within one widget.

## Studio contracts

- Existing FVWF day widgets without `dayImageMode` remain numeric.
- Toggle changes only the selected day widget mode.
- Month and weekday widgets do not show or consume the toggle.
- Samples `01`, `05`, `11`, `28`, and `31` stay centered.
- Duplicate foreground/shadow day elements remain independent.

## Required commands

- Focused Vitest suites.
- `npx tsc --noEmit` or repository TypeScript build gate.
- `node scripts/verify.mjs`.
- Firebase private-environment preflight.
- `npm run build:private`.
