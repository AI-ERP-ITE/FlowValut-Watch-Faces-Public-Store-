# Spec 140 — Sticky Studio Side Panels

**Status:** Approved for implementation  
**Created:** 2026-08-06  
**Domain:** Private Studio workspace layout

## Goal

Keep the Properties and Layers work areas continuously accessible while fitting
the Canvas, Properties, and Layers composition inside a laptop or desktop
viewport without horizontal page scrolling.

## Contract

- On desktop layouts, Properties and Layers remain sticky around the vertical
  center of the viewport while the document scrolls.
- Long Properties and Layers content scrolls inside its own pane.
- Rebalance the workspace into Canvas, Properties, and Layers columns with
  flexible width floors that fit within the viewport.
- Preserve the wider Layers presentation and taller layer rows.
- Below the desktop breakpoint, panes stack naturally and do not use sticky
  positioning or cause horizontal overflow.
- Do not change canvas behavior, property controls, layer operations, or data.

## Acceptance Criteria

1. A desktop viewport shows Canvas, Properties, and Layers without horizontal
   page scrolling.
2. Properties and Layers remain vertically centered and visible during document
   scrolling.
3. Long panel contents remain reachable through internal vertical scrolling.
4. Layer rows retain their current height and usable width.
5. Smaller viewports stack the panes without clipped content.
