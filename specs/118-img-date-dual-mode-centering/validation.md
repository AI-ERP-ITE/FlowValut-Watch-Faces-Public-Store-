# Spec 118 — Validation Matrix

## Baseline evidence

- Supplied FVWF inspected without modification.
- Two overlapping day layers share `x≈201.83`, width `62`, and have no stored `alignH`.
- Studio resolves missing alignment to `CENTER_H`.
- Current V2/V3 export hardcodes day origin to `bounds.x`, LEFT alignment, and numeric mode.
- Complete `01`–`31` generation is absent from runtime source.

## Automated gates

- [x] Legacy mode normalization.
- [x] Numeric pair centering.
- [x] Complete 31-image count and common dimensions.
- [x] V2/V3 contract parity.
- [x] MAIN/AOD and duplicate-layer filename isolation.
- [x] FVWF persistence.
- [x] TypeScript/private production build gate.
- [x] Repository verifier: 44 passed, 0 failed.
- [x] Explicit private build.

## Deployment gates

- [x] Private Firebase environment loaded and preflight passed.
- [x] `npm run deploy:full:private` used.
- [x] Only `origin/main` pushed; `public/main` remained `94a77da067c4b3bc9c37bc8a038b243dc317b8b1`.
- [x] Root, Studio, and Parametric entrypoints reference `index-CLn8Z_-H.js`.
- [x] Live JavaScript and CSS assets return HTTP 200.
- [x] Production entrypoints contain no `/src/main.tsx`.

## Completion evidence

- Specification commit: `46a4ed33`.
- Runtime/tests commit: `bb56154d`.
- Remote-integration merge: `8730fbb8`.
- Private deploy commit: `dedd4c5e`.
- Focused regression result: 14 tests passed across four files.
- Full Vitest result: 147 tests passed; 11 unrelated pre-existing parametric/effects failures remained outside this spec.
- Live checks: root, Studio, Parametric, JavaScript, and CSS all returned HTTP 200 on 2026-07-16.
