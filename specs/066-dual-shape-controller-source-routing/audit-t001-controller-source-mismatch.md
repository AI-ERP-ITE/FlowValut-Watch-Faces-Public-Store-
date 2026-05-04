# Audit T001: Controller Read Sources vs Desired Dual-Source Routing (066)

## Scope
- Renderer source audit in [app/engine/core/renderer.js](app/engine/core/renderer.js)
- Composition transfer check in [app/engine/core/composer.js](app/engine/core/composer.js)
- Inspector/controller model alignment check in [app/src/ParametricPage.tsx](app/src/ParametricPage.tsx)

## Observed Current Source Model
1. Renderer has no explicit dual-source object (`geometryPath`, `silhouettePath`, `silhouetteAlpha`).
2. Layer pipeline runs with one body input (`bodyRaw` -> optional reshape -> `body`) in [app/engine/core/renderer.js](app/engine/core/renderer.js#L1180).
3. Element mask is applied by wrapping filter input (`filterInputBody`) before style/depth/drop-shadow filter chain in [app/engine/core/renderer.js](app/engine/core/renderer.js#L1021).
4. Style/depth/drop-shadow chain reads SVG `SourceAlpha` from filter input in [app/engine/core/renderer.js](app/engine/core/renderer.js#L530).
5. Texture/gradient/material overlays derive clip masks from `filterInputBody` in [app/engine/core/renderer.js](app/engine/core/renderer.js#L1027), [app/engine/core/renderer.js](app/engine/core/renderer.js#L1035), [app/engine/core/renderer.js](app/engine/core/renderer.js#L1042).

## Key Findings

### F1: No explicit controller-source contract exists
- No per-controller declaration of source domain (geometry/silhouette/postComposite).
- Result: routing is implicit and coupled to render-layer plumbing.
- Evidence: single-path render setup in [app/engine/core/renderer.js](app/engine/core/renderer.js#L1015) and [app/engine/core/renderer.js](app/engine/core/renderer.js#L1263).

### F2: No reusable silhouette surface artifacts
- There is no stored silhouette contour or alpha field artifact for downstream controllers.
- Result: cannot selectively route edge-sensitive vs UV/layout controllers by source type.
- Evidence: no `silhouette*` artifacts in renderer/composer paths, only element mask defs and filter-input wrapping in [app/engine/core/renderer.js](app/engine/core/renderer.js#L1001).

### F3: Texture/Gradient/Material are currently clipped from masked filter input
- Overlay masks use `filterInputBody`, which already includes element mask when enabled.
- Result: these overlays are effectively bound to masked silhouette path today, not clean geometry source.
- Desired model from spec: these should remain geometry-driven.
- Evidence: [app/engine/core/renderer.js](app/engine/core/renderer.js#L1021), [app/engine/core/renderer.js](app/engine/core/renderer.js#L1027), [app/engine/core/renderer.js](app/engine/core/renderer.js#L1035), [app/engine/core/renderer.js](app/engine/core/renderer.js#L1042).

### F4: Edge-sensitive filters are tied to filter `SourceAlpha`, not source-routed domain object
- Depth/drop-shadow inner and outer logic operate on `SourceAlpha` and derivatives.
- Result: behavior depends on whichever input is currently wrapped, with no explicit routing policy.
- Evidence: [app/engine/core/renderer.js](app/engine/core/renderer.js#L603), [app/engine/core/renderer.js](app/engine/core/renderer.js#L623).

### F5: Global depth/lighting is composition-level and not contour-aware by contract
- Global depth effect is constructed from composition settings and applied to full merged content.
- Result: no per-element silhouette contract for global response.
- Evidence: [app/engine/core/renderer.js](app/engine/core/renderer.js#L252), [app/engine/core/renderer.js](app/engine/core/renderer.js#L1307).

## Mismatch Matrix (Current vs Target)
1. Contract model:
- Current: implicit source selection through SVG chain.
- Target: explicit source contract per controller.

2. Source artifacts:
- Current: none (single practical body path).
- Target: `geometryPath`, `silhouettePath`, optional `silhouetteAlpha`.

3. UV/layout overlays:
- Current: can be silhouette-clipped through masked filter input.
- Target: geometry-driven by policy.

4. Edge-sensitive controls:
- Current: derive from `SourceAlpha` of active filter input.
- Target: route to silhouette source explicitly.

## Risk Notes for Next Task (T002)
1. Refactor risk is high if done by filter-order rewrite; keep order stable and introduce source artifacts first.
2. Texture/gradient/material parity risk is highest because current clipping path is coupled to filter input.
3. Global lighting/depth needs explicit policy boundary: composition-level post-composite vs element-level silhouette response.

## T001 Exit Status
- Completed: yes (audit + mismatch documentation).
- Follow-up required: T002 explicit controller-source matrix and routing contract doc.
