# Spec 095 — SpecGroup Matrix Rewrite

## Problem

The current `specGroups.json` + `models.json` schema has three critical bugs:

1. **Wrong deviceSources** — all v3 round groups share generic IDs `[8388608, 8388609]` instead of real per-model IDs.
2. **v2/v3 split forces one group per model** — a model like Balance 2 that accepts both v2 and v3 watchfaces is locked to one group, causing v3 watchfaces to never match it.
3. **deviceSources in wrong file** — they belong on models (per-device), not on specGroups (per-resolution).

## Goal

Smallest correct schema that:
- Gives each model its real `deviceSources`
- Expresses `supportedConfigVersions: ["v2","v3"]` per specGroup (resolution+shape only)
- Collapses 11 specGroups → 7 (no more v2/v3 duplicates per resolution)

## New Schema

### specGroups.json — keyed by resolution+shape only

```json
{
  "480-round":        { "resolution": "480x480", "shape": "round",   "supportedConfigVersions": ["v2","v3"], "thumbnail": "324x324" },
  "466-round":        { "resolution": "466x466", "shape": "round",   "supportedConfigVersions": ["v2","v3"], "thumbnail": "314x314" },
  "454-round":        { "resolution": "454x454", "shape": "round",   "supportedConfigVersions": ["v2"],      "thumbnail": "306x306" },
  "416-round":        { "resolution": "416x416", "shape": "round",   "supportedConfigVersions": ["v2"],      "thumbnail": "280x280" },
  "390x450-square":   { "resolution": "390x450", "shape": "square",  "supportedConfigVersions": ["v2","v3"], "thumbnail": "266x307", "cornerRadius": 86 },
  "360-round":        { "resolution": "360x360", "shape": "round",   "supportedConfigVersions": ["v3"],      "thumbnail": "243x243" },
  "320x380-square":   { "resolution": "320x380", "shape": "square",  "supportedConfigVersions": ["v2","v3"], "thumbnail": "200x238", "cornerRadius": 69 }
}
```

### models.json — each model gets real deviceSources

Each model entry gains a `deviceSources: number[]` field with real IDs from official Zepp docs.
specGroup key now points to the merged resolution group (no v2/v3 suffix).

See tasks.md for full data.

## Affected Files

| File | Change type |
|---|---|
| `app/specGroups.json` | Full replace |
| `app/models.json` | Full replace — add deviceSources, update specGroup keys |
| `app/src/context/CatalogContext.tsx` | Interface: `apiVersion` → `supportedConfigVersions` |
| `app/src/lib/specGroupDetector.ts` | Detection logic update |
| `app/src/lib/jsCodeGenerator.ts` | `getDeviceSources()` reads from models.json |
| `app/src/lib/jsCodeGeneratorV2.ts` | Same |
| `app/src/components/PublishForm.tsx` | specGroup detection call update |
| `app/src/components/storefront/ModelPage.tsx` | Display update |
| `app/src/components/storefront/ProductPage.tsx` | Display update |
| `app/docs/specGroups.json` | Sync from app/ |
| `app/docs/models.json` | Sync from app/ |
| `app-public-sync/specGroups.json` | Sync from app/ |
| `app-public-sync/models.json` | Sync from app/ |

## Compatibility Rule (for future reference)

- Watch supports v2 only → accept only v2 watchfaces
- Watch supports v2 + v3 → accept both
- specGroup with `supportedConfigVersions: ["v2"]` → only v2 watchfaces match
- specGroup with `supportedConfigVersions: ["v2","v3"]` → both match

## Models NOT included (no Zepp watchface support)

Pace, Stratos 1/2/3, Verge/Lite, Bip/Lite/S/S-Lite, Neo, GTR 1st gen, GTS 1st gen
