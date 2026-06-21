# Spec 096 — adminPatchSpecGroups Fix

## Problem

Three bugs in `adminPatchSpecGroups` cloud function:

### Bug 1 — Skip logic wrong (line 1394)
```ts
const currentKnown = currentSpec !== 'unknown' && (validSpecGroups.size === 0 || validSpecGroups.has(currentSpec));
if (currentKnown) continue;
```
If doc has stale key like `round-v3-a` or `480-round-v2` (now renamed), it's non-'unknown' so it gets skipped. Never repaired.

**Fix:** Skip ONLY if currentSpec is in validSpecGroups. If it's non-empty but NOT in validSpecGroups → treat as stale, proceed to repair.

### Bug 2 — Source specGroup stale, no fallback (line 1413)
```ts
const inferred = typeof source.specGroup === 'string' ? source.specGroup.trim() : '';
if (!inferred) continue;
```
Source JSON still has old key (e.g. `480-round-v2`). Patch writes old key back → still wrong.

**Fix:** After reading `source.specGroup`, run it through a migration map (old → new). If still not in validSpecGroups after migration → try `source.watchModel` lookup via models map passed in request body.

### Bug 3 — SourceMetadata missing watchModel field
`SourceMetadata` interface only has `specGroup`. Can't read `watchModel` from source JSON.

**Fix:** Add `watchModel?: string` to `SourceMetadata`.

## Migration Map (old key → new key)
```
round-v3-a        → 466-round  (was incorrectly a catch-all for v3 rounds)
480-round-v2-b    → 466-round  (Active 3 Premium was misclassified)
square-v3-a       → 390x450-square
480-round-v2      → 480-round
480-round-v3      → 480-round
466-round-v3      → 466-round
454-round-v2      → 454-round
454-round-v3      → 454-round
416-round-v2      → 416-round
416-round-v3      → 416-round
390x450-square-v3 → 390x450-square
360-round-v3      → 360-round
320x380-square-v2 → 320x380-square
320x380-square-v3 → 320x380-square
```

## Fix Logic (new flow)

```
for each doc:
  currentSpec = doc.specGroup or 'unknown'
  if validSpecGroups has currentSpec → skip (already correct)
  else → proceed to repair:
    load source JSON
    inferred = source.specGroup
    inferred = MIGRATION_MAP[inferred] ?? inferred   ← apply migration
    if inferred not in validSpecGroups:
      try watchModel → models map lookup             ← new fallback
    if still empty or not valid → skip
    write new specGroup to doc
```
