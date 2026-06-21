# Spec 097 — Firebase Storage as Single Source of Truth for Config Files

## Goal

Move `models.json` and `specGroups.json` from GitHub static files to Firebase Storage.
GitHub copies become backup/cache only — clearly marked.

## Architecture

```
Firebase Storage: config/models.json       ← CANONICAL (live source)
Firebase Storage: config/specGroups.json   ← CANONICAL (live source)

app/models.json                            ← BACKUP ONLY (do not use directly)
app/specGroups.json                        ← BACKUP ONLY (do not use directly)
app/docs/models.json                       ← BACKUP ONLY
app/docs/specGroups.json                   ← BACKUP ONLY
```

## Storage Rules

Add public read for `config/` path in `storage.rules`.

## Cloud Function Changes

### New: `publicConfig` function
- GET `?file=models` or `?file=specGroups`
- Reads from Storage `config/models.json` / `config/specGroups.json`
- Returns JSON with CORS headers — no auth required

### New: `adminUpdateConfig` function
- POST with `{ file: 'models' | 'specGroups', data: {...} }`
- Admin auth required
- Writes to Storage `config/models.json` / `config/specGroups.json`

### Updated: `adminPatchSpecGroups`
- Remove hardcoded migration map param from request body
- Read `config/models.json` from Storage internally
- Build `watchModel → specGroup` map from it
- Use for fallback lookup

## App Changes

### `CatalogContext.tsx`
- `buildAssetUrl('models.json')` → fetch from `publicConfig?file=models`
- `buildAssetUrl('specGroups.json')` → fetch from `publicConfig?file=specGroups`

### `StudioApp.tsx`
- `fetch('/specGroups.json')` → fetch from `publicConfig?file=specGroups`
- `fetch('/models.json')` → fetch from `publicConfig?file=models`

### `AdminOpsPage.tsx`
- Add "Update Config" section — upload new models.json / specGroups.json via `adminUpdateConfig`

### `catalogApi.ts`
- `docs/models.json` GitHub fetch → fetch from `publicConfig?file=models`

### Code generators (`jsCodeGenerator.ts`, `jsCodeGeneratorV2.ts`)
- Keep bundled static import — build-time only, acceptable

## GitHub Backup Marking

Add `app/CONFIG_README.md` explaining these are backup copies.

## Migration Step

On first deploy: upload current `models.json` and `specGroups.json` to Firebase Storage `config/`.

## Tasks

- T1: Update storage.rules — add public read for config/
- T2: Add `publicConfig` cloud function
- T3: Add `adminUpdateConfig` cloud function
- T4: Update `adminPatchSpecGroups` — read models from Storage internally
- T5: Update `CatalogContext.tsx` — fetch from publicConfig
- T6: Update `StudioApp.tsx` — fetch from publicConfig
- T7: Update `AdminOpsPage.tsx` — add config update UI
- T8: Update `catalogApi.ts` — fetch from publicConfig
- T9: Upload initial config files to Firebase Storage
- T10: Deploy functions + app
- T11: Add CONFIG_README.md to app/
