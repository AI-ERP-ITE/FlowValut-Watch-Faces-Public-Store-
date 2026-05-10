# 02 — Formal Spec

## Types

```ts
type RenderSourceMode = 'procedural' | 'baked-live-mask' | 'baked-baked-mask';

type SurfaceSource =
  | { kind: 'procedural'; elementId: string }
  | { kind: 'baked-image'; imageDataUrl: string; width: number; height: number };

type SilhouetteSource =
  | { kind: 'procedural-vector'; elementId: string; liveMaskKey: string | null }
  | { kind: 'baked-alpha';      imageDataUrl: string; width: number; height: number; additionalLiveMaskKey: string | null };
```

## Element render-state additions

```ts
interface ParametricElementRenderState {
  // ...existing fields kept for backward compat...
  renderSourceMode?: RenderSourceMode;     // canonical
  maskEmbeddedInSnapshot?: boolean;        // canonical
}
```

## Resolver semantics

```
resolveRenderSourceMode(el)        : RenderSourceMode
resolveSurfaceSource(el)           : SurfaceSource
resolveSilhouetteSource(el)        : SilhouetteSource
```

| Mode | `resolveSurfaceSource` | `resolveSilhouetteSource` |
|---|---|---|
| procedural | `{procedural,id}` | `{procedural-vector, id, liveMaskKey}` |
| baked-live-mask | `{baked-image, …}` | `{baked-alpha, …, additionalLiveMaskKey = liveMaskKey}` |
| baked-baked-mask | `{baked-image, …}` | `{baked-alpha, …, additionalLiveMaskKey = liveMaskKey or null}` |

If the declared mode is `baked-*` but snapshot pixels are missing, the
resolver degrades safely to `procedural` to avoid producing a black hole.

`liveMaskKey` is built from stable mask fields (`id|kind|shape|mode|imageDataUrl`)
and is `null` when `mask.enabled === false` or no mask is present.

## Transition contract

| Action | Caller | Sets `renderSourceMode` | Sets `maskEmbeddedInSnapshot` |
|---|---|---|---|
| Create snapshot (mask kept live) | `setElementSnapshot(_, _, { maskEmbeddedInSnapshot: false })` | `baked-live-mask` | `false` |
| Bake layer (embed mask) | `setElementSnapshot(_, _, { maskEmbeddedInSnapshot: true })` | `baked-baked-mask` | `true` |
| Restore procedural | `deleteElementSnapshot` | `procedural` | `false` |
| Manual force | `transitionToBakedLiveMask`/`transitionToBakedBakedMask`/`transitionToProcedural` | as named | per table |

## Renderer contract (Phase 2 target)

For every element the renderer MUST:

1. Call `resolveSurfaceSource(el)` to choose surface drawing path:
   - `procedural` → existing procedural draw
   - `baked-image` → draw the snapshot `<image>` at the element's transform
2. Call `resolveSilhouetteSource(el)` to provide alpha to ALL effect filters
   (drop shadow, depth, glow):
   - `procedural-vector` → SVG `SourceAlpha` is correct (procedural paths
     are the source). If `liveMaskKey` is non-null, intersect with the
     live mask before feeding the shadow.
   - `baked-alpha` → use the snapshot's alpha (`<feImage>` of the snapshot),
     intersect with `additionalLiveMaskKey` mask if non-null.
3. NEVER substitute pre-mask procedural geometry as the silhouette when
   the mode is `baked-*`.
4. NEVER unconditionally disable shadow in preview when surface is
   `baked-image` (drawing a baked image is cheap, the shadow filter cost
   on a small alpha is also acceptable; the existing
   `isPreviewQuality ? disabled : enabled` blanket rule must be replaced
   with mode-aware logic).

## Backward compatibility
- Legacy `sourceMode = live | snapshot` field is still honoured by old
  helpers; new canonical fields are added alongside, never removed.
- Elements without `renderSourceMode` are migrated once on first read and
  stamped into the renderState.
