# Tasks: PayPal Token Delivery Migration

## Planned Tasks

- [x] T001 Replace Stripe utilities with PayPal API/auth/signature verification helpers.
- [x] T002 Update order model to support `pending` + `paypalOrderId`.
- [x] T003 Rebuild `createOrderOrCheckout` for PayPal order creation.
- [x] T004 Add `capturePayPalOrder` endpoint and paid token return.
- [x] T005 Replace Stripe webhook with PayPal webhook verification and reconciliation.
- [x] T006 Update frontend purchase API types and capture method.
- [x] T007 Update Buy page to render PayPal buttons and handle approve/capture.
- [x] T008 Update env template/config files from Stripe to PayPal keys.
- [x] T009 Remove Stripe dependency from functions package.
- [x] T010 Validate `firebase/functions` build and `app` build.

## Verification Checklist

- [x] V001 Paid start response includes PayPal order context.
- [x] V002 Approved PayPal payment returns tokenized download URL.
- [x] V003 Free flow still returns direct tokenized download URL.
- [x] V004 Webhook verification rejects invalid signatures.
- [x] V005 Duplicate capture/webhook events do not create duplicate paid orders.
- [x] V006 Token limits and expiry still enforced.
- [x] V007 Functions build passes without Stripe import usage.
- [x] V008 Frontend build passes with PayPal button integration.
