# Spec 108 — Time Pointer Hub Resize, Source-Preview Fidelity, and Pivot Consistency

## Goal
Fix the analog time-pointer pipeline so ornate SVG/HTML hands keep their detail in the studio canvas preview, while the hub remains the stable size reference for all proportional resizing.

## Problem
The current time-pointer flow has three separate but related gaps:
1. Browser HTML preview is high fidelity, but the canvas preview still draws the baked PNG fallback and loses detail.
2. Hand sizing already computes hub-relative ratios, but the canvas preview does not consume those ratios consistently.
3. Hub rendering can disappear or flatten when the visible alpha is low, and the hub needs a single-scalar resize behavior rather than separate hand-style length/width controls.

This track is about the time-pointer pipeline only. Gauge pointers are out of scope.

## Scope
In scope:
- `app/src/lib/customHandStore.ts`
- `app/src/components/InteractiveCanvas.tsx`
- `app/src/components/IconLab.tsx`
- `app/src/types/index.ts` and related time-pointer element typing if needed
- `ISSUE_LOG.md`

Out of scope:
- Gauge pointer pipeline
- Firestore / Firebase deployment work
- General canvas layout changes unrelated to time pointers

## Current Findings

### A. Hub is already the correct reference concept
The save pipeline already measures the hub and stores hub-relative ratios for hour, minute, and second sizes. The missing piece is consumption: the canvas preview still relies on baked fixed-size PNGs for custom hands instead of the stored ratio geometry.

### B. The preview quality loss is a pipeline mismatch
SVG/HTML preview is generated at source fidelity, but the canvas preview uses the baked hand PNGs. For ornate hands, the bake is too small to preserve fine geometry, so the canvas version looks dull or incomplete even when the HTML source is correct.

### C. Pivot handling must remain single-source
The tip/tail system already exists and has been corrected through prior pivot-resolver work. This spec must preserve that behavior and only make the preview/render path consume the same resolved geometry consistently.

### D. Hub visibility below a threshold is a measurement bug
The current hub opacity/opaque-bound detection can return no bounds when the hub art is visually present but low-alpha. That makes the hub render path fail or flatten instead of preserving the visible shape.

### E. Base64 PNG inside SVG is the safest detail path
The preferred workflow is for the AI-generated HTML/SVG to embed any needed PNG assets directly as `data:image/png;base64,...` inside the SVG. That keeps one source artifact and avoids manual PNG alignment or size drift.

## Requirements

### R1. Hub as the stable reference
- Keep the hub as the canonical reference for all proportional hand sizing.
- Add a single hub resize control in the time-pointer UI instead of separate length/width controls for the hub.
- Preserve aspect ratio for the hub by scaling width and height together from one scalar.
- Allow "Scale Whole" to include the hub size so the full set grows or shrinks together.

### R2. Ratio consumption in the canvas preview
- If a custom hand record has hub-relative ratio fields, the canvas preview must use them to compute draw size.
- Old records without ratio fields must keep the current fallback behavior.
- The preview must render the source SVG/HTML when source HTML exists, not the tiny baked PNG, so detailed artwork remains visible.

### R3. Pivot consistency
- Keep the existing tip/tail resolver behavior as the source of truth.
- Do not add a second pivot model.
- The save path, preview path, and export path must all read the same final pivot result.
- Any fix to hour pivot ratios must preserve current manual adjustment behavior and markerless fallback behavior.

### R4. Embedded PNG support
- Support SVG/HTML that already embeds PNG assets as base64 image data.
- Do not make manual PNG upload the primary requirement for detailed pointer art.
- If a manual PNG path is added later, it must be optional and must not replace the source-based workflow.

### R5. Hub visibility safety
- Hub measurement must not fail just because the visible art uses low alpha or soft edges.
- The measurement logic must fall back to a safe natural-size path when opaque bounds are not found.
- The hub must still render on canvas when it is visually present.

## Architecture Decision

### Hub sizing rule
Use one scalar for hub resize in the editor. Internally the hub may still be stored as width and height, but they must move together and remain proportionally locked.

### Preview rendering rule
Use source SVG/HTML rendering for custom hands when source markup exists. Use baked PNG only as a fallback for legacy or broken records.

### Geometry rule
The hub remains the reference frame. Hand sizes and pivots are derived from the stored hub-relative ratios, not from the canvas size or a watch-model-specific constant.

### Source-art rule
If the generated HTML contains a PNG already embedded as base64, treat that as the approved detail path. Do not require a separate PNG upload to recover the same artwork.

## Deliverables
- `plan.md` with staged implementation order.
- `tasks.md` with dependency-ordered work items.
- `tests.md` with regression cases for source fidelity, hub sizing, pivot consistency, and base64 image support.
- `validation.md` with the checks required before and after implementation.
- `ISSUE_LOG.md` entry for this track.

## Exit Criteria
- Ornate SVG/HTML time hands look the same in the canvas preview as they do in the HTML preview, subject only to watch-face canvas scaling.
- Hub resizing stays stable, scalar, and proportional.
- Pivot behavior does not regress.
- Low-alpha hub art still renders when it should.
- Base64-embedded PNG art is accepted as the preferred detailed-art path.
- No code changes happen until the implementation phase is explicitly approved.
