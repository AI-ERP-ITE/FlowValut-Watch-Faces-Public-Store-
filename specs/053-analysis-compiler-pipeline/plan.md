# Plan: Analysis-First Compiler Pipeline

## Clarification Steps (6)
1. Clarification 1: AI role is restricted to JSON analysis; deterministic tool owns final HTML/SVG generation.
2. Clarification 2: Layer sequence is mandatory, validated, and cannot be auto-inferred silently.
3. Clarification 3: Compiler route should be private and separate from main Studio editing screen.
4. Clarification 4: Manual guide is a required artifact and the source-of-truth for analyzer behavior.
5. Clarification 5: Apply-to-Studio flow is gated by validation pass only.
6. Clarification 6: v1 focuses on contract, validation, and route integration (not full autonomous repair loops).

## Implementation Steps
1. Define and add TypeScript types for analysis contract (`requirementsModel`, `geometryModel`, `layerModel`, `lightingModel`, `colorModel`, `textureModel`).
2. Implement layer sequence validator module with canonical required roles and dependency checks.
3. Implement compliance validator aggregator returning explicit PASS/FAIL gate report.
4. Add deterministic compiler module scaffold consuming validated analysis JSON and returning inline SVG/HTML.
5. Add private route `/studio/compiler` in `AppPrivate` and add Studio navigation entry.
6. Create Compiler screen with three core panels:
   - Analysis JSON
   - Layer stack + sequence status
   - Validation report + compile/apply controls
7. Add docs manual guide file for analyzer rules and JSON contract usage.
8. Wire analyzer prompt/template to reference manual guide and enforce JSON-only output mode.
9. Add Apply-to-Studio bridge function gated by successful compliance validation.

## Validation Steps (6)
1. Validation 1: TypeScript build passes with new contract and validator modules.
2. Validation 2: Route guard behavior intact; `/studio/compiler` requires auth.
3. Validation 3: Invalid layer order payload fails with explicit gate errors.
4. Validation 4: Missing required layer role fails validation.
5. Validation 5: Valid payload compiles to renderer-safe inline SVG/HTML.
6. Validation 6: Apply-to-Studio is blocked when compliance report contains any FAIL.
