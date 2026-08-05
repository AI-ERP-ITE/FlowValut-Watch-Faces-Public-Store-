# Spec 136 — Color and Style Clipboard Parity

**Status:** Approved for implementation  
**Created:** 2026-08-05  
**Domain:** Studio element styling workflow

## Goal

Provide a color-only transfer path while making the existing style transfer cover
the complete visual treatment without changing element identity or layout.

## Contract

- Copy Color/Paste Color uses a clipboard independent from Copy Style.
- Color paste changes only the element's primary color.
- Copy Style retains existing color, font, and arc behavior and adds visual edit
  parameters including opacity, image adjustments, hand/pointer effects, drop
  shadows, and frame surface styling.
- Style paste never changes ID, name, widget type, data binding, shortcut action,
  source/content, bounds, center/pivot, or other geometry.
- Nested visual settings are copied by value, not by shared object reference.

## Acceptance Criteria

1. Color-only paste cannot alter font size, effects, geometry, or binding.
2. Style paste transfers supported visual adjustments and effects.
3. Target identity, content, binding, and geometry remain unchanged.
4. Existing Copy Style behavior remains available.

