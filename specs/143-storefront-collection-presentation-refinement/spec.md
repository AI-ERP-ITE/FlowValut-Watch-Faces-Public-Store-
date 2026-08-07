# Feature Specification: Storefront Collection Presentation Refinement

**Feature Branch**: `[143-storefront-collection-presentation-refinement]`  
**Created**: 2026-08-07  
**Status**: Approved

## Domain

Public storefront presentation only. No admin, Firebase, publication intake, catalog-record, or watchface-generation changes.

## Goal

Improve collection browsing without introducing new required metadata or altering the established store hierarchy.

## Functional Requirements

1. Collection preview frames MUST show the complete watchface artwork instead of cropping it to fill the editorial frame.
2. The premium typographic hierarchy MUST remain, but supporting copy and utility labels MUST remain comfortably readable relative to display headings on laptop and mobile layouts.
3. The category navigation MUST be built from categories already assigned to published design models.
4. Every active category MUST remain reachable; the storefront MUST NOT silently truncate the category list.
5. Known category values MUST follow a stable presentation order grouped conceptually as character, display, theme, and tier without adding fields to the catalog.
6. Unknown existing categories MUST remain visible after the controlled values so current catalog data is never hidden.
7. Collection captions MUST use actual assigned category metadata. The storefront MUST NOT invent captions by interpreting collection names, descriptions, or tags.

## Non-Goals

1. No Design DNA or genome exposure in the public read model.
2. No migration or recreation of existing watchfaces.
3. No new mandatory admin fields.
4. No change to collection, model, SKU, variant, edition, device, pricing, purchase, or download behavior.

## Acceptance Criteria

1. Circular preview artwork is fully visible in collection cards at desktop and mobile breakpoints.
2. Supporting text and navigation labels are legible without removing the intended luxury contrast.
3. All unique assigned categories are rendered once and link to their existing category route.
4. A collection caption comes from one of its models' assigned categories, or uses the neutral `FlowVault` fallback when none exists.
5. Public build completes successfully and existing storefront routes remain intact.
