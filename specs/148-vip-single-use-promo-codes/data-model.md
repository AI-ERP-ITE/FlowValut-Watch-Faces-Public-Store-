# Spec 148 — Data Model
Names are conceptual until implementation audits the live Firestore schema.

## `vipPromoCodes/{codeId}`

```ts
interface VipPromoCode {
  id: string
  environment: 'sandbox' | 'production'
  codeHash: string
  codeMasked: string
  percentage: number
  status: 'PENDING_SYNC' | 'ACTIVE' | 'REDEEMED' | 'EXPIRED' | 'ARCHIVED' | 'ERROR'
  expiresAt: Timestamp | null
  paddleDiscountId: string | null
  syncStatus: 'NOT_SYNCED' | 'SYNCING' | 'SYNCED' | 'ERROR'
  syncError: { code: string; message: string; retryable: boolean } | null
  label: string | null
  note: string | null
  redeemedOrderId: string | null
  redeemedTransactionId: string | null
  redeemedAt: Timestamp | null
  createdBy: string
  createdAt: Timestamp
  updatedBy: string
  updatedAt: Timestamp
}
```

The final design must decide whether retrievable raw codes use encrypted server-only storage or are shown only once. Hash-only storage is preferred if Admin does not require later retrieval.

## Order additions

```ts
interface VipOrderSnapshot {
  pricingMode: 'CAMPAIGN' | 'STANDARD' | 'VIP_STANDARD'
  standardPriceId: string
  standardAmount: number
  campaignPriceId?: string | null
  campaignAmount?: number | null
  vipPolicyRevision?: number
  appliedPaddleDiscountId?: string | null
  appliedVipCodeId?: string | null
  finalPaddleTotal?: string | null
}
```

The customer-entered raw code is never stored on the order. After verified completion, store internal code ID and Paddle Discount ID.

## Audit

Use the existing commercial audit conventions. Record generation, synchronization, archive, redemption, replacement, failure, environment, actor, masked code, internal ID, and non-secret Paddle IDs.

## Indexes

Expected queries include environment/status/createdAt and environment/paddleDiscountId. Add only indexes proven necessary by final queries.
