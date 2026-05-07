# 077 - Snapshot and Mask Alpha Preservation

This spec package addresses the root alpha-loss issue seen after mask operations when switching between snapshot and live rendering.

Primary objective:

- Preserve base shape alpha across all user flows without destructive data loss.

Target route:

- https://ai-erp-ite.github.io/Watch-Faces/studio/parametric/

This package is strict approval-gated.
No task proceeds without explicit user approval.

## File Map

1. `01-plan.md` - phased execution plan and gate approvals.
2. `02-spec.md` - functional requirements and acceptance criteria.
3. `03-architecture.md` - additive design and data contracts.
4. `04-tasks.md` - atomic task list with per-task approvals.
5. `05-validation.md` - validation matrix and test evidence template.
6. `06-review-checklist.md` - implementation review checklist.
7. `07-deploy-verification.md` - build/deploy/live verification procedure.
8. `08-risk-rollback.md` - risk register and rollback protocol.
9. `09-progress-log.md` - execution log with approvals and results.
