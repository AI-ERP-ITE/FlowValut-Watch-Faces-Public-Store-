# 08 - Risks and Rollback

## Risk Register

### R-001 Visual regression in existing templates

Cause: compositing consistency patch alters edge-case rendering.
Mitigation: targeted regression scenarios and fallback logic.
Rollback: revert renderer patch commit.

### R-002 Unexpected look shift from fallback baseline

Cause: contrast default behavior changed.
Mitigation: apply only when value missing.
Rollback: restore previous fallback constant.

### R-003 Snapshot/live parity mismatch

Cause: capture pipeline not matching final visual branch.
Mitigation: parity tests for mask/effects-heavy samples.
Rollback: disable snapshot mode toggle behind safe default.

### R-004 Snapshot data corruption

Cause: malformed metadata or storage payload.
Mitigation: validation + fail-safe fallback to live mode.
Rollback: clear snapshot metadata and continue live mode.

### R-005 Deploy route mismatch

Cause: docs/studio index not updated with current hash.
Mitigation: explicit route and hash verification checklist.
Rollback: redeploy previous known-good docs bundle.

## Rollback Playbook

1. Identify failing step and affected commit.
2. Revert only scoped commit(s), avoid unrelated rollback.
3. Rebuild and redeploy known-good state.
4. Re-run URL and hash verification matrix.
5. Document rollback reason and follow-up fix plan.
