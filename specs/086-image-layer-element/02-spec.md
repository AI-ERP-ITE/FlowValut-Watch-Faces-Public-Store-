# 02 — Spec

## 1. Element definition contract

### Registration
```js
// engine/index.js
import { imageLayerElement } from "./elements/baseElements/imageLayer.js";
registerElement("image_layer", imageLayerElement);
```

### Definition shape (imageLayer.js)
```js
export const imageLayerElement = {
  id: "image_layer",
  geometry: { type: "rect" },   // rect geometry → position is x/y/w/h box
  defaultParams: {
    imageDataUrl: "",            // base64 data URL; empty = render nothing
    x: 0,                        // left edge, fraction of canvas width  [0–1]
    y: 0,                        // top edge,  fraction of canvas height [0–1]
    width: 1,                    // box width,  fraction of canvas width  [0–1]
    height: 1,                   // box height, fraction of canvas height [0–1]
    fit: "fill",                 // "fill" | "cover" | "contain"
    opacity: 1,                  // [0–1]
  },
  render(params, position, context) { /* see §2 */ }
};
```

## 2. Render function

```js
render(params, position, context) {
  const canvasW = context?.layoutMetrics?.width  ?? 100;
  const canvasH = context?.layoutMetrics?.height ?? 100;

  const src = typeof params.imageDataUrl === "string" ? params.imageDataUrl.trim() : "";
  if (!src) return "";   // nothing to render — placeholder element

  const x      = clamp(params.x,      0, 1, 0) * canvasW;
  const y      = clamp(params.y,      0, 1, 0) * canvasH;
  const width  = clamp(params.width,  0, 1, 1) * canvasW;
  const height = clamp(params.height, 0, 1, 1) * canvasH;
  const opacity = clamp(params.opacity, 0, 1, 1);

  const PAR_MAP = {
    fill:    "none",
    cover:   "xMidYMid slice",
    contain: "xMidYMid meet",
  };
  const fit = typeof params.fit === "string" && PAR_MAP[params.fit] ? params.fit : "fill";
  const preserveAspectRatio = PAR_MAP[fit];

  return `<image ` +
    `x="${x.toFixed(3)}" y="${y.toFixed(3)}" ` +
    `width="${width.toFixed(3)}" height="${height.toFixed(3)}" ` +
    `preserveAspectRatio="${preserveAspectRatio}" ` +
    `href="${escapeAttribute(src)}" ` +
    `opacity="${opacity.toFixed(3)}" />`;
}
```

`escapeAttribute` is the existing shared utility already present in renderer.js.
It must be made importable from a shared util, or `imageLayer.js` implements
its own minimal version:
```js
function escapeAttribute(str) {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
```

## 3. ParametricPage.tsx changes

### 3a. Category header default
```ts
// ~line 545 — CATEGORY_HEADER_DEFAULTS
'Image Layer': { type: 'image_layer', role: 'image_layer' },
```

### 3b. Color target guard
```ts
// resolveElementColorTarget (~line 3516)
if (elementType === 'image_layer') return 'none';
```

### 3c. Snapshot guard
Wherever snapshot bake / load / save buttons are rendered, add:
```tsx
{element.type !== 'image_layer' && (
  /* snapshot UI */
)}
```

### 3d. Inspector panel — Image Layer section
When the selected element has `type === 'image_layer'`, show:

```
┌─────────────────────────────────────────────────┐
│  Image Layer                                    │
│                                                 │
│  [Upload image…]  [Clear]                       │
│                                                 │
│  Fit:   ● fill   ○ cover   ○ contain            │
│  Opacity: ━━━━━━━━━━━━━━━━━━━  100%             │
│                                                 │
│  Position  X [ 0.00 ]  Y [ 0.00 ]              │
│  Size      W [ 1.00 ]  H [ 1.00 ]              │
│                                                 │
│  ⚠ Image stored locally (~XXX KB)               │
└─────────────────────────────────────────────────┘
```

**Upload flow:**
1. `<input type="file" accept="image/*">` (hidden, triggered by button)
2. `FileReader.readAsDataURL` → sets `params.imageDataUrl`
3. Size check: if result > 800 KB, show orange warning
4. Call `applyTemplateCommand` with updated params → history entry created
5. Mark element dirty → re-render

**Clear flow:**
1. Set `params.imageDataUrl = ""`
2. `applyTemplateCommand` → history entry

## 4. Size warning thresholds

| Data URL size | UI indicator |
|---|---|
| < 500 KB | No warning |
| 500 KB – 800 KB | ℹ yellow notice: "Large image — may slow auto-save" |
| > 800 KB | ⚠ orange warning: "Very large image — consider resizing before upload" |
| > 2 MB | 🔴 red error: "Image exceeds recommended limit. Auto-save may fail." |

## 5. z-order behaviour

`image_layer` participates in the normal element stack. Users reorder it
in the layer list exactly like any other element. Placing it at the bottom
of the list (first rendered) makes it a base layer; placing it in the
middle creates an overlay effect.

## 6. Constraints

- `imageDataUrl` must start with `data:image/` OR be empty string. Any
  other value is rejected silently (empty string substituted) at render time.
- `width` and `height` fractions are clamped to `[0.01, 2]` to allow
  slightly oversized overlays (> canvas) while preventing zero-size elements.
- `x` and `y` fractions are clamped to `[-1, 2]` to allow partial
  off-canvas placement.
