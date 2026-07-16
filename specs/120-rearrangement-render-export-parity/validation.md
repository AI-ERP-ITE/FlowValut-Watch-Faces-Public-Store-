# Spec 120 — Validation Matrix

## Automated

- [ ] Pure rearrangement tests pass for 480, 466, and rectangular targets.
- [ ] TIME_POINTER protected-local-geometry tests pass for HTML and PNG records.
- [ ] MAIN/AOD parity tests pass.
- [ ] Background raster dimension tests pass.
- [ ] Target model/resolution propagation tests pass.
- [ ] V2/V3 generator parity tests pass.
- [ ] TypeScript passes.
- [ ] Repository verifier reports zero new failures.
- [ ] Private build and Firebase environment preflight pass.

## Manual acceptance

- [ ] Load the reported 466 FVWF while a 480 model is selected and choose Rearrange.
- [ ] Confirm MAIN and AOD placement against the resized project background.
- [ ] Confirm HTML and PNG hands rotate around `(240,240)` on 480 without local pivot/size regression.
- [ ] Generate/install on the selected 480 watch and compare MAIN/AOD with Studio.
- [ ] Repeat 480→466 and confirm `(240,240)` becomes `(233,233)`.

## Deployment

- [ ] Only `origin/main` changes.
- [ ] Root, Studio, and Parametric serve one private bundle hash.
- [ ] Live JS/CSS assets return HTTP 200.
- [ ] Production HTML contains no `/src/main.tsx`.

