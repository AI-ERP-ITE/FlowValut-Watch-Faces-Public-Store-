# Spec 135 — Canvas-Only Shortcut Icon Widget

**Status:** Approved for implementation  
**Created:** 2026-08-05  
**Domain:** Interactive canvas, AOD isolation, and ZPK export safety

## Goal

Replace the static-library Shortcut image with a dedicated annotation widget that
helps face design but never becomes watch content.

## Contract

- Add a `Shortcut Icon` widget type and remove Shortcut from the static image
  library.
- Render it on the main interactive canvas and main preview only.
- Never display or copy it into AOD.
- Never bake, generate, package, or export it into ZPK/FVWF watch output.
- Legacy/project data containing this widget in AOD is ignored safely.
- The widget carries no watch data binding or app shortcut action.

## Acceptance Criteria

1. Shortcut Icon can be added, positioned, resized, and layered on MAIN.
2. Create/Re-Sync AOD excludes it.
3. AOD display and capture exclude it even if old data contains one.
4. Export preparation strips it before all asset and generator stages.
5. The static image library no longer offers Shortcut.

