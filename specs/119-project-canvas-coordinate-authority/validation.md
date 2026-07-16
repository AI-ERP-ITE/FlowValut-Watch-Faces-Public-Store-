# Spec 119 — Validation Matrix

## Baseline evidence

- [x] Widget type union inventoried across preview and V2/V3 generators.
- [x] Interactive Canvas accepts model-derived width/height.
- [x] Saved config separately supplies active resolution to project/build paths.
- [x] Property Panel retains generic 480 clamps and 240 center assumptions.
- [x] HTML project construction is intentionally excluded from this change.
- [x] V2 background recognition retains an exact 480×480 condition.
- [x] TIME_POINTER has a specialized existing canvas-relative and asset-local geometry pipeline that must remain untouched.
- [x] Gauge renderer has an intentional 145px local anchor independent of project resolution.
- [x] Manual Guide confirms device-space widget coordinates and natural IMG source sizing.

## Automated gates after approval

- [x] Saved-config resolution authority.
- [x] 480×480, 466×466, and rectangular canvas coverage.
- [x] HTML workflow non-regression guard.
- [x] Alignment-aware position-only transformations.
- [x] MAIN/AOD parity and cloned-config safety.
- [x] Legacy FVWF no-silent-conversion behavior.
- [x] TIME_POINTER protected baseline parity.
- [x] Gauge/digit/image/frame specialized-geometry parity.
- [x] V2/V3 coordinate parity.
- [x] Background semantic/config-resolution handling.
- [x] TypeScript and private production build.
- [x] Repository verifier with zero new failures.

## Manual device/Studio checks after approval

- [ ] Create and export a 480×480 project; verify no regression.
- [ ] Create and export a 466×466 project; compare Studio coordinates with generated `watchface/index.js` and device placement.
- [ ] Test one rectangular model if available.
- [ ] Confirm saved HTML creation, baking, sizing, and repositioning behave exactly as before.
- [ ] Load a mismatched FVWF and test all three choices.
- [ ] Verify time pointers before/after on Studio and device without any center adjustment introduced by this spec.
- [ ] Verify a gauge pointer, icon, IMG_LEVEL sequence, image switcher, date, week, and ordinary image.

## Deployment gates after approval

- [x] Private Firebase environment loaded and preflight passed.
- [x] `npm run deploy:full:private` used.
- [x] Only `origin/main` pushed.
- [x] Root, Studio, and Parametric entrypoints reference the same new bundle.
- [x] Live JavaScript and CSS assets return HTTP 200.
- [x] Production entrypoints contain no `/src/main.tsx`.

## Completion evidence

- Specification commit: `851bd93b`.
- Runtime and focused-test commit: `dee537c2`.
- Private deployment commit: `ed3e2abc`.
- Private production bundle: `index-C9eDZ3S6.js`; stylesheet: `index-Cm4u4hPx.css`.
- TypeScript passed with `npx tsc --noEmit`.
- Focused canvas/generator/project tests passed: 20/20.
- Repository verifier passed: 49/49.
- The full Vitest run retained 11 previously documented Spec 118 engine/effect snapshot failures; Spec 119 introduced no new failures and every Spec 119 test passed.
- Canonical private root, Studio, and Parametric SPA-query routes returned HTTP 200 with identical bundle hashes. The referenced JavaScript and CSS assets also returned HTTP 200.
- `public/main` was not changed.

## Current status

Closed on 2026-07-16. Implementation and private deployment are complete. The manual Studio/device matrix above remains available for user acceptance testing and does not block closure.
