# Implementation Plan

## Files

- `system-b-editable/src/system-b/customHandParity.ts`
  - Resolve referenced custom hand keys.
  - Copy baked pointer assets and geometry onto FVWF pointer elements.
  - Merge embedded and locally stored records by key.
- `system-b-editable/src/system-b/composerDomain.ts`
  - Add the backward-compatible FVWC custom-hand collection.
- `system-b-editable/src/system-b/ComposerWorkspace.tsx`
  - Load records and connect them to import, FVWC load, and every canvas.
- System B tests
  - Verify pointer hydration, rejection behavior, and FVWC persistence.

## Execution order

1. Domain schema compatibility.
2. Pure hydration logic.
3. Composer connection.
4. Tests and production build.
5. Private deployment and live asset verification.
