# Spec 151 Implementation Plan

## Phase 0 — Correct and contain

- Freeze the Spec 150 GitHub-rebuild route.
- Invalidate its existing Sync IDs and production preview.
- Preserve production live, DNS, Paddle, and operational data.

## Phase 1 — Restore isolated staging

- Keep the existing Public Store and creator builds separate at their build
  entry points and asset roots.
- Split Public Store Functions into a separately deployed `storefront` codebase
  while leaving existing private codebases untouched.
- Remove the accidental switcher/font files from the next Public Store staging
  artifact.
- Deploy a replacement Firebase staging release and confirm its inventory.

## Phase 2 — Retain the deployed release

- Create one immutable Hosting/`storefront`-backend/rules release package before staging
  deployment.
- Deploy that exact package to Firebase staging.
- Retain it in a private Firebase/Google Cloud release location.
- Publish a complete release manifest and bind it to the Firebase release ID.

## Phase 3 — Accept the Firebase release

- Test Accepted freezes the real staging release/package IDs and hashes.
- Freeze only public content that intentionally promotes.
- Add protected-config versioning, idempotency, locks, and invalidation.

## Phase 4 — Mirror without GitHub

- Review retrieves the retained Firebase release package.
- Preview mirrors it and applies the fixed production environment bindings.
- Sync promotes the accepted Preview without rebuilding.
- No post-acceptance GitHub checkout or application compilation is permitted.

## Phase 5 — Verify and stop

- Compare complete manifests and environment-binding differences.
- Verify operational data and secret exclusions.
- Run security and cloud health checks.
- Stop before production live, DNS, or a real Paddle payment.
