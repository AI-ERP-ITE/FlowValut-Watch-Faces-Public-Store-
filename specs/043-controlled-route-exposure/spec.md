# Feature Specification: Controlled Route Exposure + Build Target Split

**Feature Branch**: `[043-controlled-route-exposure]`  
**Created**: 2026-04-26  
**Status**: Draft

## Goal
Single codebase supports two deployment targets:
1. `public` target for store-only exposure.
2. `private` target for internal studio/admin/tooling operations.

## Functional Requirements
1. Introduce `VITE_BUILD_TARGET` with values `public` or `private`.
2. Public build MUST not register internal routes (`/studio`, `/studio/lab`, `/admin`, `/tools`).
3. Private build MUST register store + studio + admin + tools routes.
4. Private-only routes MUST have UX auth guard that redirects unauthenticated users to store.
5. Sensitive data mutation operations MUST be backend-bridge-only and authenticated.
6. Frontend must not execute direct GitHub REST write paths for sync/publish flows.
7. Add scripts for both build targets.

## Security Requirements
1. Frontend should rely on backend bridge for GitHub write actions.
2. Backend retains authn/authz/rate-limit/payload-validation authority.
3. Public build should not expose internal route registrations.

## Acceptance Criteria
1. `npm run build:public` compiles and excludes internal route registration.
2. `npm run build:private` compiles and includes internal routes.
3. Public app navigation to `/studio` or `/admin` is not routed by app router.
4. Private route access redirects to store if auth is configured and user is not authenticated.
5. Catalog/publish sensitive operations fail closed when backend bridge is not configured.
