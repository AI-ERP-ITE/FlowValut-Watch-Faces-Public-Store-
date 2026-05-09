# 06 - Review Checklist

## Constraint Compliance
1. Renderer architecture not rewritten.
2. Parametric logic untouched.
3. Effect math unchanged.
4. Mask algorithms unchanged.
5. Snapshot architecture unchanged.

## Stage 1 Review
1. Interaction mode transitions are correct.
2. Debounce on editing -> idle is 100ms.
3. Preview quality path is active only during active interaction.
4. Final quality render runs once after interaction completion.

## Stage 2 Review
1. Hash includes only required visual determinants.
2. Hash excludes editor/view determinants.
3. Cache hit avoids rerender.
4. Cache miss rerenders and updates cache entry.
5. Cache invalidates only on allowed triggers.

## Stage 3 Review
1. Dirty set tracks target elements accurately.
2. Local edits invalidate target only.
3. Sibling layers remain frozen unless globally invalidated.
4. Global invalidation path used only for allowed global changes.

## Validation Review
1. Required tests added and passing.
2. Debug logs present for cache and invalidation.
3. Visual parity verified in final mode.
4. Performance impact summary documented per stage.

## Process Review
1. Stop after each task and await user approval.
2. Run tests after each stage.
3. Print changed files after each stage.
4. Commit with required names and separated scopes.
