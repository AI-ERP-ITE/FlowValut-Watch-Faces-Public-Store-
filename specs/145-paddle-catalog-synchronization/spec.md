# Spec 145 — Paddle Catalog Synchronization

**Created:** 2026-08-08  
**Status:** Draft; awaiting implementation approval  
**Domain:** Shared core + private Admin/Release workflow + public checkout consumer  
**Initial execution environment:** Paddle Sandbox only  
**Depends on:** Spec 122 commercial Offers and fulfillment; Spec 144 Paddle environment separation

## Authority and source of truth

FlowVault remains authoritative for commercial catalog data. Paddle is a synchronized payment representation and must never overwrite FlowVault product identity, pricing policy, publication state, or fulfillment composition.

The current live Store Read Model contains 22 active sellable Offers, each with USD 8 regular price and USD 4 campaign price, and no Paddle mappings. This specification maps Paddle objects to those existing Offers. It does not infer products from the empty legacy static `catalog.json`, nor create Paddle Products for Design DNA, Collections, Product Models alone, revisions, drafts, Workshop builds, Technical Packages, or non-sellable records.

## Commercial boundary decision

1. One Paddle Product represents one sellable FlowVault `Offer`.
2. An individual `SKU` Offer produces one Paddle Product and entitles its single SKU.
3. A `BUNDLE` Offer produces one Paddle Product and entitles all `includedSkuIds`.
4. Paddle Prices describe the standard and promotional charge for the Offer.
5. Revisions and device-specific Technical Packages remain fulfillment details and never create additional Paddle Products.

This resolves the attached brief's “one product per sellable catalog product” rule against FlowVault's existing Offer-centric checkout and Spec 122 entitlement architecture.

## Goals

1. Synchronize all eligible FlowVault Offers to Paddle Sandbox without duplicate products or unnecessary duplicate Prices.
2. Create one-time standard and promotional Prices with localized overrides.
3. Make promotion switching and price changes controllable from FlowVault.
4. Integrate synchronization into the existing release/publication workflow and Admin UI.
5. Prevent checkout until content and Paddle commercial readiness both pass.
6. Preserve historical Paddle entities, transaction references, orders, entitlements, and downloads.
7. Prepare independent production mappings without creating or activating production Paddle objects in this task.

## Non-goals

1. No subscriptions, recurring billing, trials, seats, or quantity-based purchasing.
2. No Paddle-hosted storefront or Paddle-as-source-of-truth import.
3. No redesign of FlowVault hierarchy, release pipeline, checkout, webhook, or fulfillment.
4. No creation of Paddle Live catalog objects.
5. No deletion of historical Paddle Products or Prices.
6. No secrets or authenticated Paddle writes in browser code.

## Commercial pricing policy

The existing Offer fields remain authoritative for USD amounts:

- `regularPrice`: standard retail amount; currently USD 8.00.
- `campaignPrice`: promotional amount; currently USD 4.00.
- `currency`: currently `USD`.

A single private FlowVault commerce-policy document stores editable shared localized defaults and promotion state. Conceptually:

```ts
interface CommercePricingPolicy {
  promotion: { id: string; name: string; enabled: boolean };
  localizedDefaults: {
    standard: { GBP: 6.99; EUR: 7.49; AUD: 11.99 };
    promotion: { GBP: 3.49; EUR: 3.79; AUD: 5.99 };
  };
  updatedAt: Timestamp;
}
```

Exact storage location must reuse the existing private configuration conventions. Product-level localized overrides are optional and additive only where an Offer genuinely differs from the global defaults.

The active Price is selected server-side:

```text
promotion.enabled AND Offer has a valid campaignPrice
  => promotionalPriceId
otherwise
  => standardPriceId
```

The public storefront must not receive or choose arbitrary Paddle IDs. The backend loads the Offer, environment, sync state, and active Price mapping.

## Central money contract

One pure utility converts validated decimal commercial amounts into Paddle minor-unit strings. It must:

1. Use currency metadata rather than floating-point multiplication scattered through handlers.
2. Reject unsupported currencies, negative values, excess fractional precision, NaN, and unsafe integers.
3. Produce `800`, `400`, `349`, `379`, `599`, `699`, `749`, and `1199` for the initial configured values.
4. Keep zero-decimal currency support correct even though the initial set is USD, GBP, EUR, and AUD.

## Paddle object contract

### Product

Each eligible Offer synchronizes to a standard Paddle Product with:

- FlowVault Offer name, preserving catalog identity.
- Existing product-specific description where present; otherwise the approved FlowVault personal-use digital-product description.
- Tax category `digital-goods`, subject to the category being enabled in the Paddle account before bulk creation.
- `custom_data` containing stable non-secret reconciliation identity such as FlowVault Offer ID, architecture version, and environment.
- Active or archived status derived from FlowVault commercial eligibility.

### Prices

Each active paid Offer supports two one-time Prices:

1. Standard Price using `regularPrice` and standard localized overrides.
2. Promotional Price using `campaignPrice` and promotional localized overrides when the promotion is configured.

Prices omit billing cycle and trial period, set quantity minimum/maximum to one, and use `unit_price_overrides` for GB, IE, and AU rather than separate currency Prices.

When an amount or localized override changes, synchronization creates a replacement Price, atomically switches the FlowVault mapping, and archives the superseded Price after the new mapping is durable. Historical Price IDs remain in audit history and historical orders remain valid.

## Additive Offer synchronization model

The existing `paddle.sandbox` and `paddle.production` boundaries remain. Each environment mapping expands conceptually to:

```ts
interface PaddleCatalogMapping {
  productId?: string;
  standardPriceId?: string;
  promotionalPriceId?: string;
  activePriceId?: string;
  syncStatus: 'NOT_SYNCED' | 'SYNCING' | 'SYNCED' | 'OUT_OF_SYNC' | 'ERROR' | 'ARCHIVED';
  syncError?: { code: string; message: string; retryable: boolean; occurredAt: Timestamp } | null;
  lastSyncHash?: string;
  lastSyncedAt?: Timestamp;
  lastReconciledAt?: Timestamp;
}
```

Legacy Spec 144 `{ productId, priceId }` reads must be migrated compatibly. During migration, `priceId` may be interpreted only as the current active Price for that same environment; new writes use explicit standard/promotional/active IDs. Checkout must fail closed if the selected mapping is incomplete, stale, wrong-environment, archived, or not `SYNCED`.

## Eligibility and readiness

An Offer is catalog-sync eligible only when:

1. It has a stable ID, valid name and description policy, valid pricing, currency, and supported localization policy.
2. Its state is intended for sale (`ACTIVE` or the existing pre-activation publication transition).
3. All included SKUs exist and are sellable.
4. Existing Spec 122 fulfillment readiness succeeds for required Technical Packages.
5. It is paid; free Offers do not require Paddle catalog objects.

Content publication and commercial readiness are distinct. A release may preserve content while Paddle synchronization is `ERROR`, but the Offer must not become purchasable until catalog sync is `SYNCED` and active Price selection is valid.

## Synchronization operations

Trusted Firebase Functions provide reusable services and thin authenticated Admin endpoints for:

1. `syncOfferCatalog(environment, offerId)` — create/update/reconcile one Offer.
2. `syncEligibleCatalog(environment, cursor, limit)` — bounded, resumable migration/bulk synchronization.
3. `reconcileOfferCatalog(environment, offerId)` — compare FlowVault desired state with Paddle without adopting Paddle as truth.
4. `archiveOfferCatalog(environment, offerId)` — archive relevant active Paddle objects while preserving mappings/history.
5. `getCatalogSyncStatus(environment, offerId)` — return sanitized status to Admin.

All Admin endpoints require Firebase authentication, Admin authorization, rate limiting, strict schema validation, Sandbox-only enforcement for the initial task, and backend-held Paddle credentials.

## Idempotency and concurrency

1. A canonical desired-state document is hashed from environment, Offer identity, product presentation, tax category, standard Price, promotion Price, localized overrides, and commercial status.
2. If the saved mapping is complete and `lastSyncHash` matches, sync performs reconciliation and no creation.
3. Firestore transaction/lease state prevents two Admin requests from synchronizing the same Offer concurrently.
4. Paddle requests use supported idempotency/request controls where available, plus FlowVault stable `custom_data` identity and saved mappings.
5. If Paddle succeeds but FlowVault persistence fails, the retry searches/reconciles by the stable FlowVault identity before creating anything.
6. Bulk sync is bounded, resumable, and records per-Offer outcomes rather than using one all-or-nothing request.

## Reconciliation results

Reconciliation must distinguish at least:

- `SYNCED`
- `OUT_OF_SYNC`
- `MISSING_IN_PADDLE`
- `MISSING_STANDARD_PRICE`
- `MISSING_PROMOTIONAL_PRICE`
- `PROMOTION_MISMATCH`
- `LOCAL_PRICE_MISMATCH`
- `ARCHIVED_MISMATCH`
- `ENVIRONMENT_MISMATCH`
- `ERROR`

It may update FlowVault synchronization metadata and observed Paddle state, but must not overwrite authoritative FlowVault commercial configuration with Paddle values.

## Publication workflow integration

The existing Release Wizard flow remains:

```text
Workshop tested/approved -> classification -> Technical Package release -> Offer readiness
```

For a paid Offer, its commercial continuation becomes:

```text
validate FlowVault commercial state
-> synchronize Paddle Sandbox
-> persist mappings and audit result
-> mark commercial checkout ready
-> expose/retain Offer as purchasable
```

If synchronization fails, preserve the released content and record the error, but keep checkout readiness false. Admin can retry without recreating FlowVault data.

## Admin UI

Extend the existing Release Wizard/Admin Ops surfaces with a compact Paddle section showing:

- Environment
- Paddle Product ID
- Standard, promotional, and active Price IDs
- Sync status and commercial readiness
- Last synchronized/reconciled timestamps
- Sanitized error

Permitted actions are `Sync to Paddle`, `Resync`, `Retry`, `Refresh status`, and guarded `Archive`. Bulk `Sync existing catalog to Paddle Sandbox` must show a dry-run summary before execution and a per-Offer result report. No API key, webhook secret, or unrestricted Paddle payload is returned to the browser.

## Checkout and webhook compatibility

1. `createSandboxOfferCheckout` resolves active Price only from the server-loaded Offer mapping and commerce policy.
2. Browser-provided Price/Product IDs are ignored or rejected.
3. Order snapshots retain environment, Offer, Product, active Price, amount, currency, and included SKU identity.
4. The existing environment-specific webhook validates the immutable order snapshot and continues granting SKU entitlements through Spec 122.
5. Catalog synchronization must not grant entitlements or mark orders paid.

### Payment-only Paddle boundary

Paddle's responsibility ends at creating the payment transaction and delivering cryptographically verified payment status. Paddle must not generate, host, select, modify, expose, or authorize FlowVault QR codes, ZPK files, installation URLs, device packages, or download tokens. QR/ZPK generation, compatibility resolution, entitlement, controlled delivery, download limits, and installation UX remain exclusively owned by FlowVault. A Paddle browser event is never sufficient; only the verified backend webhook may advance the FlowVault order into its existing fulfillment flow.

## Archiving

Retiring an Offer disables checkout first, then archives its Paddle Prices/Product where supported. Mappings and audit history remain. Existing orders, entitlements, tokens, and downloads remain governed by their original snapshots. No Paddle delete operation is used.

## Audit logging

Use the existing audit conventions to record actor, environment, Offer ID, action, affected non-secret Paddle IDs, previous/new sync hash, outcome, timestamps, and sanitized error. API keys, webhook secrets, authorization headers, raw customer data, and download tokens are forbidden in logs.

## Security requirements

1. Only backend Functions call authenticated Paddle catalog APIs.
2. `PADDLE_SANDBOX_API_KEY` remains a Firebase Secret Manager binding.
3. Production uses a separate future secret and mapping namespace.
4. Public JSON and Store Read Model may expose only the minimum mapping required for display; checkout does not rely on client mapping authority. Prefer omitting Paddle IDs from public responses entirely.
5. All catalog mutations require Firebase Admin authorization.
6. Sandbox execution rejects production environment requests even from authenticated Admin users during this task.

## Migration and catalog report

The migration first generates a dry-run inventory from the actual `offers` collection. At the time of specification, the live read model reports:

- 22 active sellable Offers
- 22 SKU Offers and no active bundles
- USD 8 standard / USD 4 campaign on each
- zero Sandbox mappings and zero production mappings

Before creating anything, migration must list existing Paddle products/prices and reconcile saved mappings plus stable FlowVault identity metadata. Uncertain records are reported as `Requires catalog mapping review`; nothing is invented.

The final Sandbox report includes Offer/product name, collection/model/variant context, FlowVault Offer and SKU IDs, Paddle Product ID, Standard Price ID, Promotional Price ID, active checkout Price ID, all localized values, tax category, Paddle status, sync status, and any review requirement.

## Test requirements

At minimum test:

1. New eligible Offer creates one Product and two one-time Prices.
2. Correct minor-unit values and GB/IE/AU overrides are sent.
3. IDs and sync hash persist only in the Sandbox namespace.
4. Retry after success creates no duplicates.
5. Retry after Paddle-success/Firestore-failure reconciles rather than duplicates.
6. Promotion on/off selects promotional/standard Price respectively.
7. Price change creates a replacement, switches mapping, and archives the prior Price.
8. Paddle errors persist sanitized retryable status.
9. Failed/stale sync prevents checkout.
10. Archived Offer cannot create checkout.
11. Sandbox/production mappings cannot cross.
12. Concurrent sync requests serialize safely.
13. Bulk sync is bounded/resumable with per-Offer outcomes.
14. Existing webhook transaction validation and entitlement fulfillment remain valid.
15. Public responses and compiled output contain no backend secret.

## Acceptance criteria

1. FlowVault Admin can dry-run and synchronize the actual eligible catalog to Paddle Sandbox.
2. Each eligible paid Offer has exactly one active Paddle Product representation, one current standard Price, and one current promotional Price when configured.
3. The Soft Opening switch changes active checkout from USD 4 to USD 8 without recreating Products or editing storefront code.
4. Local pricing produces GB GBP, IE EUR, and AU AUD overrides from editable FlowVault policy.
5. Failed, incomplete, stale, archived, or wrong-environment sync states cannot create checkout.
6. Normal new-watchface publication can reach commercial readiness without manual Paddle Dashboard catalog maintenance.
7. Historical Paddle Prices and transaction references are preserved.
8. Sandbox catalog mapping report is complete and uncertain items are isolated for review.
9. Production Paddle remains unmodified and production checkout remains disabled.
