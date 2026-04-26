# Feature Specification: Backend Bridge Auth Hardening + Full GitHub API Migration

**Feature Branch**: `[042-backend-bridge-auth-hardening]`  
**Created**: 2026-04-26  
**Status**: Draft

## Risk Flags (Required First)
1. Public unauthenticated write endpoints can overwrite repository data even with path allowlists.
2. Origin checks are advisory and can be bypassed by non-browser clients.
3. Private repos reduce exposure but do not mitigate endpoint abuse if bridge auth is missing.

## Problem Statement
The project moved GitHub token off frontend, but write-capable bridge endpoints are still missing robust authentication and abuse controls.

## Goal
1. Enforce Firebase Auth identity verification before bridge operations.
2. Restrict bridge usage to authorized admin users only.
3. Add abuse protections (rate limit + payload/schema validation).
4. Route publish/catalog GitHub operations through backend bridge so browser token is no longer required for those flows.

## Functional Requirements
1. Backend endpoints (`githubRepoInfo`, `githubContentBridge`, `labAssetsSync`) MUST require a valid Firebase ID token.
2. Backend authorization MUST allow only admin users (custom claim `admin=true`, or configured UID/email allowlists).
3. Backend MUST enforce per-user/IP rate limiting on bridge endpoints.
4. Backend MUST enforce strict payload validation for lab manifests (schema/version/type/size/items constraints).
5. Frontend GitHub publish/catalog operations MUST use backend bridge when configured.
6. Frontend MUST attach Firebase ID token as `Authorization: Bearer <token>` for backend bridge calls.
7. Existing legacy direct-token mode MAY remain only as fallback when backend bridge is not configured.

## Configuration Requirements
1. Firebase Functions env vars:
   - `GITHUB_TOKEN`
   - `GITHUB_OWNER`
   - `GITHUB_REPO`
   - `GITHUB_BRANCH` (optional)
   - `GITHUB_ALLOWED_ORIGIN`
   - `ADMIN_UIDS` (comma-separated, optional)
   - `ADMIN_EMAILS` (comma-separated, optional)
   - `RATE_LIMIT_WINDOW_MS` (optional)
   - `RATE_LIMIT_MAX_REQUESTS` (optional)
   - `LAB_SYNC_MAX_PAYLOAD_BYTES` (optional)
2. Frontend env vars (Firebase Auth client):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_GITHUB_FUNCTIONS_BASE_URL`

## Acceptance Criteria
1. Unauthenticated requests to bridge endpoints are rejected (401).
2. Authenticated non-admin users are rejected (403).
3. Authenticated admin users can sync lab assets and run publish/catalog operations without browser GitHub token.
4. Oversized or malformed lab sync payloads are rejected (400/413).
5. Publish/catalog flow works end-to-end through backend bridge in configured mode.
