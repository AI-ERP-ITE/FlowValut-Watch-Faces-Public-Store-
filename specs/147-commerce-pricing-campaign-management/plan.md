# Spec 147 — Implementation Plan

## Strategy

Extend the existing Offer-centric Spec 145 desired-state and idempotent Paddle synchronization engine. Do not build a second catalog, duplicate Paddle adapter, or couple pricing mutations to Technical Package release.

## Phase 0 — Audit and freeze baseline

- Read live Firestore schema and current commerce policy.
- Inventory all active Offers, hierarchy relationships, Sandbox mappings, and current effective prices.
- Capture current Sandbox storefront/checkout parity.
- Confirm production remains disabled and untouched.

## Phase 1 — Effective-price domain

- Add typed Campaign, target, revision, effective-state, and job contracts.
- Implement deterministic target resolution and conflict detection.
- Implement money-safe fixed/percentage calculation with explicit rounding rules.
- Implement one server-side effective-price resolver.
- Add comprehensive unit/property tests.

## Phase 2 — Public price-parity correction

- Make the public store read model expose server-resolved effective pricing.
- Remove frontend `campaignPrice ?? regularPrice` charging/display decisions.
- Ensure cards, model page, buy page, checkout creation, order snapshot, and Paddle selection use the same revision.
- Keep the old read shape temporarily compatible during migration.

## Phase 3 — Commercial revisions and APIs

- Add authenticated preview APIs for Offer price changes and Campaign targets.
- Add create/edit/schedule/activate/pause/end/cancel/rollback APIs.
- Enforce Admin auth, environment, confirmation, rate limits, schemas, and audits.
- Ensure no endpoint accepts Paddle IDs or customer-controlled effective prices as authority.

## Phase 4 — Durable synchronization orchestration

- Add resumable bounded commerce jobs using the existing idempotent synchronizer.
- Keep previous ready revision public until new Paddle state is verified.
- Add automatic retry for retryable failures and explicit retry for terminal review.
- Add scheduled activation/ending without browser dependence.

## Phase 5 — Private Commerce & Campaigns UI

- Add auth-guarded private route and navigation.
- Build Offer pricing editor, hierarchy target selector, campaign form, preview, conflict view, progress, retry, history, and rollback.
- Clearly label Sandbox versus production.
- Keep Release Wizard limited to initial Offer setup and release status.

## Phase 6 — Migration

- Create a dry-run mapping from existing `regularPrice`, `campaignPrice`, policy, and Paddle mappings to initial commercial revisions.
- Reconcile every active Sandbox Offer without recreating Products.
- Switch public reads only after full parity verification.
- Retain compatibility fields until rollback window closes.

## Phase 7 — Verification

- Unit tests: target resolution, conflicts, money, schedule, revision selection, idempotency.
- Integration tests: Firestore transactions, job resume, partial failure, audit, auth.
- Sandbox tests: individual and bulk changes, global campaign off/on, scheduled end, rollback, localized pricing, successful/declined checkout, webhook and fulfillment regression.
- Security tests: unauthenticated/non-admin/cross-environment/malformed/replay attempts; public credential scan.
- Browser tests: every price surface agrees with Paddle Checkout.

## Phase 8 — Staging deployment

- Deploy rules/indexes only if changed.
- Deploy targeted Sandbox functions and verify function inventory.
- Deploy private Admin using the canonical private workflow.
- Deploy isolated staging storefront and execute the campaign matrix.
- Observe logs/jobs before approval.

## Phase 9 — Production preparation (deferred)

- Reconcile the independent live Paddle catalog.
- Configure live secrets and approved domain.
- Migrate production commercial revisions without enabling checkout.
- Verify live checkout opens with correct prices without taking payment.
- Enable only after owner approval and one controlled go-live procedure.

## Rollback

- Application rollback: restore previous frontend/function versions.
- Data rollback: point Offers to the previous `READY` commercial revision through an audited rollback job.
- Paddle rollback: synchronize the prior price as active; never delete persistent Paddle entities.
- Public checkout remains disabled for any Offer without matching ready revision and mapping hash.

