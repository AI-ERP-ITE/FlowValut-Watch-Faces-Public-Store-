# Spec 098 — Watchface Project Save / Load

## Goal
Allow users to save a complete watchface project to their local disk and reload it later, restoring the full canvas state including all images, effects, and element configuration.

## User Flow

### Save (auto on ZPK export)
1. User clicks "Generate ZPK"
2. ZPK downloads as usual (no change to existing flow)
3. Immediately after (or in parallel), a second download triggers automatically: a `.fvwf` project file (JSON)
4. Filename: `<watchface-name>_<YYYY-MM-DD>.fvwf` (e.g. `My_Face_2026-06-23.fvwf`)

### Load
1. A "Load Project" button is added to the studio toolbar (near the existing "New" / model selector area)
2. User clicks it → native file picker opens, filtered to `.fvwf` and `.json`
3. User selects a `.fvwf` file
4. Canvas is reset and the full watchface config is restored (all elements, images, effects, resolution, name, etc.)
5. A confirmation toast is shown: "Project loaded: <name>"

## File Format
- Plain JSON, extension `.fvwf`
- Content: the full `WatchFaceConfig` object from state (`state.watchFaceConfig`)
- Includes all `data:` URLs for images (backgrounds, gauge needles, custom uploads)
- No external references — fully self-contained

## Implementation Notes

### Save (StudioApp.tsx)
- After ZPK blob is prepared and download triggered, call `downloadProjectFile(state.watchFaceConfig)`
- `downloadProjectFile`: serialize to JSON → create Blob → trigger `<a>` download

### Load (StudioApp.tsx + toolbar)
- Add `loadProjectFile()` function: opens `<input type="file">` picker → reads file → parses JSON → dispatches `actions.loadWatchFaceConfig(parsed)`
- Add reducer action `loadWatchFaceConfig` that replaces `state.watchFaceConfig` with the loaded config
- Add "Load Project" button to toolbar UI

### Data URI handling
- All image data is embedded as `data:` URLs — no special handling needed
- Gauge needle PNGs, background images, etc. all survive the round-trip via JSON stringify/parse

## Constraints
- Must NOT change the ZPK generation logic (only adds a download alongside it)
- Load overwrites current canvas without undo — show no extra confirmation dialog (keep it simple)
- File extension: `.fvwf` (FlowVault Watchface)
