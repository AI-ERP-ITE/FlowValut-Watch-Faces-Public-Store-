# 01 - Plan: Progress & Drawer Firebase Persistence Fix

## Problem Statement

Three distinct bugs affect the save/load system in `ParametricPage.tsx`:

### Bug 1 — Load Progress restores stale old state
**Symptom:** Clicking "Load Progress" loads a very old design, ignoring all subsequent saves.

**Root causes (two compounding failures):**
1. `saveCurrentProgressSnapshot()` only writes to `localStorage`. Zero Firebase call. Any cache clear, incognito, or device switch loses all progress.
2. A legacy system stored progress as a special `__parametric-progress-snapshot__` entry embedded inside the Firebase themes array. `syncThemesFromFirebase()` still fetches this old ghost entry on every load. `mergeThemeEntries()` intentionally preserves it back to `localStorage`. On any cache clear the init path hits the legacy migration branch, reads the OLD ghost snapshot from localStorage themes, and calls `saveProgressSnapshotLocal(migrated)` — permanently overwriting the user's real latest snapshot with the stale legacy one.

### Bug 2 — Drawer elements disappear on refresh
**Symptom:** Saving an element to the drawer works visually, but after a hard refresh the element is gone.

**Root causes (two compounding failures):**
1. `saveLibraryToFirebaseOnAction` has guard `if (!authConfigured || !getCurrentAuthUser()) return`. Firebase Auth state resolves asynchronously. Clicking "Save to Drawer" shortly after page load silently skips Firebase (auth not yet resolved), leaving only localStorage. If localStorage is later cleared (quota, browser settings, privacy mode), items vanish.
2. `saveLibraryLocal()` is called **inside** the `setLibrary()` React updater callback — a side-effect anti-pattern. `setEditorNotice(successNotice)` is also called immediately (before the async `.then()`), so the user sees "Saved" feedback even when both saves failed silently.

### Bug 3 — No dedicated Firebase progress storage
**Symptom:** Progress is implicitly second-class; stored only in a browser-local key with no Firebase path.

---

## Goals

| Goal | Description |
|---|---|
| G1 | Progress snapshots saved to Firebase as a dedicated per-user document (overwrite semantics — no versioning) |
| G2 | Load Progress always pulls from Firebase first, falls back to localStorage cache |
| G3 | Drawer save waits for auth state before executing Firebase write (no silent skip) |
| G4 | Remove legacy progress-in-themes poisoning path |
| G5 | Surface real error feedback to the user instead of silent drops |

## Non-goals
- No versioned history or timestamps for progress (user prefers overwrite for storage efficiency)
- No structural change to themes save/load (already correct)
- No change to the drawer/theme UI layout

## Approach Summary
- Add `userProgressGet` / `userProgressSet` Firebase Cloud Functions
- Add `fetchParametricProgressFromFirebase` / `saveParametricProgressToFirebase` to `studioFirebasePublishApi.ts`
- Rewrite `saveCurrentProgressSnapshot` and `loadProgressSnapshot` in `ParametricPage.tsx`
- Fix `persistLibraryFromAction` auth-timing race
- Remove legacy migration code that re-hydrates old progress from themes

## Affected Files
| File | Change |
|---|---|
| `firebase/functions/src/index.ts` | Add 2 Cloud Functions |
| `app/src/lib/studioFirebasePublishApi.ts` | Add 2 API helpers |
| `app/src/ParametricPage.tsx` | Fix save/load logic, auth race, legacy path |

## Risk Level
Low — additive backend changes + targeted surgical fixes in frontend. No renderer or canvas changes.
