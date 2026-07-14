# Spec 117 — Implementation Plan

## Stage 0 — Baseline and safety

1. Capture current source assertions and Git status.
2. Record current digit PNG geometry for representative proportional and near-tabular fonts.
3. Add pure utilities before UI changes so behavior is independently testable.

## Stage 1 — Shared geometry policy

1. Centralize alignment normalization and data-type fit samples.
2. Add a pure frame-fit calculation that accepts bounds, measured content, and alignment.
3. Return new bounds without mutating the input element or linked elements.
4. Keep natural digit advance generation unchanged.

## Stage 2 — Property Panel behavior

1. Add Left/Center/Right control to variable numeric `TEXT_IMG`.
2. Replace the old reset behavior with Reset Frame to Content/Range.
3. Use the pure geometry utility and a selected-element-only update.
4. Preserve `fontSize` and alignment anchor.

## Stage 3 — Preview/export parity

1. Ensure InteractiveCanvas uses stored alignment and independent `fontSize`.
2. Ensure V2 and V3 `TEXT_IMG` generators emit the stored alignment.
3. Audit `IMG_TIME` and `IMG_DATE` start-coordinate logic; remove only logic proven to depend on non-exportable preview corrections.
4. Preserve native widget contracts and legacy defaults.

## Stage 4 — MAIN/AOD and FVWF persistence

1. Verify shared utilities apply to both editor scopes.
2. Verify scope-prefixed assets remain isolated.
3. Verify save/reload retains alignment, font size, and bounds.

## Stage 5 — Automated validation

1. Add `scripts/verifyDigitTypography.mjs`.
2. Run it as a background/headless Node process.
3. Produce machine-readable JSON and a human-readable Markdown report under `.verify-output/spec117/`.
4. Run TypeScript and explicit private build.
5. Generate/inspect a ZPK fixture or generator output for widget contract parity.

## Stage 6 — Commit and deployment

1. Commit specification files only.
2. Commit implementation and tests separately.
3. Load private environment and pass preflight.
4. Run `npm run deploy:full:private`.
5. Verify origin commit, bundle hash, root/Studio entry parity, asset HTTP 200, and private route redirect flow.

## Rollback strategy

- Each stage must remain independently revertible.
- If alignment UI fails, revert UI while retaining pure utilities/tests.
- If time export parity fails, leave current native time generation unchanged and ship only verified `TEXT_IMG`/reset improvements.
- If deploy verification fails, do not claim completion; repair or revert the implementation commit before redeployment.

