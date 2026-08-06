# Spec 141 — Shared Sticky Workspace Rails

**Status:** Approved for implementation  
**Created:** 2026-08-06  
**Domain:** Private Studio workspace layout

## Goal

Correct the early release of the Properties and Layers panes near the lower
Interactive Canvas area.

## Correction to Spec 140

- Canvas, Properties, and Layers share one three-column desktop grid and one
  common vertical containing boundary.
- Properties and Layers use viewport-height sticky rails. Each panel is centered
  inside its rail without translated sticky positioning.
- The tall Canvas column scrolls normally and does not itself become one oversized
  sticky element.
- The Canvas column has a strict minimum-width boundary so intrinsic canvas size
  cannot expand the page horizontally.
- Properties and Layers retain internal scrolling and stack normally below the
  desktop breakpoint.

## Acceptance Criteria

1. Properties and Layers remain in view until the complete Canvas workspace ends.
2. Reaching the lower Interactive Canvas does not release either side pane early.
3. The workspace has no horizontal page overflow caused by canvas intrinsic size.
4. Panel contents remain independently scrollable.
