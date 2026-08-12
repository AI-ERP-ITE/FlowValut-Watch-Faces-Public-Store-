# Spec 154 Tasks

## Contract and containment

- [x] T001 Create Spec 154 before further recovery mutation.
- [x] T002 Record permanent no-delete interpretation of Sync exclusions.
- [ ] T003 Capture fresh production/staging/control-plane inventory and rollback metadata.
- [x] T004 Preserve current Sync implementation hashes and immutable packages.
- [ ] T005 Identify exact pre-Spec-149 baseline and later fixes required for production.

## Production recovery

- [x] T010 Restore the approved 37-function private backend as codebase `private-admin`.
- [x] T011 Create deletion-protected forensic recovery database.
- [x] T012 Import and verify the 751-document Spec 152 backup in the recovery database.
- [x] T013 Produce additive backup/current conflict and missing-record ledger.
- [ ] T014 Restore missing Workshop, Parametric, audit, operational and other wrongly removed records according to the conflict policy.
- [ ] T015 Reconcile all public catalog/watchface records and Storage references.
- [ ] T016 Verify every previously released face end to end.

## Production application verification

- [x] T020 Verify all private/public Function inventories, bindings and ACTIVE state.
- [ ] T021 Verify Firebase Auth configuration and administrator access without changing it.
- [ ] T022 Verify Admin, Studio, Workshop and Parametric flows.
- [ ] T023 Verify public routes, previews, APIs and protected ZPK delivery.
- [ ] T024 Verify commerce safety, webhook rejection, fulfillment/recovery compatibility without real payment.

## Isolated Sync project

- [x] T030 Select and create a unique Sync control Firebase project.
- [x] T031 Materialize the preserved Sync implementation without rewriting business logic.
- [x] T032 Deploy only the `promotion-controller` surface.
- [ ] T033 Configure release metadata, locks, callbacks and build evidence stores.
- [x] T034 Apply least-privilege runner/controller IAM.
- [ ] T035 Prove zero data, Storage-content, secret-payload, Auth, Paddle, IAM and private-function authority.

## Validation and handoff

- [ ] T040 Test code-only staging release registration and review.
- [ ] T041 Create and verify production preview without live mutation.
- [ ] T042 Prove unknown/excluded Firebase resources remain untouched.
- [ ] T043 Verify rollback metadata and failure recovery.
- [ ] T044 Produce final end-to-end operational evidence.
- [ ] T045 Stop before live Sync, DNS, Live checkout or real Paddle payment.
