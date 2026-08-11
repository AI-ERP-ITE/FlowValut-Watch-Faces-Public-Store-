# Storefront Delivery, Recovery, Compatibility, and Analytics

## Scope

Correct the public storefront compatibility filter, restore discovery features lost during the read-model migration, enforce the customer download policy, automate purchase recovery, expose trustworthy aggregate download counts, and disclose the policy consistently.

## Functional contract

- Selecting a device is a hard compatibility filter over CURRENT technical packages.
- A device with no compatible packages shows a named coming-soon state and no incompatible product fallback.
- Search, categories, collections, featured content, and latest releases use the same compatibility set.
- Current catalog discovery supports latest, most downloaded, price ascending/descending, free-only, paid-only, and tag search.
- Every purchased order/package pair allows two initial successful transfers.
- One regeneration is available within seven days and permits one final successful transfer.
- Direct links and QR installation share the same durable counter; the lifetime maximum is three per order/package.
- Failed streams, page refreshes, link display, and QR generation do not consume an allowance.
- Recovery uses either the protected recovery secret or immutable order ID plus exact original checkout email.
- Public download totals are derived only from completed server streams and expose no purchaser data.
- Admin analytics distinguish successful transfers, unique fulfilled orders, and repeats.

## Security and integrity

- All entitlement and analytics mutations are server-side.
- Concurrent requests reserve allowance transactionally before streaming.
- Paddle payment state and immutable order snapshots remain the authority for entitlement creation.
- Public responses contain aggregate counts only; tokens, order IDs, emails, and private credentials are excluded.
- No Paddle entity, order, transaction, customer, webhook destination, or mirrored state is deleted.

## Legal surfaces

Terms, Privacy, Refund, and Support policies disclose the mandatory original email, two-plus-one allowance, seven-day recovery period, shared QR/direct counter, failed-transfer behavior, bundle treatment, and aggregate public statistics.

## Acceptance criteria

1. Selecting Amazfit Bip 6 with no CURRENT compatible package removes all faces and displays “Coming soon for Bip 6.”
2. Clearing the device restores the catalog.
3. Search results come from the new store hierarchy and obey the selected device.
4. Most-downloaded ordering uses server totals.
5. Two initial downloads succeed; the third initial request fails.
6. One recovery succeeds; a second recovery and fourth lifetime transfer fail.
7. Bundle packages have independent allowances.
8. Interrupted transfer releases its reservation.
9. Admin and public counts update only after a completed stream.
10. Public build, Functions build/tests, and secret scan pass before staging deployment.
