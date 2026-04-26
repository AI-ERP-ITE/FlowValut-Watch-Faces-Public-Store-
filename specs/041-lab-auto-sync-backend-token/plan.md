# Plan: Lab Auto-Sync + Backend Token Bridge

## Stage-Gated Flow (specsmd-mater)
1. ANALYZE
2. LOCATE
3. CLARIFY
4. PLAN
5. CONFIRM (`approve` or `proceed`)
6. IMPLEMENT
7. BUILD
8. DEPLOY
9. VERIFY

## Sequential Implementation Plan
1. Extend Firebase Functions with backend GitHub bridge endpoints and strict path allowlist.
2. Add Lab sync endpoint with per-type path routing and JSON manifest contract.
3. Add IndexedDB store helpers to replace local collections from pulled cloud snapshots.
4. Add cloud sync service for pull-all and push-per-type behaviors.
5. Integrate IconLab auto-pull on open and debounced auto-push after changes.
6. Build and fix any TypeScript/runtime regressions.
