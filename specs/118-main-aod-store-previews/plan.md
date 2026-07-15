# Implementation Plan

## Domain

Shared-core ZPK workflow, Firebase backend, and public storefront UI.

## File-by-File Plan

1. `src/StudioApp.tsx`
   - Capture Main and AOD from the existing canvas before generation changes the screen.
   - Fall back to Main when no explicit AOD exists.
   - Continue passing Main alone into the ZPK builder and success thumbnail.
2. `src/lib/studioFirebasePublishApi.ts`
   - Extend upload/result types and payload with AOD preview data/path.
3. `firebase/functions/src/index.ts`
   - Store both previews, persist both paths, serve both public assets, and expose both in catalog responses.
4. `src/context/CatalogContext.tsx`
   - Add optional `aodPreviewPath` for backward compatibility.
5. `src/components/PublishForm.tsx`
   - Include the canonical Main and AOD paths in the local published entry.
6. `src/components/storefront/ProductPage.tsx`
   - Add accessible Main/AOD thumbnail controls with Main fallback.
7. Tests
   - Add focused contract/UI source assertions or unit tests using the repository's existing test approach.

## Deployment Plan

1. Build Firebase Functions.
2. Deploy only changed Firebase endpoints with an explicit project ID.
3. Verify endpoints with `functions:list`.
4. Run `npm run deploy:full:public`; this publishes the public artifact bundle and restores/pushes the private bundle to `origin/main`.
5. Verify live public and private entrypoints, public catalog, hashes, and assets.

