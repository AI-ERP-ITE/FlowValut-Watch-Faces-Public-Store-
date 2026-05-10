# 01 — Plan

## Problem statement
Shadow does not appear on a baked-with-live-mask element. Mask preview
sometimes diverges from the rendered silhouette. Root cause is structural:
no explicit declaration of "current visible source" exists. The renderer
falls back to procedural geometry (which is now hidden by the bake), the
shadow filter is silently disabled in preview, and mask edits do not
re-target the snapshot.

## Decision summary

### Three render-source modes
| Mode | Surface (color) | Silhouette (alpha for FX & mask) |
|---|---|---|
| `procedural` | live procedural geometry | live procedural geometry ∩ optional live mask |
| `baked-live-mask` | snapshot image pixels | snapshot alpha ∩ live mask |
| `baked-baked-mask` | snapshot image pixels | snapshot alpha (mask already embedded), optionally ∩ a NEW live mask added later |

### Two source kinds returned by the resolver
- `SurfaceSource` = `procedural` | `baked-image`
- `SilhouetteSource` = `procedural-vector` | `baked-alpha`

### Strict rules
1. **Resolver is the only source of truth.** Renderer / effects / masks /
   exports MUST call the resolver. They MUST NOT inspect snapshot pixels
   or geometry directly.
2. **No phantom geometry.** Once `renderSourceMode` ∈ {baked-live-mask,
   baked-baked-mask}, prior procedural geometry is never used as silhouette
   or as filter input.
3. **Transitions are explicit.** Only the dedicated transition helpers
   (`transitionToBakedLiveMask`, `transitionToBakedBakedMask`,
   `transitionToProcedural`) and `setElementSnapshot` /
   `deleteElementSnapshot` may write the canonical fields.
4. **Migration runs once.** Legacy elements with no `renderSourceMode` are
   stamped at load time from `(snapshot pixels present?, mask present?)`.
   After that the explicit value is canonical.

## Scope
- Add canonical fields, resolver, migration, transitions. (Phase 1)
- Wire renderer/effects to consume the resolver. (Phase 2)

## Non-goals
- No change to snapshot capture pipeline (capture remains the same; only
  the metadata stamped on the result is new).
- No change to mask geometry / coordinate system (Spec 074 contract holds).
- No change to the legacy `sourceMode = live | snapshot` toggle. It stays
  for backward compatibility; `renderSourceMode` is independent canonical
  state.
- No new UI controls in this spec. UI surfacing of the new modes is a
  separate spec.
