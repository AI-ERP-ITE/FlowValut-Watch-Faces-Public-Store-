# Spec 088 — Tasks

**Status:** PENDING IMPLEMENTATION APPROVAL

---

## PART A — Firebase Storage Migration

### T-001 — `firebaseStorageClient.ts` (NEW)
**File:** `app/src/lib/firebaseStorageClient.ts`
**Deps:** `firebase/storage`
**Deliverables:**
- `uploadSourceText(path, content)` → `{ storagePath, downloadURL }`
- `uploadBinaryBlob(path, blob, contentType)` → `{ storagePath, downloadURL }`
- `downloadText(url)` → `string`
- `downloadBlob(url)` → `Blob`
- `deleteStorageObject(path)` → `void`
- `dataUrlToBlob(dataUrl)` → `Blob`
- `blobToDataUrl(blob)` → `Promise<string>`
- `sha256Hex(content)` → `Promise<string>` (uses `crypto.subtle.digest`)

---

### T-002 — `firestoreLabSync.ts` rewrite — icons push/pull
**File:** `app/src/lib/firestoreLabSync.ts`
**Deps:** T-001
**Change:** Replace `pushIcons` / `pullIcons` to use Storage for blobs
- Push: hash source → upload source + baked PNG → setDoc(metadata only)
- Pull: getDocs → compare sourceHash → download baked PNG → reconstruct record → upsert IDB
- Introduce `IconStorageMeta` interface internally
- Backward-compat: if `downloadURL` absent on old doc → treat as full-record doc, re-push to migrate

---

### T-003 — `firestoreLabSync.ts` rewrite — gauge pointers push/pull
**File:** `app/src/lib/firestoreLabSync.ts`
**Deps:** T-001
**Change:** Replace `pushGaugePointers` / `pullGaugePointers` to use Storage
- Push: hash sourceHtml → upload source.html + baked.png → setDoc(metadata only)
- Pull: download baked PNG → reconstruct `CustomGaugePointerRecord`

---

### T-004 — `firestoreLabSync.ts` rewrite — hands push/pull
**File:** `app/src/lib/firestoreLabSync.ts`
**Deps:** T-001
**Change:** Replace `pushHands` / `pullHands` to use Storage
- Push: 4 source HTML files + 5 baked PNGs uploaded; hash = sha256 of all 4 sources concatenated
- Pull: download 5 baked PNGs → reconstruct `CustomHandRecord`
- Note: `swatchDataUrl` = swatch baked PNG; all 5 `*DataUrl` fields reconstructed from Storage

---

### T-005 — `firestoreLabSync.ts` rewrite — fonts push/pull
**File:** `app/src/lib/firestoreLabSync.ts`
**Deps:** T-001
**Change:** Replace `pushFonts` / `pullFonts` to use Storage
- Push: upload font.bin (raw ArrayBuffer as Blob) → setDoc(metadata)
- Pull: download blob → ArrayBuffer → reconstruct `CustomFontRecord`
- Remove `serializeCustomFonts` / `deserializeCustomFonts` usage in sync layer (not needed when using Storage)

---

### T-006 — `firebase/storage.rules` update
**File:** `firebase/storage.rules`
**Deps:** none
**Change:** Add `labAssets` + `imageSwitchers` path rules per spec

---

### T-007 — Deploy Firebase Storage rules to Firebase
**Action:** `npx firebase-tools deploy --only storage` (run inside `firebase/` dir)
**Deps:** T-006
**Notes:** Requires Firebase CLI auth + project zeppfaceloader-b0b106e9

---

## PART B — Universal Image Switcher

### T-008 — `src/types/imageSwitcher.ts` (NEW)
**File:** `app/src/types/imageSwitcher.ts`
**Deps:** none
**Deliverables:** All interfaces from spec:
- `PolicyType`
- `StorageRef`
- `RangeSlot`
- `UserProfile`
- `HeartZone`
- `ImageSwitcherDefinition`
- `ResolveResult`

---

### T-009 — `src/types/index.ts` — add `imageSwitcherDefinitionId`
**File:** `app/src/types/index.ts`
**Change:** Add `imageSwitcherDefinitionId?: string` to `WatchFaceElement`

---

### T-010 — `elementDataRules.ts` — add policy map
**File:** `app/src/lib/elementDataRules.ts`
**Change:**
- Import `PolicyType` from `@/types/imageSwitcher`
- Add `IMAGE_SWITCHER_POLICY: Record<string, PolicyType>` export
- Add `IMAGE_SWITCHER_FIXED_SLOT_COUNTS: Record<string, number>` export

---

### T-011 — `imageSwitcherStore.ts` (NEW)
**File:** `app/src/lib/imageSwitcherStore.ts`
**Deps:** T-008
**IDB:** `zepp-studio-switchers` v1, store `switcher-definitions`, keyPath `id`
**Deliverables:**
- `loadSwitcherDefinitions()`
- `saveSwitcherDefinition(def)`
- `deleteSwitcherDefinition(id)`
- `getSwitcherDefinition(id)`
- `replaceAllSwitcherDefinitions(defs)`

---

### T-012 — `imageSwitcherResolver.ts` (NEW)
**File:** `app/src/lib/imageSwitcherResolver.ts`
**Deps:** T-008, T-010
**Deliverables:**
- `buildHeartZones(profile)` — Karvonen method, 5 zones
- `resolveSlot(liveValue, definition, profile?)` → `ResolveResult`
- `buildDefaultSlots(dataType, profile?)` — pre-fills sensible defaults per policy
- `validateDefinition(def)` → `string[]` — full validation per policy

**Heart zone formula (Karvonen):**
```
HRR = maxHR - restingHR
zone_min = restingHR + (HRR * zoneFactorMin)
zone_max = restingHR + (HRR * zoneFactorMax)

Zones: Resting(0–0.5), FatBurn(0.5–0.7), Cardio(0.7–0.85), Peak(0.85–0.95), Max(0.95–1.0)
```

---

### T-013 — `imageSwitcherSync.ts` (NEW)
**File:** `app/src/lib/imageSwitcherSync.ts`
**Deps:** T-001, T-008, T-011
**Deliverables:**
- `pullSwitcherDefinitions()` — Firestore getDocs → compare hashes → download baked PNGs → upsert IDB
- `pushSwitcherDefinition(def)` — upload per-slot sources+PNGs → setDoc metadata
- `deleteSwitcherFromCloud(id)` — deleteDoc + delete all Storage objects

---

### T-014 — `ImageSwitcherPreview.tsx` (NEW)
**File:** `app/src/components/ImageSwitcherPreview.tsx`
**Deps:** T-008
**Deliverables:** A scrollable horizontal strip showing each slot's baked PNG (or placeholder).
Props: `definition: ImageSwitcherDefinition | null`, `selectedSlotIndex: number`

---

### T-015 — `ImageSwitcherSlotRow.tsx` (NEW)
**File:** `app/src/components/ImageSwitcherSlotRow.tsx`
**Deps:** T-008
**Deliverables:** Single row: `slotIndex | label (editable) | min | max | upload | preview | delete`
- Weather/Moon rows: code label shown (read-only), no delete button
- Battery/others: editable min/max, delete button

---

### T-016 — `ImageSwitcherLab.tsx` (NEW)
**File:** `app/src/components/ImageSwitcherLab.tsx`
**Deps:** T-008–T-015
**Deliverables:** Full editor matching spec UI structure:
- Name input, dataType dropdown (only IMAGE_SWITCHER types)
- Policy label (auto-derived, read-only)
- UserProfile card (HEART only)
- Slot rows list
- Add slot / validate / save buttons
- Saved definitions list (edit / delete)
- Uses `imageSwitcherStore` for IDB + `imageSwitcherSync` for cloud

---

### T-017 — `IconLab.tsx` — add Switcher tab
**File:** `app/src/components/IconLab.tsx`
**Deps:** T-016
**Change:**
- Add `'switchers'` to `TabId` type
- Add "Switchers" tab button in tab bar
- Render `<ImageSwitcherLab />` when tab = 'switchers'

---

### T-018 — `PropertyPanel.tsx` — IMG_LEVEL switcher link
**File:** `app/src/components/PropertyPanel.tsx`
**Deps:** T-008, T-011
**Change:** When selected element is `IMG_LEVEL`:
- Load all switcher definitions from IDB
- Show dropdown: "Linked Switcher: [ None ▾ ]" or name of linked definition
- On change: dispatch update to `imageSwitcherDefinitionId`
- "Open in Switcher Lab" button → open IconLab drawer on Switchers tab

---

### T-019 — ZPK export — resolve switcher images
**File:** Wherever ZPK/export pipeline populates `IMG_LEVEL.images[]`
**Deps:** T-012
**Change:**
- If element has `imageSwitcherDefinitionId` set → load definition from IDB
- Use `resolveSlot` to get ordered `downloadURL` array (or `dataUrl` offline fallback)
- Populate `element.images[]` with resolved URLs in slot order
- Fallback: existing `images[]` used if no definition linked (unchanged behavior)

---

## Task dependency order

```
T-001 → T-002 → T-003 → T-004 → T-005
T-006 → T-007

T-008 → T-009
T-008 + T-010 → T-011 → T-012 → T-013
T-014 → T-015 → T-016 → T-017
T-011 → T-018
T-012 → T-019
```

## Estimated scope
- New files: 8
- Modified files: 7
- Storage rules: 1 (+ deploy)
- Total tasks: 19
