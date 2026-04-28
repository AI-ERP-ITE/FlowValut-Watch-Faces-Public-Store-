# Feature Specification: Studio Publish Firebase Cutover

**Feature Branch**: `[050-studio-publish-firebase-cutover]`  
**Created**: 2026-04-28  
**Status**: In Progress

## Objective
Replace Studio success-stage artifact + metadata publishing from GitHub-docs path to Firebase-backed path.

## Problem Statement
Current Studio generate/publish flow still writes generated ZPK/QR/preview/source and catalog metadata to GitHub repo paths. This causes upload failures to block hosted artifacts and conflicts with the intended Firebase Storage + Firestore architecture.

## Scope
1. Studio-generated artifacts (ZPK, QR, preview, source metadata) must be stored via backend into Firebase Storage.
2. Published watchface metadata must be written to Firestore (`watchfaces` collection).
3. Store catalog read path must support Firebase backend endpoint for published watchfaces.
4. Keep purchase delivery compatibility: generated ZPK must exist at `zpk/{watchfaceId}.zpk` in Storage.

## Non-Goals
1. No IAM policy redesign.
2. No storefront visual redesign.
3. No payment provider flow changes.

## Functional Requirements

### Backend
1. Add admin-authenticated endpoint to upload Studio artifacts to Firebase Storage.
2. Add admin-authenticated endpoint to publish/update watchface metadata in Firestore.
3. Add public read endpoint for catalog entries from Firestore for storefront consumption.
4. Enforce payload validation and path constraints on upload endpoint.

### Frontend Studio
1. Generate flow must upload artifacts through Firebase backend endpoint (not GitHub upload path).
2. On upload failure, keep current local-download fallback behavior.
3. Publish button must call Firebase metadata publish endpoint.

### Frontend Storefront
1. Catalog provider must fetch from Firebase catalog endpoint when backend URL is configured.
2. Preserve static-file fallback for environments without backend URL.

## Data Contracts

### Firestore `watchfaces/{id}` document
```json
{
  "id": "string",
  "name": "string",
  "specGroup": "string",
  "categories": ["string"],
  "hashtags": ["string"],
  "basePrice": 0,
  "discountPercent": 0,
  "price": 0,
  "downloads": 0,
  "zpkPath": "zpk/{id}.zpk",
  "previewPath": "preview/{id}.png",
  "qrPath": "qr/{id}.png",
  "sourcePath": "source/{id}.json",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "published": true
}
```

### Backend upload response
```json
{
  "ok": true,
  "watchfaceId": "string",
  "paths": {
    "zpkPath": "zpk/{id}.zpk",
    "previewPath": "preview/{id}.png",
    "qrPath": "qr/{id}.png",
    "sourcePath": "source/{id}.json"
  }
}
```

## Acceptance Criteria
1. Studio generate no longer calls GitHub artifact upload APIs.
2. Studio publish no longer writes `docs/catalog.json` through GitHub bridge.
3. Artifacts are uploaded to Firebase Storage server-side paths.
4. Firestore `watchfaces` document is created/updated from Publish form.
5. Storefront catalog can load entries from Firebase endpoint.
6. `npm run build:public` passes.
7. `npm run build:private` passes (with required env present).
