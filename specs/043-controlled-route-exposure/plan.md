# Plan: Controlled Route Exposure

## Implementation Plan
1. Split route definitions into `AppPublic` and `AppPrivate`.
2. Load route module from `App.tsx` using `VITE_BUILD_TARGET`.
3. Add private route UX guard using Firebase auth state.
4. Ensure private-only routes include `/studio`, `/admin`, `/tools`.
5. Add build scripts: `build:public` and `build:private`.
6. Enforce backend-only behavior in frontend GitHub helpers for sensitive operations.
7. Update implementation checklist and spec documentation.
8. Build and verify both targets.

## Scope Guard
- Keep existing store and studio behavior intact where possible.
- Avoid unrelated refactors and data format changes.
