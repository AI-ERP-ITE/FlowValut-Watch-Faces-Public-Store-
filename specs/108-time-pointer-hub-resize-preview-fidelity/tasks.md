# Tasks — Spec 108

## T1. Confirm the time-pointer data contract
- Review the current custom hand record shape.
- Keep the existing ratio fields and pivot fields intact.
- Add only the smallest hub-size field needed for scalar hub resize.

## T2. Add hub scalar resize behavior
- Wire the hub into the existing "Scale Whole" behavior.
- Keep the hub resize control scalar, not separate length and width.
- Ensure the hub scales with the rest of the pointer set.

## T3. Switch the custom-hand preview to source markup when available
- Prefer source SVG/HTML rendering for custom hands that have stored source markup.
- Use the ratio geometry to size the draw.
- Keep the baked PNG fallback for legacy records.

## T4. Keep pivot resolution single-source
- Reuse the current tip/tail resolver path.
- Ensure preview, save, and export see the same final pivot.
- Do not add a second pivot system.

## T5. Accept embedded PNG detail in source HTML
- Keep the AI-generated base64 image path as the default detailed-art workflow.
- Avoid forcing manual PNG upload as a required step.
- If a manual upload helper is added later, keep it optional.

## T6. Harden hub measurement
- Adjust the opaque-bound detection to tolerate low-alpha hub art.
- Add a safe fallback when no opaque bounds are found.
- Verify the hub still renders in the canvas preview.

## T7. Update issue tracking
- Add the new track to `ISSUE_LOG.md`.
- Keep the status visible until implementation is validated.
