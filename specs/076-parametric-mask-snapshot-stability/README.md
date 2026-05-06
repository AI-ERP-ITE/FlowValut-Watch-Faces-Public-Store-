# 076 - Parametric Mask Stability + Non-Destructive Snapshot Baking

This spec package defines a combined solution for:

1. Mask/composite consistency bug (base element disappears while overlays remain).
2. Stability tuning (safe contrast fallback and clip-target guards).
3. Non-destructive per-element snapshot baking workflow.
4. Deployment and verification for the parametric route.

Primary live target:

- https://ai-erp-ite.github.io/Watch-Faces/studio/parametric

This package is approval-gated. No phase proceeds without explicit user approval.

## File Map

1. `01-plan.md` - execution plan and gates.
2. `02-spec.md` - functional and non-functional requirements.
3. `03-architecture.md` - additive architecture and integration points.
4. `04-tasks.md` - detailed task IDs, inputs, outputs, done criteria.
5. `05-validation.md` - test matrix and acceptance checks.
6. `06-review-checklist.md` - implementation and code review checklist.
7. `07-deploy-verification.md` - deployment and live verification protocol.
8. `08-risk-rollback.md` - risk register and rollback plan.
9. `09-progress-log.md` - step-by-step execution log.
