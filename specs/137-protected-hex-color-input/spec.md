# Spec 137 — Protected Hex Color Prefix

**Status:** Approved for implementation  
**Created:** 2026-08-05  
**Domain:** Studio color-entry controls

## Goal

Keep the `#` prefix visible but outside the editable/selectable color value so
copying, double-click selection, and pasting operate on hex digits only.

## Contract

- Render `#` as a separate, non-selectable prefix.
- The input contains only up to six hexadecimal digits.
- Pasting values with or without `#` normalizes to digits.
- Commit only valid six-digit colors; invalid or incomplete edits revert safely.
- Apply the component to editable Studio hex fields while preserving color picker
  behavior.

## Acceptance Criteria

1. Double-clicking selects only the hexadecimal digits.
2. Copying from the input excludes `#`.
3. Pasting `#A1B2C3` or `A1B2C3` results in the same color.
4. Incomplete input cannot corrupt the element color.

