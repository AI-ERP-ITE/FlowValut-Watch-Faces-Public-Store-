# Plan: Image Switcher Case Matrix + Gauge Pair Composition

## Stage-Gated Flow (specsmd-mater)
1. ANALYZE
2. LOCATE
3. CLARIFY
4. PLAN
5. CONFIRM (`approve` or `proceed`)
6. IMPLEMENT
7. BUILD
8. DEPLOY
9. VERIFY

## Current Analyze/Locate Findings
1. Current count resolver is fixed-rule:
   - weather => 29
   - heart => 6
   - default image-switcher => 10
2. This conflicts with required heart custom count behavior.
3. Gauge composition must remain dual-widget in Zepp runtime.

## Sequential Implementation Plan
1. **Policy Layer Update**
   - Introduce explicit image-switcher count policy object by data type.
   - Add user-defined count path for non-weather switchers.

2. **Model + Validation**
   - Add/normalize per-element frame count metadata from actual image list length.
   - Validate strict weather=29.
   - Validate non-weather `N >= 2`.

3. **Asset Resolver Alignment**
   - Ensure resolver/preview/export read exact user frame list length.
   - Remove hard forcing of heart=6 and generic=10 for explicit user sets.

4. **Fallback Strategy**
   - Strict mode: fail with precise message.
   - Fallback mode: generate deterministic placeholders preserving requested `N`.

5. **Gauge Pair Composition**
   - Add composition helper/schema linking one `GAUGE_POINTER` + one `ARC_PROGRESS`.
   - Keep generated output as two widgets.

6. **Verification**
   - Build checks.
   - Case tests:
     - weather 29 pass
     - weather non-29 fail/warn
     - heart 4 pass
     - heart 5 pass
     - legacy 10-frame pass
   - Extracted output verification for dual-widget gauge export.
