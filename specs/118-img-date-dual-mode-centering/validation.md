# Spec 118 — Validation Matrix

## Baseline evidence

- Supplied FVWF inspected without modification.
- Two overlapping day layers share `x≈201.83`, width `62`, and have no stored `alignH`.
- Studio resolves missing alignment to `CENTER_H`.
- Current V2/V3 export hardcodes day origin to `bounds.x`, LEFT alignment, and numeric mode.
- Complete `01`–`31` generation is absent from runtime source.

## Automated gates

- [ ] Legacy mode normalization.
- [ ] Numeric pair centering.
- [ ] Complete 31-image count and common dimensions.
- [ ] V2/V3 contract parity.
- [ ] MAIN/AOD and duplicate-layer filename isolation.
- [ ] FVWF persistence.
- [ ] TypeScript.
- [ ] Repository verifier.
- [ ] Explicit private build.

## Deployment gates

- [ ] Private Firebase environment loaded and preflight passed.
- [ ] `npm run deploy:full:private` used.
- [ ] Only `origin/main` pushed.
- [ ] Root, Studio, and Parametric entrypoints have one matching hash.
- [ ] Live JavaScript and CSS assets return HTTP 200.
- [ ] Production entrypoints contain no `/src/main.tsx`.
