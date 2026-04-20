# Spec 026 — Element Engrave / Emboss Frame Effect

## Summary

Any element in the studio editor can optionally have a **dedicated frame element** attached to it.
Toggling "Element Frame" ON in the PropertyPanel automatically creates a new sibling element
(type `FILL_RECT`) directly below the selected element in z-order. That frame element renders
a **3D engraving / embossing** effect on the canvas and can optionally carry a background fill colour.

---

## Problem

Users want depth and tactile realism on watch-face elements without having to manually create and
align separate shadow/highlight rectangles. There is currently no spec or code for this feature.

---

## Scope

### In scope (Phase 1 — canvas preview)
- Toggle control in PropertyPanel for every element type
- Auto-create / auto-delete a linked `FILL_RECT` frame element
- 4 visual controls on the frame element: depth (high/low), mode (inner/outer), fill mode (none/color), fill colour picker
- Canvas rendering: simulate engraving (inset) or embossing (raised) with dual-tone box-shadow drawn in the `drawElements` path
- Element list shows the frame element with a "⬚ Frame" label and a chain icon (🔗) to indicate linkage
- Frame element follows parent when parent is moved or resized (handled in StudioApp `UPDATE_ELEMENT` reducer)
- Deleting the parent also deletes its frame element (and vice versa: toggling OFF deletes frame)
- Frame element cannot be toggled to create its own sub-frame (no recursive frames)

### In scope (Phase 2 — ZPK export)
- Pre-render the frame effect to a PNG dataURL using an off-screen `<canvas>`
- Include the pre-rendered PNG as an `IMG` widget in the generated ZPK
- PNG filename: `frame_<parentName>.png`

### Out of scope
- Arc / circle element frames (Phase 1 limited to rectangular bounds; ARC support is future)
- Animated or gradient frame effects
- Multiple frames per element

---

## Architecture

```
PropertyPanel
  └── "Element Frame" toggle
        ├── ON  → dispatch ADD_ELEMENT (FILL_RECT with engraveFrame config) + set parent.frameElementId
        └── OFF → dispatch REMOVE_ELEMENT(frameElementId) + clear parent.frameElementId
        └── when frame selected in list → show FrameEffectSection (depth/mode/fill controls)

StudioApp reducer
  UPDATE_ELEMENT(parentId, {bounds}) → also UPDATE_ELEMENT(frameId, {bounds})
  DELETE_ELEMENT(parentId)           → also DELETE_ELEMENT(frameId)
  DELETE_ELEMENT(frameId)            → also clear parent.frameElementId

InteractiveCanvas.drawElements
  FILL_RECT + engraveFrame → drawEngraveFrame(ctx, el)

jsCodeGeneratorV2 (Phase 2)
  FILL_RECT + engraveFrame → renderFrameToPng() → IMG widget
```

---

## Data model additions to `WatchFaceElement`

```typescript
// Parent element
frameElementId?: string;    // ID of the linked FILL_RECT frame element

// Frame element (type = 'FILL_RECT')
engraveFrame?: {
  frameOf: string;          // ID of the parent element
  mode: 'inner' | 'outer';  // inner = engrave/inset, outer = emboss/raised
  depth: 'low' | 'high';    // low = subtle shadow, high = deep shadow
  fillMode: 'none' | 'color'; // transparent bg or solid colour fill
  fillColor: string;          // hex e.g. '#1A1A2E' (used when fillMode = 'color')
  padding: number;            // px inset/outset from parent bounds (default 0)
};
```

---

## Canvas rendering algorithm

```
function drawEngraveFrame(ctx, el):
  const { x, y, width, height } = el.bounds
  const { mode, depth, fillMode, fillColor } = el.engraveFrame

  shadowBlur   = depth === 'high' ? 14 : 6
  shadowOffset = depth === 'high' ? 5  : 2

  // Optional fill
  if fillMode === 'color':
    ctx.fillStyle = fillColor
    ctx.fillRect(x, y, width, height)

  // Light edge (top-left for emboss, bottom-right for engrave)
  // Dark edge (bottom-right for emboss, top-left for engrave)
  ctx.save()
  if mode === 'outer':   // emboss / raised
    drawEdgeShadow(ctx, x, y, w, h, light='rgba(255,255,255,0.55)', dark='rgba(0,0,0,0.65)', offset=shadowOffset, blur=shadowBlur)
  else:                  // inner / engrave / inset
    drawEdgeShadow(ctx, x, y, w, h, light='rgba(0,0,0,0.65)', dark='rgba(255,255,255,0.40)', offset=shadowOffset, blur=shadowBlur)
  ctx.restore()
```

The `drawEdgeShadow` helper uses two separate `ctx.shadowColor` draw calls with clipping to produce
a split highlight/shadow effect:
- Top-left half: filled with the "light" colour and blur
- Bottom-right half: filled with the "dark" colour and blur

---

## File change map

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `frameElementId?` + `engraveFrame?` fields to `WatchFaceElement` |
| `src/components/PropertyPanel.tsx` | Add "Element Frame" toggle + `FrameEffectSection` component |
| `src/components/InteractiveCanvas.tsx` | Add `drawEngraveFrame()` call in `drawElements` switch for `FILL_RECT` |
| `src/StudioApp.tsx` | Update `UPDATE_ELEMENT` / `DELETE_ELEMENT` reducers to sync linked frame |
| `src/lib/jsCodeGeneratorV2.ts` | Phase 2: pre-render frame PNG and emit `IMG` widget |

---

## Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| User moves parent but frame doesn't follow | Sync in StudioApp reducer — any bounds update on parent also updates frame bounds |
| Recursive frames (frame gets a frame) | Block in PropertyPanel: hide toggle if `engraveFrame` is set on the element |
| ZPK rendering fidelity | Phase 2 only; Phase 1 is canvas-preview only with a note |
| ARC_PROGRESS bounds mismatch | Skip toggle / hide it for ARC and TIME_POINTER in Phase 1 |
