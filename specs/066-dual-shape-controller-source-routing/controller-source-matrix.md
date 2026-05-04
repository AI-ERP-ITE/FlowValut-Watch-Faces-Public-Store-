# Controller Source Matrix (T002)

## Contract Enum (Locked)
`ControllerSource = "geometry" | "silhouettePath" | "silhouetteAlpha" | "postComposite"`

## Purpose
This matrix is the explicit routing contract required by FR-3 in [app/specs/066-dual-shape-controller-source-routing/spec.md](app/specs/066-dual-shape-controller-source-routing/spec.md).

## Baseline Evidence
Current renderer has implicit source routing through filter/body plumbing and no explicit source object:
- [app/engine/core/renderer.js](app/engine/core/renderer.js#L1015)
- [app/engine/core/renderer.js](app/engine/core/renderer.js#L1021)
- [app/engine/core/renderer.js](app/engine/core/renderer.js#L1263)

## Mapping Table

| Controller Group | Sub-controls / Scope | Current Effective Source | Target Source | Notes |
|---|---|---|---|---|
| Style FX | highlight, shadows, sharpness (edge response) | Filter `SourceAlpha` of active input chain | `silhouettePath` | Edge-sensitive style response must follow final masked contour. |
| Style FX | contrast, hue, global tint in final grading context | Mixed / chain-coupled | `postComposite` | Keep final look controls at post-composite stage. |
| Depth FX (element) | intensity, opacity, falloff, spread, light response | Filter `SourceAlpha` | `silhouettePath` + `silhouetteAlpha` (soft-mask cases) | Hard masks use contour; feathered masks use alpha-gradient response. |
| Drop Shadow | inner/outer + blur/spread/offset | Filter `SourceAlpha` | `silhouettePath` + `silhouetteAlpha` (soft-mask cases) | Avoid geometry-only shadow response on clipped edges. |
| Global Light 2D | circumference/boundary response | Composition/global chain | `silhouettePath` | Boundary-angle sampling should track silhouette contour. |
| Global Light 3D | directional edge/normal response | Composition/global chain | `silhouettePath` + `silhouetteAlpha` | Alpha-gradient normals for soft mask transitions. |
| Texture Layers | kind/uv/rotation/scale/noise/image transforms | Clip mask from active filter input | `geometry` | Preserve UV/local transform semantics and existing placement fidelity. |
| Gradient Separate Layers | kind/center/from-to/angle/radius + blend | Clip mask from active filter input | `geometry` | Preserve gradient centers and transform semantics. |
| Material Layers | color/opacity/blend + clip | Clip mask from active filter input | `geometry` | Preserve material overlay geometry anchoring. |
| Fill/Stroke Base | element base paint | Geometry body path | `geometry` | Base element paint remains geometry-defined. |
| Transform/Layout | offset/rotation/mirror/layout/ring/ticks | Geometry placement pipeline | `geometry` | No pivot/layout behavior change allowed in this phase. |
| Mask Authoring | brush/selection/invert/strokes | Element mask model | Produces `silhouettePath` + `silhouetteAlpha` | Mask mutates silhouette artifacts only; never overwrites geometry source. |

## Fallback Policy (Locked)
1. If target source is `silhouettePath` and unavailable, fallback to `geometry`.
2. If target source is `silhouetteAlpha` and unavailable, fallback to `silhouettePath`, then `geometry`.
3. Every fallback must emit a development-only debug marker (non-production).

## Runtime Contract Shape (Planned)
```ts
interface RenderSurfaceSources {
  geometryPath: unknown;
  silhouettePath: unknown | null;
  silhouetteAlpha: unknown | null;
}
```

## Invalidation Contract (for T005)
Silhouette artifacts must be recomputed when and only when:
1. Element mask changed.
2. Geometry path changed.
3. Shape-affecting local transform changed.

## Out of Scope for T002
1. No renderer implementation changes.
2. No filter/pipeline reordering.
3. No schema migration.

## T002 Exit Criteria
1. All controller groups listed in scope have explicit target source.
2. Fallback policy is defined.
3. Mapping aligns with FR-1/FR-2/FR-3 and T001 findings.
