# 08 - Risks And Rollback

## Risk Register

### R-001 Mapping feels too compressed or too weak
Cause: incorrect curve/profile tuning.
Mitigation: keep centralized profile definitions and tune only profile values.
Rollback: revert profile changes only.

### R-002 Over-throttling harms perceived responsiveness
Cause: debounce/throttle too aggressive.
Mitigation: enforce 16ms minimum baseline with measured tuning.
Rollback: revert throttling stage while preserving mapping system.

### R-003 Under-throttling leaves rerender spam
Cause: incomplete event pipeline wiring.
Mitigation: add explicit applied-write counters and drag tests.
Rollback: widen throttle envelope for high-frequency sources.

### R-004 Precision normalization causes visible stepping
Cause: overly coarse precision.
Mitigation: profile-level precision controls and adaptive steps.
Rollback: relax precision for affected parameters only.

## Rollback Strategy
1. Keep each logical stage in separate commits.
2. Revert last stage first when regression appears.
3. Preserve prior stable improvements whenever possible.
