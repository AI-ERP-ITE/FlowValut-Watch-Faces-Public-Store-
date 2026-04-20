# Spec 027 — UX Fixes Round 3: Tasks

## Execution Order: E → C → A → D → B (low risk → high complexity)

---

## Phase 1: Quick Fixes (E + C)

### T01 — Remove duplicate imports in StudioApp.tsx
**File:** `src/StudioApp.tsx` ~line 37-38
- Delete the second `import { BackgroundCropTool }` line
- Delete the second `import { BackgroundPhotoEditor }` line
- Verify: each import appears exactly once

### T02 — Remove duplicate "Edit Photo" button
**File:** `src/StudioApp.tsx` lines 1900-1907
- Delete the second `{/* T038/T039: Edit Photo button */}` block (keep the first at lines 1891-1898)
- Verify: only one "✏ Edit Photo" button renders

### T03 — Remove duplicate BackgroundPhotoEditor modal
**File:** `src/StudioApp.tsx` lines 2356-2362
- Delete the second `<BackgroundPhotoEditor>` render block (keep the first at lines 2347-2353)
- Verify: only one modal mounts on click

### T04 — Auto-remove grid from preview screenshot
**File:** `src/StudioApp.tsx` — `handleGenerate()` (~line 1480)
1. Before the deselection line, save grid state: `const gridWasOn = showGrid;`
2. If grid was on: `setShowGrid(false);`
3. Add extra rAF wait so canvas redraws without grid
4. After capture (`toDataURL`): restore `if (gridWasOn) setShowGrid(true);`
5. Verify: preview image has no grid lines even when grid was ON

---

## Phase 2: Gemini Retry (A)

### T05 — Add retry wrapper to IconLab Gemini calls
**File:** `src/components/IconLab.tsx`
1. Add `fetchWithRetry()` function (3 retries, 2s/4s/8s exponential backoff on 429/503)
2. Replace the raw `fetch()` in `generateWithGemini()` with `fetchWithRetry()`
3. Non-retryable status codes (400/401/403) still fail immediately

### T06 — Surface retry progress in IconLab UI
**File:** `src/components/IconLab.tsx`
1. Add `retryStatus` state: `null | "Retrying (2/3)..." | "Retrying (3/3)..."`
2. Pass a callback into `fetchWithRetry` that updates `retryStatus` on each retry
3. Display `retryStatus` below the loading spinner when non-null
4. On final failure: show user-friendly message ("Gemini is experiencing high demand") + "Retry" button

---

## Phase 3: Background Crop Grid (D)

### T07 — Add grid toggle state and button to BackgroundCropTool
**File:** `src/components/BackgroundCropTool.tsx`
1. Add state: `const [showCropGrid, setShowCropGrid] = useState(false);`
2. Add grid toggle button (Grid3X3 icon) in the toolbar next to existing controls
3. Button toggles `showCropGrid`

### T08 — Draw alignment grid on crop canvas
**File:** `src/components/BackgroundCropTool.tsx`
1. In the canvas draw function, after drawing the image and mask, if `showCropGrid`:
   - Draw rule-of-thirds lines (2 horizontal + 2 vertical) in white 25% opacity
   - Draw center crosshairs in white 40% opacity
2. Grid renders on the visible canvas only — the offscreen export canvas in `handleConfirm()` is unaffected
3. Verify: exported background image never contains grid lines

---

## Phase 4: Engrave Frame Independence (B)

### T09 — Add `linked` field to engraveFrame type
**File:** `src/types/index.ts`
- Add `linked?: boolean` to the `engraveFrame` type definition
- Default interpretation: `undefined` or `true` = linked (backwards compatible)

### T10 — Guard bounds sync in AppContext reducer
**File:** `src/context/AppContext.tsx`
- In the `UPDATE_ELEMENT` handler (~line 130), wrap the frame bounds sync:
  ```
  if (frameEl?.engraveFrame && frameEl.engraveFrame.linked !== false) { ... }
  ```
- When `linked === false`, skip the bounds overwrite entirely

### T11 — Add Link/Unlink toggle in PropertyPanel
**File:** `src/components/PropertyPanel.tsx`
- In the engrave frame property section, add a "Linked to parent" switch
- When toggled OFF → dispatches `UPDATE_ELEMENT` with `engraveFrame.linked = false`
- When toggled ON → dispatches `UPDATE_ELEMENT` with `engraveFrame.linked = true` AND immediately re-syncs bounds to parent + padding

### T12 — Default linked=true on frame creation
**File:** `src/StudioApp.tsx` — `handleAddFrame()`
- Set `linked: true` in the engraveFrame config object when creating a new frame element

---

## Verification

After all tasks:
- [ ] `npm run build` succeeds (no TypeScript errors)
- [ ] Only one "Edit Photo" button in sidebar
- [ ] Preview screenshot captures have no grid lines
- [ ] Gemini 503 → retries automatically, shows status, recovers if transient
- [ ] Background crop tool has working grid toggle, grid not in export
- [ ] Engrave frame: new frames linked by default, can unlink to move independently, re-linking snaps back
- [ ] Deploy per protocol (dist → docs, update hashes, push)
