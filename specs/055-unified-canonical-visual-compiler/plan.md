# Plan: Unified Canonical Visual Compiler (055)

## Why
Recent regressions came from schema drift across docs, prompts, and runtime. The fix is governance: one canonical schema source and strict anti-drift checks in compile orchestration files.

## Approach
1. Canonicalize schema in `AI_ANALYSIS_COMPILER_PROMPT.md`.
2. Reduce `AI_ANALYSIS_COMPILER_GUIDE.md` to runbook-only content.
3. Add contract-lock rules to speckit master prompt.
4. Add contract-lock rules to each compile agent.
5. Verify runtime files still typecheck clean.

## Work Breakdown
1. Docs
   - Rewrite canonical prompt doc with current runtime contract.
   - Rewrite guide as operation + troubleshooting only.
2. Speckit
   - Update master prompt with explicit no-drift rules.
   - Update inventory, geometry, appearance, audit, emit, patch agents with canonical locks.
3. Verification
   - Validate no TS errors in touched runtime files.
   - Confirm lock-step references are documented.

## Risks
1. Over-compressing guide may remove useful onboarding detail.
2. Agent prompts may still drift if future edits bypass canonical lock rule.

## Mitigations
1. Keep concise but explicit checklist in guide.
2. Keep lock-step file list in canonical doc.
3. Keep spec/tasks for future audit traceability.
