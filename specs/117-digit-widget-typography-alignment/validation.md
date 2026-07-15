# Spec 117 — Validation Matrix

## Pre-implementation baseline

- [x] Git history for Specs 113 and 114 reviewed.
- [x] Failed pair-correction and fixed-cell approaches identified.
- [x] Current natural-advance and `layoutStartX` behavior identified.
- [x] Current reset/font-size coupling history identified.
- [x] MAIN/AOD shared regeneration path identified.

## Static validation

- [x] No prohibited algorithm reintroduced.
- [x] Alignment is stored and consumed consistently.
- [x] Frame-fit geometry is pure and immutable.
- [x] Reset path cannot mutate linked elements.
- [x] V2/V3 generator changes are parity-reviewed (V3 retained only as compatibility coverage; current product uses V2).

## Automated validation

- [x] `verifyDigitTypography.mjs` exits 0.
- [x] JSON result reports zero failures (31 passed, 0 failed).
- [x] TypeScript gate passes.
- [x] Private build passes.
- [x] Generated code assertions pass for V2/V3 and MAIN/AOD.

## Runtime matrix

| Widget | Values | Alignment | MAIN | AOD |
|---|---|---|---|---|
| IMG_TIME hours | 00, 01, 10, 11, 18, 22 | native | [ ] | [ ] |
| IMG_TIME minutes | 00, 11, 31, 58, 59 | native | [ ] | [ ] |
| TEXT_IMG STEP | 0, 9, 99, 999, 9999, 99999 | L/C/R | [ ] | [ ] |
| TEXT_IMG CAL | 0, 9, 99, 999, 9999 | L/C/R | [ ] | [ ] |
| TEXT_IMG BATTERY | 0, 9, 10, 11, 88, 100 | L/C/R | [ ] | [ ] |
| IMG_DATE day | 01, 11, 18, 28, 31 | configured | [ ] | [ ] |

## Deployment validation

- [x] `.env.private.local` loaded.
- [x] Private Firebase preflight passes.
- [x] Only `origin/main` is pushed.
- [x] Root, Studio, and Parametric entrypoints reference `index-6IAIMdgc.js`.
- [x] Hashed JS/CSS assets return HTTP 200.
- [x] Production HTML contains no `/src/main.tsx`.
- [x] Deep-link redirect queries for Studio and Parametric return the production private entrypoint.

## Final result

Status: **PASSED — IMPLEMENTED, AUTOMATED, BUILT, AND PRIVATELY DEPLOYED**

One installed-watch proportional-time smoke test remains recommended because native firmware rendering cannot be fully emulated in Node.
# Time-only tabular centering follow-up — 2026-07-15

- Focused Vitest: 5 files, 24 tests passed.
- TypeScript project build: passed.
- `npm run verify:digit-typography`: 38 passed, 0 failed.
- Private Firebase environment preflight: passed.
- Explicit `npm run build:private`: passed.
- Equal-width cells are enabled only for `IMG_TIME`; natural-width `TEXT_IMG` and numeric `IMG_DATE` generation remains unchanged.
- V2 MAIN/AOD time start coordinates are derived from frame center and generated cell width while native `LEFT` alignment is retained.
