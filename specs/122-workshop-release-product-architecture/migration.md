# Spec 122 — Migration Strategy

## Principles

1. Additive before destructive.
2. Dry-run before writes.
3. No automatic artistic grouping.
4. Preserve IDs, URLs, orders, and downloads.
5. Record every mapping and decision.

## Stage A — Inventory

1. Export current Firestore `watchfaces`, orders, tokens, downloads, and Store configuration.
2. List referenced and unreferenced Storage objects across current and historical path layouts.
3. Classify records as enabled, offline, orphan document, orphan object, ordered, or unknown.
4. Produce counts and byte totals without modifying data.

## Stage B — Mechanical backfill

For every legacy catalog entry create:

```text
Temporary Collection
└── one temporary Design Model
    └── one default SKU
        └── one Technical Package
```

The backfill does not infer that similarly named faces are colors or editions.

## Stage C — Legacy resolution

1. Write `LegacyMapping` records.
2. Resolve old `/face/:id` to the mapped Design Model and selected SKU.
3. Resolve old `/buy/:id` through a compatibility Offer.
4. Preserve `orders.productId` and the existing file resolver for historical orders.
5. Preserve old QR/download URLs until replacement and redirect behavior are verified.

## Stage D — Manual classification

Admin reviews temporary records and explicitly selects:

- Design DNA
- Collection
- Design Model
- Variant
- Edition
- Technical Variant
- Revision

Consolidation presents duplicate/conflict warnings and a preview of affected URLs, Offers, packages, and orders before applying changes.

## Stage E — Storage reconciliation

1. Match objects using Firestore paths, historical conventions, IDs, hashes, and known prefixes.
2. Label unexplained objects as orphans; do not delete them.
3. Allow an Admin to attach, trash, download, or explicitly permanently delete an orphan.
4. Correct hard-delete behavior before any cleanup campaign.

## Stage F — Cutover

1. Compare legacy and new public catalog counts and mapped visibility.
2. Verify every enabled legacy entry has a public destination.
3. Verify every order/download token still resolves.
4. Enable the new public read model behind a reversible flag.
5. Retain legacy reads until a defined observation period passes.

## Rollback

- Disable new read/release flags.
- Continue serving legacy catalog and order resolution.
- Do not delete legacy documents during initial cutover.
- Approved and released binaries remain immutable throughout rollback.

