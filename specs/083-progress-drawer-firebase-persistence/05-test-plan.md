# 05 - Test Plan

## TC1 — Save Progress → Firebase

**Pre:** Logged in, have layers on canvas.
**Action:** Click "Save Progress"
**Expected:** Notice contains "Synced to Firebase" (not just "locally")
**Verify in Firebase Console:** `userParametricProgress/{uid}` document exists, `snapshot.updatedAt` is recent

---

## TC2 — Load Progress → pulls latest from Firebase (cache cleared)

**Pre:** TC1 completed. Open DevTools → Application → Clear Site Data (clears localStorage).
**Action:** Hard refresh → click "Load Progress"
**Expected:** Notice says "Progress loaded from Firebase", canvas shows the layers from TC1 ✅
**Negative check:** NOT showing an old stale design from months ago

---

## TC3 — Multiple saves → always loads latest

**Pre:** Logged in.
**Action:** Save progress with 1 layer. Add 2 more layers. Save progress again.
**Action:** Hard refresh → Load Progress
**Expected:** 3 layers present (NOT 1 from first save) ✅

---

## TC4 — Load Progress without Firebase (not logged in)

**Pre:** Log out or use private browsing. Add layers. Save Progress.
**Action:** Refresh → Load Progress
**Expected:** Layers from local save restored. Notice says "loaded from local cache" (no Firebase mention). No crash. ✅

---

## TC5 — Save to Drawer → persists after refresh

**Pre:** Logged in, element selected.
**Action:** Click "Save to Drawer"
**Expected:** Notice confirms save
**Action:** Hard refresh (Ctrl+F5)
**Expected:** Drawer opens → element visible in correct category ✅

---

## TC6 — Save to Drawer when auth not yet resolved (race condition)

**Pre:** Logged in. Open a fresh tab to the studio URL.
**Action:** Immediately (within 1–2 seconds) save an element to drawer — before Firebase auth state has resolved.
**Expected:** Notice says "Saved locally. Will sync to Firebase when authenticated."
**Action:** Wait 3 seconds. Notice or console should show "Library synced to Firebase."
**Action:** Hard refresh → drawer element present ✅

---

## TC7 — Add drawer element to canvas

**Pre:** Drawer has at least one saved element.
**Action:** Open drawer, click "Add" on a saved element.
**Expected:** Element appears on canvas. Existing layers NOT replaced. ✅

---

## TC8 — Save Theme → Load Theme adds all elements

**Pre:** Canvas has 3 distinct layers. Theme name field filled.
**Action:** Click "Save Theme"
**Expected:** Theme appears in themes list.
**Action:** Clear canvas (delete all elements). Click "Load Theme" on saved theme.
**Expected:** All 3 layers added to canvas. ✅

---

## TC9 — Theme persists after refresh

**Pre:** TC8 completed.
**Action:** Hard refresh → open Themes drawer
**Expected:** Saved theme visible in list. ✅

---

## TC10 — Legacy ghost snapshot does NOT poison new progress

**Pre:** Firebase `userParametricThemes/{uid}` may still contain an old `__parametric-progress-snapshot__` entry (legacy).
**Action:** Log in → Load Progress
**Expected:** The old legacy snapshot from themes is NOT loaded. Only the dedicated progress document or localStorage is used. ✅

---

## TC11 — Progress snapshot NOT added to themes collection

**Pre:** Save progress multiple times.
**Action:** Inspect Firebase Console → `userParametricThemes/{uid}`
**Expected:** No entries with `id === '__parametric-progress-snapshot__'` are added. The legacy one may still exist (it is never cleaned up, just ignored). ✅

---

## TC12 — Cloud Function validation rejects bad payloads

**Test:** POST to `/userProgressSet` with `{ "snapshot": null }` → expect `400`
**Test:** POST with `{ "snapshot": { "updatedAt": "bad", "template": { "elements": [] } } }` → expect `400`
**Test:** POST with missing `template.elements` → expect `400`
**Test:** Valid payload → expect `200 { ok: true }` ✅
