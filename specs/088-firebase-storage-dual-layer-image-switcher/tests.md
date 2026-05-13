# Spec 088 — Test Plan

---

## PART A — Firebase Storage Migration Tests

### Unit Tests

#### T-001: `firebaseStorageClient.ts`

| Test | Expected |
|---|---|
| `sha256Hex("hello")` | returns `2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824` |
| `dataUrlToBlob("data:image/png;base64,...")` | returns Blob with `type=image/png` |
| `blobToDataUrl(blob)` | round-trips: `blobToDataUrl(dataUrlToBlob(url))` === original url |
| `uploadSourceText` when offline | throws, does not corrupt IDB |
| `downloadBlob` with invalid URL | throws (not silently returns empty) |

#### T-002: `firestoreLabSync.ts` — push/pull round-trip (icons)

| Test | Expected |
|---|---|
| Save icon → Storage contains `source.html` + `baked_WxH.png` | ✅ both paths exist |
| Save same icon again unchanged | NO new upload (hash match) |
| Edit icon source → save again | NEW hash → re-upload both files, `bakedVersion` increments |
| Pull on fresh IDB (no local) | Icon reconstructed with `dataUrl` from Storage |
| Pull with same hash locally | Skip download (IDB record unchanged) |
| Pull with old base64-only Firestore doc (legacy) | Detected as legacy → re-push migration |

#### T-003: Fonts

| Test | Expected |
|---|---|
| Upload TTF → Storage `font.bin` exists | ✅ |
| Pull font on new session | `ArrayBuffer` reconstructed, `registerCustomFonts()` called |
| Font appears in CSS `@font-face` after pull | ✅ |

#### T-004: Hands

| Test | Expected |
|---|---|
| Save hand pack → 4 source files + 5 baked PNGs in Storage | ✅ |
| Pull hand pack → all 5 `*DataUrl` fields populated | ✅ |
| `swatchDataUrl` is 24×24 thumbnail | ✅ (not 0-byte, not blank) |

#### T-005: Gauge Pointers

| Test | Expected |
|---|---|
| Save gauge pointer → `source.html` + `baked.png` in Storage | ✅ |
| Pull gauge pointer → `dataUrl` + `sourceHtml` populated | ✅ |

---

### Integration Tests

| Scenario | Expected |
|---|---|
| User not signed in — save icon | IDB-only, no Storage call, no error |
| Firebase Storage offline (emulator down) | Push silently fails (console.warn), IDB save succeeds |
| Storage upload partially fails (source OK, baked fails) | Firestore doc NOT written (atomicity: all-or-nothing upload guard) |
| 2MB font file upload | Succeeds without Firestore 1MB limit error |
| Delete icon → IDB removed, Firestore doc removed, Storage files removed | ✅ all 3 cleaned up |

---

## PART B — Image Switcher Tests

### Unit Tests

#### `imageSwitcherResolver.ts`

| Test | Expected |
|---|---|
| `buildHeartZones({ restingHR: 65, maxHR: 185 })` | Returns 5 zones with correct Karvonen boundaries |
| `resolveSlot(50, batteryDef)` | Returns slot covering 50% |
| `resolveSlot(0, batteryDef)` | Returns slot 0 (lowest) |
| `resolveSlot(100, batteryDef)` | Returns last slot |
| `resolveSlot(3, weatherDef)` | Returns slot with `code === 3` |
| `resolveSlot(99, weatherDef)` | Returns slot 0 (fallback — no code 99) |
| `validateDefinition(weatherDef)` with 28 slots | Returns error: "Weather requires exactly 29 slots" |
| `validateDefinition(weatherDef)` with duplicate codes | Returns error: "Duplicate code: 5" |
| `validateDefinition(batteryDef)` with overlapping ranges | Returns error: "Slot 1 overlaps slot 0" |
| `validateDefinition(heartDef)` with no userProfile | Returns error: "Heart policy requires userProfile" |

#### `imageSwitcherStore.ts`

| Test | Expected |
|---|---|
| `saveSwitcherDefinition(def)` then `getSwitcherDefinition(def.id)` | Round-trips correctly |
| `deleteSwitcherDefinition(id)` then `getSwitcherDefinition(id)` | Returns `null` |
| `loadSwitcherDefinitions()` on empty DB | Returns `[]` |

---

### Editor UI Tests

| Scenario | Expected |
|---|---|
| Open Switchers tab | ImageSwitcherLab renders, definitions list shows |
| Select WEATHER_CURRENT | 29 rows shown, fixed (no add/remove), code 0–28 labels |
| Select MOON | 8 rows shown, phase names shown |
| Select BATTERY | 4 default rows, editable min/max, "+ Add Slot" shown |
| Select HEART | Profile card shown, zones auto-suggested after filling profile |
| Upload PNG to slot | Preview image appears in row |
| Save without any PNG | Save blocked, "Upload at least one slot image" error |
| Save with duplicate codes (weather) | Validation error shown, save blocked |
| Edit saved definition | Form pre-populated, save updates `updatedAt` |
| Delete definition | Removed from list + IDB + cloud |

---

### PropertyPanel / Export Tests

| Scenario | Expected |
|---|---|
| IMG_LEVEL with no definition linked | Existing frame-count input shown (unchanged behavior) |
| IMG_LEVEL with definition linked | Switcher name shown, "Open in Switcher Lab" button |
| Link definition → unlink | `imageSwitcherDefinitionId` cleared, revert to frame-count |
| ZPK export with linked definition (4-slot battery) | `images[]` has 4 entries in slot order |
| ZPK export with linked definition (29-slot weather) | `images[]` has 29 entries |
| ZPK export offline (no downloadURL) | Falls back to IDB `dataUrl` per slot |
| ZPK export with unlinked IMG_LEVEL | `images[]` from existing element data (unchanged) |

---

## Storage Rules Verification

| Rule | Expected |
|---|---|
| Unauthenticated read `users/uid/labAssets/...` | DENIED |
| Authenticated read by owner | ALLOWED |
| Authenticated write by different uid | DENIED |
| Read `zpk/any-file` unauthenticated | ALLOWED (public CDN) |
| Write `zpk/anything` | DENIED |
| Read any other path | DENIED |

---

## Pre-deploy Smoke Test Checklist

- [ ] Dev server starts without TS errors after all new files
- [ ] `npm run build` (public) succeeds — no bundle errors
- [ ] `npm run build:private` succeeds
- [ ] Firebase Storage rules simulate pass in Firebase Emulator
- [ ] Sign in to private site → save one icon → Storage folder `users/{uid}/labAssets/icons/` appears in Firebase Console
- [ ] Sign in to private site → save one font → Storage folder `users/{uid}/labAssets/fonts/` appears
- [ ] Create a battery switcher with 3 slots → saved in Firestore under `users/{uid}/imageSwitchers/`
- [ ] Add IMG_LEVEL element → link switcher in PropertyPanel → switcher name shown
- [ ] Export ZPK with linked IMG_LEVEL → `images[]` has correct count
