# Spec 026 — Tasks

## Phase 1: Canvas preview (no ZPK changes)

---

### T01 — Add type fields to `WatchFaceElement`
**File**: `src/types/index.ts`

Add to `WatchFaceElement` interface:

```typescript
// Frame linkage (on the parent element)
frameElementId?: string;

// Engrave/emboss frame config (on the FILL_RECT frame element)
engraveFrame?: {
  frameOf: string;
  mode: 'inner' | 'outer';
  depth: 'low' | 'high';
  fillMode: 'none' | 'color';
  fillColor: string;
  padding: number;
};
```

---

### T02 — PropertyPanel: "Element Frame" toggle section
**File**: `src/components/PropertyPanel.tsx`

1. Determine if toggle is allowed:
   ```typescript
   const canHaveFrame = !['ARC_PROGRESS', 'TIME_POINTER'].includes(element.type)
                     && !element.engraveFrame;   // don't frame a frame
   ```

2. Add a new `<Section label="Element Frame">` at the bottom of the PropertyPanel (above the final helpers), shown only when `canHaveFrame` is true.

3. The section contains a `<Switch>` component:
   - `checked={!!element.frameElementId}`
   - `onCheckedChange` handler: when toggled ON → call `onAddFrame(element)`, when toggled OFF → call `onRemoveFrame(element)`
   - Label: "Add Frame"

4. Add two new optional callbacks to `PropertyPanelProps`:
   ```typescript
   onAddFrame?: (parentElement: WatchFaceElement) => void;
   onRemoveFrame?: (parentElement: WatchFaceElement) => void;
   ```

5. When the element IS a frame (`element.engraveFrame` is set), show `FrameEffectSection` instead of normal sections, and hide the "Element Frame" toggle.

---

### T03 — PropertyPanel: `FrameEffectSection` component
**File**: `src/components/PropertyPanel.tsx`

Add `function FrameEffectSection({ element, update }: ...)` inside the file:

Controls:
- Header: `⬚ Frame Effect` + `🔗 links to: {frameOf element name}` (look up by id from elements list — needs `elements` prop added to PropertyPanel)
- **Mode** — two-button toggle: `Engrave` (inner) | `Emboss` (outer)
  ```tsx
  update({ engraveFrame: { ...element.engraveFrame!, mode: 'inner' | 'outer' } })
  ```
- **Depth** — two-button toggle: `Low` | `High`
- **Fill** section:
  - Two-button: `None` | `Color`
  - When `Color` selected: `<input type="color">` + hex `<Input>` (same pattern as element Color section)
- **Padding** — `<NumField label="Pad" ...>` clamped −20 to 40

> Note: Add `elements?: WatchFaceElement[]` to `PropertyPanelProps` so the frame section can look up the parent name.

---

### T04 — StudioApp: `onAddFrame` / `onRemoveFrame` handlers
**File**: `src/StudioApp.tsx`

Wire up the two new PropPanel callbacks:

```typescript
const handleAddFrame = (parent: WatchFaceElement) => {
  const frameId = generateId();
  const padding = 0;
  const frameEl: WatchFaceElement = {
    id: frameId,
    type: 'FILL_RECT',
    name: `${parent.name} Frame`,
    bounds: {
      x: parent.bounds.x - padding,
      y: parent.bounds.y - padding,
      width: parent.bounds.width + padding * 2,
      height: parent.bounds.height + padding * 2,
    },
    visible: true,
    zIndex: parent.zIndex - 1,
    engraveFrame: {
      frameOf: parent.id,
      mode: 'inner',
      depth: 'low',
      fillMode: 'none',
      fillColor: '#1A1A2E',
      padding,
    },
  };
  dispatch({ type: 'ADD_ELEMENT', payload: frameEl });
  dispatch({ type: 'UPDATE_ELEMENT', payload: { id: parent.id, changes: { frameElementId: frameId } } });
  setSelectedElementId(frameId);  // auto-select the frame
  toast.success('Frame added');
};

const handleRemoveFrame = (parent: WatchFaceElement) => {
  if (!parent.frameElementId) return;
  dispatch({ type: 'DELETE_ELEMENT', payload: parent.frameElementId });
  dispatch({ type: 'UPDATE_ELEMENT', payload: { id: parent.id, changes: { frameElementId: undefined } } });
  toast.success('Frame removed');
};
```

Pass these as `onAddFrame={handleAddFrame}` and `onRemoveFrame={handleRemoveFrame}` to `<PropertyPanel>`.

---

### T05 — StudioApp: sync frame when parent is updated
**File**: `src/StudioApp.tsx`

In the `UPDATE_ELEMENT` reducer case (or a post-dispatch effect), after updating a parent element:

```typescript
// In reducer or useEffect watching elements:
if (changes.bounds && updatedEl.frameElementId) {
  const frame = elements.find(e => e.id === updatedEl.frameElementId);
  if (frame?.engraveFrame) {
    const pad = frame.engraveFrame.padding;
    dispatch({
      type: 'UPDATE_ELEMENT',
      payload: {
        id: updatedEl.frameElementId,
        changes: {
          bounds: {
            x: changes.bounds.x - pad,
            y: changes.bounds.y - pad,
            width: changes.bounds.width + pad * 2,
            height: changes.bounds.height + pad * 2,
          },
        },
      },
    });
  }
}
```

---

### T06 — StudioApp: cascade delete
**File**: `src/StudioApp.tsx`

In the `DELETE_ELEMENT` reducer case:

```typescript
case 'DELETE_ELEMENT': {
  const toDelete = state.watchFaceConfig.elements.find(e => e.id === action.payload);
  let ids = new Set([action.payload]);
  if (toDelete?.frameElementId) ids.add(toDelete.frameElementId);  // delete child frame
  // If deleting a frame itself — clear parent's frameElementId
  const parent = state.watchFaceConfig.elements.find(e => e.frameElementId === action.payload);
  const elements = state.watchFaceConfig.elements
    .filter(e => !ids.has(e.id))
    .map(e => e.id === parent?.id ? { ...e, frameElementId: undefined } : e);
  return { ...state, watchFaceConfig: { ...state.watchFaceConfig, elements } };
}
```

---

### T07 — InteractiveCanvas: `drawEngraveFrame()`
**File**: `src/components/InteractiveCanvas.tsx`

Add a new function:

```typescript
function drawEngraveFrame(ctx: CanvasRenderingContext2D, el: WatchFaceElement) {
  const { x, y, width: w, height: h } = el.bounds;
  const cfg = el.engraveFrame!;
  const blur   = cfg.depth === 'high' ? 14 : 6;
  const offset = cfg.depth === 'high' ? 5  : 2;

  // Optional fill
  if (cfg.fillMode === 'color') {
    ctx.save();
    ctx.fillStyle = cfg.fillColor;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  // Light colour and dark colour depend on mode
  const [lightColor, darkColor] = cfg.mode === 'outer'
    ? ['rgba(255,255,255,0.55)', 'rgba(0,0,0,0.65)']
    : ['rgba(0,0,0,0.65)', 'rgba(255,255,255,0.40)'];

  // Draw top-left edge with light/dark tone
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // Top-left highlight/shadow
  ctx.shadowColor = lightColor;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = offset;
  ctx.shadowOffsetY = offset;
  ctx.strokeStyle = lightColor;
  ctx.lineWidth = offset * 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();

  // Bottom-right shadow/highlight
  ctx.shadowColor = darkColor;
  ctx.shadowOffsetX = -offset;
  ctx.shadowOffsetY = -offset;
  ctx.strokeStyle = darkColor;
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.stroke();
  ctx.restore();
}
```

In `drawElements` switch, change the `FILL_RECT` case (currently falls through to `default`/`drawPlaceholder`):

```typescript
case 'FILL_RECT':
  if (el.engraveFrame) {
    drawEngraveFrame(ctx, el);
  } else {
    // existing FILL_RECT plain draw
    ctx.save();
    ctx.fillStyle = el.color ? parseZeppColor(el.color) : '#333333';
    ctx.fillRect(el.bounds.x, el.bounds.y, el.bounds.width, el.bounds.height);
    ctx.restore();
  }
  break;
```

---

### T08 — ElementList: frame element visual indicator
**File**: `src/components/ElementList.tsx`

In `getElementIcon`, add:
```typescript
case 'FILL_RECT':
  return element.engraveFrame ? '⬚' : '▬';
```

In the row JSX, if `element.engraveFrame` is set:
- Add a left border: `className="border-l-2 border-amber-500/60 pl-1"` on the row (in addition to existing classes)
- Append `🔗` before the element name

---

### T09 — PropertyPanel: pass `elements` prop + wire FrameEffectSection
**File**: `src/components/PropertyPanel.tsx` + `src/StudioApp.tsx`

- Add `elements?: WatchFaceElement[]` to `PropertyPanelProps`
- In FrameEffectSection, look up parent name:
  ```typescript
  const parentName = props.elements?.find(e => e.id === element.engraveFrame!.frameOf)?.name ?? 'element';
  ```
- In `StudioApp.tsx`, pass `elements={state.watchFaceConfig?.elements ?? []}` to `<PropertyPanel>`

---

## Phase 2: ZPK export

### T10 — jsCodeGeneratorV2: bake frame to PNG
**File**: `src/lib/jsCodeGeneratorV2.ts`

- Detect `element.engraveFrame` on a `FILL_RECT` element
- Create an off-screen `<canvas>`, call `drawEngraveFrame()` (or replicate the algorithm)
- Export `canvas.toDataURL('image/png')`
- Add to ZPK assets as `frame_{sanitizedName}.png`
- Emit `hmUI.widget.IMG` widget with that src

---

## Acceptance criteria

- [ ] Toggle visible in PropertyPanel for TEXT, IMG, CIRCLE, IMG_DATE, IMG_WEEK, IMG_LEVEL, IMG_TIME, TEXT_IMG elements
- [ ] Toggle NOT visible for ARC_PROGRESS, TIME_POINTER, and FILL_RECT with `engraveFrame` set
- [ ] Toggling ON: new frame element appears in element list immediately below parent
- [ ] Canvas shows engraved/embossed frame visually
- [ ] All 4 controls work (mode, depth, fill mode, fill color)
- [ ] Moving parent on canvas: frame follows automatically
- [ ] Deleting parent: frame is also removed
- [ ] Deleting frame directly: parent toggle resets to OFF
- [ ] Element list shows `⬚ 🔗` indicator and amber left border for frame elements
- [ ] Undo/redo works for add/remove frame (no extra work needed if reducers use history)
