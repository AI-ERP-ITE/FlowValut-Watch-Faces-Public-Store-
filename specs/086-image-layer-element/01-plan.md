# 01 — Plan

## Problem statement

The parametric designer has no way to load a reference raster image (PNG, JPG,
WEBP) as a background/base layer. Users work blind when trying to match an
existing watchface dial or photo mockup. They manually position rings and ticks
by feel, which is slow and inaccurate.

## Goal

Give users a "base image layer" they can place at any z-index in the layer
stack. The image stretches (or fits) to match the canvas exactly, regardless
of the source file's pixel dimensions. All SVG elements stacked above it
render on top, allowing precise tracing and positioning.

## Decision summary

### Element contract
A new engine element type `image_layer` is registered. It has a single
required param (`imageDataUrl`) and optional layout/display params. It renders
to a single SVG `<image>` element using the canvas coordinate space.

### Fit model
Source image pixel dimensions are irrelevant. The SVG `<image>` element
receives `x`, `y`, `width`, `height` in canvas units (e.g. `0 0 480 480`).
The `preserveAspectRatio` attribute controls scaling behaviour:

| `fit` param value | `preserveAspectRatio` | Result |
|---|---|---|
| `fill` (default) | `none` | Exact stretch to target box. Best for reference dial photos. |
| `cover` | `xMidYMid slice` | Fills box, crops overflow. Good for non-square sources on square canvas. |
| `contain` | `xMidYMid meet` | Fits inside box with possible letterbox bars. |

Position and size default to full canvas (`x:0, y:0, w:1, h:1` as fractions).

### Storage
The base64 data URL is stored as an element param in localStorage alongside
all other element state. No separate storage mechanism is needed. A size
warning is shown in the inspector if the payload exceeds 500 KB (roughly a
compressed 1000×1000 JPEG).

### Color target
`image_layer` has no fill/stroke color. `resolveElementColorTarget` returns
`'none'` for this type, hiding the color picker.

### Snapshot behaviour
`image_layer` elements are always rendered live (they ARE their own image
source). They are excluded from snapshot baking — `renderSourceMode` is locked
to `procedural` and the snapshot UI buttons are hidden for this type.

## Out of scope
- ZPK export of the image (design-time only)
- Cloud storage / Firebase upload
- Crop / mask / transform tools
- Multi-image gallery
