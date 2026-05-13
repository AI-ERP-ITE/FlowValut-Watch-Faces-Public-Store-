# Tasks — Spec 087: Firebase Lab Assets Storage

## Phase 1 — Safe Deploy (Bug Fixes, No New Features)
- [x] T-001: `labCloudSync.ts` — guard `replace*` calls with `items.length > 0` (BUG FIX A)
- [x] T-002: `IconLab.tsx` — pass `pivotOffsets` even in single-SVG mode (BUG FIX B)
- [ ] T-003: Deploy Phase 1 fixes → private deploy

## Phase 2 — Firestore Lab Sync (Replaces GitHub JSON)
- [ ] T-004: `firestoreLabSync.ts` — create new file with `pullLabAssetsFromFirestore`, `pushLabAssetToFirestore`, `deleteLabAssetFromFirestore`, `isFirestoreSyncEnabled`
- [ ] T-005: `firestore.rules` — add `users/{uid}/labAssets/{assetType}/{docId}` read/write rule
- [ ] T-006: `StudioApp.tsx` — replace `pullAllLabAssetsFromCloud()` with `pullLabAssetsFromFirestore()` in startup useEffect
- [ ] T-007: `IconLab.tsx` — on save of icon: call `pushLabAssetToFirestore('icons', record)` 
- [ ] T-008: `IconLab.tsx` — on save of hand/pointer: call `pushLabAssetToFirestore('hands', record)`
- [ ] T-009: `IconLab.tsx` — on save of font: call `pushLabAssetToFirestore('fonts', record)`
- [ ] T-010: `IconLab.tsx` — on delete icon/hand/font: call `deleteLabAssetFromFirestore(type, key)`
- [ ] T-011: Build + type-check passes
- [ ] T-012: Deploy Phase 2 → private deploy + verify: create icon → refresh → icon returns

## Phase 3 — Gauge Pointer Lab Tab (New Feature)
- [ ] T-013: `customGaugePointerStore.ts` — create IDB store `zepp-studio-gauge` with `custom-gauge-pointers`, CRUD functions: `loadCustomGaugePointers`, `saveCustomGaugePointer`, `deleteCustomGaugePointer`, `replaceCustomGaugePointers`
- [ ] T-014: `firestoreLabSync.ts` — extend to support `gaugePointers` type (include in pull + push + delete)
- [ ] T-015: `IconLab.tsx` — add `'gaugePointers'` tab with: HTML/SVG editor + pivotX/pivotY sliders + save button + saved-pointers grid
- [ ] T-016: `StudioApp.tsx` — load gauge pointers on startup (alongside icons/hands/fonts)
- [ ] T-017: `PropertyPanel.tsx` — add gauge pointer library dropdown when `GAUGE_POINTER` element selected (replaces blank selector with user's saved pointers)
- [ ] T-018: Build + type-check passes
- [ ] T-019: Deploy Phase 3 → private deploy + verify gauge pointer tab works

## Phase 4 — Deploy Firestore Rules
- [ ] T-020: Deploy updated `firestore.rules` via `firebase deploy --only firestore:rules`
- [ ] T-021: Verify rules in Firebase console

## Verification Checklist
- [ ] Create custom icon → refresh page → icon still shows in lab + on canvas
- [ ] Create clock hand pointer → adjust tail-tip → save → refresh → pointer renders with correct pivot
- [ ] Create gauge pointer → assign to GAUGE_POINTER element → refresh → element still has it
- [ ] Delete icon → refresh → icon is gone (not re-pulled from cloud)
- [ ] Sign out + sign back in → all assets return from Firestore
