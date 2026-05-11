# 04 — Tasks

Status legend: ✅ done · ◐ in progress · ☐ not started

---

## Phase 1 — Engine element

| ID | Task | File | Status |
|---|---|---|---|
| T01 | Create `engine/elements/baseElements/imageLayer.js` with `imageLayerElement` definition | `engine/elements/baseElements/imageLayer.js` | ☐ |
| T02 | Import `imageLayerElement` in `engine/index.js` | `engine/index.js` | ☐ |
| T03 | Call `registerElement("image_layer", imageLayerElement)` in `registerBaseElements()` | `engine/index.js` | ☐ |
| T04 | Verify element renders correct SVG `<image>` output in isolation (manual test in browser console or unit test) | — | ☐ |

---

## Phase 2 — Editor UI

| ID | Task | File | Notes | Status |
|---|---|---|---|---|
| T05 | Add `'Image Layer': { type: 'image_layer', role: 'image_layer' }` to `CATEGORY_HEADER_DEFAULTS` | `ParametricPage.tsx` ~line 545 | Enables "Add Element" button for this type | ☐ |
| T06 | Add `if (elementType === 'image_layer') return 'none';` guard to `resolveElementColorTarget` | `ParametricPage.tsx` ~line 3516 | Prevents color picker crash | ☐ |
| T07 | Add `image_layer` inspector block in right panel: file picker, fit radio, opacity slider, X/Y/W/H inputs, size warning | `ParametricPage.tsx` (right panel inspector section) | See 02-spec.md §3d for layout | ☐ |
| T08 | Hide snapshot bake/load/clear buttons when `element.type === 'image_layer'` | `ParametricPage.tsx` (snapshot UI section) | image IS the source; baking makes no sense | ☐ |

---

## Phase 3 — Storage + safety

| ID | Task | File | Notes | Status |
|---|---|---|---|---|
| T09 | Add size warning badge in inspector (< 500 KB = none, 500–800 KB = yellow, 800 KB–2 MB = orange, > 2 MB = red) | `ParametricPage.tsx` inspector | Computed from `params.imageDataUrl.length * 0.75` (approx bytes) | ☐ |
| T10 | Validate `imageDataUrl` prefix at render time (`data:image/` required or empty) — reject silently | `imageLayer.js` render function | Security: prevent non-image data URLs from reaching SVG output | ☐ |

---

## Phase 4 — Build + deploy

| ID | Task | Status |
|---|---|---|
| T11 | `npm run build` succeeds (zero TS errors) | ☐ |
| T12 | New bundle hash logged | ☐ |
| T13 | Private deploy + push origin | ☐ |
| T14 | Public deploy + push public remote | ☐ |
| T15 | Live verification (see 05-validation.md) | ☐ |
