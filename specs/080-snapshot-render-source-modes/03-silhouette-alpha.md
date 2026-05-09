# 03 — Silhouette Alpha For Editable Snapshot Effects

## Problem statement

Editable snapshot replay uses a raster `<image>` source. Effect stages that key off alpha can behave as if alpha came from rectangular image bounds, causing visual no-op behavior.

Symptoms:

1. depth rims appear invisible or misplaced
2. drop shadows appear weak/invisible
3. texture/material/overlay clipping feels dead

## Why SourceAlpha alone is insufficient here

In editable snapshot replay, source is pre-baked raster content. For effect masking, using plain `SourceAlpha` from the replay path can fail to represent intended silhouette semantics for downstream depth/shadow/overlay operations.

Therefore editable mode requires explicit silhouette-alpha extraction from snapshot content.

## Required approach

When all of the following are true:

- `useSnapshotSource === true`
- `snapshotRenderMode === "editable"`

derive `silhouetteAlpha` inside filter graph using snapshot image itself.

Use filter primitives:

1. `feImage` to load snapshot source
2. `feColorMatrix` to isolate alpha channel output as `silhouetteAlpha`

Conceptual filter snippet:

```svg
<feImage href="{snapshotUrl}" result="snapshotSurface" />
<feColorMatrix
  in="snapshotSurface"
  type="matrix"
  values="0 0 0 0 0
          0 0 0 0 0
          0 0 0 0 0
          0 0 0 1 0"
  result="silhouetteAlpha"
/>
```

## Required substitution scope

Use `silhouetteAlpha` instead of `SourceAlpha` only where alpha keying is required for editable snapshot effects:

1. depth operations
2. dropShadow operations
3. overlay clipping
4. texture/material compositing masks

Style-adjust color operations may continue to use `SourceGraphic`.

Do not rewrite unrelated filter logic.

## Explicit non-approach

Do not reconstruct vector silhouette or clipPath geometry for baked layers.

Reason: baked layers may include arbitrary rasterized appearance where vector reconstruction is not reliable.

## Filter math notes

Let:

- `S` = SourceGraphic
- `A_s` = SourceAlpha
- `A_h` = extracted silhouetteAlpha

In editable snapshot mode, alpha-driven stages must use $A_h$ instead of $A_s$:

$$
DepthMask = f_{depth}(A_h)
$$

$$
ShadowMask = f_{shadow}(A_h)
$$

$$
OverlayClip = Overlay \cap A_h
$$

This ensures effects follow snapshot silhouette, not rectangular replay bounds.
