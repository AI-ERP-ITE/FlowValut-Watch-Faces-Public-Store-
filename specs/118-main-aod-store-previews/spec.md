# Feature Specification: Main and AOD Store Previews

**Feature Branch**: `[118-main-aod-store-previews]`  
**Created**: 2026-07-15  
**Status**: Approved

## Goal

Generate, store, publish, and display distinct Main and Always-On Display (AOD) previews while preserving the Main image everywhere that previously used the single preview.

## Functional Requirements

1. Generate a clean Main preview during ZPK generation.
2. Generate a clean AOD preview from the configured AOD editor state.
3. When no explicit AOD state exists, the AOD preview MUST duplicate the Main preview.
4. Store previews as `preview/{id}-main.png` and `preview/{id}-aod.png`.
5. Preserve `previewPath` as the Main preview contract and add `aodPreviewPath` for AOD.
6. The public product page MUST provide Main and AOD controls with thumbnails and one selected large preview.
7. Browse cards, home-page surfaces, success pages, and the watch/ZPK thumbnail MUST continue using Main only.
8. Existing catalog entries that lack `aodPreviewPath` MUST display Main for both product-page modes.
9. Republish replacement metadata MUST treat both store previews as the existing `preview` asset class.

## AOD Capture Rules

- Capture from the same `InteractiveCanvas` used for the Main preview.
- Exclude selection boxes, grid, and flicker overlays from both captures.
- Respect the configured AOD background mode and AOD element set.
- Restore the user's editor mode and overlays after capture.
- The generated ZPK thumbnail pipeline remains unchanged and receives the Main preview only.

## Backend Contract

- `studioUploadArtifacts` accepts Main and AOD preview payloads.
- Firestore watchface records expose `previewPath` and `aodPreviewPath`.
- `publicCatalog` resolves both paths through `publicAsset`.
- `publicAsset` accepts the AOD preview kind without weakening existing public asset validation.
- Admin catalog reads expose both paths.

## Acceptance Criteria

1. A face with explicit AOD renders different Main and AOD store images when its layouts differ.
2. A face without explicit AOD renders identical Main and AOD store images.
3. Product-page thumbnail controls switch the large image and expose accessible selected state.
4. Cards and home-page previews remain Main.
5. The ZPK/watch thumbnail remains Main.
6. Legacy catalog entries remain usable without migration.
7. Public, private, and Firebase Functions builds pass.

