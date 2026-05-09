# 01 — Render Source Modes

## Type definition

```ts
type SnapshotRenderMode =
  | "frozen"
  | "editable";
```

## Render-state extension

```ts
renderState: {
  sourceMode?: "live" | "snapshot";
  snapshotRenderMode?: SnapshotRenderMode;
}
```

## Behavior matrix

| behavior             | frozen | editable |
| -------------------- | ------ | -------- |
| post effects         | no     | yes      |
| overlays             | no     | yes      |
| masks                | yes    | yes      |
| new masks after bake | yes    | yes      |
| depth/dropShadow     | no     | yes      |
| texture overlays     | no     | yes      |

## Mode semantics

### Mode A: frozen

Purpose: legacy optimization / final cache behavior from spec 076.

Required behavior:

- render snapshot image as baked
- bypass post-effect overlays
- bypass depth/dropShadow reapplication
- bypass texture/material reapplication
- keep masks, opacity, transforms

### Mode B: editable

Purpose: new editable baked surface behavior for specs 077-079 workflows.

Required behavior:

- render snapshot image as source
- allow renderLayer post-effects
- allow overlays
- allow depth/dropShadow
- allow texture/material operations
- allow new masks after bake

## Defaulting rules

1. Existing snapshots with no explicit mode default to frozen.
2. New bake-to-new-layer output must set snapshotRenderMode to editable.

These defaults are mandatory to preserve backward compatibility and unlock the new workflow.

## Implementation constraints

- do not duplicate renderer branches
- reuse existing renderLayer path
- mode controls only effect/overlay eligibility and alpha source behavior
- sourceMode selection (live/snapshot) remains the existing gate
