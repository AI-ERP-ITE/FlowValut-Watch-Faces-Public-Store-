# 08 - Risk & Rollback

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Firebase function deploy failure | Low | Medium | Functions are additive — existing functions unchanged. Rollback: `firebase deploy` of prior build. |
| Auth timing one-shot listener leaks | Low | Low | `unsub()` called inside listener after first fire. Pending ref cleared after use. |
| Large template causes Firestore 1MB doc limit | Very Low | Low | Progress snapshot is a single TemplateModel with base64-stripped elements. Should stay well under 1MB. Monitor in prod. |
| Legacy ghost entry in themes causes confusion | Low | Low | Code no longer reads it; ignored by `mergeThemeEntries` after this change |
| `library` stale closure in `persistLibraryFromAction` | Low | Medium | `library` is read from component state directly at call time (not from closure over old value). Verified: function is redefined on each render since it's not a `useCallback`. |
| Double-write race (save called twice fast) | Very Low | Low | Overwrites are idempotent. Last write wins. `updatedAt` timestamp resolves order. |

---

## Rollback Plan

### Backend rollback (if Cloud Functions cause issues)
1. `firebase functions:delete userProgressGet userProgressSet --force`
2. Frontend will fall back gracefully: `fetchParametricProgressFromFirebase()` catches all errors and falls back to localStorage. No crash.

### Frontend rollback (if build breaks)
1. Revert `app/src/ParametricPage.tsx` and `app/src/lib/studioFirebasePublishApi.ts` to previous commit
2. `npm run build` + deploy

### Firestore data
- No existing collections modified — new collection `userParametricProgress` added only
- `userParametricLibraries` and `userParametricThemes` collections untouched
- Rollback leaves orphaned `userParametricProgress` docs — harmless, can be cleaned up manually

---

## Feature Flag / Graceful Degradation

No feature flag needed. The changes degrade gracefully:

- If Cloud Functions not yet deployed: `fetchParametricProgressFromFirebase` throws → caught → localStorage fallback. User experience unchanged from before.
- If user not logged in: all Firebase calls are skipped; localStorage-only behavior preserved.
- If localStorage full: Firebase becomes the only persistence path (better than current behavior where both fail silently).
