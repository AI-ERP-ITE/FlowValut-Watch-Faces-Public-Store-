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
- [ ] T014 Produce a clean replacement staging artifact.

## Retained Firebase release

- [x] T020 Package the exact Hosting files prepared for staging.
- [x] T021 Package the exact Public Store backend/rules prepared for staging.
- [ ] T022 Store the immutable package privately in Firebase/Google Cloud.
- [ ] T023 Bind package hashes to the real Firebase staging release ID.

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

- [ ] T040 Verify the clean staging inventory before owner testing.
- [x] T041 Verify there is no post-acceptance GitHub source checkout/build.
- [x] T042 Verify operational data and secret exclusions in the package design.
- [x] T043 Run frontend/backend/build/package tests; cloud security validation remains before staging acceptance.
- [ ] T044 Create a replacement staging release and new Sync ID.
- [ ] T045 Stop before production, DNS, or a real Paddle payment.
