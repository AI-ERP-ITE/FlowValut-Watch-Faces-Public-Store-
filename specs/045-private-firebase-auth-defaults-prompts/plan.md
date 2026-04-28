# Implementation Plan: Prompt-Level Firebase Private Auth Defaults

## Scope
Update prompt wiring and add canonical guidance so Speckit-driven runs apply private auth behavior consistently.

## Files to Update
1. `.github/prompts/specsmd-master.prompt.md`
2. `.github/prompts/speckit.master.prompt.md` (new)
3. `app/specs/045-private-firebase-auth-defaults-prompts/spec.md` (new)
4. `app/specs/045-private-firebase-auth-defaults-prompts/tasks.md` (new)

## Approach
1. Replace direct procedural text in `specsmd-master.prompt.md` with a stable reference to `speckit.master.prompt.md`.
2. Create `speckit.master.prompt.md` as the canonical instruction source.
3. Add a dedicated private-auth defaults section covering routing, login flow, Firebase env keys, backend bridge requirements, and failure conditions.
4. Document Firebase Console path for web config retrieval.

## Validation
1. Confirm `specsmd-master.prompt.md` references canonical prompt file.
2. Confirm canonical prompt includes private route list, required env vars, and backend bridge policy.
3. Confirm spec/task docs exist for future maintenance.
