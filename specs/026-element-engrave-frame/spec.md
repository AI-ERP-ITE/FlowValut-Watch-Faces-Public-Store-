# Spec 026 — Element Engrave / Emboss Frame Effect

## Feature description

Any rectangular element can have a **frame** applied via a toggle in the PropertyPanel.
Enabling the toggle automatically inserts a new `FILL_RECT` element directly below the
parent in the layers list (one z-index lower). The frame element renders a realistic
**3D engraving** or **embossing** effect using dual-tone edge shadows.

---

## User flow

1. User selects any element (TEXT, IMG, CIRCLE, IMG_TIME, etc.)
2. PropertyPanel shows a new **"Element Frame"** section with a toggle (default OFF)
3. User flips the toggle → a new frame element appears in the element list labelled
   `⬚ {ParentName} Frame` with a 🔗 chain badge
4. The frame covers the same bounds as the parent (with optional padding)
5. The selected element in the panel auto-switches to show the **FrameEffectSection** controls:
   - **Mode**: `Engrave` (inner / inset) or `Emboss` (outer / raised)  
   - **Depth**: `Low` or `High` (slider or two-button toggle)
   - **Fill**: `None` (transparent) or `Color` (shows colour picker when selected)
   - **Padding**: ±20 px numeric field (how much the frame extends beyond or inside parent)
6. Canvas immediately shows the effect
7. Toggling OFF removes the frame element from the list (with undo support)

---

## Controls spec

### Toggle row (shown in PropertyPanel for all element types EXCEPT ARC_PROGRESS, TIME_POINTER, and elements that ARE already frames)

```
┌─────────────────────────────────────┐
│ Element Frame          [●●●] ON/OFF │
└─────────────────────────────────────┘
```

When ON, the frame element is selected in the list automatically, and the panel shows
FrameEffectSection instead of the parent controls.

---

### FrameEffectSection (shown when a frame element is selected)

```
┌─────────────────────────────────────┐
│ ⬚ Frame Effect  🔗 links to: Name   │
├─────────────────────────────────────┤
│ Mode:  [Engrave ▼]  [Emboss]        │
│ Depth: [Low     ▼]  [High]          │
├─────────────────────────────────────┤
│ Fill:  [None]  [● Color]            │
│        ████  #1A1A2E                 │
├─────────────────────────────────────┤
│ Padding  [-4] px                    │
└─────────────────────────────────────┘
```

---

## Canvas rendering spec

### Engrave / inset (mode = 'inner')

The element appears **sunken** into the watch face:
- Top-left edge: dark shadow `rgba(0, 0, 0, 0.65)` 
- Bottom-right edge: light highlight `rgba(255, 255, 255, 0.40)`
- Low depth: blur=6, offset=2
- High depth: blur=14, offset=5

### Emboss / raised (mode = 'outer')

The element appears **raised** out of the watch face:
- Top-left edge: light highlight `rgba(255, 255, 255, 0.55)` 
- Bottom-right edge: dark shadow `rgba(0, 0, 0, 0.65)`
- Same blur/offset scale as above

### Fill under the effect

When `fillMode = 'color'`, draw `fillRect(x, y, w, h)` first, then the edge shadows on top.
When `fillMode = 'none'`, skip the fill step (frame is purely the edge effect).

---

## Element list behaviour

- Frame element row shows: `🔗 ⬚ {ParentName} Frame` 
- Frame element row has same visibility toggle and delete button as any element
- Frame element row has a subtle left-border in amber/gold to visually distinguish it from regular elements
- Frame element is always sorted just below its parent in the list (its zIndex = parent.zIndex − 1)
- Clicking the frame row selects it and shows FrameEffectSection in PropertyPanel
- Clicking the parent row and toggling the "Element Frame" switch OFF removes the frame element

---

## Sync behaviour

| Action on parent | Effect on frame |
|---|---|
| Move (drag on canvas) | Frame bounds update to match parent immediately |
| Resize | Frame bounds update to match (plus padding offset) |
| Delete | Frame element deleted too |
| Duplicate | New frame element created for the duplicated parent |

| Action on frame | Effect on parent |
|---|---|
| Delete frame element directly | Parent's `frameElementId` cleared (toggle resets to OFF) |
| Change bounds manually (move/resize) | NOT synced back to parent — frame can be manually repositioned |

---

## Type definitions

### `WatchFaceElement` additions

```typescript
// On any element that HAS a frame:
frameElementId?: string;

// On the frame element itself (type = 'FILL_RECT'):
engraveFrame?: {
  frameOf: string;            // ID of the parent element
  mode: 'inner' | 'outer';   // inner = engrave, outer = emboss
  depth: 'low' | 'high';
  fillMode: 'none' | 'color';
  fillColor: string;          // CSS hex '#RRGGBB'
  padding: number;            // px — expands frame beyond parent bounds (negative = inset)
};
```

---

## ZPK export (Phase 2)

When `engraveFrame` is present on a `FILL_RECT` element:
1. Create an off-screen `<canvas>` matching the frame bounds
2. Call `drawEngraveFrame(ctx, el)` to render the effect
3. Export as PNG dataURL → store as `frame_{sanitizedName}.png` in ZPK assets
4. Emit `hmUI.createWidget(hmUI.widget.IMG, { src: 'assets/frame_{sanitizedName}.png', x, y, w, h })` in `watchface/index.js`

This mirrors how hand effects are currently baked to PNG for ZPK.

---

## Excluded element types (toggle hidden)

- `ARC_PROGRESS` — non-rectangular; frame algorithm assumes rect bounds
- `TIME_POINTER` — full-canvas element; doesn't make sense to frame
- Elements whose type is `FILL_RECT` with `engraveFrame` set — cannot frame a frame
