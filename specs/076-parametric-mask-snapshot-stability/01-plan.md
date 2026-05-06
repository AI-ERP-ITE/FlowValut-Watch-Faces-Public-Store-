# 01 - Execution Plan

## Objective

Deliver a safe additive solution that:

1. Fixes mask/composite inconsistency in parametric rendering.
2. Reduces instability from aggressive fallback defaults.
3. Introduces non-destructive snapshot baking per element.
4. Preserves backward compatibility and existing workflows.

## Approval-Gated Steps

1. Step 1 - Spec package creation and sign-off.
2. Step 2 - Core rendering bug fixes only.
3. Step 3 - Snapshot data model and deterministic hash.
4. Step 4 - Snapshot capture and storage utilities.
5. Step 5 - Renderer source switch (live vs snapshot).
6. Step 6 - Parametric UI controls and stale status.
7. Step 7 - Validation pass and evidence capture.
8. Step 8 - Deploy and live verification.
9. Step 9 - Final review and closeout report.

## Execution Rules

1. No phase skip.
2. No hidden edits outside approved step scope.
3. Stop after each step and wait for explicit approval.
4. Keep changes additive; do not rewrite renderer architecture.
5. Preserve existing saved project behavior unless explicitly documented.

## Route and Deploy Focus

Target route for verification:

- https://ai-erp-ite.github.io/Watch-Faces/studio/parametric

Deploy must follow repo prompt policy and include root and SPA deep-link checks.
