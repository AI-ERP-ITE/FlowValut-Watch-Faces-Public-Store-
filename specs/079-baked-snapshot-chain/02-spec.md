# 02 - Spec

## User Intent
When user bakes snapshot to a new layer:
1. The current visual silhouette is flattened.
2. Mask edits already applied to source are baked into pixels.
3. New layer starts with no mask metadata.
4. New layer can be re-masked independently.

## Functional Requirements
1. Preserve existing Create/Use/Delete Snapshot actions.
2. Add action to create a new baked layer from selected element.
3. New layer must:
- have unique id and name
- render from snapshot source
- include baked imageDataUrl
- clear mask field/strokes and clip-linked overlay stacks
4. Capture used by baked-layer action must include current mask influence.

## Validation
1. Existing sanitize rule remains default for normal snapshot capture.
2. New capture mode keeps mask when explicitly enabled.
3. Baked layer creation keeps original source untouched.
