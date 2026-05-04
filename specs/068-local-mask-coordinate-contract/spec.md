# Spec 068 - Local Mask Coordinate Contract

## Summary
Restore deterministic mask behavior by enforcing one coordinate contract across authoring and rendering:
- mask strokes are stored in selected-element local space
- each element instance uses a unique mask ID
- mask and element share the same transform chain at render time

## Scope
- In scope:
  - `app/src/ParametricPage.tsx`
  - `app/engine/core/renderer.js`
- Out of scope:
  - overlay feature behavior changes
  - UV/gradient/material math changes
  - route/auth/backend work
  - UI feature additions

## Problem
Current behavior mixes coordinate assumptions:
1. authoring captures points in canvas global percentages
2. renderer path assumes/introduces local transform sync
3. mismatch causes shifted/misaligned masking and cross-element artifacts

## Requirements
1. Authoring space
- Mask input capture must convert canvas pointer coordinates to selected-element local coordinates before persisting strokes.
- Existing mask structure stays intact (no schema migration fields).

2. Renderer space
- Element mask IDs must be unique per element instance.
- Mask primitives must be interpreted in the same local space as element geometry.
- Mask application must occur in the same transformed element group.
- No global mask def reuse across instances.

3. Data integrity
- Keep non-blocking behavior: no runtime crashes for empty strokes.
- Preserve existing mask enable contract (`enabled === true` in renderer).

## Non-Goals
- No new mask UI indicators
- No drag/selection UX redesign
- No refactor of unrelated pipelines

## Validation
1. Rotated and offset element retains mask alignment.
2. Two masked elements no longer leak mask influence across instances.
3. Preview and render output maintain mask alignment parity.
4. Build succeeds and deployment hashes propagate for root and studio entrypoints.
