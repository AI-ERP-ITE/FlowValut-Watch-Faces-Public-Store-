# Plan: Backend Bridge Auth Hardening + Full GitHub API Migration

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
1. Add Firebase Auth verification + admin authorization in functions bridge endpoints.
2. Add endpoint rate limiting and lab payload/schema/size validation.
3. Add frontend Firebase Auth client/token helper for backend bridge calls.
4. Add shared backend bridge client helpers for GitHub content read/write/repo-info calls.
5. Migrate catalog/publish APIs to backend bridge mode when configured.
6. Validate no new type errors and run build checks.
7. Execute deployment protocol for functions + docs sync.
