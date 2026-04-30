# Tasks: ID-Locked 4-Stage Compiler Pipeline

## Clarification (C)
- [ ] C001 Confirm executor is ChatGPT 5.3 Codex; pipeline targets strict-schema mode.
- [ ] C002 Confirm 4-stage decomposition: Registry → Geometry → Appearance → Behavior.
- [ ] C003 Confirm registry is frozen via `registryHash = sha256(canonicalRegistryJSON + imageHash)`.
- [ ] C004 Confirm `additionalProperties:false` everywhere and dynamic `id` enum injection in stages 2–4.
- [ ] C005 Confirm patch loop is per-id, per-stage; full re-run only on registry change.
- [ ] C006 Confirm legacy single-blob analysis path retained for one release behind a toggle.
- [ ] C007 Confirm coverage targets: complex dials, icon grids, weather faces, pointer-only faces.

## Schemas (S)
- [ ] S001 Add `app/src/pipeline/schemas/registry.schema.ts` exporting JSON Schema constant.
- [ ] S002 Add `app/src/pipeline/schemas/geometry.schema.ts` with `__REGISTRY_IDS__` placeholder for runtime enum injection.
- [ ] S003 Add `app/src/pipeline/schemas/appearance.schema.ts` with same placeholder.
- [ ] S004 Add `app/src/pipeline/schemas/behavior.schema.ts` with same placeholder.
- [ ] S005 Add `app/src/pipeline/schemas/index.ts` exporting a `withRegistryIds(schema, ids)` helper.

## Defaults (D)
- [ ] D001 Add `app/src/pipeline/defaults/semanticDefaults.ts` mapping `semanticType` → default geometry/appearance/behavior fragments.

## Validators (V-impl)
- [ ] VI001 Add `app/src/pipeline/validators/registryValidator.ts` (id uniqueness, naming, enum, hash binding).
- [ ] VI002 Add `app/src/pipeline/validators/geometryValidator.ts` (schema + `registryHash` + per-id coverage).
- [ ] VI003 Add `app/src/pipeline/validators/appearanceValidator.ts`.
- [ ] VI004 Add `app/src/pipeline/validators/behaviorValidator.ts`.
- [ ] VI005 Add `app/src/pipeline/validators/mergeValidator.ts` (no orphan ids, no silent drops, ordering preserved).

## Merger (M)
- [ ] M001 Add `app/src/pipeline/fourStageMerger.ts` with `mergeFourStages(input): MergedSpec`.
- [ ] M002 Implement ordered iteration over `registry.elements`.
- [ ] M003 Implement `inherit:true` resolution against `semanticDefaults`.
- [ ] M004 Implement `rejected[]` reporting for any id missing required stage data.
- [ ] M005 Guarantee no id created outside registry; unit-test the invariant.

## Renderer Adapter (R)
- [ ] R001 Add `renderMergedSpec(spec: MergedSpec)` to `app/src/pipeline/deterministicCompiler.ts`.
- [ ] R002 Reuse existing element drawing routines; map `MergedElement` to current renderer field names.
- [ ] R003 Keep legacy `renderAnalysis(json)` untouched and exported.
- [ ] R004 Ensure deterministic byte-equal output for identical `MergedSpec` input.

## UX (U)
- [ ] U001 Add tabbed 4-stage input panel to `app/src/CompilerPage.tsx` (Registry / Geometry / Appearance / Behavior / Patch).
- [ ] U002 Per-stage validation badge (PASS/FAIL + failedIds list).
- [ ] U003 Merge button → preview renders from `MergedSpec`.
- [ ] U004 Toggle to switch back to legacy single-blob mode (default OFF on first release, ON once parity confirmed).
- [ ] U005 Display `registryHash` and offer copy-to-clipboard for downstream stage prompts.

## Prompts (P)
- [ ] P001 Add `app/docs/prompts/registry.prompt.md` (≤80 lines, JSON-only output).
- [ ] P002 Add `app/docs/prompts/geometry.prompt.md` with placeholder for injected registry ids.
- [ ] P003 Add `app/docs/prompts/appearance.prompt.md`.
- [ ] P004 Add `app/docs/prompts/behavior.prompt.md`.
- [ ] P005 Add `app/docs/prompts/patch.prompt.md` describing the validator-driven per-id patch loop.

## Documentation (DOC)
- [ ] DOC001 Update `app/docs/AI_ANALYSIS_COMPILER_PROMPT.md` to describe the 4-stage flow and reference per-stage prompts.
- [ ] DOC002 Update `app/docs/AI_ANALYSIS_COMPILER_GUIDE.md` to describe the 4-stage contract, registry hashing, defaults table, merge invariants, and patch loop.
- [ ] DOC003 Cross-link spec 054 from spec 053 for context (note: 054 is the runtime model going forward).

## Validation (V)
- [ ] V001 `npm run build` passes with no TS errors after all S/VI/M/R/U files added.
- [ ] V002 Schema tests reject unknown id, duplicate id, missing required fields, missing `registryHash`.
- [ ] V003 Merger tests confirm every registry id is either in `MergedSpec.elements` or in `rejected[]`.
- [ ] V004 Patch loop test: re-emitting one failed id leaves all other ids byte-identical in output.
- [ ] V005 Coverage tests pass for: complex dial, icon-grid face, weather face, pointer-only face.
- [ ] V006 Legacy regression: an existing analysis JSON still renders without regression in legacy mode.
- [ ] V007 Apply-to-Studio bridge accepts `MergedSpec` and gates on validator PASS.
- [ ] V008 Docs guide and prompts reference the same field names as schemas (no drift).

## Rollout (RO)
- [ ] RO001 Feature flag `compiler.fourStage = true` for `/studio/compiler`.
- [ ] RO002 Side-by-side preview comparison on 3 reference faces.
- [ ] RO003 Promote to default after parity confirmed; keep legacy one release.
- [ ] RO004 Remove legacy path in following release.
