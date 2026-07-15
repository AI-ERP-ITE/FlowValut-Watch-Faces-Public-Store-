# Spec 117 Deployment Report

Date: 2026-07-15

Target: Private GitHub Pages (`origin/main`)

Result: PASS

## Evidence

- Firebase private-build environment: 4/4 required values loaded; preflight passed.
- TypeScript gate: passed.
- Private build: passed.
- Headless verifier: 31 passed, 0 failed.
- Focused integration tests inside verifier: 29 passed.
- Deployment commit: `cd7a478c`.
- Production JavaScript: `index-6IAIMdgc.js` — HTTP 200, 1,946,374 bytes.
- Production CSS: `index-DQpRy3QA.css` — HTTP 200, 87,612 bytes.
- Root, Studio, and Parametric: HTTP 200 and identical JavaScript hash.
- Studio and Parametric redirect-query flows: HTTP 200 and identical production hash.
- Production entrypoints contain no `/src/main.tsx`.
- Public remote was not pushed.

## Automated reports

Each run of `node scripts/verifyDigitTypography.mjs` writes local evidence to:

- `.verify-output/spec117/results.json`
- `.verify-output/spec117/report.md`

The output directory is intentionally ignored so timestamped verification artifacts cannot be swept into atomic deployment commits.

## Remaining manual recommendation

Install one generated face using a proportional-font `IMG_TIME` and inspect representative pairs such as `11`, `18`, and `58`. This is a firmware smoke test, not a blocker for the completed automated and deployment gates.
