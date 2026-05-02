# T001 Audit: Controller Write-Path vs Renderer Read-Path Mismatches

Date: 2026-05-03
Task: T001 (analysis-only)
Status: Completed

## Scope Audited
1. Parametric controller write paths in `src/ParametricPage.tsx`.
2. Legacy effect normalization bridge in `src/lib/effects/legacyEffectNormalization.ts`.
3. Engine ingest path in `engine/core/geometry.js`.
4. Engine read/render path in `engine/core/renderer.js`.

## Summary
1. Confirmed hard mismatch for layered effect arrays:
   - Controllers write `textureLayers` / `gradientLayers` / `materialLayers` into template element model.
   - Renderer reads these array fields.
   - Geometry stage does not currently preserve these array fields.
   - Result: controls can update JSON but lose render impact after geometry stage.
2. Confirmed element depth write/read path is structurally connected.
3. Confirmed style adjust write/read path is structurally connected.
4. Confirmed singular legacy effect fields (`texture`, `gradient`, `material`) still flow.

## Evidence Matrix

### A) Texture Layers
1. Write path:
   - `writeNormalizedTextureLayers(...)` used in `src/ParametricPage.tsx`.
   - Reference: `src/ParametricPage.tsx:2213`.
2. Normalization bridge writes both singular + array:
   - `writeNormalizedTextureLayers` -> `writeLegacyLayerSet(..., 'texture', 'textureLayers', ...)`.
   - Reference: `src/lib/effects/legacyEffectNormalization.ts:162`.
3. Renderer expects array:
   - `textureLayersFromElement = Array.isArray(safeElement.textureLayers)`.
   - Reference: `engine/core/renderer.js:933`.
4. Geometry omission:
   - Element copy includes `texture` but no `textureLayers`.
   - Reference: `engine/core/geometry.js:38`.

Conclusion: render path can drop controller-written `textureLayers`.

### B) Gradient Layers
1. Write path:
   - `writeNormalizedGradientLayers(...)` in `src/ParametricPage.tsx`.
   - Reference: `src/ParametricPage.tsx:2462`.
2. Normalization bridge writes both singular + array:
   - `writeNormalizedGradientLayers` -> `writeLegacyLayerSet(..., 'gradient', 'gradientLayers', ...)`.
   - Reference: `src/lib/effects/legacyEffectNormalization.ts:169`.
3. Renderer expects array:
   - `gradientLayersFromElement = Array.isArray(safeElement.gradientLayers)`.
   - Reference: `engine/core/renderer.js:948`.
4. Geometry omission:
   - Element copy includes `gradient` but no `gradientLayers`.
   - Reference: `engine/core/geometry.js:39`.

Conclusion: render path can drop controller-written `gradientLayers`.

### C) Material Layers
1. Write path:
   - `writeNormalizedMaterialLayers(...)` in `src/ParametricPage.tsx`.
   - Reference: `src/ParametricPage.tsx:2866`.
2. Normalization bridge writes both singular + array:
   - `writeNormalizedMaterialLayers` -> `writeLegacyLayerSet(..., 'material', 'materialLayers', ...)`.
   - Reference: `src/lib/effects/legacyEffectNormalization.ts:176`.
3. Renderer expects array:
   - `materialLayersFromElement = Array.isArray(safeElement.materialLayers)`.
   - Reference: `engine/core/renderer.js:963`.
4. Geometry omission:
   - Element copy includes `material` but no `materialLayers`.
   - Reference: `engine/core/geometry.js:37`.

Conclusion: render path can drop controller-written `materialLayers`.

### D) Style Adjust (Control Path Integrity)
1. Write path:
   - `setSelectedStyleAdjustEnabled/Number/String`.
   - References: `src/ParametricPage.tsx:3050`, `src/ParametricPage.tsx:3063`, `src/ParametricPage.tsx:3087`.
2. Geometry carries `styleAdjust`.
   - Reference: `engine/core/geometry.js:40`.
3. Renderer merges and applies.
   - References: `engine/core/renderer.js:926`, `engine/core/renderer.js:929`.

Conclusion: structurally connected; no transfer mismatch detected.

### E) Element Depth (Control Path Integrity)
1. Write path:
   - `setSelectedEffect3dEnabled/Number`.
   - References: `src/ParametricPage.tsx:3139`, `src/ParametricPage.tsx:3152`.
2. Geometry carries `effect3d`.
   - Reference: `engine/core/geometry.js:41`.
3. Renderer merges and applies.
   - Reference: `engine/core/renderer.js:980`.

Conclusion: structurally connected; no transfer mismatch detected.

### F) Element Color (Control Path Integrity)
1. Write path:
   - `setSelectedElementColor`.
   - Reference: `src/ParametricPage.tsx:2117`.
2. Color ends in params field and is consumed by element render via `renderParams`.
   - References: `engine/core/renderer.js:907`, `engine/core/renderer.js:916`.

Conclusion: structurally connected.

## Risk Severity
1. Critical:
   - Layered texture/gradient/material controls can appear functional in JSON but be visually inert due to pipeline transfer omission.
2. Medium:
   - Existing singular fallback fields partially mask issue, causing inconsistent behavior depending on UI flow.

## Recommended Fix Targets (for T002)
1. Preserve `textureLayers`, `gradientLayers`, `materialLayers` in element copy inside `engine/core/geometry.js`.
2. Preserve compatibility behavior for singular `texture`, `gradient`, `material` fields.
3. Add focused regression check in T003 proving array-layer toggles alter render output.

## Non-Goals for T001
1. No runtime code changes.
2. No UI changes.
3. No deploy/build/test gate requirement beyond audit evidence collection.
