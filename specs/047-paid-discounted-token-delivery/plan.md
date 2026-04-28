# Plan: Paid + Discounted Token Delivery

## Implementation Plan
1. Extend Firebase Functions with pricing/order utility helpers (watchface lookup, final price, token generation, order persistence).
2. Add `createOrderOrCheckout` HTTP function that branches free vs paid flow.
3. Add `handlePaymentWebhook` HTTP function with Stripe signature verification and paid-order creation.
4. Add `downloadByToken` HTTP function that validates token usage limits and redirects with signed URL.
5. Add secure storage rules file + firebase config wiring for private `zpk/*` path.
6. Extend Firestore rules to lock down `orders` collection from client access.
7. Add frontend storefront API helper for create-order call and redirect flow.
8. Update storefront purchase pages to use backend checkout/bootstrap endpoint (no frontend price trust).
9. Validate with TypeScript build for `firebase/functions` and `app`.

## Clarification Decisions
1. No Firebase Auth in purchase/download flow by design.
2. Watchface pricing source is backend Firestore collection `watchfaces`.
3. Stripe secrets and return URLs come from Functions env variables.
4. Paid post-checkout delivery is token-based via webhook-created order records.

## Scope Guard
- Keep existing private admin/backend-bridge auth behavior untouched.
- Do not expose any direct Storage public URLs in catalog.
- Do not rely on client-provided amount values for any payment path.
