# Spec 148 — Dependency-Ordered Tasks

Implementation was approved on 2026-08-09. Live deployment remains separately gated.

## Approval

- [x] T001 Confirm percentage-only, 1–90%, unique single-use codes.
- [x] T002 Confirm universal Offer applicability and no campaign stacking.
- [x] T003 Confirm hybrid FlowVault mode selection + Paddle code entry.
- [x] T004 Approve implementation start after current launch work.

## Phase 0 — Audit

- [ ] T010 Inspect Sandbox Discount catalog and API permissions read-only.
- [x] T011 Audit Checkout, order, webhook, transaction verification, and audit contracts.
- [x] T012 Confirm Paddle overlay code-entry behavior and events.
- [x] T013 Confirm production untouched.

## Phase 1 — Domain contracts

- [x] T020 Add VIP code and pricing-mode schemas.
- [x] T021 Add cryptographic generator, masking, hashing, and validation.
- [x] T022 Decide secure show-once/retrieval policy.
- [x] T023 Add lifecycle and redemption state machine.
- [ ] T024 Test entropy assumptions, masking, validation, and concurrency.

## Phase 2 — Paddle adapter

- [ ] T030 Add Discount create/get/list/archive operations.
- [x] T031 Enforce percentage, usage-limit-one, non-recurring, universal configuration.
- [x] T032 Add environment/identity metadata and mapping persistence.

## Phase 3 — Admin

- [ ] T040 Add generate and bounded-batch APIs.
- [ ] T041 Add list/status/archive/retry APIs.
- [x] T042 Enforce Admin auth, rate limits, and schemas.
- [x] T043 Add guarded VIP Promo Codes UI.
- [ ] T044 Add secure copy, masking, filters, status, and redemption details.

## Phase 4 — Checkout

- [x] T050 Add VIP-mode selector and replacement disclosure.
- [x] T051 Resolve promotional Price for normal mode.
- [x] T052 Resolve standard Price for VIP mode.
- [x] T053 Enable customer code entry inside Paddle Checkout.
- [x] T054 Add invalid-code/return-to-campaign guidance.
- [x] T055 Prove frontend never calculates or trusts discounted totals.

## Phase 5 — Webhook and fulfillment

- [x] T060 Extend immutable order snapshot.
- [x] T061 Retrieve and validate authoritative Paddle Discount/transaction state.
- [ ] T062 Validate standard Price, percentage, environment, totals, and FlowVault identity. (Totals require Sandbox evidence.)
- [x] T063 Atomically claim single-use redemption.
- [x] T064 Preserve idempotent entitlement and email behavior.
- [ ] T065 Test replay, race, mismatch, and malicious Discount attempts.

## Phase 6 — Sandbox verification

- [ ] T070 Create isolated Sandbox VIP codes.
- [ ] T071 Test valid 10%, 50%, 75%, and 90% purchases.
- [ ] T072 Test campaign replacement and prove no stacking.
- [ ] T073 Test invalid, expired, archived, and reused codes.
- [ ] T074 Test declined/abandoned transactions do not consume codes.
- [ ] T075 Test concurrent redemption fulfills at most one order.
- [ ] T076 Test localized/tax totals, email, invoice, QR, ZPK, downloads, and recovery.
- [x] T077 Run public credential and code-enumeration scans.

## Phase 7 — Staging

- [x] T080 Deploy targeted Firebase surfaces and verify inventory.
- [x] T081 Deploy private Admin through canonical workflow.
- [x] T082 Deploy isolated staging storefront. (Backend remains gated.)
- [ ] T083 Complete browser acceptance matrix.
- [ ] T084 Receive owner Sandbox approval.

## Phase 8 — Live (deferred)

- [ ] T090 Configure independent live Discount permissions.
- [ ] T091 Deploy with live generation disabled.
- [ ] T092 Verify live Checkout code UI without redemption.
- [ ] T093 Receive explicit owner approval.
- [ ] T094 Generate and redeem one controlled live VIP code.
- [ ] T095 Monitor webhook, fulfillment, email, invoice, and audit results.
