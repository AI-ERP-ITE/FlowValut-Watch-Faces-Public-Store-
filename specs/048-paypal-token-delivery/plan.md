# Plan: PayPal Token Delivery Migration

## Implementation Plan
1. Replace Stripe helper utilities in Firebase Functions with PayPal API utilities.
2. Update order schema support to include `pending` payment state and `paypalOrderId`.
3. Rework `createOrderOrCheckout` to create PayPal orders for non-zero price.
4. Add `capturePayPalOrder` endpoint for frontend post-approval capture.
5. Replace Stripe webhook endpoint with PayPal webhook verification + reconciliation.
6. Keep token download endpoint unchanged except compatibility with new order fields.
7. Update storefront purchase API client for new paid response payload and capture call.
8. Update Buy page UI to render PayPal Smart Buttons and capture flow.
9. Replace Stripe env templates with PayPal env templates.
10. Remove Stripe dependency from Functions package and validate builds.

## Clarification Decisions
1. Currency remains USD for parity with previous implementation.
2. Primary paid confirmation path is capture endpoint called on PayPal approval.
3. Webhook is reconciliation/backup and must be idempotent.
4. Existing no-account purchase model remains unchanged.

## Scope Guard
- No changes to admin bridge endpoints.
- No changes to storage/firestore access policy beyond order field compatibility.
- No changes to watchface catalog pricing source.
