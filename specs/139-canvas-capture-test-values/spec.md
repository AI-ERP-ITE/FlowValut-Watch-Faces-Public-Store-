# Spec 139 — Canvas-Capture Watch-Test Values

**Status:** Approved for implementation  
**Created:** 2026-08-05  
**Domain:** System A watch-test preview capture

## Goal

Show controlled realistic values in the preview images captured when the designer
creates a watch test, while preserving the normal live-data ZPK architecture.

## Supersession

This specification replaces the export-layer behavior defined by Spec 138. The
approved value list remains unchanged, but the values are canvas-capture-only and
must never disable or replace watch runtime data bindings.

## Required Sequence

1. The designer completes the readiness checklist and confirms creation.
2. MAIN and AOD capture canvases receive a temporary derived view containing the
   approved values.
3. The preview images are captured from that derived view.
4. The temporary view is removed immediately after capture, including failure
   paths; stored canvas and FVWF values remain unchanged.
5. ZPK generation continues from the original elements and normal live bindings.

## Readiness Checklist

All items remain mandatory. Display them in this order:

1. Have you minimized the face to see how it looks on watch?
2. Have you added or reviewed shadows on the pointers?
3. Is the Time Pointer the latest widget?
4. Have you reviewed and adjusted the background if needed?
5. Did you add a Shortcut Icon to the shortcut widgets?
6. Have you updated the AOD?

## Value Policy

Retain the approved values from Spec 138. Analog hands and Time Reading widgets
(Sunrise, Sunset, and Sleep) remain unchanged. Apply the policy to both MAIN and
AOD preview captures.

## Acceptance Criteria

1. A manual canvas sample such as `88` is unchanged before and after generation.
2. Captured MAIN and AOD previews show the approved derived values.
3. Generated date, digital time, and numeric widgets retain their normal live
   data bindings; no static test text is emitted into the ZPK.
4. The temporary capture view is restored even when preview capture fails.
5. The Shortcut Icon question is required and the AOD question appears last.
6. FVWF persistence contains no temporary capture-value metadata.
