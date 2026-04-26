# Feature Specification: Icon Source Retention + Roundtrip Editing

**Feature Branch**: `[039-icon-source-retention-roundtrip]`  
**Created**: 2026-04-26  
**Status**: Draft

## Problem Statement
Custom icons created in Icon Lab are currently persisted and exported as PNG data URLs only. Original SVG/HTML source is not retained for icon records, so users cannot re-open, recolor, and re-inject the same editable source from the saved icon library.

## Goal
1. Persist editable source payload for custom icons (SVG or HTML) alongside raster PNG.
2. Enable true roundtrip editing: save -> reopen source -> edit colors/markup -> resave.
3. Keep current export behavior stable: ZPK still packages PNG assets.

## Scope
### In Scope
1. Extend icon record schema with source payload metadata.
2. Preserve backward compatibility for legacy PNG-only icon records.
3. Add UI action to reopen saved icon into Icon Lab editors.
4. Keep deterministic PNG cache generation for preview/export.
5. Add migration and fallback behavior for records without source.

### Out of Scope
- Replacing PNG export with SVG runtime assets.
- Reworking hand-style storage behavior (already source-aware).
- Changing Zepp runtime widget contracts.

## Functional Requirements
1. The system MUST store source mode (`svg` or `html`) for newly saved custom icons.
2. The system MUST store original source text for newly saved custom icons.
3. The system MUST continue storing PNG dataUrl for fast preview/export.
4. The system MUST allow opening source-capable icons back in Icon Lab for edits.
5. Legacy PNG-only icons MUST remain usable for export and assignment.
6. Legacy PNG-only icons MUST be marked as non-editable source records in UI.
7. Export MUST keep using PNG icon assets (`icon_*.png`) with no behavior regressions.

## Data Model
Proposed extension to custom icon record:
- `sourceMode?: 'svg' | 'html'`
- `sourceCode?: string`
- `sourceVersion?: number`

## Acceptance Criteria
1. Create icon via SVG editor -> save -> reopen -> source appears unchanged.
2. Create icon via HTML editor -> save -> reopen -> source appears unchanged.
3. Edit reopened source (color/shape) -> save -> exported PNG reflects update.
4. Legacy PNG-only icon still appears and exports; UI shows source unavailable badge.
5. No regression in existing icon assignment/export flow.
