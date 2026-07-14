# Spec 117 — Validation Matrix

## Pre-implementation baseline

- [x] Git history for Specs 113 and 114 reviewed.
- [x] Failed pair-correction and fixed-cell approaches identified.
- [x] Current natural-advance and `layoutStartX` behavior identified.
- [x] Current reset/font-size coupling history identified.
- [x] MAIN/AOD shared regeneration path identified.

## Static validation

- [ ] No prohibited algorithm reintroduced.
- [ ] Alignment is stored and consumed consistently.
- [ ] Frame-fit geometry is pure and immutable.
- [ ] Reset path cannot mutate linked elements.
- [ ] V2/V3 generator changes are parity-reviewed.

## Automated validation

- [ ] `verifyDigitTypography.mjs` exits 0.
- [ ] JSON result reports zero failures.
- [ ] TypeScript gate passes.
- [ ] Private build passes.
- [ ] Generated code assertions pass for V2/V3 and MAIN/AOD.

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

- [ ] `.env.private.local` loaded.
- [ ] Private Firebase preflight passes.
- [ ] Only `origin/main` is pushed.
- [ ] Root, Studio, and Parametric entrypoints reference the same JS hash.
- [ ] Hashed JS/CSS assets return HTTP 200.
- [ ] Production HTML contains no `/src/main.tsx`.
- [ ] Deep-link redirect query reaches Studio auth flow.

## Final result

Status: **PENDING IMPLEMENTATION**

