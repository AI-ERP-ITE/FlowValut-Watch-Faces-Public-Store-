# Spec 087 — Firebase Lab Assets Storage (Firestore Persistent Backup)

## Problem
Custom user-created lab assets (icons, clock-hand pointers, gauge pointers, fonts, and future HTML types)
live ONLY in browser IndexedDB. Any startup cloud pull that returns an empty manifest WIPES the local
store (bug confirmed: commit 692451c). Assets are unrecoverable once lost.

## Root Causes Identified
1. `pullAllLabAssetsFromCloud()` called `store.clear()` then wrote items — so an empty cloud → wiped IDB.
2. Assets were never pushed to cloud before the pull feature shipped (startup pull race + auth timing).
3. No durable off-device backup existed — GitHub JSON file approach never created the files.
4. The GitHub-JSON backend (via Cloud Function labAssetsSync) writes to a git file that is not tracked
   by the deploy — so it would get wiped on next `git add -A` style deploys.

## Solution — Firestore as Source of Truth
Replace the GitHub-JSON backend with **Firebase Firestore** per-user documents.

### Storage Layout
```
users/{uid}/labAssets/
  icons/          (collection) — one doc per custom icon (keyPath = key)
  hands/          (collection) — one doc per clock hand style (keyPath = key)
  gaugePointers/  (collection) — one doc per gauge pointer style (keyPath = key)  [NEW TAB]
  fonts/          (collection) — one doc per font (keyPath = name, buffer as base64)
  weatherIcons/   (collection) — future: custom weather HTML icons
  [extensible: any future HTML category gets its own sub-collection]
```

### Sync Rules
- **NEVER call `store.clear()` from any cloud pull** — always UPSERT (put individual records)
- On startup: pull Firestore → upsert into IDB (add or overwrite by key, keep local-only records)
- On save: push to Firestore immediately (not debounced — data safety first)
- On delete: remove from Firestore + IDB
- On conflict (same key, different data): Firestore timestamp wins

### New Features
1. **Gauge Pointer Library tab** in IconLab — store/manage reusable gauge pointer HTMLs
2. **Extensible asset type registry** — adding a new HTML type = adding one entry to a config map
3. **Export/import JSON** — manual backup button per asset type

## Architecture
- New lib: `app/src/lib/firestoreLabSync.ts` — replaces `labCloudSync.ts` for asset sync
- `firestoreLabSync.ts` uses Firestore SDK directly (already initialized via `firebaseAuthClient.ts`)
- Old `backendGitHubBridge.ts` + Cloud Function `labAssetsSync` endpoint stays for now (legacy, disabled)
- `StudioApp.tsx` startup useEffect: pull from Firestore after auth settles
- IconLab: push to Firestore on save/delete

## Firestore Security Rules
```
match /users/{uid}/labAssets/{assetType}/{docId} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

## Stage-Gated Flow
1. ANALYZE — confirm current IDB + labCloudSync wiring ✅ done
2. PLAN — this document ✅
3. CONFIRM — user approval
4. IMPLEMENT — firestoreLabSync.ts + IconLab gauge tab + startup pull wiring
5. BUILD — type-check + build passes
6. DEPLOY — private deploy
7. VERIFY — create icon, refresh, confirm it returns
