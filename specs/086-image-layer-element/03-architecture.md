# 03 — Architecture

## Component map

```
ParametricPage.tsx
│
├── "Add Element" panel
│     └── "Image Layer" category → creates element { type: 'image_layer', params: defaultParams }
│
├── Inspector (right panel)
│     └── ImageLayerInspector (inline JSX block, not a separate component)
│           ├── hidden <input type="file"> (triggered by Upload button)
│           ├── FileReader → base64 → params.imageDataUrl
│           ├── Fit radio: fill | cover | contain → params.fit
│           ├── Opacity slider → params.opacity
│           ├── X/Y/W/H numeric inputs → params.x/y/width/height
│           └── Size warning badge (computed from imageDataUrl.length)
│
└── applyTemplateCommand / markSelectedElementDirty
      └── triggers re-render pipeline

engine/index.js
└── registerElement("image_layer", imageLayerElement)

engine/elements/baseElements/imageLayer.js  [NEW FILE]
└── imageLayerElement
      ├── id: "image_layer"
      ├── geometry: { type: "rect" }
      ├── defaultParams: { imageDataUrl, x, y, width, height, fit, opacity }
      └── render(params, position, context) → SVG <image> string

engine/elements/elementRegistry.js  [NO CHANGE]
└── registerElement / getElement / validateElementModel (unchanged)

engine/core/renderer.js  [NO CHANGE]
└── renderElement() dispatches to definition.render() — no change needed;
    the <image> SVG string is inserted exactly like any other element output
```

## Data flow: upload → render

```
User clicks "Upload image"
  → hidden file input triggers
  → FileReader.readAsDataURL(file)
  → onload: base64 string → validate prefix "data:image/"
  → applyTemplateCommand({ ...element, params: { ...params, imageDataUrl: base64 } })
  → workingTemplate updated → saveTemplate(workingTemplate)
  → markSelectedElementDirty() → renderer re-runs
  → renderer.js: renderElement(element) → imageLayerElement.render(params, ...)
  → returns: <image x="0" y="0" width="480" height="480" preserveAspectRatio="none" href="data:image/png;base64,..." opacity="1.000" />
  → SVG canvas updates → image visible
```

## Coordinate system

All elements in this engine operate in canvas pixel space (`0 0 W H`).
The `imageLayer.js` render function converts fraction params to canvas pixels:

```
canvasW = context.layoutMetrics.width   // e.g. 480
canvasH = context.layoutMetrics.height  // e.g. 480

pixelX = params.x * canvasW            // 0 * 480 = 0
pixelY = params.y * canvasH            // 0 * 480 = 0
pixelW = params.width  * canvasW       // 1 * 480 = 480
pixelH = params.height * canvasH       // 1 * 480 = 480
```

Source image resolution (600px, 1200px, etc.) has zero effect — SVG scales
to the declared `width`/`height` box in viewBox units.

## Fit → preserveAspectRatio mapping

| `fit` | SVG `preserveAspectRatio` | Behaviour |
|---|---|---|
| `"fill"` | `"none"` | Image warped to exact box. For square dial photos on square canvas: no distortion. |
| `"cover"` | `"xMidYMid slice"` | Aspect ratio preserved, box filled, overflow clipped. |
| `"contain"` | `"xMidYMid meet"` | Aspect ratio preserved, image fits inside box, possible empty areas. |

## localStorage impact

A 480×480 JPEG at decent quality ≈ 60–120 KB on disk → base64 adds ~33% →
~80–160 KB in localStorage. A 1200×1200 PNG can be 500 KB–2 MB on disk →
640 KB–2.7 MB base64. Users should be encouraged to resize before uploading.

Total localStorage budget across all keys is ~5 MB per origin. A single large
image could consume it entirely. The size warning system (§4 of 02-spec.md)
mitigates this.

## Snapshot / render source mode interaction

`image_layer` elements are ALWAYS live. They do not bake into snapshots:
- `renderSourceMode` for `image_layer` is forced to `procedural` (the image
  IS the procedural output)
- Snapshot bake/load/clear buttons are hidden in the inspector for this type
- `image_layer` is excluded from any batch-snapshot operations

## Mask interaction

Masks CAN be applied to `image_layer` elements — this allows users to clip
the image to a circle, ring, or custom painted shape. The existing mask
pipeline requires no changes; it operates on the rendered SVG output
regardless of element type.
