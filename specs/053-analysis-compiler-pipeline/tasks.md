# Tasks: Analysis-First Compiler Pipeline

## Clarification (C)
- [ ] C001 Confirm analyzer output is JSON-only and excludes direct final SVG/HTML generation.
- [ ] C002 Confirm canonical required layer roles and locked default order.
- [ ] C003 Confirm private route location `/studio/compiler` and Studio navigation entry point.
- [ ] C004 Confirm manual guide path and ownership (`app/docs/AI_ANALYSIS_COMPILER_GUIDE.md`).
- [ ] C005 Confirm validation-gated apply policy (no apply on FAIL).

## Implementation (T)
- [ ] T001 Add analysis contract types in `app/src/types/` for requirements/geometry/layer/lighting/color/texture models.
- [ ] T002 Add `layerSequenceValidator` module with required role, order, dependency, and count checks.
- [ ] T003 Add `complianceValidator` aggregator module producing explicit gate-wise PASS/FAIL report.
- [ ] T004 Add deterministic compiler scaffold that transforms valid analysis JSON into renderer-safe inline SVG/HTML.
- [ ] T005 Add `/studio/compiler` private route in `app/src/AppPrivate.tsx`.
- [ ] T006 Add Studio navigation action/button to open compiler route.
- [ ] T007 Create `CompilerPage` screen with JSON panel, layer sequence panel, validation panel, compile/apply actions.
- [ ] T008 Create manual guide file `app/docs/AI_ANALYSIS_COMPILER_GUIDE.md` with canonical schema, layer order, and gates.
- [ ] T009 Connect analyzer prompt/template flow to use manual guide and enforce JSON-only output.
- [ ] T010 Implement Apply-to-Studio bridge gated by full validation pass.

## Validation (V)
- [ ] V001 Run TypeScript build successfully for touched modules.
- [ ] V002 Verify private auth guard still protects `/studio/compiler`.
- [ ] V003 Verify invalid layer stacks fail with explicit diagnostics.
- [ ] V004 Verify valid payload compiles to inline SVG/HTML compatible with current renderer constraints.
- [ ] V005 Verify apply action disabled/blocked when any compliance gate fails.
- [ ] V006 Verify manual guide exists and is referenced by analyzer workflow docs/prompt wiring.
