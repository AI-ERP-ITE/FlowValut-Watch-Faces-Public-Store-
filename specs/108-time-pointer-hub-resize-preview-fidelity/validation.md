# Validation — Spec 108

## Static checks
- Confirm the new spec files exist and match the repo's spec style.
- Confirm the issue log entry was added and clearly marked.
- Confirm no code changes were made during the spec phase.

## Implementation checks
- Build the app after the code phase.
- Verify the custom time-pointer canvas preview uses source markup when available.
- Verify the hub resize control stays scalar and does not split into separate width and height controls in the UI.
- Verify ratio-backed records still render with the expected proportion.
- Verify markerless pivot behavior still respects the existing resolver.
- Verify low-alpha hub art still renders.
- Verify embedded base64 PNG images render in both the HTML preview and the canvas preview.

## Failure checks
- If the canvas still uses the baked tiny PNG for source-backed records, the fix is incomplete.
- If the hub can be resized independently in two directions, the hub rule is wrong.
- If the pivot changes after a revalidate of the same HTML, the pivot contract regressed.
- If low-alpha hub art disappears, the hub measurement fallback is still broken.
