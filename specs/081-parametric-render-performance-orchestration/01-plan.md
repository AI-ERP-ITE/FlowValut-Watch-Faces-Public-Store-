# 01 - Plan

## Goal
Improve parametric editor responsiveness through strict render-performance orchestration only, with no change to final visual output quality.

## In Scope
1. Interaction-aware render quality switching (Edit Mode vs Final Mode).
2. Element render cache keyed by deterministic visual state hash.
3. Selective invalidation with untouched layer freezing.
4. Focused validation and debug instrumentation for render scheduling and reuse.

## Out Of Scope
1. Renderer architecture rewrite.
2. Parametric logic rewrite or behavior change.
3. Effect math changes.
4. Mask algorithm changes.
5. Snapshot system redesign.
6. Any unrelated refactor or cleanup.

## Hard Constraints
1. Existing internal element rendering math remains unchanged.
2. Optimizations affect only when rendering runs, what rerenders, and what can be reused.
3. Final mode output must match current baseline output.
