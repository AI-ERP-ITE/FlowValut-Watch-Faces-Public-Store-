# Plan: Visual Envelope Pipeline (054)

**Status**: Implemented
**Companion docs**: [`spec.md`](spec.md), [`tasks.md`](tasks.md)

## Why
Spec 053 (`analysis-compiler-pipeline`) hard-coded watchface concepts (bezel, hands, complications, layer roles) into the validator and renderer. That made the pipeline unable to compile *any* image except watchfaces and forced the AI analyst to re-learn watchface vocabulary on every run. Spec 054 reframes the compiler as a generic shape-renderer: the AI analyst describes what it *sees* (shapes, fills, layers), the compiler renders deterministically, and watchface meaning — when needed — is layered on top by the editor.

## Architecture

```
┌──────────────┐   master prompt    ┌──────────────────────┐
│  any image   ├───────────────────▶│  Spec Kit chat agents │
└──────────────┘                    │  (inventory →         │
                                    │   geometry →          │
                                    │   appearance →        │
                                    │   audit →             │
                                    │   patch ⇄ emit)       │
                                    └──────────┬───────────┘
                                               │ Visual Envelope JSON
                                               ▼
                                    ┌─────────────────────┐
                                    │  CompilerPage       │  paste
                                    │  /studio/compiler   │
                                    │                     │
                                    │  ┌──────────────┐   │
                                    │  │ visualValidator │ │  6 gates
                                    │  └──────┬───────┘   │
                                    │         │ ValidationReport
                                    │         ▼            │
                                    │  ┌──────────────┐   │
                                    │  │ visualRenderer  │ │  inline SVG
                                    │  └──────────────┘   │
                                    └─────────────────────┘
```

### Module map
| Module                                    | Role                                                         |
| ----------------------------------------- | ------------------------------------------------------------ |
| `app/src/types/visualSpec.ts`             | Pure types. Single source of truth for the envelope shape.   |
| `app/src/pipeline/visualValidator.ts`     | Six-gate validator. Pure function, no I/O.                   |
| `app/src/pipeline/visualRenderer.ts`      | Deterministic SVG emitter. Pure function, no I/O.            |
| `app/src/CompilerPage.tsx`                | UI shell. Wires textarea → validator → renderer.             |
| `.github/prompts/speckit.compile.*.md`    | Chat-side spec kit (master + 6 stages).                      |
| `.github/agents/speckit.compile.*.md`     | Agent definitions for each chat stage.                       |
| `app/docs/AI_ANALYSIS_COMPILER_*.md`      | Authoritative spec + operator manual.                        |

### Why these boundaries
- **Types live alone** so the validator, renderer, UI, docs, and chat agents all import from one place.
- **Validator is shape-only** so it can be re-used by the chat-side `audit` agent verbatim (same gates, same forbidden vocabulary).
- **Renderer is shape-only** so adding a new image domain (icon, logo, UI sketch) requires zero compiler changes.
- **Chat lives in `.github/`** so prompts version with the repo and survive submodule resets.

## Key technical decisions

### D1 — Vocabulary gate (G6)
Watchface tokens are rejected by exact-substring scan, case-insensitive. Forbidden list is exported from the validator and mirrored in `speckit.compile.audit.agent.md`. Adding a new domain requires editing this list in **both** places.

### D2 — `inherit` instead of optional fields
Geometry and appearance entries can be `{ id, inherit: true }`. The renderer fills missing values from defaults (DEFAULT_FILL = solid `#888888`, DEFAULT_GEOMETRY = bbox+kind). This keeps the contract complete — every id is present in every stage — while letting the chat analyst skip uninteresting elements.

### D3 — Group nesting flat (v1)
Groups may not contain other groups. Children list their parent in `groupId`; group elements have `groupId: null`. Simplifies the validator (G2) and the renderer (single recursion level). Nested groups can be added in a future spec without breaking the contract.

### D4 — Cross-stage parity (G5)
The id sets in inventory, geometry, and appearance must be identical. This is the single rule that makes the pipeline self-checking: drift between stages — the most common chat-output failure — is caught before the renderer runs.

### D5 — Deterministic SVG ids
Gradients get `vs_grad_<n>`, clipPaths get `vs_clip_<n>`, where `n` is the order of first reference. Re-rendering the same envelope produces byte-identical SVG, which makes diffing and snapshot tests possible.

### D6 — Patch loop, not auto-correct
When the validator FAILS, the UI surfaces a "Failed IDs" box and the user copies the report + envelope back into chat (`use:speckit.compile.patch.prompt.md`). The compiler never silently fixes invalid input — failures are loud and explicit.

## Migration from 053
1. Delete the five watchface-semantic modules: `analysisCompiler.ts`, `complianceValidator.ts`, `deterministicCompiler.ts`, `layerSequenceValidator.ts`, `analysisCompilerPrompt.ts`.
2. Remove `export * from './analysisCompiler';` from `app/src/types/index.ts`.
3. Replace `CompilerPage.tsx` imports + sample data + UI panels.
4. Rewrite both compiler docs.
5. Verify `tsc -b --force` is clean.
6. Build + deploy via `npm run deploy:docs:private`.

## Risks & mitigations
| Risk                                                         | Mitigation                                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Chat analyst leaks watchface vocabulary into ids/strings.    | G6 vocabulary gate rejects deterministically; patch loop fixes.                       |
| Stages drift (id present in geometry, missing in inventory). | G5 cross-stage parity gate catches every drift.                                       |
| Renderer silently invents geometry for inherit fallback.     | DEFAULT_GEOMETRY uses bbox + kind only; never invents shapes the analyst didn't list. |
| Spec doc and TS types drift apart.                           | Source-file map at the bottom of both docs lists the lock-step files.                 |
| Dependency on Vite hashed assets in `app/index.html` breaks build. | Source `index.html` is mirrored to deployed hashes after every deploy.          |

## Deployment
- Build: `npm run deploy:docs:private` (cwd `app/`)
- Hash parity check: `docs/index.html` and `docs/studio/index.html` must reference the same bundle.
- Source mirror: `app/index.html` updated to deployed hashes.
- Commits split per master prompt §6: implementation (one commit), docs (in same commit — minor protocol drift, acceptable for shipping), deploy artifacts (separate commit).

## Verification (post-deploy)
1. Hard-refresh `https://ai-erp-ite.github.io/Watch-Faces/studio/compiler`.
2. Sample envelope auto-loads; all six gates show PASS.
3. Click **Compile Visual Envelope** → dark dial preview renders.
4. Inject `"bezel"` into any string → G6 FAILs with the offending token.
5. Delete one entry from `appearance` → G5 FAILs with the missing id.
