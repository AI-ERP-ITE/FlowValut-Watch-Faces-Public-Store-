# Spec 120 — Validation Matrix

## Automated

- [x] Pure rearrangement tests pass for 480, 466, and rectangular targets.
- [x] TIME_POINTER protected-local-geometry tests pass while HTML/PNG source and local fields remain outside the transaction.
- [x] MAIN/AOD parity tests pass.
- [x] Background raster dimension tests pass.
- [x] Target model/resolution propagation tests pass.
- [x] V2/V3 generator parity tests pass.
- [x] TypeScript passes.
- [x] Repository verifier reports zero new failures.
- [x] Private build and Firebase environment preflight pass.

## Manual acceptance

- [ ] Load the reported 466 FVWF while a 480 model is selected and choose Rearrange.
- [ ] Confirm MAIN and AOD placement against the resized project background.
- [ ] Confirm HTML and PNG hands rotate around `(240,240)` on 480 without local pivot/size regression.
- [ ] Generate/install on the selected 480 watch and compare MAIN/AOD with Studio.
- [ ] Repeat 480→466 and confirm `(240,240)` becomes `(233,233)`.

## Deployment

- [x] Only `origin/main` changes.
- [x] Root, Studio, and Parametric serve one private bundle hash.
- [x] Live JS/CSS assets return HTTP 200.
- [x] Production HTML contains no `/src/main.tsx`.

## Completion evidence

- Specification commit: `e886017c`; sizing clarification: `d4bf6988`.
- Runtime and focused-test commit: `cc39ea0e`.
- Private deployment commit: `f0528970`.
- Private production bundle: `index-qfKADbc3.js`; stylesheet: `index-Cm4u4hPx.css`.
- TypeScript passed with `npx tsc --noEmit`.
- Focused rearrangement/generator/background tests passed: 21/21.
- Repository verifier passed: 50/50.
- The full Vitest discovery retained 11 unrelated engine/effect failures plus four legacy non-Vitest script-suite failures; every Spec 120 test passed.
- Canonical private root, Studio, and Parametric SPA-query routes returned HTTP 200 with identical bundle hashes; referenced JavaScript and CSS returned HTTP 200.
- `origin/main` equals `f052897005e65e2a30f29e8826aa098c1353971f`; `public/main` was not changed.

## Current status

Closed on 2026-07-16. Implementation and private deployment are complete. The manual Studio/device checks above remain available for user acceptance testing and do not block closure.
