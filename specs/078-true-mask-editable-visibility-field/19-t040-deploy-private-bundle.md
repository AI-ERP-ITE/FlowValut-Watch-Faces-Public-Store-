# 19 - T-040 Deploy Private Bundle

Date: 2026-05-07
Task: T-040 Build and deploy private bundle
Status: Done

## Command execution
1. Ran `npm run deploy:docs:private` in `app/`.
2. Preflight passed and private build succeeded.
3. Deploy sync completed with root mirror enabled.

## Key outputs
1. New private JS bundle hash: `index-DTSnu2uU.js`
2. Updated entries:
- `docs/index.html`
- `docs/studio/index.html`
- `docs/studio/parametric/index.html`
- `index.html`
- `studio/index.html`
- `studio/parametric/index.html`
3. New assets synced under both `assets/` and `docs/assets/`.
4. Old hashed assets removed from both locations.

## Commit evidence
1. Deploy artifact commit: `13c24fe`
2. Commit message: Deploy private bundle for true mask field fix

## Notes
1. Initial deploy failure was caused by stale root/studio hashed entry references.
2. Temporary `/src/main.tsx` entry switch allowed Vite build and deploy sync to regenerate correct hashed entries.
