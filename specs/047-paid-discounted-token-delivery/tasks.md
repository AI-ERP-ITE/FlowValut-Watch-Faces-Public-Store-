# Tasks: Paid + Discounted Token Delivery

## Planned Tasks

- [ ] T001 Add shared utility helpers in Firebase Functions for pricing, token generation, and order writes.
- [ ] T002 Implement `createOrderOrCheckout` endpoint with backend final-price branching.
- [ ] T003 Implement `handlePaymentWebhook` endpoint with Stripe signature validation.
- [ ] T004 Implement `downloadByToken` endpoint with token checks and signed URL redirect.
- [ ] T005 Add Firestore rules for `orders` collection (deny client reads/writes).
- [ ] T006 Add Firebase Storage rules and config for private `zpk/*` objects.
- [ ] T007 Add storefront API client utility for order/checkout initiation.
- [ ] T008 Update storefront purchase UI flow to use backend endpoint results.
- [ ] T009 Validate `firebase/functions` build and `app` build for integration safety.

## Verification Checklist

- [ ] V001 Backend computes final price from `basePrice` and `discountPercent` only.
- [ ] V002 Free (100% discount) path returns tokenized download URL without Stripe.
- [ ] V003 Paid path returns Stripe checkout URL and does not create paid order early.
- [ ] V004 Webhook creates paid order only after signature-verified checkout completion.
- [ ] V005 `downloadByToken` blocks invalid/expired/maxed tokens.
- [ ] V006 Successful token download increments `downloadCount` atomically.
- [ ] V007 Storage denies direct access to `zpk/*` from clients.
- [ ] V008 Frontend sends only `watchfaceId` and never sends amount.
