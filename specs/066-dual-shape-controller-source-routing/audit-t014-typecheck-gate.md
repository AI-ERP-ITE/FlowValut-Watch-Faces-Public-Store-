# Audit T014: Typecheck Gate (066)

## Task
Run TypeScript build gate:

```powershell
node .\\node_modules\\typescript\\bin\\tsc -b
```

## Result
- First run: FAIL (exit code 1, 10 errors)
- Final rerun: PASS (exit code 0, no TypeScript errors)

## Error Summary
1. [src/CompilerPage.tsx](src/CompilerPage.tsx#L19): `decomposition` does not exist in type `VisualEnvelope`.
2. [src/CompilerPage.tsx](src/CompilerPage.tsx#L118): property `decomposition` missing on `VisualEnvelope`.
3. [src/ParametricPage.tsx](src/ParametricPage.tsx#L15): cannot find module `@/lib/effects/legacyEffectNormalization`.
4. [src/ParametricPage.tsx](src/ParametricPage.tsx#L22): cannot find module `@/lib/history/commandHistory`.
5. [src/ParametricPage.tsx](src/ParametricPage.tsx#L7155): implicit `any` for `_layer`.
6. [src/ParametricPage.tsx](src/ParametricPage.tsx#L7155): implicit `any` for `index`.
7. [src/ParametricPage.tsx](src/ParametricPage.tsx#L7819): implicit `any` for `_layer`.
8. [src/ParametricPage.tsx](src/ParametricPage.tsx#L7819): implicit `any` for `index`.
9. [src/ParametricPage.tsx](src/ParametricPage.tsx#L8243): implicit `any` for `_layer`.
10. [src/ParametricPage.tsx](src/ParametricPage.tsx#L8243): implicit `any` for `index`.

## Fixes Applied Before Rerun
1. Added optional `decomposition` typing support to `VisualEnvelope` in [src/types/visualSpec.ts](src/types/visualSpec.ts).
2. Added typed decomposition entry model in [src/types/visualSpec.ts](src/types/visualSpec.ts).
3. Added missing legacy layer normalization helpers in [src/lib/effects/legacyEffectNormalization.ts](src/lib/effects/legacyEffectNormalization.ts).
4. Added missing history command helpers in [src/lib/history/commandHistory.ts](src/lib/history/commandHistory.ts).
5. Added explicit callback param typing for layer selectors in [src/ParametricPage.tsx](src/ParametricPage.tsx).
6. Updated history import path to explicit module file in [src/ParametricPage.tsx](src/ParametricPage.tsx#L22).

## Rerun Evidence
```powershell
node .\\node_modules\\typescript\\bin\\tsc -b
```
- Output: clean (no diagnostics)
- Exit code: 0

## T014 Status
- Complete (gate passed).
