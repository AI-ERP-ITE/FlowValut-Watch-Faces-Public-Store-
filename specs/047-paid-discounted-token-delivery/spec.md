# Feature Specification: Paid + Discounted ZPK Delivery with Token Access

**Feature Branch**: `[047-paid-discounted-token-delivery]`  
**Created**: 2026-04-27  
**Status**: Draft

## Problem Statement
Current storefront download model exposes direct static links and does not enforce backend-authoritative pricing or token-based gated delivery. We need one unified purchase path that supports paid, discounted, and free watchfaces without account login.

## Goal
Implement Firebase-backed order + delivery flow with:
1. Backend-only price calculation
2. Stripe checkout for non-zero final price
3. Immediate order/token creation for 100% discounted items
4. Token-gated download endpoint that redirects to short-lived signed Storage URL
5. Private ZPK storage (no direct public links)

## Critical Rules
1. Frontend MUST send only `watchfaceId` for purchase intent.
2. Backend MUST derive final price from stored watchface data.
3. No Firebase Auth or user account requirement in storefront purchase flow.
4. All downloads MUST require a backend-issued token.
5. ZPK files MUST live in private Firebase Storage path `zpk/{watchfaceId}.zpk`.

## Data Model Requirements

### Watchface Pricing Source
Each purchasable watchface record must expose:
```json
{
  "id": "string",
  "basePrice": 5,
  "discountPercent": 0
}
```

### Orders Collection
Firestore collection: `orders`

Required order fields:
```json
{
  "orderId": "string",
  "watchfaceId": "string",
  "token": "string",
  "createdAt": "timestamp",
  "downloadCount": 0,
  "maxDownloads": 3,
  "expiresAt": "timestamp|null",
  "paymentStatus": "paid|free",
  "stripeSessionId": "string|null"
}
```

## Backend Functional Requirements

### 1) createOrderOrCheckout
Input:
```json
{ "watchfaceId": "string" }
```

Behavior:
1. Load watchface pricing model from backend source.
2. Compute final price:
   `finalPrice = basePrice * (1 - discountPercent / 100)`
3. If final price is zero:
   - Create secure token
   - Save order with `paymentStatus = "free"`
   - Return `{ type: "free", downloadUrl: "/download?token=..." }`
4. If final price is greater than zero:
   - Create Stripe checkout session with backend amount
   - Return `{ type: "paid", checkoutUrl: session.url }`

### 2) handlePaymentWebhook
Behavior:
1. Verify Stripe signature using webhook secret.
2. On successful checkout completion:
   - Read `watchfaceId` from session metadata
   - Generate secure token
   - Save paid order (`paymentStatus = "paid"`)
3. Persist enough metadata for reconciliation (session id, amount)

### 3) downloadByToken
Input:
`GET /download?token=TOKEN`

Behavior:
1. Lookup order by token.
2. Reject if not found.
3. Reject if `downloadCount >= maxDownloads`.
4. Reject if `expiresAt` exists and is expired.
5. Create signed URL for `zpk/{watchfaceId}.zpk` with <= 5 minute expiry.
6. Increment download counter atomically.
7. Redirect caller to signed URL.

## Frontend Requirements
1. Product purchase action must call backend create endpoint with `watchfaceId` only.
2. If response type is `free`, frontend must navigate to backend-provided download URL.
3. If response type is `paid`, frontend must navigate to backend-provided checkout URL.
4. Frontend must not submit or override amount values.

## Security Requirements
1. Token generation must use cryptographically secure randomness.
2. Storage rules must block all direct reads/writes for `zpk/*`.
3. Signed URL expiration must be short (<= 5 minutes).
4. Webhook endpoint must reject invalid signatures.
5. Download endpoint must always enforce token validation + limits.

## Acceptance Criteria
1. Price used for checkout always comes from backend model.
2. 100% discount creates order immediately and allows token download flow.
3. Paid purchase only yields downloadable order after webhook confirmation.
4. Every download request requires a valid token.
5. Download count limit (default 3) is enforced.
6. Direct Storage access to ZPK paths is denied by rules.
7. Existing storefront pages compile and route correctly after integration.
