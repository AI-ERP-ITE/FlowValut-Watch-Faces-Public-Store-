# Tasks: Universal Image Fidelity Pipeline (056)

## Implementation
- [x] T001 Create `app/specs/056-universal-image-fidelity-pipeline/{spec.md,plan.md,tasks.md}`.
- [x] T002 Update `app/src/pipeline/visualRenderer.ts` to apply circle canvas clipping.
- [x] T003 Update `app/src/pipeline/visualRenderer.ts` to render `shape:"image"` as real image.
- [x] T004 Update `app/src/pipeline/visualRenderer.ts` to support appearance filters (`shadow|glow|blur`).
- [x] T005 Add deterministic visual fidelity scorer utility under `app/src/pipeline/`.
- [x] T006 Extend `app/src/pipeline/visualValidator.ts` with fidelity gate API.
- [x] T007 Update `app/src/CompilerPage.tsx` to support source-image upload + fidelity panel.
- [x] T008 Update canonical doc `app/docs/AI_ANALYSIS_COMPILER_PROMPT.md` with universal renderability/fidelity policy.
- [x] T009 Update `.github/prompts/speckit.compile.master.prompt.md` with renderability/fidelity self-check gates.
- [x] T010 Update compile agents (`inventory/geometry/appearance/audit/emit/patch`) for universal fidelity enforcement.

## Verification
- [x] V001 Validate TypeScript/diagnostics for touched files.
- [ ] V002 Run end-to-end local flow from prompt output to compiler render and verify fidelity metrics. (Blocked: `/studio/compiler` is private-auth gated and this environment is missing required `VITE_FIREBASE_*` variables plus authenticated session.)
- [x] V003 Confirm no deploy/push operations performed.
