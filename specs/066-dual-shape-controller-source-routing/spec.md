# Feature Specification: Dual-Shape Controller Source Routing

**Feature Branch**: `[066-dual-shape-controller-source-routing]`
**Created**: 2026-05-04
**Status**: Draft

## Problem Statement
Current renderer flow behaves as controller-driven stacking where many visual-response controllers read pre-mask geometry. When mask is applied at the end, edge-sensitive responses (lighting, depth response, shadow response) can diverge from final masked silhouette.

## Goal
Keep controller order intact and introduce dual-shape awareness so each controller reads the correct source surface.

## Core Principle
Controllers do not change order. Controllers change input source.

## New Concepts
1. `geometryPath` (existing): original local-space geometry for layout/material/uv-safe operations.
2. `silhouettePath` (new): post-mask contour in local space for edge-sensitive operations.
3. `silhouetteAlpha` (optional companion): post-mask alpha field for soft/feathered edge response where contour-only is insufficient.

## Functional Requirements

### FR-1 Source Duality
1. Renderer must expose both original geometry source and mask-derived silhouette source.
2. Mask operations must not overwrite `geometryPath`.
3. `silhouettePath`/`silhouetteAlpha` must be recomputed only when geometry/mask/shape-affecting local transform changes.

### FR-2 Controller Input Routing
1. Edge-sensitive controllers must default to silhouette source.
2. UV/local-space controllers must remain on geometry source.
3. Post-composite color grading controllers remain post-composite.

### FR-3 Routing Contract
1. Each controller group must have an explicit source declaration (`geometry`, `silhouettePath`, `silhouetteAlpha`, `postComposite`).
2. No implicit source selection inside controller body.
3. Fallback rule: if silhouette source unavailable, use geometry source and log debug marker in development mode.

### FR-4 Scope Guardrails
1. Do not reorder existing controller stack.
2. Do not change pivot/transform semantics.
3. Do not migrate legacy JSON schema for this phase.

## Controller Source Mapping (Locked)

### A) Must use silhouette source (edge response)
1. Style FX edge-sensitive controls (highlight, shadow edge response, sharpness edge logic)
2. Depth FX visual response controls (edge/falloff/spread response)
3. Drop Shadow modes
4. Global Light 2D circumference boundary sampling
5. Global Light 3D edge/normal approximation (with alpha-gradient normals for soft masks)
6. Stroke/outline edge effects

### B) Must use geometry source (local/uv/layout)
1. Texture layers and UV placement
2. Gradient Separate placement and transform
3. Material layers
4. Fill/stroke base color fields
5. Transform/layout/ring/ticks generation

### C) Must use post-composite source
1. Global contrast
2. Global hue
3. Global tint / final grading controls

## Non-Goals
1. Full pipeline rewrite.
2. Controller stack reordering.
3. Broad rendering architecture migration.

## Acceptance Criteria
1. Masked edges drive shadow/depth/global-light response correctly.
2. Texture/gradient/material placement remains unchanged from baseline behavior.
3. Pivot/transform behavior remains stable.
4. Performance regression remains within acceptable limits (no full-frame redundant recompute loops).
5. Build/type checks pass and targeted verification cases pass.
