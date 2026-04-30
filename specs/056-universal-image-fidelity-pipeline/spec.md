# Feature Specification: Universal Image Fidelity Pipeline

**Feature Branch**: `[056-universal-image-fidelity-pipeline]`
**Created**: 2026-04-30
**Status**: In Progress

## Objective
Build a universal, non-domain-specific visual compiler flow that can reproduce uploaded images as HTML/SVG with deterministic, measurable fidelity while preserving the semantic-free `element` contract.

## Core Definition (Locked)
`element` remains: one distinct, renderable visual unit extracted from the source image, described without semantic meaning, and defined only by observable visual properties.

## Product Decisions (Locked)
1. Keep existing three-stage envelope: `inventory`, `geometry`, `appearance`.
2. Keep semantic-free ids and vocabulary rules.
3. Add renderability-first behavior: if an effect cannot be represented by current primitives, use explicit visual fallback via supported primitives (including `image` shape).
4. Add end-to-end verification in compiler flow (structure + visual fidelity checks).
5. No deployment work in this feature.

## Scope
1. Renderer upgrades for missing fidelity-critical capabilities.
2. Validator upgrades with deterministic visual fidelity checks.
3. Compiler page upgrades for source-image verification workflow.
4. Speckit prompt/agents upgrades to enforce universal renderability and fidelity guards.
5. New spec/plan/tasks governance files.

## Functional Requirements

### FR-1 Renderer Completeness
1. Canvas `shape:"circle"` must apply true circular clipping in rendered output.
2. `geometry.shape:"image"` must render as image content (not placeholder rect).
3. Appearance `filter` values (`shadow|glow|blur`) must render deterministic SVG filter output.
4. Existing blend/clip behavior must remain deterministic.

### FR-2 Universal Envelope Renderability
1. Speckit compile flow must generate envelopes that are renderable by current compiler primitives.
2. If source detail cannot be represented by vector primitives alone, envelope may include explicit image patch elements.
3. This rule is universal and domain-agnostic.

### FR-3 End-to-End Fidelity Verification
1. Compiler page must support source image upload for verification.
2. Verification must include structural validity and visual fidelity.
3. Visual fidelity must be deterministic and metric-based (pixel + edge + color summary).
4. Verification output must clearly show pass/fail and reasons.

### FR-4 Prompt/Agent Contract Alignment
1. Master prompt and compile agents must include renderability and fidelity self-check gates.
2. Contract must stay aligned with canonical doc and runtime validator.

## Acceptance Criteria
1. Rendering with circle canvas is clipped correctly.
2. Image geometry renders actual image pixels.
3. Filter appearance fields produce visible effects.
4. Compiler page can verify envelope against uploaded image and show scores.
5. Speckit prompts/agents enforce universal fidelity checks.
6. End-to-end local workflow succeeds:
   1. Generate envelope via speckit prompt.
   2. Save to `app/exports/compiler/visual_envelope_full.json`.
   3. Paste to compiler.
   4. Render output and pass verification thresholds.

## Out of Scope
1. Deployment, git push, or release orchestration.
2. Domain-specific optimizations (watchfaces, dashboards, etc.).
3. ML-based style transfer or non-deterministic reconstruction.
