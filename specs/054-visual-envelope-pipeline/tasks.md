# Tasks: Visual Envelope Pipeline (054)

**Status**: All tasks complete. Recorded for reference / future re-runs.
**Companion docs**: [`spec.md`](spec.md), [`plan.md`](plan.md)

## Phase 1 — Spec Kit (chat-side)

### T1.1 Create master prompt
- File: `.github/prompts/speckit.compile.master.prompt.md`
- Orchestrates the six sub-stages.
- Status: ✅

### T1.2 Create stage prompts (6)
- `.github/prompts/speckit.compile.{inventory,geometry,appearance,audit,patch,emit}.prompt.md`
- Each is a thin stub pointing at its agent.
- Status: ✅

### T1.3 Create stage agents (6)
- `.github/agents/speckit.compile.{inventory,geometry,appearance,audit,patch,emit}.agent.md`
- Shape: `OBJECTIVE / RULES / PROCESS / PRECONDITION / EXECUTION RULE / STATUS`.
- Status: ✅

## Phase 2 — App pipeline (TypeScript)

### T2.1 Create `app/src/types/visualSpec.ts`
- Exports: `VisualEnvelope`, `InventoryDoc`, `InventoryElement`, `Canvas`, 10 `Geometry*` forms, `GeometryTransform`, `Fill` union, `Stroke` union, `Texture`, `AppearanceItem`, `AppearanceInherit`, `AppearanceEntry`, `ValidationGate`, `ValidationReport`, `MergedElement`, `MergedSpec`, type guards `isGeometryInherit`, `isAppearanceInherit`.
- Acceptance: `tsc -b` clean.
- Status: ✅

### T2.2 Create `app/src/pipeline/visualValidator.ts`
- Export: `validateVisualEnvelope(env): ValidationReport`.
- Implements gates G1–G6 in order.
- Constants: `ID_PATTERN`, `HEX_COLOR`, `FORBIDDEN_WORDS`.
- Acceptance: `tsc -b` clean; pasting a known-good envelope yields `isValid: true` with all 6 gates PASS.
- Status: ✅

### T2.3 Create `app/src/pipeline/visualRenderer.ts`
- Exports: `mergeVisualEnvelope(env): MergedSpec`, `renderVisualSpec(env): RenderResult { svg, html, merged }`.
- Per-element `<g data-id … data-kind … data-z …>` wrappers.
- `<defs>` for gradients (`vs_grad_<n>`) and clipPaths (`vs_clip_<n>`).
- Group recursion (children inside parent `<g>`, skip at top level).
- `inherit` → DEFAULT_GEOMETRY / DEFAULT_FILL / DEFAULT_STROKE.
- Acceptance: `tsc -b` clean; sample envelope renders to non-empty SVG containing exactly one `<g data-id="el_001">` per inventory element.
- Status: ✅

### T2.4 Rewrite `app/src/CompilerPage.tsx`
- Replace imports: `VisualEnvelope` / `validateVisualEnvelope` / `renderVisualSpec`.
- Replace `SAMPLE_ANALYSIS` → `SAMPLE_ENVELOPE` (4-element example).
- Replace "Layer Sequence" panel → "Inventory" panel (`id · kind · z<order>`).
- Validation panel renders `report.gates` with PASS/WARN/FAIL icons.
- Failed-IDs box surfaces `use:speckit.compile.patch.prompt.md` handoff.
- Compile button gated on `report.isValid`.
- Acceptance: page loads sample envelope, all gates PASS, compile button enabled, click renders preview.
- Status: ✅

### T2.5 TypeScript verification (mid-flight)
- Run: `cd app && npx tsc -b`
- Expected: exit 0, no errors.
- Status: ✅ (initial run flagged 3 narrowing errors in renderer + 1 cast warning in validator; fixed with `isGeometryInherit` guard and `unknown` intermediate cast)

## Phase 3 — Cleanup

### T3.1 Delete orphaned 053 modules
- `app/src/types/analysisCompiler.ts`
- `app/src/pipeline/complianceValidator.ts`
- `app/src/pipeline/deterministicCompiler.ts`
- `app/src/pipeline/layerSequenceValidator.ts`
- `app/src/pipeline/analysisCompilerPrompt.ts`
- Pre-check: grep for consumers across `app/src/` — confirmed no external references.
- Status: ✅

### T3.2 Remove re-export from `app/src/types/index.ts`
- Delete: `export * from './analysisCompiler';` (line 288).
- Status: ✅

### T3.3 TypeScript verification (post-cleanup)
- Run: `cd app && npx tsc -b --force`
- Expected: exit 0.
- Status: ✅

## Phase 4 — Documentation

### T4.1 Rewrite `app/docs/AI_ANALYSIS_COMPILER_PROMPT.md`
- Authoritative VisualEnvelope spec.
- Sections: pipeline overview, top-level shape, inventory rules, 10-form geometry table, fill/stroke schemas, G5/G6 rules, full worked 4-element example matching `SAMPLE_ENVELOPE`, 12-point pre-paste checklist, source file map.
- Status: ✅

### T4.2 Rewrite `app/docs/AI_ANALYSIS_COMPILER_GUIDE.md`
- Operator manual.
- Sections: end-to-end flow, six-gate cheat sheet, authoring rules of thumb, troubleshooting table, renderer guarantees, source file map.
- Status: ✅

## Phase 5 — Deploy

### T5.1 Pre-deploy build
- Run: `cd app && npm run deploy:docs:private` (runs `build:private` then sync to `docs/`).
- Required env vars: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` (loaded from `app/.env.private.local`).
- Pre-deploy fix: source `app/index.html` had stale hashed asset references that wouldn't resolve at build time. Replaced with `<script type="module" src="/src/main.tsx">` for the build, then re-mirrored to deployed hashes after.
- Status: ✅ — bundle hash `index-Xh7EUhxQ.js` / `index-VhJRlysz.css`.

### T5.2 Post-deploy verification
- `docs/index.html` and `docs/studio/index.html` reference the same hashed JS — confirmed.
- Neither file contains `/src/main.tsx` — confirmed.
- Source `app/index.html` mirrored to deployed hashes — confirmed.
- Status: ✅

### T5.3 Commit & push
- App submodule:
  - `7891a4c` — implementation + docs (combined; minor protocol drift, see plan §Risks).
  - `7affb39` — deploy artifacts (`docs/`, mirrored `index.html`).
  - Pushed to `origin/main` (`879e6b7..7affb39`).
- Root repo:
  - `41767d5` — speckit prompts/agents under `.github/`.
  - `8007596` — submodule pointer bump to `7affb39`.
  - Pushed to `origin/032-device-parity-root-cause` (`c72a408..8007596`).
- Public remote: not promoted (private build).
- Status: ✅

## Phase 6 — Reference (this spec)

### T6.1 Create spec files
- `app/specs/054-visual-envelope-pipeline/spec.md`
- `app/specs/054-visual-envelope-pipeline/plan.md`
- `app/specs/054-visual-envelope-pipeline/tasks.md`
- Status: ✅ (this commit)

## Acceptance summary
- [x] All 6 chat agents present under `.github/agents/`.
- [x] All 7 chat prompts present under `.github/prompts/` (master + 6 stages).
- [x] 3 new TS modules (`visualSpec.ts`, `visualValidator.ts`, `visualRenderer.ts`).
- [x] 5 orphaned modules deleted.
- [x] CompilerPage rewritten for VisualEnvelope.
- [x] `tsc -b --force` clean.
- [x] Both docs rewritten as authoritative + operator manuals.
- [x] Private build deployed; hash parity verified.
- [x] App + root commits pushed to their tracked branches.
- [x] Spec/plan/tasks recorded under `app/specs/054-visual-envelope-pipeline/`.

## Out of scope (deferred)
- Nested groups (v2).
- ZPK packaging integration.
- Public-target promotion.
- Snapshot tests for deterministic SVG output.
- Editor-side consumption of compiled envelopes.
