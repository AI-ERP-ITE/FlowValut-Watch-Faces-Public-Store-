# Plan: ID-Locked 4-Stage Compiler Pipeline

## Clarification Steps
1. Executor is ChatGPT 5.3 Codex; design exploits its strength in strict JSON schemas and minimizes its weakness in cross-turn visual memory.
2. Identity (ids + roles + semantic types) is set ONCE in Stage 1 and frozen via `registryHash`; later stages cannot create new identity.
3. The 4 stages are: Registry → Geometry → Appearance → Behavior. Behavior is optional for static faces.
4. The deterministic merger is the single source of truth fed to the renderer; raw stage outputs never reach the renderer.
5. Schema strictness (`additionalProperties:false` + dynamic id enums) makes hallucination of unknown ids structurally impossible.
6. Patch loop is per-id, per-stage. Full re-runs only when registry changes.
7. The pipeline must work uniformly for: complex dials, icon-grid faces, weather faces, pointer-only faces.
8. Legacy single-blob analysis path is preserved for one release behind a toggle.

## Architecture Overview
1. **Stage prompts** (in `app/docs/prompts/`): `registry.prompt.md`, `geometry.prompt.md`, `appearance.prompt.md`, `behavior.prompt.md`, `patch.prompt.md`.
2. **Schemas** (in `app/src/pipeline/schemas/`): `registry.schema.ts`, `geometry.schema.ts`, `appearance.schema.ts`, `behavior.schema.ts` (TypeScript-exported JSON Schema constants for runtime enum injection).
3. **Validators** (in `app/src/pipeline/validators/`): `registryValidator.ts`, `geometryValidator.ts`, `appearanceValidator.ts`, `behaviorValidator.ts`, `mergeValidator.ts`.
4. **Merger** (in `app/src/pipeline/`): `fourStageMerger.ts` exporting `mergeFourStages()` returning `MergedSpec`.
5. **Renderer adapter**: `deterministicCompiler.ts` extended with `renderMergedSpec(spec: MergedSpec)`; legacy `renderAnalysis(json)` kept.
6. **UX**: `CompilerPage.tsx` gains a tabbed 4-stage input area and a Merge button; legacy panel hidden behind toggle.
7. **Defaults table**: `app/src/pipeline/defaults/semanticDefaults.ts` keyed by `semanticType` for `inherit:true` resolution.

## Data Contracts (high-level)
1. `RegistryDoc` = `{ canvas, elements[] }`, frozen, hashed.
2. `GeometryDoc` = `{ registryHash, items[] }` items keyed by registry id.
3. `AppearanceDoc` = `{ registryHash, items[] }` items keyed by registry id.
4. `BehaviorDoc` = `{ registryHash, items[] }` items keyed by registry id (optional).
5. `MergedElement` = registry fields ∪ geometry ∪ appearance ∪ behavior, flattened.
6. `MergedSpec` = `{ canvas, elements: MergedElement[], warnings[], rejected[] }`.
7. `ValidationReport` = `{ ok, failedIds:[{id, stage, reason}], warnings[] }`.

## Implementation Steps
1. Author and check in JSON Schemas as TypeScript constants (so id enums can be dynamically injected from a registry hash).
2. Implement `registryValidator.ts` (uniqueness, naming, enum, image-hash binding).
3. Implement `fourStageMerger.ts` with: ordered iteration, inherit resolution, rejection list, no-id-creation guarantee, no silent drops.
4. Implement remaining stage validators (each ≤80 lines).
5. Implement `mergeValidator.ts` aggregating per-stage validators + merge invariants.
6. Implement `semanticDefaults.ts` with conservative defaults per semantic type.
7. Extend `deterministicCompiler.ts` with `renderMergedSpec(spec)`; reuse existing element drawing routines wherever possible.
8. Update `CompilerPage.tsx`:
   - Add tabbed inputs for Registry / Geometry / Appearance / Behavior / Patch.
   - Show per-stage validation status.
   - Add Merge button → renders preview from `MergedSpec`.
   - Keep legacy single-blob mode behind a toggle.
9. Author the 5 stage prompt files in `app/docs/prompts/` (registry, geometry, appearance, behavior, patch). Each ≤80 lines, JSON-only output instruction.
10. Update `app/docs/AI_ANALYSIS_COMPILER_PROMPT.md` to point to the 4-stage prompts and describe the patch loop.
11. Update `app/docs/AI_ANALYSIS_COMPILER_GUIDE.md` to describe the 4-stage contract, registry hash, defaults table, and merge invariants.
12. Add an Apply-to-Studio bridge variant that consumes `MergedSpec` directly.

## Validation Steps
1. Build passes (`npm run build`) with no TS errors.
2. Schema unit tests reject: unknown id, duplicate id, missing required field, missing `registryHash`.
3. Merger unit tests verify: every registry id appears in `MergedSpec.elements` OR in `rejected[]`.
4. Patch loop test: a single failed id can be re-emitted and merged without disturbing other ids.
5. Coverage tests across face types: complex dial, icon grid, weather, pointer-only.
6. Renderer test: `MergedSpec` renders deterministically (same input → identical SVG bytes).
7. Legacy regression: existing single-blob analysis still renders unchanged.
8. Docs verification: prompts and guide reference the same schema field names; no drift between guide and code.

## Risks & Mitigations
1. **Stage output drift across turns** — mitigated by `registryHash` requirement on every later stage.
2. **Renderer dual-input complexity** — mitigated by keeping legacy path read-only and only adding a new entry point.
3. **Default resolution ambiguity** — mitigated by a single hard-coded `semanticDefaults` table reviewed during spec acceptance.
4. **Token cost** — mitigated by ≤80-line stage prompts and patch loop avoiding full re-runs.
5. **Image-hash binding** — for v1 accept manual `imageHash` paste; revisit automation later.

## Rollout
1. Land schemas + merger + validators behind a feature flag.
2. Enable flag for `/studio/compiler` only.
3. Run side-by-side comparison on 3 reference faces (dial, icon grid, weather).
4. Once parity confirmed, make 4-stage default; legacy path retained one release.
5. Remove legacy path in next release after no regressions reported.
