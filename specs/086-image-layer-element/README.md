# Spec 086 — Image Layer Element

## Why
Users need to load a reference PNG/JPG (e.g. a watchface mockup, dial photo,
or design guide) as a base layer inside the parametric canvas, then place SVG
elements (rings, ticks, gauges, hands) on top of it for accurate positioning
and tracing.

Currently there is no element type that accepts a user-uploaded raster image.
The closest existing type, `texture_layer`, is procedural (gradient + noise)
and cannot accept external pixels.

## What
Add a new engine element type `image_layer`:
- Accepts a `imageDataUrl` param (base64 data URL from file picker)
- Renders as an SVG `<image>` placed at configurable position / size
- Supports `fit` modes: `fill` (exact stretch) | `cover` (fill + crop) | `contain` (fit + letterbox)
- Respects the canvas `viewBox` — source image dimensions are irrelevant
- Has `opacity` control (0–1)

A matching UI is added to ParametricPage.tsx:
- "Image Layer" entry in the Add Element panel
- File picker button in the element inspector when type = `image_layer`
- Fit / opacity controls in the inspector
- "Clear image" button

## Non-goals
- This is NOT a ZPK export asset — image layers are design-time reference only
- No cloud upload — stored as base64 in localStorage (same as all element params)
- No image editing or crop UI (see Spec 023 for that)
- No animation / data binding

## Phases
- **Phase 1 — Engine element** (`04-tasks.md` T01–T04). Register `image_layer`
  in the element registry with SVG `<image>` render output.
- **Phase 2 — Editor UI** (`04-tasks.md` T05–T08). File picker, inspector
  controls, category default, color target guard.
- **Phase 3 — Storage + recovery** (`04-tasks.md` T09–T10). Warn user if
  base64 payload approaches localStorage limit.
