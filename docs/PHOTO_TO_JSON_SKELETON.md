# Photo to JSON Skeleton (Mimic Template)

Use this file every time you want AI to mimic a photo into structured JSON.

## 1) Goal
- Input: one reference photo.
- Output: one JSON file that reproduces the same visual layout.
- Rule: do not guess hidden details; mark unknown values clearly.

## 1.1) JSON-First Rule (Important)
- JSON is the source of truth.
- JSON is NOT limited by currently visible editor controls.
- You can include advanced fields even if a UI toggle/input is not present yet.
- Unknown/unsupported runtime fields should be preserved in JSON (do not strip).
- If renderer cannot use a field yet, keep it in JSON as forward-compatible metadata.

## 2) Required Inputs
- Project name:
- Design name:
- Reference photo path or URL:
- Target canvas width:
- Target canvas height:
- Device class:
- Notes or constraints:

## 3) Logic Skeleton (Our Process)
1. Read photo and detect major zones (background, center, top, bottom, left, right).
2. Inventory all visible elements (text, icons, shapes, hands, arcs, images).
3. Estimate geometry for each element (x, y, width, height, rotation, anchor).
4. Capture style for each element (color, font, stroke, opacity, shadow).
5. Set layer order (back to front).
6. Add behavior metadata (static, data-bound, animated, pointer, progress).
7. Add confidence score per element and flag uncertain fields.
8. Validate spacing and overlap against original photo.
9. Export final JSON.

## 4) Element Checklist
For each element, fill:
- id
- type
- label
- bbox (x, y, w, h)
- anchor (left-top, center, etc)
- rotation
- zIndex
- style
- fill (solid/gradient/noise/pattern/image)
- gradient (if used)
- gradient.clip (independent, element_self, target_element)
- gradient.clipTargetName (required when clip=target_element)
- gradient.blendMode
- gradient.opacity
- binding (if dynamic)
- confidence
- notes

## 4.1) Full Gradient Option Matrix (Use Any Needed)
Gradient can be independent or clipped to an element.

Core fields:
- type: solid | linear | radial | conic | angular | noise
- enabled: boolean
- opacity: 0..1
- blendMode: normal | multiply | screen | overlay | soft-light | hard-light | color-dodge | color-burn | darken | lighten | difference | exclusion
- repeating: boolean
- units: objectBoundingBox | userSpaceOnUse
- transform: translateX, translateY, scaleX, scaleY, rotateDeg, skewXDeg, skewYDeg

Color stop fields (UNLIMITED stops):
- offset: 0..1
- location: 0..1 (alias of offset)
- color: hex/rgb/rgba/hsla/hsva
- colorWheel: hue(0..360), saturation(0..1), value(0..1), lightness(0..1) (optional)
- opacity: 0..1
- smoothness: optional (0..1)
- midpoint: optional (0..1)
- interpolation: linear | smooth | spline

Fill model (Photoshop-like):
- fill.type: solid | gradient | noise | pattern | image
- fill.opacity: 0..1
- fill.blendMode: same blend set as above
- fill.noise (if type=noise): amount, scale, monochrome, distribution(gaussian|uniform), seed
- fill.solid (if type=solid): color (+ optional colorWheel)
- fill.gradientRef: optional link/path to gradient object

Linear-only:
- x1, y1, x2, y2 (0..1 if objectBoundingBox, absolute if userSpaceOnUse)
- angleDeg (optional alternative to x/y endpoints)

Radial-only:
- cx, cy
- r
- fx, fy (focal point)
- fr (focal radius)

Conic/Angular-only:
- cx, cy
- startAngleDeg
- endAngleDeg

Clip behavior (must support all three):
- clip.mode: independent | element_self | target_element
- clip.enabled: boolean
- clip.inheritPrevious: boolean
- clip.targetName: string (for target_element)

## 4.2) Compatibility Mode
- authoringMode: strict_runtime | permissive_json
- Use permissive_json when you need advanced fields that UI does not expose yet.
- In permissive_json mode, never delete unknown keys during edits.

## 5) JSON Template (Copy and Fill)
```json
{
  "meta": {
    "project": "<project_name>",
    "design": "<design_name>",
    "sourceImage": "<path_or_url>",
    "createdAt": "<iso_datetime>",
    "version": "1.0.0"
  },
  "canvas": {
    "width": 454,
    "height": 454,
    "deviceClass": "watch"
  },
  "background": {
    "type": "image",
    "src": "<bg_asset_or_source>",
    "fit": "cover"
  },
  "elements": [
    {
      "id": "el_001",
      "type": "text",
      "label": "time_hour",
      "bbox": { "x": 0, "y": 0, "w": 0, "h": 0 },
      "anchor": "center",
      "rotation": 0,
      "zIndex": 10,
      "style": {
        "fontFamily": "<font>",
        "fontSize": 24,
        "fontWeight": 600,
        "color": "#FFFFFF",
        "opacity": 1
      },
      "fill": {
        "type": "gradient",
        "opacity": 1,
        "blendMode": "normal",
        "solid": {
          "color": "#ffffff",
          "colorWheel": { "hue": 0, "saturation": 0, "value": 1, "lightness": 1 }
        },
        "noise": {
          "amount": 0,
          "scale": 1,
          "monochrome": false,
          "distribution": "gaussian",
          "seed": 1
        },
        "gradientRef": "gradient"
      },
      "gradient": {
        "enabled": false,
        "type": "linear",
        "opacity": 1,
        "blendMode": "normal",
        "repeating": false,
        "units": "objectBoundingBox",
        "transform": {
          "translateX": 0,
          "translateY": 0,
          "scaleX": 1,
          "scaleY": 1,
          "rotateDeg": 0,
          "skewXDeg": 0,
          "skewYDeg": 0
        },
        "linear": {
          "x1": 0,
          "y1": 0,
          "x2": 1,
          "y2": 1,
          "angleDeg": 45
        },
        "radial": {
          "cx": 0.5,
          "cy": 0.5,
          "r": 0.5,
          "fx": 0.5,
          "fy": 0.5,
          "fr": 0
        },
        "conic": {
          "cx": 0.5,
          "cy": 0.5,
          "startAngleDeg": 0,
          "endAngleDeg": 360
        },
        "stops": [
          {
            "offset": 0,
            "location": 0,
            "color": "#FFFFFF",
            "colorWheel": { "hue": 0, "saturation": 0, "value": 1, "lightness": 1 },
            "opacity": 1,
            "smoothness": 1,
            "interpolation": "smooth"
          },
          {
            "offset": 1,
            "location": 1,
            "color": "#000000",
            "colorWheel": { "hue": 0, "saturation": 0, "value": 0, "lightness": 0 },
            "opacity": 1,
            "smoothness": 1,
            "interpolation": "smooth"
          }
        ],
        "clip": {
          "enabled": false,
          "mode": "independent",
          "inheritPrevious": false,
          "targetName": ""
        }
      },
      "binding": {
        "mode": "dynamic",
        "key": "time.hour"
      },
      "confidence": 0.85,
      "notes": "<what is estimated>"
    }
  ],
  "groups": [
    {
      "id": "grp_main",
      "name": "main_cluster",
      "members": ["el_001"]
    }
  ],
  "validation": {
    "authoringMode": "permissive_json",
    "unknownKeysPreserved": true,
    "overlapWarnings": [],
    "outOfBounds": [],
    "missingFields": [],
    "qualityScore": 0.0
  }
}
```

## 6) Prompt Skeleton (To Generate JSON)
Use this exact prompt shape when asking AI:

"Convert this reference photo to JSON using PHOTO_TO_JSON_SKELETON.md.
- Keep geometry faithful.
- Do not invent hidden parts.
- Mark uncertain fields in notes.
- Return valid JSON only.
- Include confidence for each element.
- Fill gradient using full option matrix when gradient exists.
- If clipped gradient is needed: set clip.mode and clip.targetName correctly.
- Use unlimited gradient stops with per-stop color, opacity, location, and smoothness.
- Keep advanced JSON fields even when editor UI controls are missing."

## 7) Quick Acceptance Rules
- JSON parses without error.
- Every visible photo element appears in elements list.
- Layer order matches photo.
- Main alignment and spacing look correct.
- Uncertain values are explicitly marked.
