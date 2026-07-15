# Spec 118 — IMG_DATE Dual-Mode Centering and Complete Day Images

**Feature branch:** `main`
**Created:** 2026-07-16
**Status:** Approved for implementation
**Domain:** ZEP P system task / shared Studio core
**Deployment target:** Private Pages only (`origin/main`)

## Problem

Numeric day `IMG_DATE` widgets are centered inside their frames in Studio, but V2/V3 export starts them at `bounds.x` with `day_align: LEFT`. Existing FVWF files without `alignH` therefore look centered in Studio and shift left on the physical watch. The current exporter generates only ten digit images and does not implement the optional Zepp complete-character day mode.

The supplied regression fixture, `actve 3 premum no sgn.fvwf`, contains two overlapping numeric day layers at the same `62 × 50` frame. Both correctly inherit Studio's centered default, and both shift left under the current export contract.

## Goals

1. Fix existing numeric-day alignment without requiring users to recreate widgets or FVWF projects.
2. Add an explicit persisted mode toggle for compact numeric digits versus complete `01`–`31` images.
3. Keep complete-day mode ready for future baked decorations/effects without inventing effect parameters prematurely.
4. Preserve independent foreground/shadow layers and MAIN/AOD asset isolation.
5. Maintain V2/V3 generator parity.

## Data contract

```ts
dayImageMode?: 'digits' | 'complete';
```

Missing or invalid values resolve to `digits` for backward compatibility.

## Functional requirements

### FR-1 — Numeric digit mode

- Generate ten 0–9 images.
- Use one common cell width derived from the widest measured digit advance.
- Center each glyph inside its cell without horizontal scaling.
- Keep `day_zero: 1` and `day_is_character: false`.
- Treat every runtime date as a fixed two-cell value.
- Export `day_startX = frameCenterX - generatedPairWidth / 2` with native `day_align: LEFT`.
- Preview and device export must use the same two-cell geometry.

### FR-2 — Complete day-image mode

- Generate exactly 31 complete images representing `01` through `31`.
- Give all 31 assets an identical transparent canvas sized to the configured day frame.
- Center each complete label within that canvas without stretching its glyphs.
- Use per-element, per-scope filenames:
  - `date_day_main_<elementId>_01.png` through `_31.png`
  - `date_day_aod_<elementId>_01.png` through `_31.png`
- Emit `day_is_character: true` and the 31-image arrays for simplified/traditional Chinese and English.
- Anchor the shared image canvas at the stored frame origin.

### FR-3 — Property Panel

- For day `IMG_DATE` only, show a `Complete Day Images (01–31)` toggle.
- OFF means `digits`; ON means `complete`.
- Explain the asset-count and decorative-mode tradeoff in the UI.
- Provide an `Open Effects` action when complete mode is enabled.
- Do not claim an effect is device-baked until its export implementation exists.

### FR-4 — Effects readiness

- The existing Effects tab remains accessible.
- Complete-day generation must have one explicit per-frame bake boundary where future effects can be inserted.
- Current date drop-shadow controls remain labelled preview-only unless this spec adds and validates their baking.
- No placeholder effect data or speculative parameters are added.

### FR-5 — Persistence and compatibility

- FVWF save/load preserves `dayImageMode` in MAIN and AOD.
- Existing files with no field remain in numeric mode.
- Switching modes does not change bounds, font size, color, font style, z-order, or linked elements.
- Multiple day elements at identical bounds remain independent and receive independent asset families.

## Non-goals

- Designing new date-specific effects or decorations.
- Changing month or weekday behavior.
- Changing variable-length `TEXT_IMG` geometry.
- Changing Firebase, authentication, public storefront, or backend code.
- Modifying watchface files outside the workspace.

## Acceptance criteria

1. The supplied FVWF's two numeric day layers remain centered after export without recreation.
2. Numeric mode generates 10 equal-width digit cells and a deterministic centered start X.
3. Complete mode generates exactly 31 same-sized assets per day element and scope.
4. V2 and V3 emit the correct `day_is_character` value and array length for each mode.
5. MAIN/AOD and duplicate day elements never collide in filenames.
6. Missing `dayImageMode` defaults to numeric mode.
7. FVWF persistence retains the selected mode.
8. Preview samples `01`, `05`, `11`, `28`, and `31` remain centered.
9. TypeScript, focused tests, repository verifier, private build, deployment, and live hash verification pass.

## Exit criteria

- All tasks in `tasks.md` are complete.
- Automated validation reports zero failures.
- The private production bundle is deployed to `origin/main` only.
- Root, Studio, and Parametric redirect-query routes serve the same new bundle.
- No public remote or Firebase backend is touched.
