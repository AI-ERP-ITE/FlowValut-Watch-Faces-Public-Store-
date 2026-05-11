# 05 — Validation

## Acceptance criteria

### AC-01 — Full-canvas fill (primary use case)
- Add an `image_layer` element with defaults (x:0, y:0, w:1, h:1, fit:fill)
- Upload a 1200×1200 PNG
- **Expected:** image fills the entire 480×480 canvas exactly. No black bars, no overflow.
- **SVG check:** `<image x="0" y="0" width="480" height="480" preserveAspectRatio="none" ...>`

### AC-02 — Rectangular canvas
- Set layout to 480×320 (rect watchface)
- Upload a 1000×1000 square image, fit=fill
- **Expected:** image fills 480×320 and is stretched (no bars). preserveAspectRatio="none"

### AC-03 — Fit: cover
- Upload a portrait 400×800 image, fit=cover, canvas 480×480
- **Expected:** image fills 480×480, top/bottom cropped. No empty bars.
- **SVG check:** `preserveAspectRatio="xMidYMid slice"`

### AC-04 — Fit: contain
- Upload a landscape 800×400 image, fit=contain, canvas 480×480
- **Expected:** image fits inside box. Empty bars appear top and bottom.
- **SVG check:** `preserveAspectRatio="xMidYMid meet"`

### AC-05 — z-order
- Place an `image_layer` at the bottom of the layer list
- Add a ring element on top
- **Expected:** ring renders visually on top of the image

### AC-06 — Opacity
- Set `opacity: 0.5`
- **Expected:** image is semi-transparent. SVG output has `opacity="0.500"`

### AC-07 — Empty state (no image loaded)
- Create `image_layer` element but do not upload an image
- **Expected:** nothing rendered in canvas for that element. No SVG error.
- **SVG check:** render function returns `""` when `imageDataUrl` is empty

### AC-08 — Invalid data URL rejected
- Manually set `params.imageDataUrl = "data:text/html,<script>alert(1)</script>"` via JSON editor
- **Expected:** render function returns `""`. No SVG injection.

### AC-09 — Size warning
- Upload a file > 800 KB
- **Expected:** orange warning visible in inspector

### AC-10 — Color picker hidden
- Select an `image_layer` element
- **Expected:** color picker / fill controls are NOT shown in the inspector

### AC-11 — Snapshot controls hidden
- Select an `image_layer` element
- **Expected:** "Bake layer", "Load snapshot", "Clear snapshot" buttons are NOT shown

### AC-12 — Undo/redo
- Upload image → it appears
- Ctrl+Z → image removed (imageDataUrl back to "")
- Ctrl+Y → image restored

### AC-13 — Auto-save round-trip
- Upload image, wait for auto-save interval
- Hard refresh
- Accept auto-save restore from amber banner
- **Expected:** image layer present and image still visible

### AC-14 — Mask interaction
- Apply a circular mask to an `image_layer` element
- Paint mask strokes
- **Expected:** image is clipped by the mask. No crash or blank canvas.

---

## Regression checks (must not break)

| Check | How to verify |
|---|---|
| All existing element types still render correctly | Add a ring, base, ticks — inspect SVG output |
| `CATEGORY_HEADER_DEFAULTS` additions don't affect existing categories | Add elements from Base, Bezel, Ticks, Free Objects — all work |
| `resolveElementColorTarget` guard doesn't affect other types | Open color picker on a `ring` element — still works |
| localStorage serialization unchanged for non-image elements | Export all → re-import → no data loss |

---

## Live verification steps (post-deploy)

1. Hard-refresh `https://ai-erp-ite.github.io/Watch-Faces/studio/parametric/`
2. Add element → "Image Layer" category → confirm element appears in layer list
3. Upload a 1200×1200 PNG → confirm it fills the canvas
4. Change fit to `cover`, `contain` → confirm visual change
5. Drag layer below a ring → confirm ring renders on top
6. Set opacity to 0.3 → confirm transparency
7. Ctrl+Z → image gone. Ctrl+Y → image back.
8. Check size warning with a large file (> 800 KB)
