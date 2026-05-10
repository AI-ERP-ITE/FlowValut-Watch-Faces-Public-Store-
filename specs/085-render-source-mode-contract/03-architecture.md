# 03 — Architecture

## File map

| Layer | File | Role |
|---|---|---|
| Types | `app/src/types/renderSourceMode.ts` | Enum, `SurfaceSource`, `SilhouetteSource`, guards |
| Types | `app/src/types/parametric.ts` | Adds canonical fields on `ParametricElementRenderState` |
| Types | `app/src/types/index.ts` | Re-exports |
| Migration | `app/src/lib/renderSourceModeMigration.ts` | One-time legacy → canonical stamp |
| Transitions | `app/src/lib/renderSourceModeTransitions.ts` | Only sanctioned mutators |
| Resolver | `app/engine/core/sourceResolver.ts` | Single source of truth used by renderer/FX |
| Storage | `app/engine/snapshot/snapshotStorage.ts` | Reads/writes canonical fields, normalizes legacy on load |
| Editor | `app/src/ParametricPage.tsx` | Calls `setElementSnapshot` with explicit `maskEmbeddedInSnapshot` |
| Renderer (Phase 2) | `app/engine/core/renderer.js` | Will consume resolver to drive surface + silhouette |

## Data flow (per element, per frame)

```
element (template)
    │
    ▼
normalizeRenderState  ── (one-time migration if needed) ──▶ stamps canonical fields
    │
    ▼
sourceResolver ─────► resolveSurfaceSource     ──▶ Renderer surface path
              │
              └────► resolveSilhouetteSource  ──▶ Effect filter alpha input
                                              ──▶ Mask preview reference
                                              ──▶ Export silhouette source
```

## Mode lifecycle

```
        (create element)
              │
              ▼
        ┌─────────────┐
        │ procedural  │◀───────────────┐
        └─────┬───────┘                 │
              │ setElementSnapshot      │ deleteElementSnapshot
              │ (maskEmbedded=false)    │ / transitionToProcedural
              ▼                         │
       ┌──────────────────┐             │
       │ baked-live-mask  │─────────────┤
       └─────┬────────────┘             │
             │ setElementSnapshot       │
             │ (maskEmbedded=true)      │
             ▼                          │
      ┌────────────────────┐            │
      │ baked-baked-mask   │────────────┘
      └────────────────────┘
```

## Invariants

1. `renderSourceMode === 'procedural'` ⇒ surface is procedural geometry,
   silhouette is procedural geometry intersected with live mask if any.
2. `renderSourceMode === 'baked-live-mask'` ⇒ surface is snapshot pixels,
   silhouette is snapshot alpha intersected with live mask. The live mask
   may change at any time; snapshot pixels do not change with mask edits.
3. `renderSourceMode === 'baked-baked-mask'` ⇒ surface is snapshot pixels,
   silhouette is snapshot alpha (which already encodes the embedded mask).
   A *new* live mask added later acts as an *additional* intersection.
4. Resolver result is purely a function of `(renderSourceMode,
   maskEmbeddedInSnapshot, snapshot, mask)`. No history, no parameters.
5. Migration is monotonic: once stamped, never re-inferred.
