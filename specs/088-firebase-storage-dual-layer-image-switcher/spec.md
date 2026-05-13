# Spec 088 — Full Specification

## TypeScript Interfaces

### `src/types/imageSwitcher.ts` (NEW)

```typescript
// ── Policy types ──────────────────────────────────────────────────────────────

export type PolicyType =
  | 'FIXED_CODES'      // weather (29 codes), moon (8 codes) — exact integer code → slot
  | 'PERCENT_RANGES'   // battery — 0–100% ordered stops
  | 'DYNAMIC_RANGES'   // heart — profile-derived heart-rate zones
  | 'ABSOLUTE_RANGES'; // steps/AQI/UV/stress — fixed numeric min..max bands

// ── Storage references ────────────────────────────────────────────────────────

export interface StorageRef {
  storagePath: string;    // Firebase Storage path
  downloadURL: string;    // CDN download URL (cached, use for preview + ZPK)
  fileHash: string;       // SHA-256 hex of content at time of upload
  bakedVersion: number;   // increments on rebake; 0 = never baked
}

// ── Range slot ────────────────────────────────────────────────────────────────

export interface RangeSlot {
  slotIndex: number;
  label: string;

  // FIXED_CODES only
  code?: number;        // exact weather code 0–28, moon phase 0–7, etc.

  // PERCENT_RANGES / DYNAMIC_RANGES / ABSOLUTE_RANGES
  min?: number;         // inclusive lower bound
  max?: number;         // inclusive upper bound

  // Optional: user provided source HTML/SVG for this slot image
  source?: StorageRef;  // nullable — slots may be upload-only (no source)
  baked?: StorageRef;   // the baked PNG for this slot
}

// ── User profile (for DYNAMIC_RANGES / HEART) ─────────────────────────────────

export interface UserProfile {
  restingHeartRate: number;    // bpm
  maxHeartRate: number;        // bpm
  age?: number;
  fitnessTier?: 'beginner' | 'intermediate' | 'advanced';
}

// ── Heart zone (computed from UserProfile) ────────────────────────────────────

export interface HeartZone {
  zoneIndex: number;
  label: string;   // 'Resting' | 'Fat Burn' | 'Cardio' | 'Peak' | 'Max'
  min: number;
  max: number;
}

// ── Image Switcher definition (stored in IDB + Firestore) ─────────────────────

export interface ImageSwitcherDefinition {
  id: string;               // nanoid
  name: string;
  dataType: string;         // 'BATTERY' | 'HEART' | 'WEATHER_CURRENT' | etc.
  policyType: PolicyType;
  slotCount: number;        // resolved: 29 for weather, 8 for moon, user-set for others
  ranges: RangeSlot[];
  userProfile?: UserProfile;  // only present for DYNAMIC_RANGES
  createdAt: number;
  updatedAt: number;
}

// ── Resolver output ───────────────────────────────────────────────────────────

export interface ResolveResult {
  slotIndex: number;
  downloadURL: string | null;   // CDN URL from slot.baked.downloadURL (online)
  dataUrl?: string;             // IDB-cached dataUrl (offline fallback)
  slot: RangeSlot;
}
```

---

### `src/types/index.ts` — modification

Add to `WatchFaceElement`:
```typescript
/** Links this IMG_LEVEL element to a saved ImageSwitcherDefinition */
imageSwitcherDefinitionId?: string;
```

---

### `src/lib/elementDataRules.ts` — additions

```typescript
export const IMAGE_SWITCHER_POLICY: Record<string, PolicyType> = {
  WEATHER_CURRENT: 'FIXED_CODES',
  WEATHER_STATUS:  'FIXED_CODES',
  MOON:            'FIXED_CODES',
  BATTERY:         'PERCENT_RANGES',
  HEART:           'DYNAMIC_RANGES',
  STEP:            'ABSOLUTE_RANGES',
  CAL:             'ABSOLUTE_RANGES',
  DISTANCE:        'ABSOLUTE_RANGES',
  STAND:           'ABSOLUTE_RANGES',
  PAI:             'ABSOLUTE_RANGES',
  PAI_WEEKLY:      'ABSOLUTE_RANGES',
  FAT_BURN:        'ABSOLUTE_RANGES',
  STRESS:          'ABSOLUTE_RANGES',
};

export const IMAGE_SWITCHER_FIXED_SLOT_COUNTS: Record<string, number> = {
  WEATHER_CURRENT: 29,
  WEATHER_STATUS:  29,
  MOON:            8,
};
```

---

### `src/lib/firebaseStorageClient.ts` (NEW)

```typescript
/**
 * firebaseStorageClient.ts
 * Shared Firebase Storage helpers for all lab asset types and image switchers.
 * All functions are fire-and-forget safe when called from push flows.
 */

import { getApp } from 'firebase/app';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

function getStorageBucket() {
  return getStorage(getApp());
}

/** Upload a text string (SVG/HTML source) to Firebase Storage. */
export async function uploadSourceText(
  storagePath: string,
  content: string,
): Promise<{ storagePath: string; downloadURL: string }>;

/** Upload a binary blob (PNG, font bytes) to Firebase Storage. */
export async function uploadBinaryBlob(
  storagePath: string,
  blob: Blob,
  contentType: string,
): Promise<{ storagePath: string; downloadURL: string }>;

/** Download text content from a CDN URL (source HTML/SVG). */
export async function downloadText(url: string): Promise<string>;

/** Download binary blob from a CDN URL (baked PNG, font). */
export async function downloadBlob(url: string): Promise<Blob>;

/** Delete a single Storage object by path. No-op if not found. */
export async function deleteStorageObject(storagePath: string): Promise<void>;

/** Convert a data URL string to a Blob. */
export function dataUrlToBlob(dataUrl: string): Blob;

/** Convert a Blob to a data URL string. */
export async function blobToDataUrl(blob: Blob): Promise<string>;

/** Compute SHA-256 hex digest of a string or ArrayBuffer. */
export async function sha256Hex(content: string | ArrayBuffer): Promise<string>;
```

---

### `src/lib/firestoreLabSync.ts` — rewrite contract

**push flow per type:**

```typescript
// ICONS
async function pushIcon(uid: string, record: CustomIconRecord): Promise<void> {
  const sourceContent = record.sourceCode ?? '';
  const newHash = await sha256Hex(sourceContent);
  const existingMeta = await getFirestoreIconMeta(uid, record.key); // optional read

  const needsRebake = !existingMeta || existingMeta.sourceHash !== newHash;

  let sourcePath = existingMeta?.sourcePath ?? `users/${uid}/labAssets/icons/${record.key}/source.${record.sourceMode === 'svg' ? 'svg' : 'html'}`;
  let bakedPath  = existingMeta?.bakedPath  ?? `users/${uid}/labAssets/icons/${record.key}/baked_${record.width}x${record.height}.png`;
  let sourceURL  = existingMeta?.sourceURL  ?? '';
  let downloadURL = existingMeta?.downloadURL ?? '';
  let bakedVersion = existingMeta?.bakedVersion ?? 0;

  if (needsRebake) {
    const sourceBlob = new Blob([sourceContent], { type: 'text/plain' });
    ({ storagePath: sourcePath, downloadURL: sourceURL } = await uploadSourceText(sourcePath, sourceContent));
    const pngBlob = dataUrlToBlob(record.dataUrl);
    ({ storagePath: bakedPath, downloadURL } = await uploadBinaryBlob(bakedPath, pngBlob, 'image/png'));
    bakedVersion++;
  }

  await setDoc(labDocRef(uid, 'icons', record.key), {
    key: record.key, name: record.name, category: record.category,
    width: record.width, height: record.height, createdAt: record.createdAt,
    sourceMode: record.sourceMode ?? null,
    sourcePath, sourceURL, sourceHash: newHash,
    bakedPath, downloadURL, bakedVersion,
    updatedAt: Date.now(),
  });
}

// FONTS — no source/bake separation; font.bin IS the canonical asset
async function pushFont(uid: string, record: CustomFontRecord): Promise<void> {
  const newHash = await sha256Hex(record.buffer);
  const storagePath = `users/${uid}/labAssets/fonts/${record.name}/font.bin`;
  const fontBlob = new Blob([record.buffer], { type: 'font/ttf' });
  const { downloadURL } = await uploadBinaryBlob(storagePath, fontBlob, 'font/ttf');
  await setDoc(labDocRef(uid, 'fonts', record.name), {
    name: record.name, fileName: record.fileName, createdAt: record.createdAt,
    storagePath, downloadURL, fileHash: newHash, updatedAt: Date.now(),
  });
}

// HANDS — 5 baked PNGs + 4 source HTML files
// GAUGE POINTERS — 1 source HTML + 1 baked PNG
// (same pattern, paths differ)
```

**pull flow:**

```typescript
async function pullIcons(uid: string): Promise<void> {
  const snap = await getDocs(labCol(uid, 'icons'));
  const local = await loadCustomIcons();
  const localMap = new Map(local.map(r => [r.key, r]));

  for (const d of snap.docs) {
    const meta = d.data() as IconStorageMeta;
    const existing = localMap.get(meta.key);
    // Skip if local IDB has same hash
    if (existing?.sourceHash === meta.sourceHash) continue;
    // Download baked PNG
    const pngBlob = await downloadBlob(meta.downloadURL);
    const dataUrl = await blobToDataUrl(pngBlob);
    // Download source text (optional, non-blocking)
    let sourceCode: string | undefined;
    if (meta.sourceURL) {
      sourceCode = await downloadText(meta.sourceURL).catch(() => undefined);
    }
    const record: CustomIconRecord = {
      key: meta.key, name: meta.name, category: meta.category,
      dataUrl, width: meta.width, height: meta.height,
      createdAt: meta.createdAt, sourceMode: meta.sourceMode,
      sourceCode, sourceVersion: meta.bakedVersion,
    };
    localMap.set(meta.key, record);
  }
  await replaceCustomIcons([...localMap.values()]);
}
```

---

### `src/lib/imageSwitcherStore.ts` (NEW)

```typescript
// IDB: 'zepp-studio-switchers' (v1), store 'switcher-definitions', keyPath 'id'

export async function loadSwitcherDefinitions(): Promise<ImageSwitcherDefinition[]>
export async function saveSwitcherDefinition(def: ImageSwitcherDefinition): Promise<void>
export async function deleteSwitcherDefinition(id: string): Promise<void>
export async function getSwitcherDefinition(id: string): Promise<ImageSwitcherDefinition | null>
```

---

### `src/lib/imageSwitcherResolver.ts` (NEW)

```typescript
/**
 * Build heart-rate zones from a UserProfile.
 * Uses Karvonen method for DYNAMIC_RANGES.
 * Zones: Resting / Fat Burn / Cardio / Peak / Max
 */
export function buildHeartZones(profile: UserProfile): HeartZone[]

/**
 * Resolve a live numeric value to a range slot index.
 * Returns the matching RangeSlot (and its cached downloadURL / dataUrl).
 */
export function resolveSlot(
  liveValue: number,
  definition: ImageSwitcherDefinition,
  profile?: UserProfile,
): ResolveResult

/**
 * Build default range slots for a given dataType + policy.
 * Used when user creates a new definition to pre-fill sensible defaults.
 */
export function buildDefaultSlots(dataType: string, profile?: UserProfile): RangeSlot[]

/**
 * Validate a definition before save.
 * Returns array of error strings (empty = valid).
 */
export function validateDefinition(def: ImageSwitcherDefinition): string[]
```

**Validation rules:**
- `FIXED_CODES` (WEATHER): exactly 29 slots, codes 0–28 all present, no duplicates
- `FIXED_CODES` (MOON): exactly 8 slots, codes 0–7
- `PERCENT_RANGES`: ≥2 slots, all min/max 0–100, ordered ascending, non-overlapping
- `DYNAMIC_RANGES`: ≥2 slots (auto-built from profile), userProfile required
- `ABSOLUTE_RANGES`: ≥2 slots, ordered ascending, non-overlapping, max of last slot ≥ min of first

---

### `src/lib/imageSwitcherSync.ts` (NEW)

```typescript
/**
 * Pull all switcher definitions from Firestore and upsert IDB.
 * Downloads baked slot PNGs from Storage.
 */
export async function pullSwitcherDefinitions(): Promise<void>

/**
 * Push a single switcher definition to Firestore + Storage.
 * Uploads per-slot baked PNGs if they have changed.
 */
export async function pushSwitcherDefinition(def: ImageSwitcherDefinition): Promise<void>

/**
 * Delete a switcher definition from Firestore + Storage (all slot files).
 */
export async function deleteSwitcherFromCloud(id: string): Promise<void>
```

---

### Editor UI structure — `ImageSwitcherLab.tsx` (NEW)

```
┌───────────────────────────────────────────────────────────────────────┐
│ CREATE / EDIT IMAGE SWITCHER                                          │
│                                                                       │
│  Name:  [ _______________________ ]                                   │
│  Data:  [ BATTERY ▾ ]    Policy: PERCENT_RANGES (auto-derived)        │
│                                                                       │
│  ──── HEART only ─────────────────────────────────────────────────   │
│  │ Resting HR: [ 65 ] bpm    Max HR: [ 185 ] bpm                   │  │
│  │ Age: [ 32 ]   Tier: [ intermediate ▾ ]                          │  │
│  │ [ Auto-suggest zones ]                                           │  │
│  ────────────────────────────────────────────────────────────────   │
│                                                                       │
│  ┌──┬──────────────┬───────┬───────┬───────────────┬──┐             │
│  │# │ Label        │ Min   │ Max   │ Image         │✕ │             │
│  │0 │ Critical     │  0%   │  25%  │ [Upload] [▢]  │✕ │             │
│  │1 │ Low          │  26%  │  50%  │ [Upload] [▢]  │✕ │             │
│  │2 │ Medium       │  51%  │  75%  │ [Upload] [▢]  │✕ │             │
│  │3 │ Full         │  76%  │ 100%  │ [Upload] [▢]  │✕ │             │
│  └──┴──────────────┴───────┴───────┴───────────────┴──┘             │
│                                                                       │
│  Weather/Moon: rows fixed, code shown, no add/remove                 │
│  Others: [ + Add Slot ]                                              │
│                                                                       │
│  [ Validate ]   [ Save Switcher ]                                    │
│                                                                       │
│  ── Saved definitions ──────────────────────────────────────────     │
│  │ Battery Pack v1   BATTERY/PERCENT  4 slots  [Edit] [Delete]   │   │
│  │ Weather Neon      WEATHER/FIXED    29 slots [Edit] [Delete]   │   │
└───────────────────────────────────────────────────────────────────────┘
```

---

### `PropertyPanel.tsx` — IMG_LEVEL addition

When selected element is `IMG_LEVEL`:
```
──── Image Switcher ─────────────────────────────
  Linked: [ Battery Pack v1 (4 slots) ▾ ]
          [ None ▾ ]
  [ Open in Switcher Lab ]
──────────────────────────────────────────────────
```
If no definition linked: existing frame-count input shown as fallback.

---

### Firebase Storage Rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // ZPK downloads — public read, no write
    match /zpk/{file} {
      allow read: if true;
      allow write: if false;
    }

    // Lab assets — owner only
    match /users/{uid}/labAssets/{type}/{key}/{file} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // Image switcher slot assets — owner only
    match /users/{uid}/imageSwitchers/{definitionId}/{rest=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // Deny everything else
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

### Firestore Metadata Schemas

#### icons/{key}
```typescript
interface IconStorageMeta {
  key: string;
  name: string;
  category: string;
  width: number;
  height: number;
  createdAt: number;
  updatedAt: number;
  sourceMode: 'svg' | 'html' | null;
  sourcePath: string;
  sourceURL: string;
  sourceHash: string;
  bakedPath: string;
  downloadURL: string;   // baked PNG CDN URL
  bakedVersion: number;
}
```

#### hands/{key}
```typescript
interface HandStorageMeta {
  key: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  handRenderVersion: number;
  pivotOffsets?: { hour: {x,y}; minute: {x,y}; second: {x,y}; };
  sourcePaths: { hour: string; minute: string; second: string; hub: string; };
  sourceURLs:  { hour: string; minute: string; second: string; hub: string; };
  sourceHash: string;    // sha256 of all 4 sources concatenated
  bakedPaths:  { hour: string; minute: string; second: string; cover: string; swatch: string; };
  downloadURLs:{ hour: string; minute: string; second: string; cover: string; swatch: string; };
  bakedVersion: number;
}
```

#### fonts/{name}
```typescript
interface FontStorageMeta {
  name: string;
  fileName: string;
  createdAt: number;
  updatedAt: number;
  storagePath: string;
  downloadURL: string;
  fileHash: string;
}
```

#### gaugePointers/{key}
```typescript
interface GaugePointerStorageMeta {
  key: string;
  name: string;
  pivotX: number;
  pivotY: number;
  createdAt: number;
  updatedAt: number;
  sourcePath: string;
  sourceURL: string;
  sourceHash: string;
  bakedPath: string;
  downloadURL: string;
  bakedVersion: number;
}
```

#### imageSwitchers/{definitionId}
```typescript
interface SwitcherFirestoreMeta {
  id: string;
  name: string;
  dataType: string;
  policyType: PolicyType;
  slotCount: number;
  userProfile?: UserProfile;
  ranges: Array<{
    slotIndex: number;
    label: string;
    code?: number;
    min?: number;
    max?: number;
    sourcePath?: string;
    sourceURL?: string;
    sourceHash?: string;
    bakedPath?: string;
    downloadURL?: string;
    bakedVersion?: number;
  }>;
  createdAt: number;
  updatedAt: number;
}
```
