# Feature Specification: Analysis-First Compiler Pipeline

**Feature Branch**: `[053-analysis-compiler-pipeline]`  
**Created**: 2026-04-29  
**Status**: Draft

## Objective
Introduce a deterministic analysis-to-compile pipeline that prevents AI simplification by separating AI analysis from HTML/SVG generation and enforcing strict layering, geometry, color, and lighting compliance.

## Product Decisions (Locked)
1. AI is used for analysis output only (JSON contract), not final HTML/SVG freeform generation.
2. Final HTML/SVG is produced by an internal deterministic compiler.
3. Layer sequence is a first-class required model and validation gate.
4. A dedicated private route screen `/studio/compiler` is added for this workflow.
5. A machine-readable manual guide is required and treated as source-of-truth for analyzer prompts and contract rules.

## Scope
1. JSON analysis contract and schema types.
2. Layer model and sequence validator.
3. Compiler screen route and UX placement.
4. Manual guide document for AI analyzer instructions.
5. Integration path from compiler output into Studio editing flow.

## Functional Requirements

### FR-1 Analysis Contract (AI Output)
1. Analyzer output MUST be valid JSON and include:
   - `requirementsModel`
   - `geometryModel`
   - `layerModel`
   - `lightingModel`
   - `colorModel`
   - `textureModel`
   - `complianceHints`
2. Analyzer output MUST not include final SVG/HTML payload in analysis phase.
3. Analyzer output MUST provide explicit element counts and placements for required watchface components.

### FR-2 Layer Sequence as Core Constraint
1. `layerModel.layerStack` MUST be explicit, ordered back-to-front.
2. Each layer MUST include: `id`, `role`, `zIndex`, `dependsOn`, `clipRefs`, `mustContain`.
3. Validator MUST reject:
   - missing required layer roles
   - broken dependency order
   - duplicate/invalid z-index usage
   - required layer content count mismatch

### FR-3 Deterministic Compiler
1. Compiler MUST consume validated analysis JSON and generate renderer-safe inline SVG/HTML.
2. Compiler output MUST avoid unsupported constructs for strict raster flow:
   - no external resources
   - no `foreignObject`
   - no unresolved refs
3. Compiler MUST support explicit clipping and defs ownership for texture/material regions.

### FR-4 Manual Guide Requirement
1. Add a dedicated manual guide file under docs for analyzer behavior.
2. Guide MUST define:
   - canonical JSON schema and semantics
   - canonical layer order
   - lighting/color extraction expectations
   - strict compliance gates and failure policy
3. Analyzer prompt builder MUST reference this manual guide as the rule source.

### FR-5 UI/Route Injection
1. Add a dedicated private screen route at `/studio/compiler`.
2. Add clear navigation path from Studio to Compiler and back.
3. Compiler screen MUST show at minimum:
   - analysis JSON panel
   - layer sequence panel
   - validation report panel
   - compile/apply actions

### FR-6 Validation and Apply Flow
1. Compile action MUST be blocked if validation fails.
2. Validation report MUST include explicit PASS/FAIL per gate.
3. Apply-to-Studio MUST create/replace current design state only after successful validation.

## Non-Goals
1. Replacing existing Studio editor flow.
2. Full auto-correction for all invalid analysis payloads in v1.
3. Public storefront exposure of compiler route.

## Acceptance Criteria
1. New private route `/studio/compiler` exists and is guard-protected.
2. Layer sequence validation rejects invalid ordering and missing roles.
3. Manual guide exists and is referenced by analyzer workflow.
4. Compiler can produce renderer-safe inline SVG/HTML from valid analysis JSON.
5. Studio integration path can apply compiled output only when validation passes.
