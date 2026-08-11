# Spec 145 — Phase 0 Sandbox Inventory

**Captured:** 2026-08-08  
**FlowVault source:** deployed `publicStoreHierarchy` read model  
**Paddle inspection:** blocked — no callable authenticated Sandbox connector and no `PADDLE_SANDBOX_API_KEY` in local configuration or Firebase Secret Manager

## Summary

| Metric | Result |
|---|---:|
| Collections | 6 |
| Product Models | 10 |
| Sellable SKUs | 22 |
| Active Offers | 22 |
| SKU Offers | 22 |
| Bundle Offers | 0 |
| Regular price | USD 8.00 |
| Campaign price | USD 4.00 |
| Existing Sandbox mappings in FlowVault | 0 |
| Existing production mappings in FlowVault | 0 |

## Classification

All 22 records are valid FlowVault synchronization candidates. Their final action is provisionally `CREATE_OR_RECONCILE`; it must not become `CREATE` until Paddle Sandbox is inspected by stable FlowVault metadata, saved mappings, Product name, and related Prices. This prevents duplicate Paddle Products if the account was populated manually before FlowVault mappings existed.

No item currently requires FlowVault hierarchy mapping review. Product spelling and capitalization are preserved exactly from the source catalog and are not silently corrected during synchronization.

## Candidate inventory

| # | Collection | Model | Variant | FlowVault Offer ID | FlowVault SKU ID | Standard | Promotion | Sandbox mapping | Provisional action |
|---:|---|---|---|---|---|---:|---:|---|---|
| 1 | Revenant | Memento Mori 01 | Gothic/Teal | `offer-dark-revenant-memento-mori-01-gothic-teal-moon-phase-comprehensive` | `dark-revenant-memento-mori-01-gothic-teal-moon-phase-comprehensive` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |
| 2 | Revenant | Memento Mori 01 | Gothic / violet | `offer-dark-revenant-memento-mori-01-gothic-violet-moon-phase-comprehensive` | `dark-revenant-memento-mori-01-gothic-violet-moon-phase-comprehensive` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |
| 3 | Legacy | Legacy 01 | Basic/Black | `offer-legacy-legacy-01-basic-black-basic` | `legacy-legacy-01-basic-black-basic` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |
| 4 | Torque | Torque 01 | Steel/Informative | `offer-performance-torque-torque-01-steel-informative-comprehensive` | `performance-torque-torque-01-steel-informative-comprehensive` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |
| 5 | Torque | Torque 02 | Steel/Informative | `offer-performance-torque-torque-02-steel-informative-comprehensive-short-cut` | `performance-torque-torque-02-steel-informative-comprehensive-short-cut` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |
| 6 | Gossamer | Nocturne 01 | Basic/Flame | `offer-swiss-luxury-gossamer-nocturne-01-basic-flame-basic` | `swiss-luxury-gossamer-nocturne-01-basic-flame-basic` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |
| 7 | Legacy | Legacy 02 | Basic/Black | `offer-swiss-luxury-legacy-legacy-02-basic-black-basic` | `swiss-luxury-legacy-legacy-02-basic-black-basic` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |
| 8 | Legacy | Legacy 03 | Basic/Black | `offer-swiss-luxury-legacy-legacy-03-basic-black-basic` | `swiss-luxury-legacy-legacy-03-basic-black-basic` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |
| 9 | Legacy | Legacy 03 | Basic/Champagne Pearl | `offer-swiss-luxury-legacy-legacy-03-basic-champagne-pearl-basic` | `swiss-luxury-legacy-legacy-03-basic-champagne-pearl-basic` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |
| 10 | Legacy | Legacy 04 | Basic/Copper | `offer-swiss-luxury-legacy-legacy-04-basic-copper-date` | `swiss-luxury-legacy-legacy-04-basic-copper-date` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |
| 11 | Legacy | Legacy 04 | Basic/Dark | `offer-swiss-luxury-legacy-legacy-04-basic-dark-date` | `swiss-luxury-legacy-legacy-04-basic-dark-date` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |
| 12 | Legacy | Legacy 04 | Basic/Dark/Silver Hands | `offer-swiss-luxury-legacy-legacy-04-basic-dark-silver-hands-date` | `swiss-luxury-legacy-legacy-04-basic-dark-silver-hands-date` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |
| 13 | Legacy | Legacy 04 | Basic/White | `offer-swiss-luxury-legacy-legacy-04-basic-white-date` | `swiss-luxury-legacy-legacy-04-basic-white-date` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |
| 14 | Monarch | Monarch 01 | Basic/Bordeaux Velvet | `offer-swiss-luxury-monarch-monarch-01-basic-bordeaux-velvet-comprehensive` | `swiss-luxury-monarch-monarch-01-basic-bordeaux-velvet-comprehensive` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |
| 15 | Monarch | Monarch 01 | Basic /Céleste Blue | `offer-swiss-luxury-monarch-monarch-01-basic-celeste-blue-comprehensive` | `swiss-luxury-monarch-monarch-01-basic-celeste-blue-comprehensive` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |
| 16 | Monarch | Monarch 01 | Basic/Champaign | `offer-swiss-luxury-monarch-monarch-01-basic-champaign-comprehensive` | `swiss-luxury-monarch-monarch-01-basic-champaign-comprehensive` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |
| 17 | Monarch | Monarch 01 | Basic/Emerald Green | `offer-swiss-luxury-monarch-monarch-01-basic-emerald-green-comprehensive` | `swiss-luxury-monarch-monarch-01-basic-emerald-green-comprehensive` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |
| 18 | Regent | Forge 01 | Graphite Blue | `offer-swiss-luxury-regent-forge-01-graphite-blue-informative` | `swiss-luxury-regent-forge-01-graphite-blue-informative` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |
| 19 | Regent | Forge 01 | Graphite Brown | `offer-swiss-luxury-regent-forge-01-graphite-brown-informative` | `swiss-luxury-regent-forge-01-graphite-brown-informative` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |
| 20 | Regent | Forge 01 | Graphite Champaign | `offer-swiss-luxury-regent-forge-01-graphite-champaign-informative` | `swiss-luxury-regent-forge-01-graphite-champaign-informative` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |
| 21 | Regent | Forge 01 | Graphite Green | `offer-swiss-luxury-regent-forge-01-graphite-green-informative` | `swiss-luxury-regent-forge-01-graphite-green-informative` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |
| 22 | Regent | Forge 01 | Graphite Grey | `offer-swiss-luxury-regent-forge-01-graphite-grey-informative` | `swiss-luxury-regent-forge-01-graphite-grey-informative` | USD 8.00 | USD 4.00 | Missing | CREATE_OR_RECONCILE |

## Required Paddle inspection

After Sandbox authentication becomes available, Phase 0 must read:

1. Active and archived Products, including Prices.
2. Product/Price `custom_data` for FlowVault Offer identity.
3. Name-based possible matches where stable metadata is absent.
4. Tax-category availability/acceptance for `digital-goods`.
5. API key permissions for product and price read/write (writes remain disabled during Phase 0).

Any ambiguous name-only match is moved to `Requires catalog mapping review`; it is never adopted or duplicated automatically.

