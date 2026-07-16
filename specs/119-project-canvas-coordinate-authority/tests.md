# Spec 119 — Regression Tests

## Resolution authority

- Before project creation, selected Firebase model/spec resolution initializes the new config.
- After project creation, saved `config.resolution` drives Interactive Canvas, Property Panel, element creation, background generation, and export.
- Loading a project does not allow live model metadata to silently override saved resolution.
- Width and height remain independent for rectangular canvases.

## HTML workflow non-regression

- HTML project creation and background construction remain unchanged.
- HTML parsing, baking, sizing, positioning, and reference-canvas behavior remain unchanged.
- No HTML resolution-mismatch prompt or automatic rearrangement is introduced.
- Existing custom hand, gauge, icon, IMG_LEVEL, switcher, and custom PNG behavior remains unchanged.

## Position-only rearrangement

- Center-aligned element anchors retain their normalized location while width/height remain unchanged.
- Left/right and top/bottom aligned anchors reconstruct correct X/Y with unchanged size.
- Explicit center widgets transform only approved project-space center fields.
- `Keep original positions` returns geometry identical to input.
- `Cancel` leaves the loaded project unchanged.
- Validation failure leaves the original project unchanged.
- MAIN and AOD receive the same selected transformation policy.
- Derived digit layout origins are recalculated, not blindly multiplied.

## Protected geometry

- TIME_POINTER input element geometry is unchanged by rearrangement.
- TIME_POINTER preview center, custom 480 reference ratio, hand pivots, prepared asset sizes, and V2/V3 emitted parameters match the pre-change baseline.
- Gauge background/pointer/arc output dimensions and normalized pivots match baseline.
- IMG_TIME/IMG_DATE glyph dimensions and complete-day image dimensions match baseline.
- IMG_LEVEL/icon/switcher frame dimensions match baseline.
- IMG_PROGRESS spacing behavior matches baseline.

## Generator contracts

- A 466×466 semantic background is skipped/handled exactly once in V2.
- A 480×480 background retains current behavior.
- Gauge-pair full-screen siblings are not misclassified as the project background.
- V2/V3 widget coordinates match Interactive Canvas after an approved rearrangement.

## Required commands after approval

- Focused Vitest suites for canvas geometry, persistence/import, and generators.
- `npx tsc --noEmit` or the repository TypeScript build gate.
- `node scripts/verify.mjs`.
- Firebase private-environment preflight.
- `npm run build:private`.
