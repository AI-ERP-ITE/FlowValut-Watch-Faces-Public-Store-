# Clarification Notes (066)

## Confirmed Intent
1. System model is controller-driven stacking, not a simple linear material->effects pipeline.
2. Correct fix direction is controller input-source routing, not controller-order rewrite.
3. New source concept must remain local-space and must not replace base geometry semantics.
4. Implementation must minimize blast radius and avoid pivot/transform regressions.

## Locked Decisions
1. Keep existing controller order.
2. Introduce dual-shape awareness (`geometryPath` + `silhouettePath`, optional `silhouetteAlpha`).
3. Route edge-sensitive controllers to silhouette source.
4. Keep UV/layout/material controllers on geometry source.
5. Keep final grading controls in post-composite stage.

## Open Questions (to confirm during implementation)
1. Should soft-mask global light use alpha-gradient normals by default or behind feature flag?
2. Do any existing color controls currently act pre-composite and rely on that behavior?
3. Is debug telemetry needed for source-fallback events in production builds?
