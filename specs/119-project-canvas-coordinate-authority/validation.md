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

- [ ] Saved-config resolution authority.
- [ ] 480×480, 466×466, and rectangular canvas coverage.
- [ ] HTML workflow non-regression guard.
- [ ] Alignment-aware position-only transformations.
- [ ] MAIN/AOD parity and cloned-config safety.
- [ ] Legacy FVWF no-silent-conversion behavior.
- [ ] TIME_POINTER protected baseline parity.
- [ ] Gauge/digit/image/frame specialized-geometry parity.
- [ ] V2/V3 coordinate parity.
- [ ] Background semantic/config-resolution handling.
- [ ] TypeScript and private production build.
- [ ] Repository verifier with zero new failures.

## Manual device/Studio checks after approval

- [ ] Create and export a 480×480 project; verify no regression.
- [ ] Create and export a 466×466 project; compare Studio coordinates with generated `watchface/index.js` and device placement.
- [ ] Test one rectangular model if available.
- [ ] Confirm saved HTML creation, baking, sizing, and repositioning behave exactly as before.
- [ ] Load a mismatched FVWF and test all three choices.
- [ ] Verify time pointers before/after on Studio and device without any center adjustment introduced by this spec.
- [ ] Verify a gauge pointer, icon, IMG_LEVEL sequence, image switcher, date, week, and ordinary image.

## Deployment gates after approval

- [ ] Private Firebase environment loaded and preflight passed.
- [ ] `npm run deploy:full:private` used.
- [ ] Only `origin/main` pushed.
- [ ] Root, Studio, and Parametric entrypoints reference the same new bundle.
- [ ] Live JavaScript and CSS assets return HTTP 200.
- [ ] Production entrypoints contain no `/src/main.tsx`.

## Current status

Specification complete. Runtime implementation, build, deployment, and issue-log closure are blocked pending explicit user approval.
