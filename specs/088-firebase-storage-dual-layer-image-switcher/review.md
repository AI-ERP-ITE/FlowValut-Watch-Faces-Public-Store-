# Spec 088 — Review Notes

**Status:** PRE-IMPLEMENTATION REVIEW

---

## Architecture Review

### ✅ Confirmed correct decisions

1. **Dual-layer (source + baked)** — matches Figma/game-engine pattern. Source stays editable, baked PNG is deterministic and served from CDN. No regressions.

2. **Hash-gated rebake** — `sha256Hex(sourceContent) != storedSourceHash` → rebake. Prevents re-upload on every sync. Critical for performance with large hand packs (5 PNGs × N users).

3. **IDB shape unchanged** — Local records stay identical. Storage/Firestore are cloud-only. Offline-first behavior fully preserved. Users without Firebase account see no change.

4. **Backward-compat pull** — Old Firestore docs (pre-088) have `dataUrl` field set directly. Pull detects absence of `downloadURL` → treats doc as legacy format → triggers re-push to migrate silently.

5. **No parser changes** — `IMG_LEVEL.images[]` contract unchanged. Only the population source changes (from manual user upload → from resolver output).

6. **Policy is editor-layer, not runtime** — Resolver lives in TypeScript, not the parser. ZPK export bakes the resolved `images[]` → watch runtime sees a flat array as before.

---

## Risk Assessment

### 🔴 HIGH — Firebase Storage not enabled in project
**Risk:** Firebase Storage may not be enabled in `zeppfaceloader-b0b106e9` project (only Firestore was used to date).
**Mitigation:** Must enable Storage bucket in Firebase Console before deploy. Check `.env.private.local` for `storageBucket` key. `FALLBACK_FIREBASE_CONFIG` in `firebaseAuthClient.ts` does NOT include `storageBucket` — must be added.
**Action:** Add `storageBucket: 'zeppfaceloader-b0b106e9.appspot.com'` to Firebase config before T-002.

### 🟡 MEDIUM — Font pull requires ArrayBuffer reconstruction
**Risk:** Fonts stored as raw `ArrayBuffer` in IDB. Pull downloads blob → `.arrayBuffer()` → reconstructed record. Must call `registerCustomFonts()` after pull to activate CSS `@font-face`.
**Mitigation:** `pullFonts` already calls `registerCustomFonts()` today — keep that call.

### 🟡 MEDIUM — Hand swatch is a computed 24×24 thumbnail
**Risk:** `swatchDataUrl` in `CustomHandRecord` is a 24×24 preview thumbnail, not a real hand image. It was baked separately from the 4 main hands. Must be stored as `baked_swatch.png` in Storage and reconstructed on pull.
**Mitigation:** Include swatch in baked paths map. 5 baked files total for hands.

### 🟡 MEDIUM — `getDownloadURL` returns time-limited tokens on some Storage plans
**Risk:** Firebase Storage download URLs can expire or include tokens that rotate.
**Mitigation:** For ZPK export: embed asset bytes directly (download at export time, not store URL in ZPK). For preview: use IDB `dataUrl` as primary source, `downloadURL` as online refresh only.

### 🟢 LOW — `crypto.subtle.digest` requires HTTPS / localhost
**Risk:** `sha256Hex` uses Web Crypto API which requires secure context. Dev server at `localhost:5173` is fine. Production GH Pages is HTTPS. No issue.

### 🟢 LOW — Image Switcher definitions may reference deleted assets
**Risk:** User deletes a lab asset (icon) that a switcher slot references.
**Mitigation:** Slot `downloadURL` is an independent CDN URL stored in the definition — it survives the IDB deletion. Only re-upload / re-save would break it. Acceptable for v1.

---

## Design Decisions Locked

| Decision | Rationale |
|---|---|
| Source ext: `.svg` for SVG mode, `.html` for HTML mode | Correct MIME, human-readable in Storage browser |
| Baked path: `baked_{w}x{h}.png` for icons | Future multi-resolution support |
| Font stored as `font.bin` | Avoids MIME fights with `.ttf`/`.woff2`; `font/ttf` content-type set on upload |
| Heart zones: Karvonen method | Standard HR zone formula used by Garmin, Polar, etc. Profile-aware, not hardcoded |
| `slotCount` stored in definition | Avoids re-counting `ranges.length` at runtime |
| `updatedAt` on every setDoc | Enables future differential sync (only pull docs newer than last pull time) |

---

## Integration Checklist (pre-deploy)

- [ ] Firebase Storage enabled in Console for `zeppfaceloader-b0b106e9`
- [ ] `storageBucket` added to Firebase config (`firebaseAuthClient.ts`)
- [ ] `storage.rules` deployed (`firebase deploy --only storage`)
- [ ] `firestoreLabSync.ts` old `serializeCustomFonts` import removed (no longer needed in sync layer)
- [ ] `firebase/storage.rules` checked: `zpk` rule still present (existing CDN downloads)
- [ ] `IconLab.tsx` Switcher tab visible in private build (not shown on public store)
- [ ] `PropertyPanel.tsx` switcher section only shown for `IMG_LEVEL` type

---

## Out of scope for Spec 088

- Animated switcher preview (frame-by-frame playback of slots)
- AI-generated slot images (separate spec)
- Per-slot multi-resolution baking (only one bake size per slot in v1)
- Sharing switcher definitions between users
- Switcher definition import/export as JSON
