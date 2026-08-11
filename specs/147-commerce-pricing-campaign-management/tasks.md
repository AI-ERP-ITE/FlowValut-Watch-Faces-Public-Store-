# Spec 147 — Dependency-Ordered Tasks

All tasks are intentionally pending. Implementation begins only after the current release test and separate explicit approval.

## Specification approval

- [ ] T001 Review Spec 147 business rules and conflict policy with owner.
- [ ] T002 Confirm v1 non-goals and campaign target scopes.
- [ ] T003 Approve implementation start.

## Phase 0 — Audit

- [ ] T010 Inspect live Firestore commerce schema and rules read-only.
- [ ] T011 Inventory active Offers, hierarchy targets, mappings, and effective prices.
- [ ] T012 Capture storefront/server/Paddle price-parity baseline.
- [ ] T013 Confirm production disabled and untouched.

## Phase 1 — Domain contracts

- [ ] T020 Add Campaign, target, revision, job, and effective-state schemas.
- [ ] T021 Add deterministic hierarchy target resolver.
- [ ] T022 Add priority/conflict resolver with no stacking.
- [ ] T023 Add money-safe fixed and percentage calculation.
- [ ] T024 Add single server-side effective-price resolver.
- [ ] T025 Test boundaries, rounding, conflicts, schedules, and environment isolation.

## Phase 2 — Price parity

- [ ] T030 Extend public read model with effective commercial state.
- [ ] T031 Update every public price surface to use effective state.
- [ ] T032 Remove frontend campaign fallback decisions.
- [ ] T033 Align checkout, order snapshot, validation, and Paddle active Price.
- [ ] T034 Add mismatch/fail-closed regression tests.

## Phase 3 — Persistence and APIs

- [ ] T040 Add immutable commercial and Campaign revision persistence.
- [ ] T041 Add dry-run price-change API.
- [ ] T042 Add Campaign CRUD and lifecycle APIs.
- [ ] T043 Add rollback API.
- [ ] T044 Add Admin auth, confirmation, rate limiting, schemas, and audit.
- [ ] T045 Add required Firestore rules/indexes and tests.

## Phase 4 — Jobs and Paddle sync

- [ ] T050 Add durable bounded commerce jobs.
- [ ] T051 Reuse Spec 145 idempotent Product/Price synchronizer.
- [ ] T052 Hold previous ready revision until new mapping is verified.
- [ ] T053 Add retry/resume and per-Offer sanitized results.
- [ ] T054 Add scheduled activation and ending.
- [ ] T055 Test partial failure, process restart, duplicate execution, and rollback.

## Phase 5 — Private Admin UI

- [ ] T060 Add guarded Commerce & Campaigns route.
- [ ] T061 Add Offer pricing editor independent of ZPK release.
- [ ] T062 Add hierarchy target selector and Campaign editor.
- [ ] T063 Add dry-run, conflict, and confirmation experience.
- [ ] T064 Add progress, failure retry, audit history, and rollback.
- [ ] T065 Add explicit Sandbox/production isolation cues.

## Phase 6 — Migration

- [ ] T070 Generate existing-data migration dry run.
- [ ] T071 Review ambiguous or invalid Offer pricing.
- [ ] T072 Create initial Sandbox commercial revisions.
- [ ] T073 Reconcile existing Paddle objects without duplication/deletion.
- [ ] T074 Switch staging public reads after parity gate.
- [ ] T075 Preserve and test rollback compatibility.

## Phase 7 — Verification

- [ ] T080 Run backend unit/integration tests.
- [ ] T081 Run public/private explicit builds.
- [ ] T082 Run credential and private-route exposure scans.
- [ ] T083 Test one Offer, variant, edition, model, collection, DNA, and store-wide campaigns.
- [ ] T084 Test campaign off/on, pause/end, schedule, failure, retry, and rollback.
- [ ] T085 Test localized storefront and Paddle price parity.
- [ ] T086 Run successful/declined checkout, webhook, email, entitlement, QR/ZPK, download, and recovery regressions.

## Phase 8 — Staging deployment

- [ ] T090 Deploy targeted rules/indexes/functions.
- [ ] T091 Verify deployed function inventory and environment.
- [ ] T092 Deploy private Admin through canonical workflow.
- [ ] T093 Deploy isolated staging storefront.
- [ ] T094 Execute full staging acceptance matrix.
- [ ] T095 Receive owner approval of Sandbox campaign management.

## Phase 9 — Live activation (deferred)

- [ ] T100 Reconcile independent production Products and Prices.
- [ ] T101 Configure live-only secrets, domain, webhook, and policy.
- [ ] T102 Migrate production revisions with checkout disabled.
- [ ] T103 Verify live checkout opens and price parity without payment.
- [ ] T104 Receive explicit owner approval.
- [ ] T105 Execute controlled go-live and monitor.

