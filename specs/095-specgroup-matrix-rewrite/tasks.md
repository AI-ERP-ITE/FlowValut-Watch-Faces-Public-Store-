# Tasks — Spec 095: SpecGroup Matrix Rewrite

## T1 — Update specGroups.json
- [ ] Replace `app/specGroups.json` with new 7-group schema
- [ ] Fields: `resolution`, `shape`, `supportedConfigVersions`, `thumbnail`, `cornerRadius` (square only)
- [ ] Remove: `apiVersion`, `deviceSources`

## T2 — Update models.json
- [ ] Add `deviceSources: number[]` per model with real IDs from official Zepp docs
- [ ] Update all `specGroup` values to new merged keys (e.g. `480-round-v2` → `480-round`)
- [ ] Remove models that don't support downloadable Zepp watchfaces

## T3 — Update SpecGroup TypeScript interface
- File: `app/src/context/CatalogContext.tsx`
- [ ] `apiVersion: 'v2' | 'v3'` → `supportedConfigVersions: ('v2' | 'v3')[]`
- [ ] `deviceSources: number[]` → remove from SpecGroup, add to WatchModel interface
- [ ] Add `thumbnail?: string` and `cornerRadius?: number` to SpecGroup

## T4 — Update specGroupDetector.ts
- File: `app/src/lib/specGroupDetector.ts`
- [ ] Detection now matches by resolution+shape only (no apiVersion filter)
- [ ] `detectSpecGroup(width, height, specGroups)` — remove `apiVersion` param
- [ ] `formatSpecGroupLabel()` — show `supportedConfigVersions` instead of single apiVersion

## T5 — Update jsCodeGenerator.ts + jsCodeGeneratorV2.ts
- [ ] `getDeviceSources(watchModel)` — read from imported `models.json` instead of hardcoded map
- [ ] `getDeviceSourcesV2(watchModel)` — same

## T6 — Update PublishForm.tsx
- File: `app/src/components/PublishForm.tsx`
- [ ] Remove `apiVersion` prop from specGroup detection call
- [ ] Update `detectSpecGroup` call signature

## T7 — Update storefront UI
- Files: `ModelPage.tsx`, `ProductPage.tsx`
- [ ] Replace `specGroup.apiVersion.toUpperCase()` display
- [ ] Show `supportedConfigVersions` as badge(s) e.g. "V2 + V3" or "V2 only"

## T8 — Sync copies
- [ ] Copy `app/specGroups.json` → `app/docs/specGroups.json`
- [ ] Copy `app/models.json` → `app/docs/models.json`
- [ ] Copy both → `app-public-sync/`

## Validation
- [ ] `npm run build` passes in `app/`
- [ ] No TypeScript errors
- [ ] specGroupDetector returns correct group for 480×480
- [ ] jsCodeGenerator produces correct deviceSources for Balance 2
- [ ] UI displays correct version badges on ModelPage and ProductPage
