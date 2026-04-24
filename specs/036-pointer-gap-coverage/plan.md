# Plan: Strict Gap Audit + Pointer Coverage Extension

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
1. Add `GAUGE_POINTER` element type in central type union.
2. Extend `RuleElementKey` with `GAUGE_POINTER`.
3. Add strict `ELEMENT_TO_DATA.GAUGE_POINTER` list (bounded/progress types only).
4. Keep reverse mapping generation unchanged and verify `DATA_TO_ELEMENT` picks up new element.
5. Map `GAUGE_POINTER` to `IMG_POINTER` in `ELEMENT_TO_WIDGET` for audit coverage.
6. Add pointer-specific note documenting Zepp angle normalization behavior.
7. Regenerate local audit output and confirm zero missing widgets.
8. Add concise `GAP_AUDIT_SUMMARY.md` with actionable gaps only.

## End-to-End Process Through ZPK Creation
1. Build: `npm run build`
2. Generate watchface package using existing pipeline path (no generator logic changes).
3. Extract resulting `.zpk` and inspect generated `watchface/index.js`.
4. Verify pointer structure:
   - `TIME_POINTER` remains for analog clock only.
   - `IMG_POINTER` capability represented via `GAUGE_POINTER` layer authority and audit coverage.
5. If deployment required later, follow project deployment protocol for `docs/index.html` and `docs/studio/index.html` sync.
