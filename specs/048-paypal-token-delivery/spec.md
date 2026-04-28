# Feature Specification: PayPal Multi-Method Token Delivery

**Feature Branch**: `[048-paypal-token-delivery]`  
**Created**: 2026-04-27  
**Status**: Draft

## Problem Statement
Current payment flow is Stripe-specific. Product requirement changed to collect money via PayPal while still supporting multiple buyer payment methods (PayPal wallet, cards, and region-supported alternatives) with backend-authoritative pricing and token-gated ZPK delivery.

## Goal
Replace Stripe checkout integration with PayPal Checkout while preserving:
1. Backend-only price calculation
2. Free-path instant token delivery
3. Paid-path secure payment confirmation before download
4. Token-gated signed URL download from private Storage
5. No user account requirement

## Critical Rules
1. Frontend MUST send only `watchfaceId` when starting purchase.
2. Backend MUST derive final amount from stored watchface pricing.
3. Paid order MUST be marked paid only after successful PayPal capture or verified webhook event.
4. Every download MUST require valid backend-issued token.
5. Storage `zpk/*` MUST remain private.

## Data Model Requirements

### Orders Collection
Firestore collection: `orders`

Required fields:
```json
{
  "orderId": "string",
  "watchfaceId": "string",
  "token": "string",
  "createdAt": "timestamp",
  "downloadCount": 0,
  "maxDownloads": 3,
  "expiresAt": "timestamp|null",
  "paymentStatus": "pending|paid|free",
  "paypalOrderId": "string|null"
}
```

## Backend Functional Requirements

### 1) createOrderOrCheckout
Input:
```json
{ "watchfaceId": "string" }
```

Behavior:
1. Load watchface pricing from backend source.
2. Compute `finalPrice = basePrice * (1 - discountPercent / 100)`.
3. If finalPrice == 0:
   - Create tokenized free order
   - Return `{ type: "free", downloadUrl }`
4. If finalPrice > 0:
   - Create PayPal order in backend
   - Persist pending order with `paypalOrderId`
   - Return `{ type: "paid", provider: "paypal", orderId, paypalClientId, paypalEnv }`

### 2) capturePayPalOrder
Input:
```json
{ "orderId": "paypal-order-id" }
```

Behavior:
1. Capture order via PayPal API.
2. Verify completed capture status.
3. Mark matching pending order as paid.
4. Return tokenized download URL.

### 3) handlePayPalWebhook
Behavior:
1. Verify PayPal webhook signature using webhook verification API.
2. On payment completion events, reconcile order and mark as paid if pending.
3. Be idempotent for duplicate events.

### 4) downloadByToken
Unchanged core behavior:
1. Validate token
2. Enforce maxDownloads/expiry
3. Issue short-lived signed URL
4. Increment download count atomically

## Frontend Requirements
1. Start purchase with backend call (watchfaceId only).
2. If free: redirect to backend download URL.
3. If paid: render PayPal Smart Buttons using backend orderId and clientId.
4. On approve: call capture endpoint then redirect to download URL.
5. Do not compute/send trusted prices from frontend.

## Security Requirements
1. PayPal credentials only in backend env.
2. Webhook verification required before applying webhook side effects.
3. Token generation remains cryptographically secure.
4. Private Storage access denied by rules.

## Acceptance Criteria
1. Paid flow uses PayPal (not Stripe).
2. Buyer can pay with PayPal-supported methods shown by PayPal Checkout.
3. Free flow still works with immediate token delivery.
4. Download remains token-gated and limited.
5. Both backend and frontend builds pass.
