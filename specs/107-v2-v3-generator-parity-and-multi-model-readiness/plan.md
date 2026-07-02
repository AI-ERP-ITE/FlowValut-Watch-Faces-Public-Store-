# specs/107-v2-v3-generator-parity-and-multi-model-readiness/plan.md

## Objective
Prepare a safe implementation blueprint for generator parity + multi-model readiness without touching runtime code in this phase.

## Workstream P1: V2 vs V3 parity audit
1. Build a behavior table from current generators.
2. Mark each behavior as parity / partial / missing.
3. For each missing behavior, classify:
   - Must-port
   - Optional-port
   - V2 legacy-only (do not port)

## Workstream P2: Generator routing policy
1. Replace model-name hardcoding conceptually with metadata-driven selection.
2. Define deterministic fallback rules for missing metadata.
3. Define temporary compatibility list for exceptions during migration.

## Workstream P3: Multi-resolution editor readiness
1. Identify all fixed-size assumptions (canvas size, clamp bounds, background render dimensions).
2. Define model-dimension state contract used by Studio + canvas + export prep.
3. Define square/rect preview frame behavior and acceptance checks.

## Workstream P4: Risk control
1. Preserve existing V2 exports as fallback path until parity blockers are closed.
2. Add no-code validation gates before any implementation starts.
3. Ensure deploy is blocked until parity-critical tests pass.

## Milestones
- M1: Parity matrix drafted and reviewed.
- M2: Routing policy approved.
- M3: Multi-resolution UI requirements approved.
- M4: Task execution backlog finalized with priorities.

## Non-goals (this phase)
- No source edits.
- No build/deploy modifications.
- No production behavior changes.
