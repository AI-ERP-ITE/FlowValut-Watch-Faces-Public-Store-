# 16 - T-022 Workaround Removal

## Goal
Remove temporary workaround logic that violated true-mask requirements.

## Removed
1. Gray hide tone fallback in renderer mask primitive generation.
2. Temporary alpha-floor test that asserted non-black hide behavior.

## Current State
1. Hide tone in primitive fallback path is true black.
2. No fake alpha floor constants remain.
3. Scalar field path from T-020 is primary for edited masks.

## Verification
Searched for workaround tokens and temporary identifiers:
1. HIDE_LUMA_FLOOR
2. hideChannel
3. mask-alpha-floor

No active workaround tokens remain in runtime path.

## Done Criteria Check
1. Old workaround logic removed: PASS.
2. Runtime no longer depends on fake floor/tone strategy: PASS.
