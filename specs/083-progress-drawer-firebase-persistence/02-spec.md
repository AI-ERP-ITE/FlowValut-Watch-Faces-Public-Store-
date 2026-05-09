# 02 - Specification: Progress & Drawer Firebase Persistence Fix

---

## Section 1 — Firebase Cloud Functions (backend)

### 1.1 `userProgressGet`

**Endpoint:** `GET /userProgressGet`  
**Auth:** required (Firebase ID token in `Authorization: Bearer` header)  
**Response:**
```json
{ "ok": true, "snapshot": { "updatedAt": 1234567890, "template": { ... } } | null }
```

**Firestore document:** `userParametricProgress/{uid}`  
**Fields read:** `snapshot` (object or null)

**On missing doc:** return `{ ok: true, snapshot: null }`

---

### 1.2 `userProgressSet`

**Endpoint:** `POST /userProgressSet`  
**Auth:** required  
**Request body:**
```json
{ "snapshot": { "updatedAt": 1234567890, "template": { ... } } }
```
**Firestore document:** `userParametricProgress/{uid}` — full overwrite (no merge), single document per user.  
**Response:** `{ "ok": true }`

**Validation:**
- `snapshot` must be a non-null object
- `snapshot.updatedAt` must be a finite number
- `snapshot.template` must be a non-null object with an `elements` array
- Reject with `400` if any validation fails
- Rate-limited under key `userProgressSet` (same rate limiter as other endpoints)

---

## Section 2 — Frontend API helpers (`studioFirebasePublishApi.ts`)

### 2.1 `fetchParametricProgressFromFirebase`

```ts
export async function fetchParametricProgressFromFirebase(): Promise<{
  updatedAt: number;
  template: Record<string, unknown>;
} | null>
```

- Calls `adminFetch<{ ok: boolean; snapshot: ... | null }>('userProgressGet', { method: 'GET' })`
- Returns `payload.snapshot ?? null`
- If the snapshot object is missing `updatedAt` or `template`, return `null`

### 2.2 `saveParametricProgressToFirebase`

```ts
export async function saveParametricProgressToFirebase(input: {
  snapshot: { updatedAt: number; template: Record<string, unknown> };
}): Promise<{ ok: boolean }>
```

- Calls `adminFetch<{ ok: boolean }>('userProgressSet', { method: 'POST', body: JSON.stringify(input) })`

---

## Section 3 — ParametricPage.tsx Changes

### 3.1 `saveCurrentProgressSnapshot` — add Firebase write

**Current behavior:** writes only to `localStorage['parametric-progress-snapshot-v1']`

**New behavior:**
1. Build `snapshotEntry` as today
2. Call `setProgressSnapshot(snapshotEntry)` — update React state
3. Call `saveProgressSnapshotLocal(snapshotEntry)` — write localStorage cache
4. Call `saveParametricProgressToFirebase({ snapshot: snapshotEntry })` (async, non-blocking)
   - On success: update drawer notice to include "Saved to Firebase."
   - On error: update drawer notice to include "Local only. Firebase sync failed: [reason]"

**Notice strings:**
- Success path: `Progress saved at ${savedAt}. Synced to Firebase.`
- Firebase-fail path: `Progress saved locally at ${savedAt}. Firebase sync failed: ${reason}`
- localStorage-full + Firebase-success: `Progress synced to Firebase (local storage full).`
- Both failed: `Progress save failed: local storage full and Firebase unavailable.`

---

### 3.2 `loadProgressSnapshot` — read from Firebase first

**Current behavior:** reads only from React state (`progressSnapshot`) which was hydrated from localStorage.

**New behavior:**
1. Set a loading notice: `Loading progress...`
2. If `authConfigured && getCurrentAuthUser()`:
   a. Call `fetchParametricProgressFromFirebase()`
   b. If result is non-null AND `result.updatedAt > (progressSnapshot?.updatedAt ?? 0)`: use remote snapshot
   c. Also update localStorage cache and React state with the fresher snapshot
   d. If result is null or fetch fails: fall back to React state `progressSnapshot`
3. If not authed: fall back to React state `progressSnapshot` (localStorage cache)
4. If no snapshot at all: show `No saved progress found.`
5. Apply the template to canvas (existing apply logic unchanged)

---

### 3.3 Remove legacy progress-in-themes migration

**Remove the following block entirely** from the startup `useEffect`:

```ts
} else if (storedThemes) {
  // Legacy migration path from old progress-in-themes storage.
  const legacyThemeSnapshot = storedThemes.find((theme) => isProgressSnapshotTheme(theme));
  if (legacyThemeSnapshot) {
    const migrated: ProgressSnapshotEntry = {
      updatedAt: Number.isFinite(Number(legacyThemeSnapshot.updatedAt))
        ? Number(legacyThemeSnapshot.updatedAt)
        : Date.now(),
      template: deepClone(legacyThemeSnapshot.template),
    };
    setProgressSnapshot(migrated);
    saveProgressSnapshotLocal(migrated);
  }
}
```

**Rationale:** This block re-hydrates a stale ghost entry from the themes array (which Firebase still returns from the old schema), permanently overwriting the user's real progress on any cache clear. Firebase progress is now stored in a dedicated document — this migration path is no longer safe to run.

---

### 3.4 Fix `persistLibraryFromAction` — auth-timing race

**Current problem:** `saveLibraryToFirebaseOnAction` has guard `if (!authConfigured || !getCurrentAuthUser()) return`. If auth state is not yet resolved at click time, Firebase save is silently skipped.

**New behavior:**
1. After building `next`, attempt `saveLibraryToFirebaseOnAction(next)` immediately as today.
2. If it returns without doing anything (user not yet authed), subscribe a **one-shot** auth state listener via `subscribeAuthState` that fires once when the user becomes authenticated, then immediately calls `saveLibraryToFirebaseOnAction(next)` and unsubscribes.
3. The one-shot listener stores the pending `next` snapshot in a `useRef<Array<LibraryEntry> | null>` called `pendingLibraryFirebaseSyncRef`.
4. On successful one-shot sync: update drawer notice to "Library synced to Firebase."

**Why useRef:** the pending value must survive re-renders without triggering them.

---

### 3.5 `persistLibraryFromAction` — move side-effect out of updater

**Current problem:** `saveLibraryLocal(next)` and notice-setting are called inside `setLibrary(updater)` — a React anti-pattern (side effects in state updaters are not safe with Strict Mode double-invocation).

**New behavior:**
1. Read `library` from state (already available as the `library` state variable).
2. Compute `next` synchronously outside the updater.
3. Call `setLibrary(next)` directly (not as updater function).
4. Call `saveLibraryLocal(next)` outside the updater.
5. Call `saveLibraryToFirebaseOnAction(next)` (with one-shot fallback per §3.4).

---

## Section 4 — Behavior Matrix

### Progress Save/Load

| Scenario | Save | Load |
|---|---|---|
| Logged in, normal | localStorage + Firebase | Firebase (fresher) → localStorage fallback |
| Logged in, Firebase fails | localStorage only + warning | localStorage |
| Not logged in | localStorage only | localStorage |
| Cache cleared, logged in | Firebase is source of truth | Firebase |
| Cache cleared, not logged in | Data lost (expected) | No snapshot message |

### Drawer Save

| Scenario | Save | On Refresh |
|---|---|---|
| Logged in, auth ready | localStorage + Firebase | ✅ present (from Firebase on sync) |
| Logged in, auth not yet ready | localStorage + queued Firebase write | ✅ present (one-shot flush when auth resolves) |
| Not logged in | localStorage only | Present until cache clear |

---

## Section 5 — Constraints

- **No breaking changes** to the `userParametricThemes` or `userParametricLibraries` Firestore collections
- **Do not** add a progress snapshot entry back to the themes collection ever
- **Do not** add progress snapshot filtering/merging in `mergeThemeEntries` — it should be a no-op after legacy entries expire naturally
- The `userParametricProgress/{uid}` document is owned entirely by the user; no admin read needed
- All new Cloud Functions follow the exact same auth + CORS + rate-limit pattern as `userParametricLibraryGet/Set`
