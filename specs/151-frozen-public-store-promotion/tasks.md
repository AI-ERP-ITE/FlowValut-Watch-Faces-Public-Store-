# Spec 151 Tasks

## Correct specification and containment

- [x] T001 Create and correct Spec 151 before continuing implementation.
- [x] T002 Disable the legacy GitHub checkout/rebuild route.
- [x] T003 Invalidate Spec 150 Sync IDs and preview acceptance.

## Isolated Public Store staging build

- [x] T010 Separate the Public Store asset root from creator assets.
- [x] T011 Keep the Public Store application entry graph separate from creator
      and Workshop application entry graphs.
- [x] T012 Split Public Store Functions into the `storefront` codebase without
      deleting or changing the existing private functions.
- [x] T013 Generate a complete manifest for the Public Store release unit.
- [x] T014 Produce a clean replacement staging artifact.

## Retained Firebase release

- [x] T020 Package the exact Hosting files prepared for staging.
- [x] T021 Package the exact Public Store backend/rules prepared for staging.
- [x] T022 Store the immutable package privately in Firebase/Google Cloud.
- [x] T023 Bind package hashes to the real Firebase staging release ID.

## Acceptance and promotion

- [ ] T030 Freeze the deployed staging release at Test Accepted.
- [x] T031 Add configuration versioning and acceptance invalidation.
- [ ] T032 Add idempotency and a per-Sync-ID operation lock.
- [x] T033 Make Review retrieve the retained Firebase release package.
- [x] T034 Make Preview mirror it with only fixed environment bindings.
- [x] T035 Make Sync promote the accepted Preview without rebuilding.
- [x] T036 Compare complete staging/Preview manifests and report bindings.
- [ ] T037 Add post-deploy health and rollback evidence.

## Validation

- [x] T040 Verify the clean staging inventory before owner testing.
- [x] T041 Verify there is no post-acceptance GitHub source checkout/build.
- [x] T042 Verify operational data and secret exclusions in the package design.
- [x] T043 Run frontend/backend/build/package tests; cloud security validation remains before staging acceptance.
- [x] T044 Create a replacement staging release and new Sync ID.
- [x] T045 Stop before production, DNS, or a real Paddle payment.

## 2026-08-11 staging evidence

- Firebase Hosting release: `fvrel-a6a3e565043b3050181729eb` / `sync-v151-a6a3e565043b3050181729eb`.
- Deployed manifest: schema 2, policy 151, 148 complete Hosting files.
- Public homepage and catalog/hierarchy/config endpoints returned HTTP 200.
- Former shared creator paths `/machined_steel.switcher` and
  `/fonts/CascadiaCode.ttf` returned HTTP 404; neither path class is present in
  the complete manifest. This is build separation evidence, not a Sync
  blacklist.
- Exactly 22 Functions are labeled as the `storefront` codebase. The remaining
  42 shared-project Functions are outside the frozen package and promotion
  boundary.
- An unauthenticated call to `adminDeploymentSync` returned HTTP 401.
- No production deployment, DNS change, or real Paddle payment was attempted.
