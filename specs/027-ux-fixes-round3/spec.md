# Spec 027 — UX Fixes Round 3: Technical Specification

---

## A. Gemini 503 Retry for Icon Lab

### Current State
- **`src/components/IconLab.tsx`** `generateWithGemini()` (line 71): raw `fetch()` → no retry
- **`src/pipeline/pipelineAIService.ts`** has `fetchWithRetry()` (line 19): 3 retries, exponential backoff (1s/2s/4s), retries on 429 & 503

### Changes

#### A1. Add retry wrapper in IconLab.tsx

Add a `fetchWithRetry` helper local to IconLab (or import the one from pipelineAIService if it's exported):

```typescript
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 2000;
const RETRYABLE_STATUS = new Set([429, 503]);

async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, options);
    if (res.ok || !RETRYABLE_STATUS.has(res.status) || attempt === MAX_RETRIES) return res;
    const delay = RETRY_BASE_MS * Math.pow(2, attempt);
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error('Unreachable');
}
```

#### A2. Surface retry status in UI

In `handleGenerate()`:
- Replace `setAiLoading(true)` with a status message: `"Generating..."` → `"Retrying (attempt 2/3)..."` etc.
- On final failure after all retries: show the specific error ("Gemini is experiencing high demand. Please try again in a few minutes.") with a **Retry** button that re-triggers `handleGenerate()`.

#### A3. Acceptance criteria
- 503 → automatic retry up to 3 times with backoff
- User sees retry progress ("Retrying 2/3...")
- After 3 failures → actionable error message + Retry button
- Non-retryable errors (400/401/403) still fail immediately

---

## B. Engrave Frame — Independent Positioning

### Current State
- Frame = separate `FILL_RECT` element with `engraveFrame` config
- `AppContext.tsx` `UPDATE_ELEMENT` reducer auto-syncs frame bounds to parent bounds + padding
- Frame is selectable on canvas, but any parent move overwrites frame position
- `engraveFrame` type: `{ frameOf, mode, depth, fillMode, fillColor, padding }`

### Changes

#### B1. Add `linked` field to engraveFrame type

**`src/types/index.ts`** — extend `engraveFrame`:

```typescript
engraveFrame?: {
  frameOf: string;
  mode: 'inner' | 'outer';
  depth: 'low' | 'high';
  fillMode: 'none' | 'color';
  fillColor: string;
  padding: number;
  linked?: boolean; // default true — auto-sync to parent bounds
};
```

#### B2. Guard bounds sync in reducer

**`src/context/AppContext.tsx`** — in `UPDATE_ELEMENT` handler, wrap the frame sync:

```typescript
if (frameEl?.engraveFrame && frameEl.engraveFrame.linked !== false) {
  // existing sync logic
}
```

When `linked === false`, the frame bounds are left untouched regardless of parent changes.

#### B3. PropertyPanel: Link/Unlink toggle

**`src/components/PropertyPanel.tsx`** — in the engrave frame section, add:

```
🔗 Linked to parent   [Toggle Switch]
```

- When ON (linked): frame follows parent (current behavior)
- When OFF (unlinked): frame position/size is independent
- Switching from unlinked → linked should re-sync bounds immediately (snap back to parent + padding)

#### B4. Default linked=true on creation

**`src/StudioApp.tsx`** `handleAddFrame()` — set `linked: true` in the new frame's `engraveFrame` config.

#### B5. Acceptance criteria
- New frames are linked by default (backwards compatible)
- Toggle to unlink → frame can be dragged/resized independently
- Toggle back to linked → frame snaps to parent bounds + padding
- ZPK export works correctly for both linked and unlinked frames

---

## C. Preview Screenshot — Auto-Remove Grid Before Capture

### Current State
- `StudioApp.tsx` `handleGenerate()` line ~1480: deselects element, waits 2 rAF, captures `canvas.toDataURL()`
- Grid is drawn if `showGrid === true` — grid is NOT disabled before capture
- Preview image sent to GitHub and shown in QR display

### Changes

#### C1. Temporarily disable grid during capture

**`src/StudioApp.tsx`** — in `handleGenerate()`, around the capture block:

```typescript
// Save and disable grid
const gridWasOn = showGrid;
if (gridWasOn) setShowGrid(false);

setSelectedElementId(null);
await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));

// Capture
let previewDataUrl: string | null = null;
try {
  const canvas = canvasRef.current;
  if (canvas) {
    previewDataUrl = canvas.toDataURL('image/png');
    setPreviewImageUrl(previewDataUrl);
  }
} catch (e) {
  previewDataUrl = state.backgroundImage;
}

// Restore grid
if (gridWasOn) setShowGrid(true);
```

Need an extra rAF wait after `setShowGrid(false)` to ensure the canvas redraws without the grid before capture.

#### C2. Acceptance criteria
- Grid ON → generate → preview image has NO grid lines
- Grid OFF → generate → no change in behavior
- Grid state is restored after capture (user's toggle preserved)

---

## D. Background Crop Tool — Alignment Grid

### Current State
- `BackgroundCropTool.tsx` renders a 480×480 canvas with the background image, a circular clip mask, and pan/zoom controls
- NO grid/mesh overlay exists for alignment
- Export uses a **separate offscreen canvas** — so any UI overlay on the visible canvas does NOT appear in the export

### Changes

#### D1. Add grid toggle button

**`src/components/BackgroundCropTool.tsx`** — add a toggle button (grid icon) to the toolbar:

```typescript
const [showCropGrid, setShowCropGrid] = useState(false);
```

Button placed near existing controls (rotate, zoom).

#### D2. Draw alignment grid on visible canvas

After drawing the image and clip mask, if `showCropGrid`:

```typescript
function drawCropGrid(ctx: CanvasRenderingContext2D, size: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;

  // Rule-of-thirds
  const third = size / 3;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(third * i, 0); ctx.lineTo(third * i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, third * i); ctx.lineTo(size, third * i); ctx.stroke();
  }

  // Center crosshairs (brighter)
  const cx = size / 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, size); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, cx); ctx.lineTo(size, cx); ctx.stroke();

  ctx.restore();
}
```

#### D3. Grid isolation from export

No changes needed. The existing `handleConfirm()` creates an offscreen canvas and draws only the image data. The grid is drawn after in the render loop — it never touches the export canvas.

#### D4. Acceptance criteria
- Grid toggle visible in crop tool toolbar
- Grid shows rule-of-thirds + center crosshairs when ON
- Grid does NOT appear in the exported/cropped background image
- Grid OFF by default

---

## E. Remove Duplicate "Edit Photo" UI

### Current State (3 duplication sites in StudioApp.tsx)

1. **Import duplication** (~line 37-38): `BackgroundCropTool` and `BackgroundPhotoEditor` imports appear twice each
2. **Button duplication** (lines 1891-1908): Two identical `"✏ Edit Photo"` buttons
3. **Modal duplication** (lines 2347-2363): Two identical `<BackgroundPhotoEditor>` renders

### Changes

#### E1. Remove duplicate imports
Keep first occurrence of each import, delete the second.

#### E2. Remove duplicate button
Keep the first `"✏ Edit Photo"` button block (lines 1891-1898), delete the second (lines 1900-1907).

#### E3. Remove duplicate modal
Keep the first `<BackgroundPhotoEditor>` render (lines 2347-2353), delete the second (lines 2356-2362).

#### E4. Acceptance criteria
- Only one "Edit Photo" button visible in sidebar
- Only one `BackgroundPhotoEditor` modal mounts when clicked
- No duplicate imports
- All existing edit photo functionality preserved
