# Spec 145 — Dependency-Ordered Tasks

## Specification and approval

- [x] T001 Read both supplied Paddle catalog briefs.
- [x] T002 Apply repository SpecKit and Paddle plugin guidance.
- [x] T003 Audit existing Offer, pricing, release, checkout, webhook, entitlement, and environment architecture.
- [x] T004 Verify the live sellable hierarchy baseline without mutating it.
- [x] T005 Produce adjusted specification and implementation plan.
- [x] T006 Receive explicit approval to begin Phase 0 execution.

## Phase 0 — Inventory

- [x] T010 Generate the Firestore eligible-Offer dry run with hierarchy context.
- [x] T011 Inspect Paddle Sandbox Products/Prices read-only.
- [x] T012 Reconcile existing Paddle objects/mappings; no mapping-review exceptions remain.
- [x] T013 Confirm Paddle `standard` downloadable-software tax category and API permissions.

## Phase 1 — Domain contracts

- [x] T020 Add and test centralized minor-unit conversion.
- [x] T021 Add and test editable commerce pricing policy.
- [x] T022 Expand environment-specific Paddle mapping schema compatibly.
- [x] T023 Add desired-state hashing and active Price/readiness logic.

## Phase 2 — Paddle adapter

- [x] T030 Add typed Sandbox/production-aware Paddle catalog adapter.
- [x] T031 Add Product create/update/archive/retrieve operations.
- [x] T032 Add one-time Price create/retrieve/archive operations with localized overrides.
- [x] T033 Add safe error normalization and adapter tests.

## Phase 3 — Minimal synchronization engine

- [x] T040 Add one mapping-first sync service with a simple `SYNCING` guard.
- [x] T041 Add idempotent Product and standard/promotional Price synchronization.
- [x] T042 Add replacement-Price handling and transactional mapping/status/hash persistence.
- [x] T043 Test retry, concurrent guard, and partial-failure recovery.

## Phase 4 — Backend endpoints

- [x] T050 Add authenticated single sync, reconcile/status, and archive endpoints.
- [x] T051 Add dry-run inventory and bounded resumable bulk-sync endpoints.
- [x] T052 Enforce Admin authorization, rate limits, schemas, and Sandbox-only mutation.
- [x] T053 Bind only the Sandbox catalog secret to initial write endpoints.

## Phase 5 — Release integration

- [x] T060 Add commercial-readiness gate without changing artifact release semantics.
- [x] T061 Connect eligible paid Offer publication to resumable catalog sync.
- [x] T062 Preserve content publication but block checkout on catalog-sync failure.

## Phase 6 — Admin UI

- [x] T070 Add typed Admin catalog-sync API client.
- [x] T071 Add compact Paddle status/actions to existing Admin surfaces.
- [x] T072 Add dry-run-first bulk Sandbox synchronization UI.
- [x] T073 Add safe error, retry, and review-list presentation.

## Phase 7 — Checkout compatibility

- [x] T080 Resolve active Price only on the backend from synchronized Offer state.
- [x] T081 Reject stale, archived, incomplete, or cross-environment mappings.
- [x] T082 Minimize Paddle IDs in public read models.
- [x] T083 Preserve webhook/order/entitlement behavior with regression tests.
- [x] T084 Verify Paddle remains payment-only and FlowVault exclusively owns QR/ZPK delivery and installation.

## Phase 8 — Sandbox migration

- [x] T090 Execute and approve the actual 23-Offer dry run.
- [x] T091 Synchronize all 23 eligible Offers to Paddle Sandbox in bounded batches.
- [x] T092 Reconcile all results and persist mappings.
- [x] T093 Verify the complete mapping set; no mapping-review exceptions remain.

## Phase 9 — Verification and deployment

- [x] T100 Run frontend/backend tests and explicit public/private builds.
- [x] T101 Run compiled-output credential scan.
- [x] T102 Deploy changed Firebase rules/indexes if required. (No catalog rule/index changes required.)
- [x] T103 Deploy only changed Sandbox Functions and verify Functions list.
- [ ] T104 Deploy private Admin through the canonical private workflow.
- [x] T105 Redeploy and verify isolated staging Hosting.
- [x] T106 Execute successful/declined Sandbox checkout, webhook, entitlement, and download matrix.
- [x] T107 Verify production remains disabled and Paddle production untouched.
- [x] T108 Produce final implementation, migration, security, testing, and manual-action report.

## Live activation — deferred

- [ ] T110 Create/reconcile independent production Products and Prices after live approval.
- [ ] T111 Configure production secret, client token, and webhook destination.
- [ ] T112 Execute one controlled production transaction.
- [ ] T113 Receive explicit owner approval before enabling production checkout.
