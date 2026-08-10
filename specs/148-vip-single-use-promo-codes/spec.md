# Spec 148 — VIP Single-Use Promo Codes

**Created:** 2026-08-09
**Status:** Implementation in progress; isolated staging backend deployment gated by new-project infrastructure
**Domain:** Shared private Admin + public buy page + Firebase commerce backend + Paddle Checkout
**Depends on:** Specs 145 and 147

## Purpose

Provide premium VIP customers with unique percentage promo codes that can be entered inside Paddle Checkout. Each code may complete exactly one transaction. VIP pricing replaces active campaign pricing and never stacks on top of it.

## Approved business rules

1. Promo codes are percentage-only in v1.
2. Allowed percentage is 1–90 inclusive.
3. Each generated code is unique and can complete exactly one transaction.
4. FlowVault may generate an unlimited number of individual codes; there is no aggregate campaign redemption ceiling.
5. Codes apply to every paid FlowVault Offer, regardless of Collection, Product Model, variant, edition, or Offer.
6. A VIP code discounts the standard price, never the current campaign/promotional price.
7. Campaign and VIP code modes may coexist in the store, but only one price benefit applies to a transaction.
8. Customers enter the actual code inside Paddle Checkout.
9. Paddle validates and counts the redemption. FlowVault independently verifies the resulting transaction before fulfillment.
10. Codes and redemption history are archived/retained, never deleted.
11. 100%-off codes are excluded from v1 and require a separate zero-total fulfillment specification and Sandbox test matrix.

## Customer flow

### Normal campaign checkout

```text
Buy page
→ current campaign Price is displayed
→ customer does not select VIP mode
→ server creates the order/transaction using the synchronized promotional Price
→ Paddle Checkout opens
→ campaign price is charged
```

### VIP checkout

```text
Buy page
→ customer selects “I have a VIP code”
→ FlowVault clearly states that VIP codes replace current promotional pricing
→ server creates the order/transaction using the synchronized standard Price
→ Paddle Checkout opens with discount-code entry enabled
→ customer enters the unique code inside Paddle
→ Paddle applies the percentage to the standard Price
→ completed transaction is verified server-side
→ code is marked redeemed and fulfillment proceeds
```

If the code is invalid, expired, archived, already redeemed, or incompatible, Paddle rejects it. Checkout remains at the standard price. The UI must tell the customer to close Checkout and return to normal checkout if they prefer the current campaign price.

## Price examples

| Standard | Campaign | VIP code | Normal customer | VIP customer |
|---:|---:|---:|---:|---:|
| $8.00 | $4.00 | 75% | $4.00 | $2.00 |
| $8.00 | $5.00 | 50% | $5.00 | $4.00 |
| $8.00 | none | 90% | $8.00 | $0.80 |

Forbidden stacked result: `$4.00 - 75% = $1.00`.

## Paddle representation

Each FlowVault VIP code maps to one Paddle standard Discount entity:

- Type: `percentage`.
- Amount: integer/decimal percentage within the approved range.
- Unique alphanumeric code, case-insensitive.
- `enabled_for_checkout: true`.
- `usage_limit: 1`.
- `recur: false`.
- No `restrict_to` in v1, because codes apply to all paid Offers.
- Optional expiration timestamp.
- FlowVault identity metadata in `custom_data`.
- Environment-specific Paddle Discount ID stored only in private data.

The Paddle API key must possess the minimum required discount read/write permissions. Sandbox and production Discount entities are independent.

## Code generation

- Codes are generated cryptographically server-side.
- Codes use an unambiguous uppercase alphanumeric alphabet and contain sufficient entropy; no sequential or guessable codes.
- Admin may optionally provide a non-secret internal label, recipient note, percentage, and expiration.
- The raw redeemable code is shown to the authorized Admin after creation and remains retrievable only through guarded Admin operations according to the final security review.
- Codes use `FVIP` followed by 12 unambiguous uppercase alphanumeric characters; ambiguous `I`, `O`, `0`, and `1` are excluded.
- Logs, audit summaries, public APIs, analytics, and browser errors must use a masked code such as `FVIP7K****R4TX`.
- Code uniqueness is enforced in both FlowVault and Paddle.

## Order and transaction contract

Before opening Checkout, the server creates an order snapshot containing:

- `pricingMode: CAMPAIGN | STANDARD | VIP_STANDARD`.
- Offer and environment.
- Standard Product/Price IDs.
- Standard amount and currency.
- Campaign amount for presentation/history where applicable.
- VIP eligibility policy revision.
- No assumption that an unknown customer-entered code is valid.

On `transaction.completed`, the verified backend retrieves/uses authoritative Paddle transaction data and validates:

1. Environment and order identity.
2. Product, standard Price ID, and quantity one.
3. Completed status.
4. A single Paddle Discount is present for VIP mode.
5. Discount custom metadata identifies a FlowVault VIP code in the same environment.
6. Percentage is within the approved range.
7. The FlowVault code record matches the Paddle Discount ID.
8. The code was active and not previously consumed by another completed order.
9. Paddle totals equal the expected standard-price discount and currency behavior.
10. Redemption is atomically claimed before entitlement activation.

Failed validation returns a non-2xx webhook response when retry may safely resolve the condition, or records a terminal security review state without granting fulfillment. It must never grant QR/ZPK access based only on a browser Checkout event.

## Concurrency and redemption

- Paddle `usage_limit: 1` is the primary external redemption control.
- FlowVault also uses a Firestore transaction to claim the code by Paddle transaction/order ID.
- Repeated delivery of the same verified webhook is idempotent.
- Two different transactions attempting the same code result in at most one fulfilled order.
- A declined or abandoned transaction does not consume the code; Paddle redemption occurs on completion.
- A refund does not automatically reactivate a code in v1. Any exceptional reissue creates a new unique code with an audit trail.

## Admin capabilities

Add a guarded **VIP Promo Codes** area that can:

- Generate one or a bounded batch of unique codes.
- Set percentage and optional expiration.
- Add an internal label/note.
- Copy a newly generated code securely.
- List masked codes and status.
- Filter by active, redeemed, expired, archived, environment, percentage, and date.
- Inspect the linked non-secret Paddle Discount ID and redemption order/transaction IDs.
- Archive an unused active code.
- Retry failed Paddle synchronization idempotently.
- Generate a replacement code through an explicit audited action; never reset a redeemed code.

Production generation requires a separate live enablement flag and explicit confirmation.

## Public UX requirements

- The buy page includes an unchecked `I have a VIP code` control.
- Selecting it explains that VIP pricing replaces the current public promotion.
- The displayed pre-checkout amount remains clearly labeled as the standard price until Paddle applies and displays the code-adjusted total.
- FlowVault must not predict or display a discounted total before Paddle validates the customer-entered code.
- Paddle-formatted totals are displayed without frontend reformatting or price math.
- Closing VIP Checkout returns the customer to the Offer without creating a second charge.

## Security

- All create/list/archive/retry operations require Firebase authentication, Admin authorization, strict schemas, rate limits, explicit environment, and audit records.
- Paddle secrets remain Firebase secrets and never enter client code, responses, logs, or compiled assets.
- Public APIs never list valid codes or expose Discount metadata sufficient for enumeration.
- Codes are bearer benefits: anyone possessing an unused code can redeem it. Admin UX must state this clearly.
- Do not identify VIP eligibility by IP, card, browser, or unverified email.
- Code redemption never bypasses existing webhook verification, entitlement, download, email, or security controls.

## Email and support

- Fulfillment email may state that a VIP benefit was applied, but should not echo the full code.
- Paddle invoice/receipt remains authoritative for tax and paid total.
- Support/Admin may see masked code, status, order, transaction, percentage, and timestamps.
- Codes must not be included in ordinary analytics payloads.

## Acceptance criteria

1. Normal checkout during a campaign charges the promotional Price.
2. VIP mode uses the standard Price before code application.
3. A valid 75% code on an $8 standard Price charges $2 even when a $4 campaign exists.
4. The forbidden $1 stacked result never occurs.
5. The code is entered and validated inside Paddle Checkout.
6. One unique code completes at most one transaction.
7. Declined/abandoned checkout leaves the code usable.
8. Reusing a redeemed code is rejected without creating entitlement.
9. Concurrent attempts fulfill at most one order.
10. Invalid, expired, archived, cross-environment, or non-FlowVault discounts never grant fulfillment.
11. Existing campaign, ordinary checkout, webhook, email, QR/ZPK, download, and recovery paths continue working.
12. Sandbox passes completely before any live Discount is created.

## Non-goals

- Shared reusable codes.
- Per-email reusable campaigns.
- Fixed-amount discounts.
- 100%-off/zero-total fulfillment.
- Campaign and VIP discount stacking.
- Customer-created codes.
- Subscription discounts.
- Automatic reactivation after refund.
