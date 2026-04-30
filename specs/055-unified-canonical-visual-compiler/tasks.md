# Tasks: Unified Canonical Visual Compiler (055)

## Implementation
- [x] T001 Rewrite `app/docs/AI_ANALYSIS_COMPILER_PROMPT.md` as canonical schema authority aligned with runtime contract.
- [x] T002 Rewrite `app/docs/AI_ANALYSIS_COMPILER_GUIDE.md` as runbook-only doc.
- [x] T003 Update `.github/prompts/speckit.compile.master.prompt.md` with canonical lock and anti-drift checks.
- [x] T004 Update `.github/agents/speckit.compile.inventory.agent.md` with canonical lock and source-resolution canvas rule.
- [x] T005 Update `.github/agents/speckit.compile.geometry.agent.md` with flat-transform-only rule.
- [x] T006 Update `.github/agents/speckit.compile.appearance.agent.md` with canonical lock and texture support requirement.
- [x] T007 Update `.github/agents/speckit.compile.audit.agent.md` with transform/canvas anti-drift checks.
- [x] T008 Update `.github/agents/speckit.compile.emit.agent.md` with final transform/canvas checks.
- [x] T009 Update `.github/agents/speckit.compile.patch.agent.md` with patch safety rules for canvas/transform.
- [x] T010 Create `app/specs/055-unified-canonical-visual-compiler/{spec.md,plan.md,tasks.md}`.

## Verification
- [x] V001 Run diagnostics/typecheck verification for touched runtime files.
- [x] V002 Confirm no conflicting schema variants remain in compile master/agents.

## Follow-up (optional)
- [ ] F001 Add automated lint step to detect forbidden nested transform schema in prompt/agent docs.
- [ ] F002 Add CI check requiring canonical doc reference in all compile agent files.
