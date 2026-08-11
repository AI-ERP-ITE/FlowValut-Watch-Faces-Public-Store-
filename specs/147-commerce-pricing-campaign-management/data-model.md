# Spec 147 — Data Model

The names below are conceptual and must be reconciled with live Firestore before implementation.

## `commerceConfig/paddleCatalog`

Retain environment-localized defaults and policy version. Remove its global boolean as the sole public-display decision after Campaign migration; effective state is resolved through revisions.

## `campaigns/{campaignId}`

```ts
interface Campaign {
  id: string
  name: string
  description?: string
  environment: 'sandbox' | 'production'
  state: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'CANCELED'
  discount: { type: 'FIXED_PRICE'; amount: number } | { type: 'PERCENT'; percent: number }
  targets: CampaignTarget[]
  priority: number
  startsAt: Timestamp | null
  endsAt: Timestamp | null
  activationRevisionId?: string
  createdBy: string
  updatedBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

## `campaignRevisions/{revisionId}`

Immutable activation/ending snapshot containing Campaign configuration, resolved Offer IDs, old/new effective amounts, conflicts, desired hashes, actor, environment, and timestamps.

## `commercialRevisions/{revisionId}`

Immutable Offer pricing revision:

```ts
interface CommercialRevision {
  id: string
  environment: 'sandbox' | 'production'
  offerId: string
  regularPrice: number
  effectivePrice: number
  currency: 'USD'
  campaignId: string | null
  previousRevisionId: string | null
  desiredSyncHash: string
  status: 'PENDING' | 'SYNCING' | 'READY' | 'ERROR' | 'SUPERSEDED'
  createdBy: string
  createdAt: Timestamp
}
```

## Offer additions

Environment-specific active commercial revision pointers and existing Paddle mappings remain on the Offer. Do not overwrite immutable order snapshots when these pointers change.

## `commerceJobs/{jobId}`

Durable bounded job containing operation, environment, Campaign/revision, cursor, totals, progress counts, sanitized failure results, lease metadata, retry count, and terminal status.

## Required indexes

Determine from final query shapes. Expected composites include Campaign environment/state/start time, Campaign environment/state/end time, and commerce job environment/status/created time. Deploy only indexes actually required by emulator/cloud query verification.

