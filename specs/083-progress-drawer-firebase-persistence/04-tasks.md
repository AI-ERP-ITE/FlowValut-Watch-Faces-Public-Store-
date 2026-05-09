# 04 - Tasks

## T1 — Backend: Add `userProgressGet` Cloud Function

**File:** `firebase/functions/src/index.ts`

Add after `userParametricThemesSet`:

```ts
export const userProgressGet = functions
  .region('us-central1')
  .https.onRequest(async (req, res) => {
    try {
      if (!applyCors(req, res, getPurchaseAllowedOrigin(), 'GET,OPTIONS')) return;
      if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }

      const actor = await requireAuthenticatedUser(req, res);
      if (!actor) return;
      if (!enforceRateLimit(req, res, 'userProgressGet', actor)) return;

      const ref = db.collection('userParametricProgress').doc(actor.uid);
      const snap = await ref.get();
      const data = snap.data();
      const snapshot = (data?.snapshot && typeof data.snapshot === 'object') ? data.snapshot : null;

      res.status(200).json({ ok: true, snapshot });
    } catch (err) {
      functions.logger.error('userProgressGet error', err);
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
    }
  });
```

**Acceptance:** Function exists, returns `{ ok: true, snapshot: null }` for new users, returns stored snapshot for existing users.

---

## T2 — Backend: Add `userProgressSet` Cloud Function

**File:** `firebase/functions/src/index.ts`

Add after `userProgressGet`:

```ts
export const userProgressSet = functions
  .region('us-central1')
  .https.onRequest(async (req, res) => {
    try {
      if (!applyCors(req, res, getPurchaseAllowedOrigin(), 'POST,OPTIONS')) return;
      if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

      const actor = await requireAuthenticatedUser(req, res);
      if (!actor) return;
      if (!enforceRateLimit(req, res, 'userProgressSet', actor)) return;

      const body = req.body as Record<string, unknown>;
      const snapshot = body?.snapshot;

      if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
        res.status(400).json({ error: 'Invalid snapshot: must be a non-null object' });
        return;
      }
      const s = snapshot as Record<string, unknown>;
      if (!Number.isFinite(Number(s.updatedAt))) {
        res.status(400).json({ error: 'Invalid snapshot: updatedAt must be a finite number' });
        return;
      }
      if (!s.template || typeof s.template !== 'object' || !Array.isArray((s.template as Record<string, unknown>).elements)) {
        res.status(400).json({ error: 'Invalid snapshot: template.elements must be an array' });
        return;
      }

      await db.collection('userParametricProgress').doc(actor.uid).set({
        uid: actor.uid,
        snapshot,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({ ok: true });
    } catch (err) {
      functions.logger.error('userProgressSet error', err);
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
    }
  });
```

**Acceptance:** Overwrites existing doc. Returns `400` for invalid payloads.

---

## T3 — Frontend API: Add progress helpers to `studioFirebasePublishApi.ts`

**File:** `app/src/lib/studioFirebasePublishApi.ts`

Append at end of file:

```ts
export async function fetchParametricProgressFromFirebase(): Promise<{
  updatedAt: number;
  template: Record<string, unknown>;
} | null> {
  const payload = await adminFetch<{
    ok: boolean;
    snapshot: { updatedAt: unknown; template: unknown } | null;
  }>('userProgressGet', { method: 'GET' });

  const snap = payload.snapshot;
  if (!snap || typeof snap !== 'object') return null;
  const updatedAt = Number(snap.updatedAt);
  if (!Number.isFinite(updatedAt)) return null;
  if (!snap.template || typeof snap.template !== 'object') return null;
  return { updatedAt, template: snap.template as Record<string, unknown> };
}

export async function saveParametricProgressToFirebase(input: {
  snapshot: { updatedAt: number; template: Record<string, unknown> };
}): Promise<{ ok: boolean }> {
  return adminFetch<{ ok: boolean }>('userProgressSet', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
```

**Acceptance:** Both functions compile, `fetchParametricProgressFromFirebase` returns `null` gracefully on missing/malformed snapshot.

---

## T4 — Frontend: Import new API functions in ParametricPage.tsx

**File:** `app/src/ParametricPage.tsx`

Modify the import line (line ~6):
```ts
// Before:
import { fetchParametricLibraryFromFirebase, saveParametricLibraryToFirebase, fetchParametricThemesFromFirebase, saveParametricThemesToFirebase } from '@/lib/studioFirebasePublishApi';

// After:
import { fetchParametricLibraryFromFirebase, saveParametricLibraryToFirebase, fetchParametricThemesFromFirebase, saveParametricThemesToFirebase, fetchParametricProgressFromFirebase, saveParametricProgressToFirebase } from '@/lib/studioFirebasePublishApi';
```

---

## T5 — Frontend: Add `pendingLibraryFirebaseSyncRef`

**File:** `app/src/ParametricPage.tsx`

Near the other `useRef` declarations, add:
```ts
const pendingLibraryFirebaseSyncRef = useRef<Array<LibraryEntry> | null>(null);
```

---

## T6 — Frontend: Rewrite `saveCurrentProgressSnapshot`

**File:** `app/src/ParametricPage.tsx`

Replace `saveCurrentProgressSnapshot` (currently ~lines 1562–1580) with:

```ts
const saveCurrentProgressSnapshot = () => {
  if (!workingTemplate) {
    setDrawerNotice('Save progress failed: nothing on canvas yet.');
    return;
  }

  const now = new Date();
  const savedAt = `${now.toLocaleTimeString('en-US', { hour12: false })}.${String(now.getMilliseconds()).padStart(3, '0')}`;

  const snapshotEntry: ProgressSnapshotEntry = {
    updatedAt: Date.now(),
    template: deepClone(workingTemplate),
  };
  setProgressSnapshot(snapshotEntry);
  const localSaved = saveProgressSnapshotLocal(snapshotEntry);

  if (authConfigured && getCurrentAuthUser()) {
    void saveParametricProgressToFirebase({ snapshot: snapshotEntry })
      .then(() => {
        setDrawerNotice(`Progress saved at ${savedAt}. Synced to Firebase.`);
      })
      .catch((err) => {
        const reason = err instanceof Error && err.message ? err.message : 'Firebase unavailable';
        setDrawerNotice(localSaved
          ? `Progress saved locally at ${savedAt}. Firebase sync failed: ${reason}`
          : `Progress save failed at ${savedAt}: local storage full and Firebase sync failed: ${reason}`);
      });
    setDrawerNotice(`Saving progress...`);
  } else {
    setDrawerNotice(localSaved
      ? `Progress saved locally at ${savedAt}.`
      : `Progress save failed at ${savedAt} (storage full).`);
  }
};
```

---

## T7 — Frontend: Rewrite `loadProgressSnapshot` (make async)

**File:** `app/src/ParametricPage.tsx`

Replace `loadProgressSnapshot` (currently ~lines 1582–1597) with:

```ts
const loadProgressSnapshot = () => {
  setDrawerNotice('Loading progress...');

  const applySnapshot = (snap: ProgressSnapshotEntry) => {
    const template = {
      ...deepClone(snap.template),
      elements: (snap.template.elements ?? []).map((element, index) => ensureElement(element, index)),
    } as TemplateModel;
    setWorkingTemplate(template);
    clearCommandHistory();
    saveTemplate(template);
    setSelectedElementId(template.elements[0]?.id ?? null);
    setSelectedPanelTarget(template.elements.length > 0 ? 'element' : 'layout');
    void renderPreview(template);
  };

  const fallback = () => {
    if (!progressSnapshot) {
      setDrawerNotice('No saved progress found.');
      return;
    }
    applySnapshot(progressSnapshot);
    setDrawerNotice('Progress loaded from local cache.');
  };

  if (authConfigured && getCurrentAuthUser()) {
    void fetchParametricProgressFromFirebase()
      .then((remote) => {
        if (remote && Number.isFinite(remote.updatedAt)) {
          const remoteSnap: ProgressSnapshotEntry = {
            updatedAt: remote.updatedAt,
            template: remote.template as unknown as TemplateModel,
          };
          // Use remote if it's newer than local cache
          if (!progressSnapshot || remote.updatedAt >= progressSnapshot.updatedAt) {
            setProgressSnapshot(remoteSnap);
            saveProgressSnapshotLocal(remoteSnap);
            applySnapshot(remoteSnap);
            setDrawerNotice('Progress loaded from Firebase.');
          } else {
            // Local is newer (saved offline) — apply local, then push it back to Firebase
            if (progressSnapshot) {
              applySnapshot(progressSnapshot);
              setDrawerNotice('Progress loaded (local is newer than cloud).');
              void saveParametricProgressToFirebase({ snapshot: progressSnapshot }).catch(() => {/* non-fatal */});
            }
          }
        } else {
          fallback();
        }
      })
      .catch(() => fallback());
  } else {
    fallback();
  }
};
```

**Note:** `loadProgressSnapshot` was previously a sync function called from `useStudioKeyboardShortcuts`. It must remain callable from the keyboard shortcut hook — the async work is fire-and-forget internally, so the function signature stays `() => void`.

---

## T8 — Frontend: Fix `persistLibraryFromAction` — auth race + side-effect

**File:** `app/src/ParametricPage.tsx`

Replace the entire `persistLibraryFromAction` function:

```ts
const persistLibraryFromAction = (updater: (prev: Array<LibraryEntry>) => Array<LibraryEntry>, successNotice: string) => {
  const next = updater(library).map((entry) => sanitizeLibraryEntryForPersistence(entry));
  setLibrary(next);
  const localSaved = saveLibraryLocal(next);

  const pushToFirebase = (items: Array<LibraryEntry>) => {
    return saveLibraryToFirebaseOnAction(items)
      .then(() => {
        if (authConfigured && getCurrentAuthUser()) {
          setDrawerNotice(`${successNotice} Saved to Firebase.`);
        } else {
          setDrawerNotice(localSaved ? `${successNotice} Saved locally.` : `${successNotice} Local save failed (storage full).`);
        }
      })
      .catch((error) => {
        const reason = error instanceof Error && error.message ? error.message : 'Firebase unavailable';
        setDrawerNotice(localSaved
          ? `${successNotice} Saved locally. Firebase sync failed: ${reason}`
          : `${successNotice} Save failed: local storage full and Firebase sync failed: ${reason}`);
      });
  };

  if (authConfigured && getCurrentAuthUser()) {
    void pushToFirebase(next);
  } else {
    // Auth not ready yet — show local notice now, queue Firebase write for when auth resolves
    setDrawerNotice(localSaved
      ? `${successNotice} Saved locally. Will sync to Firebase when authenticated.`
      : `${successNotice} Local save failed. Will retry Firebase when authenticated.`);
    pendingLibraryFirebaseSyncRef.current = next;
    const unsub = subscribeAuthState((user) => {
      if (user && pendingLibraryFirebaseSyncRef.current) {
        const pending = pendingLibraryFirebaseSyncRef.current;
        pendingLibraryFirebaseSyncRef.current = null;
        unsub();
        void saveLibraryToFirebaseOnAction(pending)
          .then(() => setDrawerNotice('Library synced to Firebase.'))
          .catch((err) => {
            const reason = err instanceof Error && err.message ? err.message : 'Firebase unavailable';
            setDrawerNotice(`Library Firebase sync failed: ${reason}`);
          });
      }
    });
  }
};
```

**Note:** `library` must be in scope. Since `persistLibraryFromAction` is defined inside the component body where `library` is a state variable, this is already the case.

---

## T9 — Frontend: Remove legacy progress migration block from startup useEffect

**File:** `app/src/ParametricPage.tsx`

Locate the startup `useEffect` (~line 4766). Remove this entire block:

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

Leave only:
```ts
if (storedProgressSnapshot) {
  setProgressSnapshot(storedProgressSnapshot);
}
```

---

## T10 — Deploy Cloud Functions

```bash
cd firebase/functions
npm run build
firebase deploy --only functions:userProgressGet,userProgressSet
```

Verify deployment in Firebase Console → Functions.

---

## T11 — Build & Deploy Frontend

Follow master deploy protocol:
```powershell
cd app
npm run build
# Copy dist to docs, update both index.html files
# git add, commit, push
```

---

## T12 — Smoke Test

1. Log in, go to `/studio/parametric/`
2. Add 2–3 layers
3. Click **Save Progress** → notice says "Synced to Firebase"
4. Hard refresh (Ctrl+F5)
5. Click **Load Progress** → notice says "Progress loaded from Firebase" → all 3 layers present ✅
6. Add a new element, select it, click **Save to Drawer** → notice confirms save
7. Hard refresh → open drawer → element is present ✅
8. Click **Add** on drawer element → appears on canvas ✅
9. Click **Save Theme** → theme appears in themes list
10. Reload → themes present ✅, click **Load Theme** → all elements from theme bundle added to canvas ✅
