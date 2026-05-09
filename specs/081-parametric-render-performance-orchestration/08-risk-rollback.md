# 08 - Risks And Rollback

## Risk Register

### R-001 Preview mode diverges from expected interaction visuals
Cause: preview branch over-simplifies expensive passes.
Mitigation: branch only expensive passes; keep base compositing stable.
Rollback: revert Stage 1 commit only.

### R-002 Hash false misses or false hits
Cause: unstable serialization or incorrect include/exclude fields.
Mitigation: deterministic key ordering and targeted hash tests.
Rollback: disable cache integration and keep hash module isolated.

### R-003 Over-invalidation reduces performance gains
Cause: dirty tracking marks too many elements.
Mitigation: enforce target-only invalidation rules and assert in tests.
Rollback: revert Stage 3 commit and retain Stage 1-2.

### R-004 Under-invalidation causes stale visuals
Cause: missing dirty mark on snapshot/effect/mask updates.
Mitigation: centralize invalidation hooks and add mask/snapshot tests.
Rollback: temporary fallback to broader invalidation in affected flow only.

## Rollback Strategy
1. Keep each stage in separate commit.
2. If regression appears, revert only the last stage commit first.
3. Preserve unrelated stage improvements when safe.
