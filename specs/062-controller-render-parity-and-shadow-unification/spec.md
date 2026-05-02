# Feature Specification: Controller Render Parity + Shadow Unification

**Feature Branch**: `[062-controller-render-parity-and-shadow-unification]`
**Created**: 2026-05-03
**Status**: Planned

## Objective
Ensure every controller that edits model JSON also produces meaningful visual output in preview/render paths, and unify drop-shadow behavior across Parametric, Studio preview, and export so installed watch output matches editor expectations.

## Scope (Locked)
1. Repair controller-to-render pipeline gaps (especially layered texture/gradient/material paths).
2. Add full element depth/drop-shadow controls in Parametric (including currently missing advanced parameters).
3. Apply Studio-optimized shadow normalization logic across all relevant 3D effect UIs.
4. Preserve broad, practical control ranges from subtle to aggressive with visible effect at both ends.
5. Validate controller behavior: JSON mutation + render impact + parity checks.

## Functional Requirements

### FR-1 Controller JSON/Render Contract
1. Any controller that mutates element/template effect JSON MUST affect rendered output unless explicitly marked metadata-only.
2. Layered effect controllers (`textureLayers`, `gradientLayers`, `materialLayers`) MUST survive full pipeline stages and reach renderer.
3. No silent no-op effect controllers are allowed.

### FR-2 Pipeline Integrity
1. Geometry/composition transfer MUST preserve all effect fields required by renderer.
2. Existing singular effect fields (`texture`, `gradient`, `material`) remain backward compatible.
3. Legacy payloads remain loadable without migration failure.

### FR-3 Depth + Drop Shadow UI Coverage
1. Parametric element depth panel MUST expose full renderer-supported element depth parameters.
2. Element drop shadow controls MUST include:
   - enabled
   - color
   - opacity
   - blur
   - offsetX
   - offsetY
3. Any other active 3D effect UI surface outside Parametric MUST apply the same normalized shadow logic.

### FR-4 Shadow Logic Parity
1. Shadow normalization used in Studio preview/export must be shared and reused by Parametric and other 3D effect UIs.
2. Preview should closely match export/watch output under Amazfit RGB constraints.
3. Shadow-related range handling must avoid clipping/dead zones where possible.

### FR-5 Range Quality
1. Control ranges must support subtle and aggressive settings.
2. Range/step tuning should avoid imperceptible high-end or low-end dead bands.
3. Existing useful ranges should not be narrowed unless needed for deterministic parity.

## Acceptance Criteria
1. Layered texture/gradient/material controls update JSON and visibly change render.
2. Parametric element depth exposes full supported parameter set and functions.
3. Drop shadow behavior matches Studio normalization logic across preview/export paths.
4. No newly introduced controller no-ops in audited scope.
5. Build/type checks and verify suite pass.
6. Added verification notes document before/after parity results.
