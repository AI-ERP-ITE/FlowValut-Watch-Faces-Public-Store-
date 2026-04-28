# Tasks: Studio Publish Firebase Cutover

## Clarification (C)
- [x] C001 Confirm Studio artifact + metadata publish target is Firebase (not GitHub).
- [x] C002 Preserve local-download fallback on upload failure.
- [x] C003 Preserve purchase delivery contract for `zpk/{id}.zpk`.
- [x] C004 Catalog load path uses backend first with static fallback.

## Implementation (T)
- [x] T001 Add backend `studioUploadArtifacts` endpoint (admin auth + Storage write).
- [x] T002 Add backend `studioPublishWatchface` endpoint (admin auth + Firestore write).
- [x] T003 Add backend `publicCatalog` endpoint (Firestore read).
- [x] T004 Add frontend `studioFirebasePublishApi` client.
- [x] T005 Refactor Studio generate upload flow to Firebase endpoint.
- [x] T006 Refactor Publish form submit flow to Firebase endpoint.
- [x] T007 Refactor catalog provider to backend endpoint with static fallback.
- [x] T008 Remove Studio dependence on GitHub artifact publish path.

## Validation (V)
- [x] V001 Functions TypeScript build passes.
- [x] V002 App public build passes.
- [x] V003 App private build passes.
- [x] V004 Studio flow static code check confirms Firebase publish path.
