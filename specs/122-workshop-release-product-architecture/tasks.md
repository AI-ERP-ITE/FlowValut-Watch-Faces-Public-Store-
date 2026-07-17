# Spec 122 — Dependency-Ordered Tasks

## Specification and approvals

- [x] T001 Capture the permanent FlowVault hierarchy and naming rules.
- [x] T002 Capture Workshop `.fvwf` + test-ZPK requirements.
- [x] T003 Correct the Offline versus hard-delete analysis.
- [x] T004 Capture metadata-only repack and byte-parity requirements.
- [x] T005 Capture storefront, Offer, entitlement, compatibility, and migration requirements.
- [x] T006 Create traceability, data-model, lifecycle, tests, validation, migration, and deployment documents.
- [x] T007 Receive approval for Phase 1 runtime implementation.

## Phase 1 — Contracts and foundations

- [x] T010 Add shared domain types and runtime validation.
- [x] T011 Add collection/storage path constants and canonical ID/code builders.
- [x] T012 Add compatibility vocabulary for Devices versus Design Models.
- [x] T013 Add feature flags and legacy adapters with no production behavior change.
- [x] T014 Add focused type/validator/identifier tests.
- [x] T015 Commit Phase 1 separately and obtain Phase 2 approval.

## Phase 2 — Workshop persistence

- [x] T020 Reuse/export exact `.fvwf` serialization as an in-memory artifact.
- [x] T021 Add authenticated Workshop project/build endpoints and binary upload flow.
- [x] T022 Save exact FVWF, test ZPK, MAIN/AOD previews, metadata, and parent build.
- [x] T023 Add Workshop Project creation and numbered immutable builds.
- [x] T024 Rename the test action to Create Watch Test without requiring store fields.
- [x] T025 Add Open in Studio, Download FVWF, Download Test ZPK, notes, and approval.
- [x] T026 Add Workshop persistence/import regression tests.
- [x] T027 Deploy/verify targeted Workshop endpoints and obtain Phase 3 approval.

## Phase 3 — Lifecycle and cleanup

- [x] T030 Preserve Take Offline as non-destructive store visibility.
- [x] T031 Add Trash and Restore metadata/state transitions.
- [x] T032 Make hard deletion fail closed on unexpected Storage errors.
- [x] T033 Add reference guards, typed confirmation, and deletion audit.
- [x] T034 Add historical-path orphan scan and storage-usage summaries.
- [x] T035 Add lifecycle, authorization, and partial-failure regression tests.
- [x] T036 Deploy/verify cleanup endpoints and obtain Phase 4 approval.

## Phase 4 — Hierarchy and release wizard

- [x] T040 Add Design DNA, Collection, Design Model, Variant, Edition, SKU, Technical Variant, Revision, and Offer persistence.
- [x] T041 Add normalized duplicate/conflict checks.
- [x] T042 Add canonical customer-name and internal-code generation.
- [x] T043 Build one shared guided release wizard for Studio and Admin.
- [x] T044 Prevent direct enabling of incomplete builds.
- [x] T045 Support Save as Ready and Release to Store.
- [x] T046 Add hierarchy/wizard tests and obtain Phase 5 approval.

## Phase 5 — Metadata-only release repack

- [x] T050 Document V2/V3 nested package name locations with fixtures.
- [x] T051 Implement allowlisted metadata-only ZPK repacking.
- [x] T052 Implement SHA-256 structural/payload parity comparison.
- [x] T053 Store validation reports and immutable approved/released package links.
- [x] T054 Block release on embedded-name mismatch or unauthorized differences.
- [x] T055 Add V2/V3 positive, negative, and corruption regression tests.
- [x] T056 Deploy/verify release endpoints and obtain Phase 6 approval.

## Phase 6 — Public storefront

- [x] T060 Add Design Model storefront read model/API.
- [x] T061 Add Collection, Design Model, and Device routes.
- [x] T062 Add legacy face/model route resolution.
- [x] T063 Update cards to represent one Design Model.
- [x] T064 Add Variant/Edition/Offer selection and MAIN/AOD media behavior.
- [x] T065 Add compatibility and finished-timepiece messaging.
- [x] T066 Add public route/read-model/accessibility tests and obtain Phase 7 approval.

## Phase 7 — Offers and fulfillment

- [ ] T070 Add server-authoritative Offer checkout.
- [ ] T071 Add immutable order and SKU-entitlement snapshots.
- [ ] T072 Add Device-to-current-Technical-Package fulfillment resolution.
- [ ] T073 Add Complete Color Collection fulfillment.
- [ ] T074 Preserve legacy order/download compatibility.
- [ ] T075 Add pricing, entitlement, revision, and deletion-protection tests.
- [ ] T076 Deploy/verify purchase endpoints and obtain Phase 8 approval.

## Phase 8 — Migration

- [ ] T080 Add dry-run legacy backfill and validation report.
- [ ] T081 Backfill temporary Design Model/SKU/Technical Package records.
- [ ] T082 Add manual classification/consolidation queue.
- [ ] T083 Add legacy ID mappings and storage reconciliation.
- [ ] T084 Verify all legacy routes, orders, downloads, and statuses.
- [ ] T085 Approve cutover flags and obtain deployment approval.

## Phase 9 — Final validation and deployment

- [ ] T090 Run complete frontend, Functions, verifier, migration, security, and ZPK parity test matrix.
- [ ] T091 Build Functions and deploy targeted endpoints with explicit Firebase project.
- [ ] T092 Deploy Firestore/Storage configuration when changed.
- [ ] T093 Verify endpoints with `functions:list` and frontend environment contracts.
- [ ] T094 Run canonical public and private builds.
- [ ] T095 Deploy with `npm run deploy:full:public` only.
- [ ] T096 Verify live public/private routes, hashes, assets, catalog, auth, checkout, and legacy compatibility.
- [ ] T097 Record origin/public commits and deployed bundle hashes.
- [ ] T098 Close Spec 122 only after every required live gate passes.
