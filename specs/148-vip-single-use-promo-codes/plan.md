# Spec 148 — Implementation Plan
## Strategy

Extend the existing Paddle adapter, order snapshots, strict transaction verification, and Spec 147 effective-price model. Do not create a parallel payment path or trust Paddle browser events for fulfillment.

## Phase 0 — Audit

- Inspect current Paddle Sandbox permissions and Discount objects read-only.
- Inspect order, transaction, webhook, checkout, and audit schemas.
- Confirm overlay Checkout supports customer code entry in the current configuration.
- Confirm production remains disabled.

## Phase 1 — Domain and security contracts

- Add VIP code, pricing mode, redemption, and safe error schemas.
- Add cryptographic code generation, masking, hashing, and percentage validation.
- Decide show-once versus encrypted retrieval through a security review.
- Add concurrency and idempotency tests.

## Phase 2 — Paddle Discount adapter

- Add environment-aware create/get/list/archive operations.
- Require percentage, checkout-enabled, one-use, non-recurring Discount configuration.
- Add FlowVault environment/code identity metadata.
- Normalize errors without leaking code/API details.

## Phase 3 — Admin APIs and UI

- Add authenticated generate, bounded batch, list, status, archive, and retry APIs.
- Add private VIP Promo Codes screen with masked listing and secure copy behavior.
- Add audit history and explicit production safeguards.

## Phase 4 — Hybrid Checkout

- Add `I have a VIP code` mode on the buy page.
- Normal mode resolves campaign effective Price.
- VIP mode resolves standard Price and enables Paddle code entry.
- Add clear replacement/no-stacking explanation and invalid-code fallback guidance.
- Do not calculate the unknown code total in FlowVault.

## Phase 5 — Verification and fulfillment

- Extend order snapshots with pricing mode and standard Price authority.
- Extend server transaction retrieval/validation for a single FlowVault Discount.
- Atomically claim a code on verified completion before activating entitlements.
- Preserve webhook idempotency and background fulfillment email behavior.

## Phase 6 — Sandbox testing

- Test valid percentages, invalid, expired, archived, redeemed, concurrent, declined, and abandoned scenarios.
- Test active campaign replacement and prove no stacking.
- Test localized totals and tax behavior using Paddle-formatted values.
- Run full QR/ZPK/download/email regression.

## Phase 7 — Staging deployment

- Deploy targeted rules/indexes/functions.
- Deploy private Admin canonically.
- Deploy isolated staging storefront.
- Execute acceptance matrix and security scan.

## Phase 8 — Live preparation (deferred)

- Add independent production Discount permissions and environment configuration.
- Deploy with production code generation disabled.
- Verify live Checkout UI without creating/redeeming a code.
- Enable only after explicit owner approval.

## Rollback

- Disable VIP mode on the public storefront.
- Keep normal campaign/standard checkout operational.
- Archive unused affected Discounts only through guarded Admin action; never delete entities or redemption history.
- Retain completed orders and entitlements unchanged.
