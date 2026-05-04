# Spec 071 - Preview Render Parity

## Summary
Make preview overlays and global mask guides use the same coordinate interpretation as renderer.

## Requirements
1. Selected-mask overlay rendering must branch by mask coordinateSpace.
2. Global mask guides must convert local masks to canvas coordinates per element transform.
3. Active draft strokes/shapes must display through the same conversion path used by persisted strokes.

## Acceptance
1. Overlay, global guide, and final SVG mask placement match for moved/rotated elements.
