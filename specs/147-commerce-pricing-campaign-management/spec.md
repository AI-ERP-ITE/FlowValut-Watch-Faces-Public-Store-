# Spec 147 — Commerce Pricing and Campaign Management

**Created:** 2026-08-09  
**Status:** Planned / deferred until the current Sandbox release test is complete  
**Domain:** Shared private Admin + public storefront + Firebase commerce backend  
**Depends on:** Specs 122, 144, 145, and 146-storefront-delivery-recovery-analytics

## Purpose

Give FlowVault a dedicated commercial-management system for editing standard prices and running targeted promotions without rebuilding, resubmitting, or rereleasing any ZPK. FlowVault remains the commercial source of truth; Paddle remains the payment processor and stores the synchronized Product and one-time Price objects.

## Confirmed current defect

The public storefront currently displays `campaignPrice` whenever that field exists. The checkout backend instead selects the promotional or standard Paddle Price using the private global `promotion.enabled` policy. Disabling the campaign can therefore leave the storefront displaying a promotional amount while checkout selects the standard amount.

This specification MUST remove that split decision. A single server-derived `effectivePrice` and campaign state MUST control public display, checkout readiness, immutable order snapshots, and Paddle active Price selection.

## Business invariants

1. A commercial change MUST never require a ZPK rebuild, classification, upload, parity validation, or technical release.
2. One sellable FlowVault Offer maps to one environment-specific Paddle Product.
3. Standard and promotional Paddle Prices are one-time, quantity-one prices.
4. FlowVault determines targeting, effective price, schedule, and presentation. Paddle receives the resolved price representation per Offer.
5. Paddle has no responsibility for QR codes, ZPK delivery, compatibility, installation, download limits, or recovery.
6. Sandbox and production catalogs, policies, jobs, mappings, and secrets remain isolated.
7. Existing Products, Prices, customers, transactions, orders, entitlements, and download records MUST NOT be deleted.
8. Price replacement MUST save the new mapping before archiving a superseded Price.
9. Public checkout MUST fail closed when its Offer mapping is stale, incomplete, cross-environment, archived, or in error.
10. A customer MUST see the exact effective price that the server snapshots and Paddle Checkout charges.

## Commercial concepts

### Offer pricing

Every paid Offer owns:

- `regularPrice`: normal USD selling price.
- Optional Offer-specific promotional override.
- Currency: initially USD, with server-managed localized overrides.
- Environment-specific Paddle Product/Price mapping.

Editing these fields is a commercial mutation and does not mutate a Technical Package.

### Campaign

A Campaign is a reusable commercial policy with:

- Name and internal description.
- State: `DRAFT`, `SCHEDULED`, `ACTIVE`, `PAUSED`, `ENDED`, or `CANCELED`.
- Optional start and end timestamps.
- Discount method: fixed promotional price or percentage reduction.
- Target selector.
- Priority and explicit conflict behavior.
- Created/updated/activated/ended actor and timestamps.
- Immutable activation snapshot of affected Offers and calculated prices.

### Target scopes

Campaigns MUST support:

- Entire active store.
- One or more Design DNAs.
- One or more Collections.
- One or more Product Models.
- One or more variants.
- One or more editions.
- One or more explicit Offers.

Target resolution occurs against FlowVault hierarchy IDs, never Paddle IDs. Before activation, Admin receives a dry-run list of every affected Offer, its hierarchy context, old effective price, new effective price, and expected Paddle action.

### Conflict policy

The first implementation MUST allow only one winning campaign per Offer. Resolution is deterministic:

1. Explicit Offer target.
2. Edition target.
3. Variant target.
4. Product Model target.
5. Collection target.
6. Design DNA target.
7. Store-wide target.
8. Higher explicit priority breaks ties within the same scope.
9. Identical scope and priority is an activation-blocking conflict.

Campaigns MUST NOT stack discounts in v1. A future stacking model requires a separate approved specification.

## Effective-price contract

The backend computes an `EffectiveCommercialState` for each Offer and environment containing:

- Regular amount.
- Effective amount.
- Currency.
- Discount percentage for presentation only.
- Winning Campaign ID/name, or null.
- Campaign start/end metadata.
- Pricing revision.
- Desired-state hash.
- Paddle Product ID and active Price ID only where safe for the intended response.
- Checkout readiness.

The public read model MUST expose the effective state required for display, but not private campaign configuration or unrestricted Paddle payloads. Frontend code MUST NOT independently select `campaignPrice`, calculate discounts for charging, perform currency conversion, or infer whether a campaign is active.

## Administrative capabilities

Create a private authenticated **Commerce & Campaigns** area containing:

1. Offer Pricing editor independent of Release Wizard.
2. Campaign list and lifecycle controls.
3. Scope selector using existing hierarchy records.
4. Dry-run preview and conflict report.
5. Scheduled start/end controls.
6. Bulk synchronization progress and per-Offer results.
7. Retry only failed/out-of-sync Offers.
8. Audit history and rollback to the immediately preceding commercial revision.
9. Sandbox/production environment badge and hard isolation.
10. Read-only Paddle Product, standard Price, promotional Price, active Price, sync hash, and status.

The Release Wizard MAY continue accepting initial regular/campaign amounts for a newly created Offer, but after release all routine pricing changes MUST use Commerce & Campaigns.

## Lifecycle requirements

### Create or edit standard pricing

1. Admin selects Offer(s).
2. Server validates money precision, nonnegative amount, environment, Offer state, and authorization.
3. Admin previews affected Offers and localized outcomes.
4. Server creates a pricing revision and synchronization job.
5. Existing Paddle Products are reused.
6. Replacement Prices are created only when desired state changed.
7. Mapping switches only after the replacement is confirmed.
8. Public effective price changes only when the Offer is commercially ready.

### Activate a campaign

1. Resolve targets and conflicts.
2. Persist an immutable activation snapshot.
3. Calculate effective prices server-side.
4. Synchronize affected Offers in bounded resumable batches.
5. Activate public presentation only for successfully synchronized Offers.
6. Keep failed Offers at their previous commercially ready price and report them to Admin.

### Pause, end, or cancel

Ending a campaign resolves each affected Offer back to the next winning campaign or its standard price, synchronizes Paddle, and then updates public presentation. Historical orders retain their immutable charged-price and Paddle IDs.

### Schedule

Scheduled activation and ending MUST be performed by backend scheduled functions or a durable job mechanism. Browser presence is never required. Jobs are idempotent, resumable, bounded, and safe under at-least-once execution.

## Failure and rollback behavior

- Content remains published if a commercial sync fails.
- Checkout remains on the last verified commercially ready revision or becomes unavailable; it must never charge an unverified new amount.
- Public presentation must remain aligned with that same ready revision.
- Failed jobs store only sanitized error metadata.
- Retry reuses existing mappings and partially created objects.
- Rollback creates a new revision referencing the prior approved state; it does not erase history.

## Security and authorization

- All mutations require Firebase ID-token authentication, Admin authorization, rate limiting, strict schemas, and explicit environment.
- Public builds do not register private campaign routes.
- Paddle API keys remain Firebase secrets and never enter client code, responses, logs, browser storage, or compiled assets.
- Campaign activation, bulk price changes, rollback, and production actions require explicit typed confirmation.
- Production mutation remains disabled until the independent live catalog is approved.
- Audit records contain actor, action, environment, targets, revision IDs, non-secret Paddle IDs, results, and timestamps.

## Email, orders, fulfillment, and analytics

- Existing paid-order email and fulfillment behavior remains unchanged.
- Orders snapshot effective amount, currency, Campaign ID if applicable, Product ID, Price ID, Offer revision, and environment.
- Refund and invoice records continue referencing the actual Paddle transaction.
- Store analytics MAY later compare campaign impressions/conversions, but analytics is not permitted to influence price resolution in v1.

## Acceptance criteria

1. Disabling all campaigns makes every public surface and checkout show/select standard prices after synchronization.
2. A campaign can target one Offer, variant, edition, Product Model, Collection, Design DNA, or the whole store.
3. Preview accurately lists affected and excluded Offers before mutation.
4. No pricing action requires a ZPK rerelease.
5. Store display, PricePreview/Checkout, server order snapshot, webhook validation, and invoice amount agree.
6. Existing Paddle Products are reused; retries do not duplicate them.
7. Partial failure never creates a displayed-price/charged-price mismatch.
8. Scheduled operations complete without an open Admin browser.
9. Campaign conflicts are deterministic or activation is blocked.
10. Historical orders and fulfillment remain unchanged after subsequent price changes.
11. Sandbox tests pass before any production catalog mutation.

## Related future pricing benefits

Customer-entered VIP promo codes are defined separately by Spec 148. Campaigns remain Offer-level public pricing; VIP codes replace rather than stack with the winning Campaign price.

## Non-goals for v1

- Discount codes entered by customers.
- Per-customer negotiated pricing.
- Subscription billing.
- Stacked campaigns.
- A/B pricing.
- Paddle-managed QR/ZPK delivery.
- Automatic production enablement.
