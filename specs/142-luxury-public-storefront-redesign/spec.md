# Feature Specification: Luxury Public Storefront Redesign

**Feature Branch**: `[142-luxury-public-storefront-redesign]`  
**Created**: 2026-08-06  
**Status**: Approved

## Domain

Public storefront Web/UI task. Studio, Admin, Labs, creation tools, backend interfaces, and ZPK generation are outside scope.

## Goal

Present FlowVault as a modern luxury watch maison whose products are digital timepieces, while keeping the storefront faster and clearer than a traditional luxury-watch site.

## Architectural Boundary

The redesign MAY change public presentation components and storefront-scoped visual tokens.

The redesign MUST preserve:

- public route paths and legacy redirect behavior;
- collection, design-model, SKU, offer, catalog, and device identifiers;
- catalog and hierarchy schemas;
- Firebase and static fallback calls;
- search, hashtag, sorting, filtering, and global device compatibility behavior;
- compatibility resolution and technical-package selection;
- purchase, fulfillment, download, and success flows;
- existing data attributes, analytics hooks, loading behavior, and keyboard access;
- public/private build separation.

No hardcoded replacement product catalog or parallel data source may be introduced.

## Information Architecture

The public homepage MUST present this sequence:

1. Minimal luxury navigation.
2. Single-timepiece cinematic hero.
3. Image-led collection discovery.
4. Featured-model editorial presentation.
5. FlowVault philosophy.
6. Digital craftsmanship.
7. Curated releases.
8. Reusable journal-story presentation.
9. Restrained journal/newsletter contact invitation.
10. Premium footer.

Dense browsing controls remain available below the editorial discovery sequence and on search, collection, category, and device routes.

## Navigation

Primary public navigation MUST expose:

- Collections;
- New Releases;
- Philosophy;
- Journal;
- Search.

Device compatibility remains continuously accessible as a secondary control. Mobile navigation MUST retain all discovery links and practical access to device selection and search.

## Collection Hierarchy

The visual hierarchy is:

`Design DNA -> Collection -> Design Model -> Variant / Edition`

Collections and products MUST continue to come from the existing dynamic hierarchy. Presentation-only design-DNA labels may be inferred from existing collection/model text, with a neutral fallback, and MUST NOT alter stored data.

## Homepage Requirements

- The configured featured selection remains the hero authority.
- The hero displays one watchface only, a short editorial message, one primary action, and one restrained secondary action.
- Collection discovery uses dynamic collections and available model imagery.
- Featured, release, and collection links resolve to existing routes.
- Philosophy text includes: “FlowVault does not create watchfaces. FlowVault creates digital timepieces.”
- Journal content is reusable static editorial presentation and does not introduce a CMS.
- The newsletter invitation MUST NOT claim subscription persistence without an existing backend; it may use the established business email channel.

## Cards and Browsing

- Cards emphasize imagery, model name, collection, variant count, and restrained price.
- The action language is “Discover” or “View Details”; checkout retains explicit price and purchasing language.
- Search, hashtags, device filtering, sorting, result counts, pagination, and direct links remain operational.
- Legacy catalog routes retain their current data and actions while adopting the same visual system.

## Product Detail Requirements

Design-model and legacy product pages MUST prioritize:

1. Large preview.
2. Model and selected variant identity.
3. Emotional description.
4. Visible purchase panel.
5. Design story / collection identity.
6. Main and AOD presentation.
7. Functional details and tags.
8. Compatible devices.
9. Technical specifications.
10. Related discovery where existing data supports it.

Purchase controls MUST remain visible without requiring the entire editorial story to be read first.

## Visual System

- Near-black `#050505` and deep charcoal `#0B0B0C` foundations.
- Warm off-white `#F2EFE8` primary text.
- Muted warm secondary text at approximately 55% opacity.
- Restrained gold `#B89A5A` accents.
- Fine white borders at approximately 10% opacity.
- High-contrast serif display typography and clean premium sans-serif interface typography.
- Desktop sections use a calm, image-led 80–140 px rhythm.
- Mobile preserves hierarchy without excessive empty space.
- Motion is limited to slow zoom, fade, reveal, and gentle hover transitions, with reduced-motion support.

All new visual rules MUST be scoped to the public storefront shell so private tools keep their functional interface.

## Planned Files

- `src/components/storefront/StorefrontLayout.tsx`
- `src/components/storefront/DesignModelHomePage.tsx`
- `src/components/storefront/DesignModelCard.tsx`
- `src/components/storefront/CollectionPage.tsx`
- `src/components/storefront/DesignModelPage.tsx`
- `src/components/storefront/WatchfaceCard.tsx`
- `src/components/storefront/WatchfaceGrid.tsx`
- `src/components/storefront/CategoryPage.tsx`
- `src/components/storefront/ModelPage.tsx`
- `src/components/storefront/ProductPage.tsx`
- `src/components/storefront/SearchPage.tsx`
- `src/components/storefront/SearchBar.tsx`
- `src/components/storefront/FilterSidebar.tsx`
- `src/components/storefront/SortControls.tsx`
- `src/index.css`

No context, API, backend, checkout, route-registration, Studio, Admin, or ZPK source file is planned for modification.

## Acceptance Criteria

1. The public homepage follows the approved ten-part editorial sequence.
2. Collections are the primary discovery surface and remain dynamically sourced.
3. Cards and product details expose variants, collection identity, compatibility, price, and purchase actions clearly.
4. Search, hashtag links, filters, sorting, device selection, product links, and checkout routes preserve existing behavior.
5. Desktop and mobile layouts are responsive, keyboard accessible, contrast-safe, and reduced-motion aware.
6. Public build excludes private routes and private functionality.
7. Private build still succeeds with no visual or functional regressions in internal tools.
8. Existing verification suites pass.
9. Public deployment serves the new hashed JS/CSS, catalog files remain HTTP 200, and private Pages are restored successfully.

