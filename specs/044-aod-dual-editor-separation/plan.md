# Plan: Dual MAIN/AOD Editor Separation

## Implementation Plan
1. Extend data model with optional dedicated AOD element storage.
2. Add independent editor mode state (`MAIN` / `AOD`) and active-element binding.
3. Add explicit one-time action to initialize/resync AOD from main layout.
4. Route canvas, property panel, element list, and element CRUD to active mode.
5. Update generation pipeline to export normal widgets from main and AOD widgets from dedicated AOD set.
6. Persist both element sets in source metadata for deterministic regeneration.
7. Validate with TypeScript/Problems scan on touched files.

## Scope Guard
- No auto-sync after AOD initialization.
- No inheritance/override model between main and AOD.
- No deployment/build-publish steps in this implementation pass.
