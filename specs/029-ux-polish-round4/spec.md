# Spec 029 — Detailed Specification

## T1: Fix duplicate Drop Shadow section
- PropertyPanel.tsx contains two identical "Drop Shadow" sections
- Delete the second occurrence (keep the first)
- Condition: `!['TIME_POINTER'].includes(element.type) && !element.engraveFrame`

## T2: Add icon hue/saturation/colorize UI
- Show section for elements where `element.type === 'IMG'` and `element.iconKey`
- Fields: iconHue (slider -180 to +180°), iconSaturation (slider 0–200%), iconColorize (color picker + opacity slider 0–100%)
- "Reset" button to clear all effects
- Warning: "Effects baked into ZPK export"

## T3: Fix IMG_STATUS data type selector
- Replace generic DATA_TYPES dropdown with dedicated 4-option picker for IMG_STATUS:
  - DISCONNECT → "Bluetooth Off"
  - CLOCK → "Alarm Active"
  - DISTURB → "Do Not Disturb"
  - LOCK → "Screen Locked"
- Element creation must set `statusType` field, NOT `dataType`
- Fix element creation in StudioApp.tsx add-element handler

## T4: Fix TIME_POINTER click blocking
- In InteractiveCanvas.tsx hit-test loop, process elements in REVERSE z-order (highest z first)
- If a non-TIME_POINTER element is hit first, return it — TIME_POINTER only wins if nothing else is at that point
- Alternatively: skip TIME_POINTER if any other element's bounds contain the click point

## T5: Reduce selection border opacity
- SEL_COLOR rect stroke: change from opaque to `rgba(0, 212, 255, 0.35)` (35% opacity)
- lineWidth: reduce from 2 to 1.5
- Corner handles: reduce opacity to 50%

## T6: Date→Weekday widget type conversion
- In PropertyPanel for IMG_DATE elements, add "Widget Type" toggle: Date Digit / Weekday Name
- Changing to Weekday Name dispatches action to change element.type from IMG_DATE to IMG_WEEK
- For IMG_WEEK, add "Name Format" toggle: Full (Monday) / Short (Mon) / Initial (Mo.)
  - Stored as `element.weekFormat: 'full' | 'short' | 'initial'`
  - Affects generated code asset path conventions

## T7: Fix IconLab HTML preview
- After API success, inspect what `code` contains (SVG string vs full HTML)
- The `mode` state must be set correctly: 'svg' for SVG, 'html' for full HTML
- If Gemini returns `<svg ...>` root tag → mode = 'svg'; if returns `<!DOCTYPE` or `<html` → mode = 'html'
- Fix the mode detection after API response

## T8: Engrave depth slider
- Replace low/high button toggle with a range slider (1–20, integer)
- Store as `ef.depth: number` (was `'low' | 'high'`)
- Map to blur/offset in rendering: blur = depth * 1.2, offset = depth * 0.6 (min 1)
- Update renderEngraveFrameToPng + InteractiveCanvas engrave rendering to use numeric depth
- Update types/index.ts: `depth: number` (default 6)

## T9: Engrave light direction
- Add `lightAngle: number` (0–360°, default 135 = top-left light)
- Add angle dial UI in PropertyPanel (circular picker or number input + preset buttons: TL/TR/BL/BR)
- In rendering: derive shadowOffsetX/Y from angle: `offsetX = cos(angle) * offset`, `offsetY = sin(angle) * offset`
- Update both renderEngraveFrameToPng and canvas renderer

## T10: Engrave custom highlight/shadow colors
- Add `highlightColor: string` (default '#FFFFFF') and `shadowColor: string` (default '#000000') to engraveFrame type
- Add `highlightOpacity: number` (default 0.6) and `shadowOpacity: number` (default 0.6)
- Add color pickers + opacity sliders in PropertyPanel
- Replace hardcoded colors in renderEngraveFrameToPng and canvas renderer

## T11: Engrave shape support
- Add `shape: 'rect' | 'circle' | 'rounded'` to engraveFrame type (default 'rect')
- Add shape picker in PropertyPanel (3 buttons)
- Add `cornerRadius: number` (default 12) for 'rounded' shape — show when shape='rounded'
- Update canvas rendering: use fillRect / arc / roundRect accordingly
- Update renderEngraveFrameToPng similarly
- ZPK note: circle/rounded baked as PNG (already the case for engraveFrame)

## T12: Engrave click-through fix
- When user clicks on a point and the topmost hit is a FILL_RECT with engraveFrame, allow selection
- The parent element (frameOf) sits at same coordinates — need z-order to prioritize correctly
- Engrave frame should have a z-index BELOW its parent element; hit testing should check engrave frame only if click misses the parent

## T13: Rename element labels + add hover tooltips
Rename in Add Element dialog (StudioApp.tsx):
| Old | New |
|---|---|
| Hours | Digital Hours |
| Minutes | Digital Minutes |
| Digits | Numeric Data Display |
| Arc | Arc Progress |
| Date | Date Digit |
| Weekday | Weekday Name |
| Level | Image Data Switcher |
| Status | Status Indicator |
| Image | Static Image / Icon |
| Circle | Shape |
| Analog | Analog Clock |

Add `description` field to each entry and show as tooltip on hover.

## T14: Add Digital Seconds element
- Add new entry: `{ type: 'IMG_TIME', label: 'Digital Seconds', sub: 'seconds' }`
- Add 'seconds' case to InteractiveCanvas IMG_TIME rendering (show "36" as preview)
- Add seconds support in jsCodeGenerator + jsCodeGeneratorV2 generateImgTimeWidget:
  - Add `second_startX`, `second_startY`, `second_array` params when subtype='seconds'
- Add to data type section explanations

## T15: Shape element consolidation
- Rename 'Circle' → 'Shape' in Add Element dialog
- Add `shapeType: 'circle' | 'fill_rect' | 'stroke_rect' | 'rounded_rect'` to WatchFaceElement
- When adding a Shape element, show sub-type picker
- Update canvas rendering to switch on shapeType
- Update code generators: circle→CIRCLE, fill_rect→FILL_RECT, stroke_rect→STROKE_RECT, rounded_rect→FILL_RECT (baked as PNG note)
- Add cornerRadius property for rounded_rect

## T16: Date format on TEXT widget
- Add `dateFormat: string` field to WatchFaceElement (for TEXT elements)
- When element.dataType matches a date context OR when user picks "Date Format" in PropertyPanel TEXT section, show format picker
- Available formats: DD/MM, MM/DD, DD-MM-YYYY, DD/MM/YYYY, MM-DD-YYYY, DD MMM, MMM DD
- In code generator, emit getText callback or static template string accordingly
- Canvas preview: show formatted sample date "21/04" etc.

## T17: Fix all data type lists
### Elements using hmUI.data_type (IMG_LEVEL, ARC_PROGRESS, TEXT_IMG, IMG_PROGRESS):
**Keep:** BATTERY, STEP, CAL, DISTANCE, HEART, PAI_WEEKLY, SPO2, STRESS, SUN_RISE, UVI, AQI, ALTIMETER, VO2MAX, SLEEP, TRAINING_LOAD
**Remove:** FAT_BURN, STAND, HUMIDITY, SUN_SET, WIND, ALARM, NOTIFICATION
**Keep with warning:** WEATHER_CURRENT (custom/preview-only, not official)
**Remove from these lists:** MOON (IMG_CLICK only)

### IMG_STATUS: replace dropdown with 4-button picker (done in T3)

### Display labels for data types:
| Key | Display Label |
|---|---|
| BATTERY | Battery % |
| STEP | Step Count |
| CAL | Calories |
| DISTANCE | Distance |
| HEART | Heart Rate |
| PAI_WEEKLY | PAI Weekly |
| SPO2 | Blood Oxygen |
| STRESS | Stress Level |
| SUN_RISE | Sunrise Time |
| UVI | UV Index |
| AQI | Air Quality |
| ALTIMETER | Altitude |
| VO2MAX | VO2 Max |
| SLEEP | Sleep Duration |
| TRAINING_LOAD | Training Load |
| WEATHER_CURRENT | Weather (preview only) |
