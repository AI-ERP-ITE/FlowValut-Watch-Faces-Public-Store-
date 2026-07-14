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
- Deployment not attempted: the pre-existing dirty `index.html`, `studio/index.html`, and `studio/parametric/index.html` guard is still active.
