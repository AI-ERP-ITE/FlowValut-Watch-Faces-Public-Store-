# Feature Specification: Visual Envelope Pipeline

**Feature Branch**: `[054-visual-envelope-pipeline]`
**Created**: 2026-04-30
**Status**: Implemented (deployed: app submodule `7affb39`, root `8007596`)
**Supersedes (in part)**: `053-analysis-compiler-pipeline`

## Objective
Replace the watchface-semantic analysis-to-compile pipeline (053) with a **pure-visual** pipeline that operates on shapes, fills, strokes, transforms, and layering — with **no built-in concept of "watchface"**. The compiler accepts any image type (logo, icon, UI sketch, watchface mockup) and renders deterministic SVG. Watchface semantics, when needed, are layered on top by the consuming editor, not by the compiler.

## Product Decisions (Locked)
1. AI analysis runs **chat-side** via Spec Kit prompts (`.github/prompts/speckit.compile.*`) — not via in-app API/UI.
2. The chat pipeline emits a single JSON artifact called the **Visual Envelope** (`{ inventory, geometry, appearance }`).
3. The in-app **Compiler** page (`/studio/compiler`, private route) accepts a pasted Visual Envelope, validates it through 6 gates, and renders a deterministic SVG preview.
4. The validator and renderer are **shape-only**. A vocabulary gate (G6) actively rejects watchface-semantic tokens (bezel, hand, complication, battery, …) anywhere in the envelope.
5. The contract is documented in `app/docs/AI_ANALYSIS_COMPILER_PROMPT.md` (authoritative spec) and `app/docs/AI_ANALYSIS_COMPILER_GUIDE.md` (operator manual). Both are kept in lock-step with the TS types.

## Scope
1. New TS types: `VisualEnvelope`, `InventoryDoc`, 10 geometry forms, `Fill`/`Stroke` unions, `ValidationReport`, `MergedSpec`.
2. New validator with 6 deterministic gates.
3. New renderer producing deterministic SVG with `<defs>` for gradients/clipPaths and per-element `<g data-id … data-kind … data-z …>` wrappers.
4. Rewrite of `/studio/compiler` UX: paste textarea → inventory panel → 6-gate validation report → compile preview.
5. Removal of all watchface-semantic compiler code from the previous (053) implementation.
6. Spec Kit prompt + agent set for the chat-side analysis (7 prompts + 6 agents under `.github/`).
7. Rewrite of both compiler docs to reflect the visual envelope contract.

## Functional Requirements

### FR-1 Visual Envelope Contract
1. The envelope MUST be a JSON object with exactly the keys `inventory`, `geometry`, `appearance`.
2. `inventory.canvas` MUST contain `{ width, height, shape: 'rect' | 'circle' }`.
3. `inventory.elements` MUST be an array of `{ id, kind, bbox, zOrder, groupId }`.
4. Every `id` MUST match `^[a-z][a-z0-9_]{0,63}$` and MUST be **shape-named**, not purpose-named.
5. The same `id` set MUST appear in `inventory.elements`, `geometry`, and `appearance` (G5 cross-stage parity).

### FR-2 Geometry
1. Geometry entries MUST carry `id` + a `shape` discriminator from: `circle | arc | line | rect | polygon | path | text | image | group | inherit`.
2. Each shape MUST provide its required numeric fields (e.g. `circle` requires `cx, cy, r`).
3. Optional `transform` MAY contain `rotateDeg`, `rotateOrigin`, `translate`, `scale`.
4. Numeric values MUST be finite; radii MUST be ≥ 0; polygons MUST have ≥ 3 points; `arc.rInner` MUST be ≤ `arc.rOuter`.

### FR-3 Appearance
1. Appearance entries MUST carry `id` + `fill` + `stroke` (or be `{ id, inherit: true }`).
2. `fill` MUST use one of: `solid` (`color`), `linear` (`stops`, `angleDeg`), `radial` (`cx`, `cy`, `r`, `stops`), or `none`.
3. Gradients MUST have ≥ 2 stops with `offset ∈ [0, 1]`.
4. Hex colors MUST match `^#([0-9a-f]{6}|[0-9a-f]{8})$` (lowercase 6 or 8 digit).
5. `stroke` MUST be `'none'` or `{ color, width (≥0), cap?, join?, dashArray?, opacity? }`.
6. `clipPath` (if present) MUST reference an existing inventory id.

### FR-4 Validation Gates
The validator MUST run six gates in order and produce `{ isValid, gates: ValidationGate[], failedIds: [] }`:
- **G1 Shape** — top-level keys present; canvas valid; arrays are arrays.
- **G2 Inventory** — id pattern, id uniqueness, zOrder uniqueness, group rules (no nesting; group must have ≥1 child; non-null `groupId` must reference a group).
- **G3 Geometry** — per-shape required fields; numeric sanity.
- **G4 Appearance** — fill/stroke shapes; hex format; gradient stops; clipPath references resolvable.
- **G5 Cross-stage parity** — id set equality across inventory, geometry, appearance.
- **G6 Vocabulary** — forbidden token scan (case-insensitive): `bezel, dial, crown, pusher, subdial, complication, hour_hand, minute_hand, second_hand, pointer, tick, marker, numeral, screw, lume_pip, time_pointer, arc_progress, battery, steps, heart_rate, time_hour, time_minute, time_second`.

### FR-5 Renderer
1. Render order MUST be ascending `zOrder`.
2. Each element MUST emit a `<g data-id="…" data-kind="…" data-z="…">` wrapper.
3. Linear/radial gradients MUST be promoted to `<defs>` with deterministic ids `vs_grad_<n>`.
4. `clipPath` references MUST be promoted to `<defs>` with deterministic ids `vs_clip_<n>`.
5. Groups MUST render their children inside the parent `<g>`; children MUST be skipped at top level.
6. `inherit` geometry/appearance MUST fall back to `DEFAULT_GEOMETRY` (bbox + kind) and `DEFAULT_FILL = solid #888888` / `DEFAULT_STROKE = 'none'`.
7. The renderer MUST NOT invent geometry, ignore unknown fields silently, or apply watchface-specific defaults.

### FR-6 Compiler Page UX
1. Route: `/studio/compiler` (private; existing route preserved from 053).
2. UI: paste textarea (Visual Envelope JSON), inventory panel (`id · kind · z<order>`), validation panel (six gates with PASS/WARN/FAIL + details), compile preview (SVG).
3. **Compile** button MUST be disabled when `report.isValid === false`.
4. When the textarea changes after a successful compile, an amber "Input changed — compile again" hint MUST appear.
5. When any gate FAILS, a "Failed IDs" box MUST surface the patch handoff (`use:speckit.compile.patch.prompt.md`).

### FR-7 Chat-Side Spec Kit Pipeline
1. Master prompt: `.github/prompts/speckit.compile.master.prompt.md`.
2. Sub-stages (each as prompt + agent pair): `inventory`, `geometry`, `appearance`, `audit`, `patch`, `emit`.
3. The `emit` agent MUST output exactly the Visual Envelope JSON ready for paste into the Compiler page.
4. The `audit` agent MUST run the same 6 gates as the in-app validator, in the same order, with the same forbidden vocabulary.
5. The `patch` agent MUST consume `{ envelope, validationReport }` and produce a corrected envelope.

### FR-8 Documentation
1. `app/docs/AI_ANALYSIS_COMPILER_PROMPT.md` — authoritative contract: top-level shape, inventory rules, 10-form geometry table, fill/stroke schemas, G5/G6 rules, full worked example, 12-point pre-paste checklist, source file map.
2. `app/docs/AI_ANALYSIS_COMPILER_GUIDE.md` — operator manual: end-to-end flow, six-gate cheat sheet, authoring rules, troubleshooting table.
3. Any change to the contract MUST update **all** of: types, validator, renderer, CompilerPage sample, both docs, and the speckit.compile.* agents.

## Non-Goals
- Watchface semantics (hand mapping, AOD overlays, complication binding) — stays out of compiler scope.
- ZPK packaging — separate pipeline.
- API-side AI calls — chat-only by design.
- Asset/font embedding — the compiler emits inline SVG; asset handling lives in the editor.

## Acceptance Criteria
- ✅ `tsc -b` clean across the app.
- ✅ Zero references in `app/src/` to the deleted modules (`analysisCompiler`, `complianceValidator`, `deterministicCompiler`, `layerSequenceValidator`, `analysisCompilerPrompt`).
- ✅ `/studio/compiler` loads with the 4-element sample envelope, all 6 gates PASS, and **Compile** renders the preview SVG.
- ✅ Pasting an envelope containing the token `bezel` causes G6 to FAIL.
- ✅ Pasting an envelope with mismatched id sets causes G5 to FAIL with the offending id list.
- ✅ Hash parity in `app/docs/index.html` and `app/docs/studio/index.html` after `npm run deploy:docs:private`.
- ✅ Neither deployed HTML contains `/src/main.tsx`.

## Source Files
| Concern        | Path                                                 |
| -------------- | ---------------------------------------------------- |
| TS types       | `app/src/types/visualSpec.ts`                        |
| Validator      | `app/src/pipeline/visualValidator.ts`                |
| Renderer       | `app/src/pipeline/visualRenderer.ts`                 |
| UI             | `app/src/CompilerPage.tsx`                           |
| Spec doc       | `app/docs/AI_ANALYSIS_COMPILER_PROMPT.md`            |
| Operator guide | `app/docs/AI_ANALYSIS_COMPILER_GUIDE.md`             |
| Chat prompts   | `.github/prompts/speckit.compile.*.prompt.md`        |
| Chat agents    | `.github/agents/speckit.compile.*.agent.md`          |

## Deployment Record
| Item            | Value                                            |
| --------------- | ------------------------------------------------ |
| Build target    | private (`npm run deploy:docs:private`)          |
| Bundle hash     | `index-Xh7EUhxQ.js` / `index-VhJRlysz.css`       |
| App commit      | `7affb39` on `origin/main`                       |
| Root commit     | `8007596` on `origin/032-device-parity-root-cause` |
| Public push     | not promoted (private build)                     |
