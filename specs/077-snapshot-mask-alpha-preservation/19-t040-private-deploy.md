# 19 - T-040 Private Deploy Evidence

Task: T-040 Build and deploy private bundle
Date: 2026-05-07
Status: Done

## Objective

Build and deploy a private bundle after T-030/T-031 validation, then record deploy evidence (bundle hash + commit hashes).

## Precondition

1. Validation commits already prepared:
   - `cfe9a2c` Spec 077 evidence through T-031
   - `2ac0587` snapshot/mask transition fixes + regressions
2. `.env.private.local` present.

## Execution Log

1. First deploy attempt:
   - Command: `npm run deploy:docs:private`
   - Result: failed at Vite HTML resolution.
   - Error: unresolved stale hashed assets in root `app/index.html`:
     - `/Watch-Faces/assets/index-JlXHYMHy.js`
     - `/Watch-Faces/assets/index-CrlChUe_.css`

2. Build entry recovery:
   - Temporarily restored build-compatible root entry script:
     - `<script type="module" src="/src/main.tsx"></script>`

3. Second deploy attempt:
   - Command: `npm run deploy:docs:private`
   - Result: success.
   - Build target: private (`vite build --mode private`)
   - Deploy sync: docs + root mirror updated by `scripts/deployDistToDocs.mjs --target=private --mirror-root`

## Deploy Evidence

1. Bundle hash parity (from deploy output): `index-C0jqmnpy.js`
2. Updated entries:
   - `docs/index.html`
   - `docs/studio/index.html`
   - `docs/studio/parametric/index.html`
   - root mirrors: `index.html`, `studio/index.html`, `studio/parametric/index.html`
3. Asset churn captured:
   - removed stale hashed JS/chunk files
   - added new hashed JS/chunk files for current build

## Commit Evidence

1. Spec evidence commit: `cfe9a2c`
2. Implementation commit: `2ac0587`
3. Deploy artifact commit: `6953d21`
4. Push status: `origin/main` updated to `6953d21`

## T-040 Done Criteria Check

1. Deploy script success: PASS
2. New deployed hash recorded: PASS (`index-C0jqmnpy.js`)
3. Commit evidence logged: PASS

## Next Gate

Stop for approval before T-041 live route verification.
