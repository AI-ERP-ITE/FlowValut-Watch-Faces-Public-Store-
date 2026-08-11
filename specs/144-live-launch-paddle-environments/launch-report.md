# FlowVault Paddle launch report

**Status:** Sandbox staging verified; production checkout intentionally disabled.

## Implemented state

- Staging is isolated at `https://flowvault-staging.web.app` and initializes Paddle Sandbox only.
- Production remains at `https://www.fvwatchfaces.com` with checkout disabled.
- Backend API calls select `sandbox-api.paddle.com` or `api.paddle.com` explicitly from the requested environment.
- Sandbox API credentials and the notification signing secret are bound through Firebase Secret Manager. They are not shipped in browser assets.
- The permanent Sandbox notification destination targets `paddleSandboxWebhook` and verifies the raw request body with the Paddle SDK before processing.
- Paddle is payment confirmation only. FlowVault owns Offer selection, device compatibility, entitlements, signed ZPK delivery, QR handling, and installation.
- Twenty-three one-time products were synchronized. Each has a standard USD 8 Price and a Soft Opening USD 4 Price, plus configured GBP, EUR, and AUD localized overrides.
- Products, Prices, notification destinations, transactions, orders, entitlements, and customers are permanent system state and must not be deleted as cleanup.

## Verification evidence

- Catalog dry run: 23 eligible Offers, no exceptions.
- Idempotent reconciliation rerun: no new Products or Prices and no duplicates.
- Backend automated tests: 55 passed.
- Compiled staging credential scan: passed.
- Successful browser checkout: promotional total USD 4, Sandbox Visa test card, Paddle transaction status `Complete`.
- Verified fulfillment: `transaction.completed` returned HTTP 200, order `iDK6gj6uglsy4qtASd3s` became paid/active, and FlowVault returned the Amazfit Balance ZPK download.
- Decline test: Paddle displayed the bank-decline message, delivered `transaction.payment_failed`, received HTTP 200, and FlowVault exposed no entitlement or download.
- A concurrent duplicate completion delivery revealed an idempotency race. The handler was corrected to claim the event before side effects, release the claim on processing failure, return HTTP 200 for duplicates, and was redeployed after all 55 tests passed.

## Remaining before production activation

1. Complete Paddle live-account verification and obtain approval for the production domain.
2. Create an independent live client-side token and server API key.
3. Create an independent live notification destination pointing to `paddleLiveWebhook`, then store its signing secret in Firebase Secret Manager.
4. Synchronize the 23 Products and their one-time Prices independently into the live Paddle catalog.
5. Set the live default payment link to an approved `https://www.fvwatchfaces.com` checkout URL.
6. Open live checkout and verify the displayed Prices without taking payment until Paddle permits live transactions.
7. Run one controlled live transaction, verify webhook/order/entitlement/download behavior, then obtain owner approval before setting `PADDLE_LIVE_CHECKOUT_ENABLED=true` and deploying production.

## Maintenance follow-ups

- Upgrade the Cloud Functions runtime from Node.js 20 before its scheduled decommission on October 30, 2026.
- Upgrade `firebase-functions` in a separate tested maintenance change because the current major-version upgrade may contain breaking changes.
- Rotate the unrelated GitHub credential observed in historical Firebase diagnostic output and store it in Secret Manager.
