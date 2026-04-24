# Plan: Element-Layer Data Validation Authority

## Stage-Gated Execution Plan (specsmd-mater)
1. ANALYZE
2. LOCATE
3. CLARIFY
4. PLAN
5. CONFIRM (requires `approve` or `proceed`)
6. IMPLEMENT
7. BUILD
8. DEPLOY
9. VERIFY

## Implementation Steps

1. Add `elementDataRules` module as final authority for element/data compatibility.
2. Implement reverse lookup from data type to allowed elements.
3. Wire Add Element dialog to read filtered options from central rules.
4. Add Add-flow auto-correction to prevent invalid element/data combinations.
5. Wire Property panel data selector to central rules.
6. Add edit-flow auto-correction for invalid bound data values.
7. Preserve existing `IMG_STATUS` statusType behavior (no forced migration to dataType).
8. Add non-blocking image-count expectations for `IMG_LEVEL` overload cases.
9. Run diagnostics on changed files and confirm no regressions in generator routing.
