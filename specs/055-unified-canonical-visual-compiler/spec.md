# Feature Specification: Unified Canonical Visual Compiler

**Feature Branch**: `[055-unified-canonical-visual-compiler]`
**Created**: 2026-04-30
**Status**: Implemented
**Supersedes (contract governance)**: 054 visual envelope docs/prompt drift variants

## Objective
Create one canonical schema authority for the visual envelope pipeline and remove schema drift between docs, speckit prompts/agents, validator, and renderer.

## Product Decisions (Locked)
1. Canonical schema source is `app/docs/AI_ANALYSIS_COMPILER_PROMPT.md`.
2. `app/docs/AI_ANALYSIS_COMPILER_GUIDE.md` is runbook only (no schema duplication).
3. Speckit master and compile agents must reference canonical doc and must not define conflicting schema variants.
4. Geometry transform contract is flat keys only: `rotation`, `scaleX`, `scaleY`, `pivotX`, `pivotY`.
5. Canvas dimensions must match source image pixel resolution.

## Scope
1. Rewrite canonical prompt doc to align with runtime contract.
2. Slim guide doc to operational instructions.
3. Add anti-drift lock rules to speckit compile master prompt.
4. Add canonical lock + anti-drift checks to all six compile agents.
5. Record spec/plan/tasks for governance and future audits.

## Functional Requirements

### FR-1 Canonical Contract Authority
1. `AI_ANALYSIS_COMPILER_PROMPT.md` must define envelope shape and field contract used by prompts and runtime.
2. All compile agents and master prompt must treat canonical doc as source of truth.
3. Conflicting schema alternatives are forbidden in agents.

### FR-2 Transform and Geometry Contract
1. Nested transform object forms are forbidden.
2. Only flat transform keys are valid.
3. Polygon points must be tuple arrays.

### FR-3 Canvas Fidelity Contract
1. `inventory.canvas.width` and `inventory.canvas.height` must equal source image resolution.
2. Audit and emit stages must explicitly check this constraint.

### FR-4 Guide and Prompt Separation
1. Prompt doc remains canonical schema source.
2. Guide remains lightweight operator runbook.
3. Schema duplication in guide is removed.

## Acceptance Criteria
1. Canonical doc reflects runtime field names and constraints.
2. Guide doc no longer duplicates schema tables.
3. Speckit master prompt contains canonical lock + transform/canvas anti-drift checks.
4. All six compile agents contain canonical lock instructions.
5. TypeScript diagnostics for touched runtime files remain clean.

## Out of Scope
1. Runtime renderer feature expansion.
2. Validator algorithm redesign.
3. Route/UI redesign.
