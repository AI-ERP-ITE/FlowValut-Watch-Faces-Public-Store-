# Feature Specification: Admin + Preview Adjustment Suite

**Feature Branch**: `[051-admin-preview-adjustments]`  
**Created**: 2026-04-28  
**Status**: Draft

## Objective
Deliver a unified admin/store lifecycle and preview-adjustment expansion covering background transforms, editable store lifecycle states, broader custom-HTML rendering, engrave UX parity, shadow parity, and AOD anti-flicker controls.

## Product Decisions (Locked)
1. Store delete is **soft delete** by default: keep watchface document + assets in database/storage and mark store status as `OFFLINE`.
2. Admin can re-enable any `OFFLINE` item by setting status back to `ENABLED`.
3. Hard-delete (document/storage removal) is out of scope for this feature and remains manual/maintenance-only.
4. “Edit existing ZPK” flow supports two publish modes:
   - keep existing QR code and replace ZPK/source/preview only
   - regenerate all assets including QR

## Scope
1. Admin backend/library view for watchface lifecycle operations.
2. Background rotation + flips for Main and AOD backgrounds.
3. Store soft delete/restore lifecycle controls.
4. Select existing watchface (enabled or offline), edit design, republish options.
5. Custom HTML rendering support expansion for element-specific creators.
6. Hue editing controls parity for image-like/editable elements.
7. Engrave frame render/editor parity fix (tabs + controls availability).
8. Pointer shadow and element drop-shadow parity in preview/export.
9. AOD background anti-flicker controls parity across all AOD background modes.

## Functional Requirements

### FR-1 Admin Catalog Lifecycle
1. Admin console MUST list all catalog records (enabled + offline).
2. Each record MUST expose current store status and actions: `Set Offline`, `Set Enabled`.
3. Public catalog endpoint MUST continue to return only enabled/published records.
4. Catalog records MUST preserve metadata and asset paths while offline.

### FR-2 Background Rotation/Flip Controls
1. Main background editor MUST support:
   - free rotation slider (continuous range)
   - numeric angle input
   - quick rotations (90/180/270)
   - horizontal flip
   - vertical flip
2. AOD background editor MUST provide the same transform controls.
3. Transform state MUST persist in watchface config and survive reload.
4. Preview MUST reflect transforms exactly for both Main and AOD modes.

### FR-3 Edit Existing Published/Offline Watchface
1. Admin MUST be able to choose any existing watchface ID and load source for editing.
2. Republish MUST support mode toggle:
   - Keep QR, replace ZPK/source/preview
   - Regenerate all assets (including QR)
3. Publish response MUST report which assets were replaced.

### FR-4 Custom HTML Rendering Expansion
1. Static image (`IMG`) creator path MUST accept and render custom HTML/SVG input.
2. Weather status-set paths (`IMG_LEVEL` weather types) MUST accept custom HTML frames.
3. Weather current icons MUST accept custom HTML frames.
4. Gauge pointer (`GAUGE_POINTER`) MUST support custom HTML/SVG creator path.

### FR-5 Hue Controls Parity
1. Hue control MUST be available for all editable image-like elements where effects pipeline supports it.
2. Preview and exported assets MUST stay consistent with hue transforms.

### FR-6 Engrave UX/Render Fix
1. Engrave frame elements MUST always show editable controls (no empty panel).
2. If engrave needs special controls, panel MUST map them to existing tabs or dedicated tab mapping.
3. Render result MUST stay parity-safe in preview and export.

### FR-7 Shadow Parity
1. Pointer shadow behavior and element drop shadow behavior MUST use unified normalization where possible.
2. Canvas preview and baked export MUST remain visually aligned.

### FR-8 AOD Flicker Control Parity
1. “Erase Flickery Shadows” option and flicker-risk indicators MUST be available for AOD background editing.
2. This MUST work for all AOD background modes:
   - `USE_MAIN_BACKGROUND`
   - `UPLOAD_AOD_BACKGROUND`
   - `SOLID_COLOR`
   - `NONE_BLACK`

## Non-Goals
1. Hard-delete storage garbage-collection workflow.
2. Payment flow/provider changes.
3. Public storefront redesign.

## Acceptance Criteria
1. Admin can soft-delete/restore entries and status persists in Firestore.
2. Public catalog excludes offline entries while admin list includes all.
3. Main + AOD backgrounds support rotate/flip controls with persisted state.
4. Existing watchface can be edited/republished with QR retention option.
5. Custom HTML creators render in all specified element categories.
6. Engrave controls always appear and are editable.
7. Pointer and generic shadow behavior is parity-aligned in preview/export.
8. AOD flicker controls and warnings apply across all AOD background modes.
