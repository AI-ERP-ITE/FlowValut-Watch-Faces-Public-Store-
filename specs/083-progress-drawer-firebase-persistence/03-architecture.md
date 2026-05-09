# 03 - Architecture: Progress & Drawer Firebase Persistence Fix

---

## Data Flow: Save Progress

```
User clicks "Save Progress"
  │
  ├─► setProgressSnapshot(snapshotEntry)         [React state — instant]
  ├─► saveProgressSnapshotLocal(snapshotEntry)   [localStorage — sync]
  └─► saveParametricProgressToFirebase(...)      [async, non-blocking]
        ├─► adminFetch POST /userProgressSet
        │     └─► Firestore: userParametricProgress/{uid}  ← OVERWRITE
        ├─[success]─► notice: "Saved. Synced to Firebase."
        └─[failure]─► notice: "Saved locally. Firebase sync failed: {reason}"
```

## Data Flow: Load Progress

```
User clicks "Load Progress"
  │
  ├─[if authed]─► fetchParametricProgressFromFirebase()
  │                 └─► adminFetch GET /userProgressGet
  │                       └─► Firestore: userParametricProgress/{uid}
  │                             ├─[fresher than local]─► use remote → update localStorage + React state
  │                             └─[stale or null]──────► fall back to progressSnapshot (localStorage cache)
  └─[if not authed]─► use progressSnapshot (localStorage cache)
        │
        └─► (if no snapshot at all) → notice: "No saved progress found."
        
  Applied snapshot ─► setWorkingTemplate → clearCommandHistory → saveTemplate → renderPreview
```

## Data Flow: Save to Drawer

```
User clicks "Save to Drawer" (element selected)
  │
  ├─► Compute next = [...library, newEntry]
  ├─► setLibrary(next)                            [React state — instant]
  ├─► saveLibraryLocal(next)                      [localStorage — sync, outside updater]
  └─► saveLibraryToFirebaseOnAction(next)         [async]
        ├─[auth ready]─► adminFetch POST /userParametricLibrarySet
        │                  └─► Firestore: userParametricLibraries/{uid}  ← overwrite entries
        ├─[auth NOT ready]─► pendingLibraryFirebaseSyncRef.current = next
        │                      └─► one-shot subscribeAuthState listener
        │                            └─[user signs in]─► saveLibraryToFirebaseOnAction(pending)
        │                                                  └─► notice: "Library synced to Firebase."
        └─[Firebase error]─► notice: "Saved locally. Firebase sync failed: {reason}"
```

## Data Flow: Load Drawer (on page load / sync)

```
Page mounts
  │
  ├─► loadStoredLibrary()             [localStorage]
  ├─► setLibrary(storedLibrary)
  └─► syncLibraryFromFirebase()
        ├─► fetchParametricLibraryFromFirebase()
        │     └─► GET /userParametricLibraryGet
        │           └─► Firestore: userParametricLibraries/{uid}
        ├─► mergeLibraryEntries(local, remote)   [server order authoritative]
        └─► setLibrary(merged) + write localStorage

Drawer panel ─► shows all library entries grouped by category
"Add" button ─► dispatch ADD_ELEMENT(entry.element) → canvas
```

## Data Flow: Save Theme / Load Theme

_(unchanged — already correct)_

```
Save Theme: persistThemes([...prev, nextTheme]) → saveThemesLocal + saveParametricThemesToFirebase
Load Theme: applyThemeById → setWorkingTemplate with ALL theme elements (replaces canvas)
```

---

## Firestore Schema Addition

### `userParametricProgress/{uid}`

```
{
  uid: string,
  snapshot: {
    updatedAt: number,      // Unix ms timestamp
    template: {
      elements: [...],      // full TemplateModel serialized
      layout: {...},
      ...
    }
  },
  updatedAt: Timestamp      // server timestamp (for debugging)
}
```

---

## State Shape Changes in ParametricPage.tsx

No new state variables. Additions:

| Ref | Type | Purpose |
|---|---|---|
| `pendingLibraryFirebaseSyncRef` | `useRef<Array<LibraryEntry> \| null>` | Holds library snapshot awaiting auth resolution |
| (no new state) | — | Progress snapshot already in `progressSnapshot` state |

---

## Module Dependency Graph (changes only)

```
firebase/functions/src/index.ts
  └─ +userProgressGet (new CF)
  └─ +userProgressSet (new CF)

app/src/lib/studioFirebasePublishApi.ts
  └─ +fetchParametricProgressFromFirebase
  └─ +saveParametricProgressToFirebase

app/src/ParametricPage.tsx
  ├─ imports fetchParametricProgressFromFirebase, saveParametricProgressToFirebase
  ├─ saveCurrentProgressSnapshot (modified)
  ├─ loadProgressSnapshot (modified — async)
  ├─ persistLibraryFromAction (modified — auth race + side-effect fix)
  ├─ startup useEffect (modified — remove legacy migration block)
  └─ +pendingLibraryFirebaseSyncRef (new ref)
```

---

## Error Handling Contract

| Failure | User sees | System does |
|---|---|---|
| Firebase save progress fails | Toast/notice with reason | localStorage still saved; user not blocked |
| Firebase load progress fails | Falls back to localStorage; notice if empty | No crash |
| Firebase save drawer fails (auth ready) | Notice with reason | localStorage still saved |
| Firebase save drawer (auth not ready) | "Saved locally. Will sync when authenticated." | One-shot listener queued |
| One-shot sync fires but Firebase fails | "Library sync failed: {reason}" | localStorage still has items |
