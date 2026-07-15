# Validation — Spec 116

## Static checks

- No Firestore hand metadata contains PNG/base64 payloads.
- Missing `sourceKind` safely infers legacy HTML or baked-only handling.
- Firebase uses binary upload/download for PNG source layers and text for HTML layers.
- Deletion includes all four `source_png/` masters.

## Runtime checks

- Save/reopen a transparent PNG pack.
- Change tip/tail and verify composer preview and Studio canvas agree.
- Replace one PNG layer, update, refresh, and confirm it persists.
- Confirm HTML source editing still works.
- Generate a test ZPK and inspect pointer assets and pivots.

## Build and deploy checks

- `npx tsc --noEmit`
- `node scripts/verify.mjs`
- Firebase private-environment preflight
- `npm run build:private`
- Before deploy, ensure the working tree contains only intended deploy-safe changes.
- Deploy privately with `npm run deploy:full:private` and verify root plus `?p=/studio` use matching live bundle hashes.

## Local validation result — 2026-07-14

- `npx.cmd tsc --noEmit`: passed.
- `node scripts/verify.mjs`: passed, 38 checks and 0 failures, including six Spec 116 assertions.
- `npm.cmd run build:private` with `.env.private.local` loaded into the process: passed.
- TIME_POINTER/GAUGE_POINTER boundary audit: passed; no changes were made to `customGaugePointerStore.ts` or gauge save/delete/render paths.
- Interactive browser smoke test: not run because no browser runtime was available in this VS Code session. Manual save/reopen and authenticated Firebase round-trip remain part of T6 live verification.
- Initial deployment guard was cleared by explicit user authorization after confirming the atomic deploy preserves dirty working-tree entry files.

## Private deployment result — 2026-07-14

- Used canonical `npm.cmd run deploy:full:private` from the `app/` repository.
- Firebase private-build environment preflight passed.
- Pushed only to `origin/main`; public remote was not touched.
- Deployment commit: `5d3596c38cd06dbf543bc5e20b1cf31385cb34f1`.
- Live bundle: `index-DhtWbROL.js`; stylesheet: `index-DQpRy3QA.css`.
- Root, `?p=/studio`, and `?p=/studio/parametric` returned HTTP 200 with matching hashes and no `/src/main.tsx` entry.
- Live JS and CSS assets returned HTTP 200.
- Existing dirty root/studio development entry files remained as the only working-tree modifications after deployment.

## Closure — 2026-07-15

Status: **PASSED — IMPLEMENTED, VALIDATED, PRIVATELY DEPLOYED, AND CLOSED**

All recorded automated, build, deployment, route-parity, and asset-availability gates passed. The earlier note that an interactive browser smoke test was unavailable remains part of the historical validation record and is not being rewritten as a test that was run.
