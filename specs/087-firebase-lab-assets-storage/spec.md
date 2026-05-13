# Spec 087 — Firebase Lab Assets Storage

## 1. Goals
- All user-created lab assets persist permanently in Firestore, tied to the user's Firebase UID
- Startup sync UPSERTS (never clears) local IDB from Firestore
- Saving/deleting an asset immediately syncs to Firestore
- New "Gauge Pointers" tab in IconLab for reusable gauge pointer HTMLs
- Architecture is extensible — adding a new HTML asset category requires minimal code change

## 2. Asset Types

| Type Key | IDB Store | Firestore Sub-collection | IDB Key Field | New? |
|---|---|---|---|---|
| `icons` | `zepp-studio` / `custom-icons` | `users/{uid}/labAssets/icons` | `key` | existing |
| `hands` | `zepp-studio-hands` / `custom-hands` | `users/{uid}/labAssets/hands` | `key` | existing |
| `fonts` | `zepp-studio` / `custom-fonts` | `users/{uid}/labAssets/fonts` | `name` | existing |
| `gaugePointers` | `zepp-studio-gauge` / `custom-gauge-pointers` | `users/{uid}/labAssets/gaugePointers` | `key` | **NEW** |

Future types (no code change needed, just add to registry):
- `weatherIcons` — custom weather status SVG/HTML icons
- `backgroundOverlays` — custom HTML background textures

## 3. firestoreLabSync.ts — Public API

```typescript
// Pull all assets from Firestore → upsert into IDB (never clears)
pullLabAssetsFromFirestore(): Promise<void>

// Push a single asset record to Firestore (called on save)
pushLabAssetToFirestore(type: LabAssetType, record: LabRecord): Promise<void>

// Delete a single asset from Firestore (called on delete)
deleteLabAssetFromFirestore(type: LabAssetType, key: string): Promise<void>

// Check if Firestore sync is available (user signed in + SDK configured)
isFirestoreSyncEnabled(): boolean
```

## 4. Upsert Contract
```
For each Firestore doc in collection:
  if IDB has record with same key:
    overwrite IDB record (Firestore wins — it's the server of truth)
  else:
    insert into IDB
Never delete IDB records not present in Firestore
```

## 5. Gauge Pointer Store (NEW)
New file: `app/src/lib/customGaugePointerStore.ts`

```typescript
interface CustomGaugePointerRecord {
  key: string;          // 'custom_gauge:slug'
  name: string;
  sourceHtml: string;   // raw HTML/SVG the user typed
  dataUrl: string;      // rendered PNG data URL (for preview + use)
  pivotX: number;       // 0-1 ratio, default 0.5
  pivotY: number;       // 0-1 ratio, default 0.9
  createdAt: number;
}
```

IDB: `zepp-studio-gauge` (v1), store `custom-gauge-pointers`, keyPath `key`

## 6. IconLab Tab Changes
Add `'gaugePointers'` to `TabId`:
```typescript
type TabId = 'icons' | 'pointers' | 'gaugePointers' | 'fonts';
```
The Gauge Pointers tab UI:
- HTML/SVG editor (same as icons tab)
- Pivot X/Y sliders (0-1, default 0.5 / 0.9)
- Save → `saveCustomGaugePointer(name, html, pivotX, pivotY)`
- Saved grid showing thumbnail preview
- Click saved pointer → selects currently focused GAUGE_POINTER element's src + pivotX/pivotY

## 7. PropertyPanel Integration
When a `GAUGE_POINTER` element is selected:
- Show dropdown of saved gauge pointers from `customGaugePointerStore`
- Selecting one → sets `el.src`, `el.pivotX`, `el.pivotY` on the element

## 8. StudioApp Startup
Replace call to `pullAllLabAssetsFromCloud()` with `pullLabAssetsFromFirestore()`.
Keep `subscribeAuthState` guard (wait for auth to settle).

## 9. IconLab Save/Delete Hooks
Every `saveCustomIconStyle`, `saveCustomHandStyle`, `saveCustomFont`, `saveCustomGaugePointer`:
→ immediately call `pushLabAssetToFirestore(type, record)` (fire-and-forget with warn on fail)

Every delete:
→ call `deleteLabAssetFromFirestore(type, key)` (fire-and-forget)

## 10. Firestore Document Format
Each asset = one Firestore document with same fields as the IDB record.
For fonts: `buffer` (ArrayBuffer) serialized as base64 string → deserialized back on pull.

## 11. Firestore Security Rules Update
```
match /users/{uid}/labAssets/{assetType}/{docId} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```
Add to `firebase/firestore.rules`.

## 12. Old labCloudSync / GitHub Bridge
- `labCloudSync.ts` → keep file, but disable (isLabCloudSyncEnabled → always false after migration)
- `backendGitHubBridge.ts` → keep (still used for other non-lab endpoints)
- Cloud Function `labAssetsSync` → keep but document as deprecated

## 13. Error Handling
- Firestore push failure → warn to console, do NOT block save to IDB (IDB is primary)
- Firestore pull failure → warn to console, proceed with IDB-only (no data loss)
- Auth not available → skip Firestore sync entirely, IDB works standalone

## 14. Out of Scope
- Real-time Firestore listeners (onSnapshot) — pull-on-startup is sufficient
- Sharing assets between users
- Paid/free tier gating on lab assets
