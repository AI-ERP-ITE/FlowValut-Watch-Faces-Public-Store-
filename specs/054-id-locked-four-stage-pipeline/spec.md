# Feature Specification: ID-Locked 4-Stage Compiler Pipeline

**Feature Branch**: `[054-id-locked-four-stage-pipeline]`
**Created**: 2026-04-29
**Status**: Draft
**Supersedes runtime model of**: 053-analysis-compiler-pipeline (single-blob analysis JSON)
**Executor assumption**: ChatGPT 5.3 Codex (agent mode) — strict-schema-friendly, weak at long visual memory, prone to hallucination under loose schemas.

## Objective
Replace the current single-blob analysis JSON with a deterministic, ID-locked, 4-stage decomposition pipeline so an AI agent (Codex) cannot drift, duplicate, or invent visual parts across stages. Identity is frozen in Stage 1 and reused unchanged by Stages 2–4. The deterministic compiler renders only what survives a strict merge.

## Problem Recap
1. Single-blob analysis JSON allowed silent drift: shapes invented, ids reused, lanes collapsed, geometry duplicated between scaffold hints and element rows.
2. Long natural-language prompts could not bind the model to source visuals across many factors at once.
3. Renderer received contradictory or duplicated geometry, producing approximated output regardless of how strict the renderer became.

## Solution Summary
A 4-stage ID-locked pipeline:
- **Stage 1 — Registry**: AI lists every visible element with stable `id`, `layerRole`, `semanticType`, `geometryClass`, `zHint`. Frozen and hashed after acceptance.
- **Stage 2 — Geometry**: AI provides shape/position/clip per registry id. May not invent ids.
- **Stage 3 — Appearance**: AI provides fill/color/luminance/texture/asset per registry id. May not invent ids.
- **Stage 4 — Behavior** (optional): AI provides binding/rotation/visibility per registry id.
- **Merge**: Deterministic merger combines stages by id; rejected/missing ids reported; renderer receives a single `MergedSpec`.
- **Patch loop**: Validator reports `failedIds[]`; AI re-emits only those ids in the named stage.

## Product Decisions (Locked)
1. AI may only reference ids that exist in the frozen registry (schema enforced via enum injection).
2. The registry is hashed after Stage 1 and `registryHash` is required in Stages 2–4.
3. The deterministic compiler consumes `MergedSpec`, never raw stage outputs.
4. Old single-blob analysis path remains available for one release behind a legacy toggle.
5. Each stage has its own JSON Schema and its own validator.
6. Patch loop is per-id and per-stage; full re-runs are not allowed except on registry change.
7. Targets supported equally: complex dials, icon grids, weather faces, pointer-only faces.

## Scope
1. New schemas: `registry.schema.json`, `geometry.schema.json`, `appearance.schema.json`, `behavior.schema.json`.
2. New merger module: `fourStageMerger.ts` producing `MergedSpec`.
3. New validators: registry, geometry, appearance, behavior, merge.
4. Compiler page UX: 4 stage textareas (or one auto-detecting input) + Merge button + per-stage validation panel + patch input.
5. Renderer adapter: `deterministicCompiler.ts` accepts `MergedSpec` (additive, keeps legacy path).
6. Docs updated: `AI_ANALYSIS_COMPILER_PROMPT.md`, `AI_ANALYSIS_COMPILER_GUIDE.md`.
7. Per-stage prompt templates checked into `app/docs/prompts/` (registry, geometry, appearance, behavior, patch).

## Functional Requirements

### FR-1 Registry (Stage 1)
1. Output MUST be strict JSON conforming to `registry.schema.json`.
2. MUST include `canvas.{w,h,shape}` and `elements[]`.
3. Each element MUST have unique `id` (snake_case, `^[a-z][a-z0-9_]{1,40}$`).
4. Each element MUST set `layerRole`, `semanticType`, `geometryClass`, `zHint`.
5. Repeated identical marks (ticks, indices) MUST be grouped as one element with `geometryClass="group"`.
6. No invented elements; every element must correspond to a visible part of the source image.
7. After acceptance, registry is hashed (`sha256(canonicalRegistryJSON + imageHash)`) and frozen.

### FR-2 Geometry (Stage 2)
1. Output MUST conform to `geometry.schema.json`.
2. MUST include `registryHash` matching frozen Stage 1 hash.
3. MUST include one `items[]` entry for every registry id; entry is either `{id, inherit:true}` or a full `{id, shape, clip?, transform?}`.
4. Schema enum for `id` is dynamically injected from registry; unknown ids are rejected at schema time.
5. Shapes use canvas pixel coordinates from `registry.canvas`.
6. No fills, no colors, no opacity in this stage.
7. Tick groups MUST emit `shape.type="group"` with line children, never duplicated as separate top-level ids.

### FR-3 Appearance (Stage 3)
1. Output MUST conform to `appearance.schema.json`.
2. MUST include `registryHash`.
3. MUST include `items[]` entry for every registry id (full or `inherit:true`).
4. Supports `fill` (`solid|linear|radial|none`), `stroke`, `luminance`, `texture`, `asset`, `opacity`.
5. Gradient backgrounds must be expressed as `linear`/`radial` with explicit stops; flat solid only when source is genuinely flat.
6. No geometry mutation here.

### FR-4 Behavior (Stage 4, optional)
1. Output MUST conform to `behavior.schema.json`.
2. MUST include `registryHash`.
3. Provides `binding`, `rotation`, `visibility` per id where relevant.
4. Static decor elements MAY be omitted or marked `inherit:true`.
5. Hand bindings MUST match semantic type (`hand_hour`→`time_hour`, etc.).

### FR-5 Deterministic Merge
1. Merger iterates `registry.elements` in declared order.
2. For each id, pulls matching stage entries; if any required stage is missing the id, push to `rejected[]` and skip rendering for that id.
3. `inherit:true` resolves via a defaults table keyed by `semanticType`.
4. Output `MergedSpec` is the only input to the renderer.
5. Merger MAY NOT introduce ids that are not in the registry.
6. Merger MAY NOT silently drop registry ids; every drop must appear in `rejected[]` with a reason.

### FR-6 Validator-Driven Patch Loop
1. Validators output structured JSON: `{ ok, failedIds:[{id, stage, reason}], warnings }`.
2. AI re-emits only patches for failed ids in the named stage.
3. Patch merge = overwrite of that id's entry within that stage; no other ids touched.
4. If registry itself fails validation, all subsequent stage outputs are invalidated and must be re-issued.

### FR-7 Coverage Across Face Types
1. Complex dials: registry contains rings/ticks/indices/subdials/bridges; full geometry + appearance.
2. Icon grids: registry contains icon ids; geometry mostly position; appearance mostly `asset`.
3. Weather faces: registry has weather widgets + temp text; behavior stage carries data bindings.
4. Pointer-only faces: registry has 2–3 hand ids + bg; minimal stages.

### FR-8 Strict Schema Enforcement
1. All stage schemas use `additionalProperties:false` at every level.
2. `id` fields are `enum` of registry ids in stages 2–4 (injected at runtime).
3. Codex must not be able to emit a syntactically valid stage doc that contains an unknown id.

## Non-Functional Requirements
1. Each stage prompt MUST be ≤80 lines and contain: role, inputs, schema reference, rules, output instruction.
2. No stage prompt may invite English explanation or markdown — JSON-only outputs.
3. Total token cost target: ≤4× a single-blob analysis when all 4 stages run; ≤1.2× for typical patch loops.
4. The renderer change for `MergedSpec` MUST remain backwards compatible with the legacy single-blob path for one release.

## Acceptance Criteria
1. Given a watchface image, executing the 4 stages in order yields a `MergedSpec` that renders without scaffold guesses.
2. An attempt to add an id not in the registry is rejected at schema parse time.
3. An attempt to silently drop a registry id is reported in `rejected[]`.
4. Patching a single failed id does not modify any other id's data.
5. The same pipeline successfully renders: a complex dial, an icon-grid face, a weather face, a pointer-only face.
6. Switching back to legacy mode still renders existing analysis JSON without regression.

## Out of Scope
1. Automated image hashing service (manual paste of `imageHash` is acceptable for v1).
2. Multi-AI orchestration (only one executor at a time).
3. ZPK packaging changes; the pipeline output still flows into the existing apply-to-Studio bridge.
