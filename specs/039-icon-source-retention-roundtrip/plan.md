# Plan: Icon Source Retention + Roundtrip Editing

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

## Sequential Implementation Plan
1. **Schema Update**
   - Extend custom icon record with `sourceMode` and `sourceCode`.
   - Keep `dataUrl` as required cached raster output.

2. **Save Flow Update**
   - Capture current editor source (SVG/HTML) in `handleSaveIcon`.
   - Persist source fields together with generated PNG dataUrl.

3. **Load + Edit Flow**
   - Add "Edit in Lab" action for source-capable custom icons.
   - Hydrate editor mode and source content from stored fields.

4. **Legacy Fallback**
   - Keep PNG-only records functional.
   - Display non-blocking indicator when source is unavailable.

5. **Verification**
   - Build checks.
   - Manual matrix: SVG save/reopen, HTML save/reopen, legacy PNG-only behavior, export parity.
