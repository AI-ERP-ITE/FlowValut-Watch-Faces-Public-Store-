# Plan — Spec 108

## Phase 1: Lock the geometry contract
- Confirm the hub stays the single resize reference.
- Define the hub control as one scalar value that scales width and height together.
- Keep the existing ratio fields and pivot resolver as the source of truth.

## Phase 2: Make the canvas preview source-based
- Route custom hands through the source SVG/HTML path when source markup exists.
- Use the stored hub-relative ratios to calculate display size.
- Keep the baked PNG only as the fallback path.

## Phase 3: Stabilize pivot behavior
- Reuse the current tip/tail resolver.
- Ensure the preview draw path and save path both read the same final pivot result.
- Do not introduce a second pivot model.

## Phase 4: Preserve detail in the source markup
- Accept base64-embedded PNG assets inside the SVG/HTML source.
- Avoid manual PNG upload as the main workflow.
- Keep the source-based path as the default for new saves.

## Phase 5: Fix hub visibility edge cases
- Lower-risk the opaque-bounds measurement path.
- Add a fallback when low-alpha hub art produces no opaque bounds.
- Verify the hub still renders in the canvas preview.

## Phase 6: Validate against regressions
- Compare source HTML preview and canvas preview.
- Verify old records still render through the fallback path.
- Check that the new hub scalar does not break whole-set scaling.
