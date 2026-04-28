# Plan: Studio Publish Firebase Cutover

## Clarification Steps (4)
1. Clarification 1: Studio artifacts and publish metadata move to Firebase backend endpoints; no GitHub writes in this flow.
2. Clarification 2: Keep local ZPK fallback UX when backend upload fails.
3. Clarification 3: Preserve existing purchase delivery contract (`zpk/{id}.zpk` in Storage).
4. Clarification 4: Storefront catalog supports Firebase endpoint first with static-file fallback.

## Implementation Steps
1. Add Firebase Functions endpoint `studioUploadArtifacts` (admin auth, Storage write).
2. Add Firebase Functions endpoint `studioPublishWatchface` (admin auth, Firestore write).
3. Add Firebase Functions endpoint `publicCatalog` (public read from Firestore watchfaces).
4. Add frontend API client `studioFirebasePublishApi.ts` for these endpoints.
5. Refactor Studio generate flow to call Firebase artifact upload endpoint.
6. Refactor Publish form flow to call Firebase metadata publish endpoint.
7. Refactor Catalog provider to read backend `publicCatalog` endpoint with fallback to static JSON.
8. Remove Studio dependence on GitHub upload path for success-stage artifact hosting.

## Validation Steps (4)
1. Validation 1: Functions TypeScript build passes.
2. Validation 2: App TypeScript/Vite public build passes.
3. Validation 3: App private build passes with env preflight.
4. Validation 4: Static code check confirms Studio success/publish paths use Firebase APIs instead of GitHub upload/catalog write.
