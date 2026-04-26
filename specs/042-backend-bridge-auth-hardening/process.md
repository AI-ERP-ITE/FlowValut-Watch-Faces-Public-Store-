# Process: Backend Bridge Auth Hardening + Full GitHub API Migration

## Objective
Close the unauthenticated-bridge security gap while keeping existing UX and backend-token architecture.

## Process Rules
- Follow specsmd-mater stage sequence.
- Block deployment until authentication and authorization are enforced.
- Keep write scope hardcoded to allowlisted paths.
- Preserve fallback behavior only for non-configured backend mode.

## Security Rules
1. AuthN: verify Firebase ID token on backend.
2. AuthZ: require admin claim or allowlisted uid/email.
3. Abuse controls: apply rate limit per endpoint + actor (uid/ip).
4. Validation: reject malformed, oversized, or unsafe payloads.

## Migration Rules
1. Catalog/publish GitHub operations use backend bridge when configured.
2. Frontend sends bearer token for bridge calls.
3. Browser GitHub token is not required in backend mode.
