# Spec 027 — UX Fixes Round 3: Plan

## Overview

Five user-reported issues covering AI reliability, engrave frame usability, preview/screenshot fidelity, background crop workflow, and UI duplication.

---

## Issue A: Gemini 503 Retry for Icon Lab

**Problem:** `IconLab.tsx` calls `gemini-2.5-flash` with zero retry logic. When Google returns HTTP 503 ("high demand"), the generation fails immediately with no recoverability.

**Root Cause:** The pipeline service (`pipelineAIService.ts`) already has `fetchWithRetry()` with exponential backoff for 429/503. The Icon Lab (`IconLab.tsx`) does NOT use this — it makes a raw `fetch()` inside `generateWithGemini()`.

**Solution:** Add retry logic to Icon Lab's Gemini call path matching the existing pipeline pattern (3 retries, exponential backoff on 429/503), plus surface a user-friendly message with a "Retry" button.

| File | Change |
|------|--------|
| `src/components/IconLab.tsx` | Add retry wrapper around `generateWithGemini()`, show retry status in UI |

---

## Issue B: Engrave Frame — Independent Positioning

**Problem:** The engrave frame (FILL_RECT with `engraveFrame` config) is a separate element, but its bounds are **auto-synced** to the parent element in `AppContext.tsx` reducer. When the parent moves/resizes, the frame is locked to follow it exactly (with padding offset). The user cannot independently move, scale, or reposition the frame.

**Root Cause:** `UPDATE_ELEMENT` action in `AppContext.tsx` (lines 130-144) force-overwrites the frame's bounds every time the parent changes. Additionally, when the frame is selected on canvas, dragging it moves it — but the next parent update snaps it back.

**Solution:**
1. Add a `linked: boolean` toggle (default `true`) to the `engraveFrame` config
2. When `linked = true` → current behavior (auto-sync to parent)
3. When `linked = false` → frame moves/scales independently, parent changes don't affect it
4. Add "Unlink" button in PropertyPanel's frame section
5. Allow frame element to be selected and dragged/resized independently on canvas (already possible for selection, but bounds get overwritten)

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `linked?: boolean` to `engraveFrame` type |
| `src/context/AppContext.tsx` | Guard bounds sync with `linked !== false` check |
| `src/components/PropertyPanel.tsx` | Add Link/Unlink toggle in frame section |
| `src/StudioApp.tsx` | Default `linked: true` when creating frame |

---

## Issue C: Preview Screenshot — Auto-Remove Grid Before Capture

**Problem:** When the user generates a watchface, `handleGenerate()` captures the canvas via `canvas.toDataURL()`. If the grid/mesh overlay is toggled ON (`showGrid = true`), the grid lines are baked into the preview image, producing an ugly screenshot with mesh lines visible.

**Root Cause:** `handleGenerate()` in `StudioApp.tsx` (line 1480) deselects the element before capture (removes selection rectangle) but does NOT turn off the grid.

**Solution:** Temporarily set `showGrid = false` before the capture frame, restore it after. Same 2-rAF pattern already used for deselection.

| File | Change |
|------|--------|
| `src/StudioApp.tsx` | Save grid state → set false → wait 2 rAF → capture → restore grid state |

---

## Issue D: Background Crop Tool — Grid Overlay + Auto-Removal

**Problem:** Two sub-issues:
1. `BackgroundCropTool` has NO grid/mesh overlay, making it hard to align the background image accurately within the circular crop area
2. If the main canvas grid is ON when the background is captured, grid could theoretically leak into exports

**Solution:**
1. Add a toggleable alignment grid to `BackgroundCropTool.tsx` (crosshairs + rule-of-thirds lines on the crop canvas)
2. The grid is drawn as a UI overlay AFTER the crop export call, so it never appears in the exported image (the export uses a separate offscreen canvas that renders only the image)

Note: `BackgroundCropTool` already uses an **offscreen canvas** for export (`handleConfirm` at line ~200 creates a fresh canvas, draws only the image, calls `toDataURL`). The grid drawn on the visible canvas will NOT appear in the export. No removal automation needed — just need to add the visual grid for alignment.

| File | Change |
|------|--------|
| `src/components/BackgroundCropTool.tsx` | Add grid toggle button + draw grid lines on the visible crop canvas |

---

## Issue E: Remove Duplicate "Edit Photo" UI

**Problem:** Three duplication sites in `StudioApp.tsx`:
1. **Lines 37-38**: `BackgroundCropTool` and `BackgroundPhotoEditor` imports each appear twice
2. **Lines 1891-1908**: Two identical "✏ Edit Photo" buttons in the sidebar
3. **Lines 2347-2363**: Two identical `<BackgroundPhotoEditor>` modal renders

**Root Cause:** Copy-paste error during a previous spec implementation.

**Solution:** Remove one copy of each duplicate (keep the first, remove the second).

| File | Change |
|------|--------|
| `src/StudioApp.tsx` | Remove duplicate imports, duplicate button, duplicate modal |

---

## Execution Order

1. **E** (duplicate removal) — zero risk, immediate UX fix
2. **C** (preview grid removal) — small, isolated change
3. **A** (Gemini retry) — isolated to IconLab, no side effects
4. **D** (crop tool grid) — additive feature, no regressions
5. **B** (engrave frame unlink) — most complex, touches multiple files
