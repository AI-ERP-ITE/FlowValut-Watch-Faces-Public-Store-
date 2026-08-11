# Spec 144 — Dependency-Ordered Tasks

## Specification

- [x] T001 Verify and create dedicated Firebase Hosting site `flowvault-staging`.
- [x] T002 Audit existing storefront, Paddle, Firebase, Offer, entitlement, download, auth, and deployment architecture.
- [x] T003 Record staging/live environment contract and implementation plan.
- [x] T004 Receive approval for Phase 1 runtime implementation.

## Phase 1 — Configuration contracts

- [x] T010 Add centralized FlowVault frontend configuration.
- [x] T011 Add staging and production public-safe environment files.
- [x] T012 Add explicit staging/production build commands.
- [x] T013 Add configuration validation tests.

## Phase 2 — UI safety

- [x] T020 Apply production checkout kill switch to all purchase entry points.
- [x] T021 Add staging Sandbox/Test Mode indicator and noindex behavior.
- [x] T022 Preserve production UI with intentional purchase-unavailable state.
- [x] T023 Add UI tests proving disabled checkout makes no backend/Paddle call.

## Phase 3 — Offer mapping

- [x] T030 Add environment-specific Paddle Product/Price references to Offers.
- [x] T031 Add mapping validation and missing-mapping diagnostics.
- [x] T032 Add Sandbox/Live cross-contamination tests.

## Phase 4 — Backend checkout

- [x] T040 Add server-side environment and checkout-enable policy.
- [x] T041 Replace dynamic prices with mapped Paddle Price IDs.
- [x] T042 Persist immutable environment and price snapshots on orders.
- [x] T043 Prevent legacy simulated paid fulfillment from serving as production checkout.

## Phase 5 — Webhooks and fulfillment

- [x] T050 Add separate Sandbox and Live webhook Functions.
- [x] T051 Bind the Sandbox API key and notification signing secret through Firebase Secret Manager. Live secrets remain intentionally deferred.
- [x] T052 Validate signature, environment, status, order, Price ID, amount, and currency.
- [x] T053 Make webhook and transaction idempotency environment-aware.
- [x] T054 Preserve Spec 122 SKU entitlement and controlled download flow.
- [x] T055 Remove sensitive token logging.
- [ ] T056 Add successful, failed, duplicate, invalid, unknown-price, browser-closed, and cross-environment tests.

## Phase 6 — Paddle.js

- [x] T060 Add current Paddle.js Overlay Checkout initialization.
- [x] T061 Initialize Paddle Sandbox only in staging.
- [x] T062 Add webhook-authoritative success and refresh recovery UX.
- [ ] T063 Verify responsive checkout behavior.

## Phase 7 — Hosting and deploy safety

- [x] T070 Add Firebase Hosting multi-site configuration for `flowvault-staging`.
- [x] T071 Add staging deploy script with explicit project/site target.
- [x] T072 Add compiled-output credential scanner.
- [x] T073 Gate staging and public production deployment with the scanner.

## Phase 8 — Data and documentation

- [x] T080 Add environment-aware Firestore fields and indexes where required.
- [x] T081 Ensure production reporting excludes Sandbox records.
- [x] T082 Document environment architecture, secrets, mappings, deployment, activation, and rollback.

## Phase 9 — Verification and deployment

- [x] T090 Build and test frontend and Functions.
- [x] T091 Deploy changed Sandbox Functions with explicit project and endpoint list.
- [x] T092 Verify Functions list and endpoint contracts.
- [x] T093 Deploy only `flowvault-staging` Hosting.
- [x] T094 Execute successful and declined-card Sandbox payment matrix.
- [x] T095 Verify production remains checkout-disabled and free of Sandbox IDs.
- [x] T096 Produce the requested final launch report.

## Live activation — explicitly deferred

- [ ] T100 Configure Live Paddle products, prices, client token, API key, and webhook secret.
- [ ] T101 Run one controlled Live transaction.
- [ ] T102 Receive explicit owner approval to enable production checkout.
- [ ] T103 Set production checkout enabled and deploy production.
