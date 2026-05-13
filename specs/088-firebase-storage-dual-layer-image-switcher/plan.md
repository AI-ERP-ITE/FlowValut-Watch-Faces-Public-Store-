# Spec 088 — Firebase Storage Dual-Layer + Universal Image Switcher
## Plan

**Date:** 2026-05-13
**Status:** APPROVED FOR SPEC / PENDING IMPLEMENTATION

---

## Objective

Two coupled deliverables:

### Part A — Firebase Storage Migration
Replace base64-in-Firestore with a proper two-layer asset pipeline:
- **Source asset** (SVG/HTML) → Firebase Storage (permanent, editable)
- **Baked PNG** → Firebase Storage (runtime cache, rebaked only on source hash change)
- **Metadata only** → Firestore doc (no blobs, lightweight)
- **Full record** → IndexedDB (local cache, reconstructed from Storage on pull)

Covers all 4 existing lab asset types: icons, hands, fonts, gauge pointers.

### Part B — Universal Image Switcher
Build a complete policy-based Image Switcher system inside IconLab as a new "Switcher" tab.
One engine with 4 policy types (FIXED_CODES, PERCENT_RANGES, DYNAMIC_RANGES, ABSOLUTE_RANGES).
Attached to `IMG_LEVEL` elements via `imageSwitcherDefinitionId`. Assets stored using Part A's
dual-layer pipeline.

---

## Why

### Part A
- Firestore 1MB document limit → fonts and hand packs can silently fail to sync
- Base64 inside Firestore wastes read/write quota (charged per byte read)
- No CDN delivery of assets → every pull re-downloads full base64 from Firestore
- Source code lost if only PNG is stored → no clean re-editing possible

### Part B
- No editor exists for `IMG_LEVEL` asset sets — user must manually assemble 29 weather images etc.
- No policy engine → no smart resolution of which image to show for a given value
- Weather (fixed codes), battery (percent stops), heart (profile zones), AQI/steps (numeric bands)
  all need fundamentally different behavior — currently undifferentiated

---

## Non-goals

- No changes to ZPK export pipeline — `images[]` on `IMG_LEVEL` is still the final output
- No parser changes — existing HTML parser rules unchanged
- No new data types added to `elementDataRules.ts` — only policy map added
- No changes to IDB schema (records stay same shape; Storage/Firestore are cloud-only layer)
- No realtime live-value playback — resolver is for export/preview only (not animated watch sim)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  SAVE FLOW (push)                                                   │
│                                                                     │
│  User clicks Save in Lab                                            │
│         │                                                           │
│         ▼                                                           │
│  1. sha256(sourceContent)  ──► compare with stored sourceHash       │
│         │                                                           │
│         ▼                                                           │
│  2. uploadBytes(sourcePath, sourceBlob)  → Firebase Storage        │
│         │                                                           │
│         ▼                                                           │
│  3. bakeOnce: source → canvas → PNG blob                            │
│         │                                                           │
│         ▼                                                           │
│  4. uploadBytes(bakedPath, pngBlob)  → Firebase Storage             │
│         │                                                           │
│         ▼                                                           │
│  5. getDownloadURL(sourcePath) + getDownloadURL(bakedPath)          │
│         │                                                           │
│         ▼                                                           │
│  6. setDoc(metadata only)  → Firestore                             │
│         │                                                           │
│         ▼                                                           │
│  7. upsert full record (with dataUrl from step 3) → IDB            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  PULL FLOW (on app load / auth change)                              │
│                                                                     │
│  getDocs(labCol(uid, type))  ← Firestore (metadata only)            │
│         │                                                           │
│         ▼                                                           │
│  for each doc:                                                      │
│    check local IDB sourceHash == doc.sourceHash ?                   │
│      YES → skip download, IDB already current                       │
│      NO  → fetch baked PNG from downloadURL → Blob → dataUrl        │
│          → fetch source text from sourceURL                         │
│          → reconstruct full record                                  │
│          → upsert IDB                                               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  REBAKE TRIGGER                                                     │
│                                                                     │
│  sha256(newSource) != storedSourceHash  → full rebake + re-upload   │
│  bakedVersion absent                   → full bake + upload         │
│  user clicks "Regenerate PNG"          → forced rebake              │
│  otherwise                             → metadata-only setDoc       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  IMAGE SWITCHER — POLICY FLOW                                       │
│                                                                     │
│  User creates definition in ImageSwitcherLab                        │
│    ├── picks dataType (BATTERY, HEART, WEATHER_CURRENT, ...)        │
│    ├── policy auto-selected                                         │
│    ├── fills range slots (codes/min/max) + uploads PNG per slot     │
│    └── Save → Storage (per-slot PNG) + Firestore (definition doc)   │
│                                                                     │
│  User links definition to IMG_LEVEL element in PropertyPanel        │
│    └── element.imageSwitcherDefinitionId = definition.id            │
│                                                                     │
│  At export time (ZPK builder):                                      │
│    resolver.resolve(element, definition) → ordered downloadURL[]    │
│    → populate element.images[] → existing ZPK pipeline unchanged    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Storage Path Layout

```
users/{uid}/
  labAssets/
    icons/{key}/
      source.svg          ← or source.html
      baked_96x96.png
    hands/{key}/
      source_hour.html
      source_minute.html
      source_second.html
      source_hub.html
      baked_hour.png
      baked_minute.png
      baked_second.png
      baked_cover.png
      baked_swatch.png
    fonts/{name}/
      font.bin            ← raw ttf/woff2 bytes
    gaugePointers/{key}/
      source.html
      baked.png
  imageSwitchers/{definitionId}/
    slots/{slotIndex}/
      source.html         ← if user provided HTML/SVG source for slot
      baked.png           ← baked slot image
```

---

## Module Dependency Order

```
firebaseStorageClient.ts        (no deps)
    ↓
firestoreLabSync.ts             (uses firebaseStorageClient)
imageSwitcherStore.ts           (IDB, no firebase deps)
    ↓
imageSwitcherSync.ts            (uses firebaseStorageClient + imageSwitcherStore)
    ↓
imageSwitcherResolver.ts        (pure logic, no firebase deps)
    ↓
ImageSwitcherSlotRow.tsx        (UI primitive)
ImageSwitcherPreview.tsx        (UI primitive)
    ↓
ImageSwitcherLab.tsx            (uses all image switcher modules)
    ↓
IconLab.tsx                     (adds Switcher tab)
PropertyPanel.tsx               (adds switcher link for IMG_LEVEL)
```

---

## Key Invariants

1. IDB records stay same shape as today — no migration needed
2. If user is not signed in, all storage operations silently skip — IDB-only mode unchanged
3. Rebake only when sourceHash changes — never on every read/select
4. ZPK export uses `downloadURL` from slot metadata OR falls back to IDB `dataUrl`
5. No parser changes — `IMG_LEVEL.images[]` is still the contract
6. Firestore documents contain ZERO base64 strings after migration
7. Pull is additive (local-only assets preserved) — same contract as today
