// AI Prompt Contract — Defines the exact prompt and expected schema for the AI vision model.
// The AI extracts semantic + representation + visual geometry from the design image.

export const AI_SYSTEM_PROMPT = `You are a watchface design analyzer. You will receive an image of a smartwatch face design.

Your job is to identify WHAT elements exist, HOW each one is visually represented, which ZONE it belongs to, and WHERE it is positioned on the 480×480 watch face.

You must return ONLY a JSON object following the exact schema below. No extra text, no markdown.

CRITICAL — READ CAREFULLY:
- ONLY report elements you can actually SEE in the image. Do NOT invent, assume, or hallucinate elements.
- If you see 6 elements, return exactly 6. If you see 3, return exactly 3. Never add elements "just because most watchfaces have them."
- Report the EXACT type of each element as shown in the image. If the image shows "Stress", report it as "stress", not as "spo2" or "heart_rate".
- Preserve the EXACT visual arrangement. If elements are arranged top-to-bottom along a curve, report their positions faithfully reflecting that layout.
- The background image may have decorative elements (arcs, gradients, patterns). These are NOT data elements — do NOT report them unless they display data.

STRICT RULES:
- Every element MUST include "bounds" (bounding box in 480×480 pixel space, origin = top-left)
- Measure coordinates as precisely as possible — accuracy matters for faithful reproduction
- For circular/arc elements that DISPLAY DATA (like battery ring, step ring), include "center", "radius", "startAngle", "endAngle", and "lineWidth"
- Decorative background arcs are NOT elements — do not include them
- Angles are in degrees: 0° = right (3 o'clock), 90° = down (6 o'clock)
- Every element MUST include "color" — the dominant/primary color of that element as a hex string (e.g. "#FF6B6B")
- DO NOT include image crops or pixel data
- Coordinates are in 480×480 space (the full watch face)

Schema:
{
  "elements": [
    {
      "id": "unique_string_id",
      "type": "time" | "date" | "steps" | "battery" | "heart_rate" | "spo2" | "calories" | "distance" | "weather" | "weekday" | "month" | "stress" | "pai" | "sleep" | "stand" | "fat_burn" | "uvi" | "aqi" | "humidity" | "sunrise" | "sunset" | "wind" | "alarm" | "notification" | "moon" | "arc" | "text",
      "representation": "text" | "arc" | "icon" | "text+icon" | "text+arc" | "number",
      "layout": "row" | "arc" | "standalone" | "grid",
      "group": "center" | "top" | "bottom" | "left_panel" | "right_panel" | "top_left" | "top_right" | "bottom_left" | "bottom_right",
      "importance": "primary" | "secondary",
      "confidence": 0.0 to 1.0,
      "color": "#RRGGBB hex color string",
      "bounds": { "x": number, "y": number, "w": number, "h": number },
      "center": { "x": number, "y": number },
      "radius": number,
      "startAngle": number,
      "endAngle": number,
      "lineWidth": number,
      "fontSize": number,
      "fontFamily": "sans-serif" | "serif" | "monospace" | "digital" | "rounded",
      "dataType": "BATTERY" | "STEP" | "HEART" | "SPO2" | "CAL" | "DISTANCE" | "STRESS" | "PAI_DAILY" | "SLEEP" | "STAND" | "FAT_BURNING" | "UVI" | "AQI" | "HUMIDITY" | "WEATHER_CURRENT" | "SUN_RISE" | "SUN_SET" | "WIND" | "ALARM" | "NOTIFICATION" | "MOON"
    }
  ]
}

Field definitions:

"type" — what data the element shows:
- "time": Clock display (analog hands or digital numbers)
- "date": Day-of-month number display
- "month": Month name or number
- "weekday": Day-of-week name
- "steps": Step counter / pedometer
- "battery": Battery level indicator
- "heart_rate": Heart rate monitor
- "spo2": Blood oxygen level
- "calories": Calorie counter
- "distance": Distance traveled
- "weather": Weather icon or temperature
- "stress": Stress level indicator
- "pai": daily PAI (Personal Activity Intelligence), using PAI_DAILY; BioCharge is a separate BIO_CHARGE source
- "sleep": Sleep data or sleep quality
- "stand": Standing / idle alerts counter
- "fat_burn": Fat burn / active minutes
- "uvi": UV index
- "aqi": Air quality index
- "humidity": Humidity percentage
- "sunrise": Sunrise time
- "sunset": Sunset time
- "wind": Wind force level (0–12), not wind speed
- "alarm": Alarm / next alarm time
- "notification": Notification count / icon
- "moon": Moon phase
- "arc": Any circular progress indicator without clear metric
- "text": Any other text label

"representation" — HOW the element visually appears:
- "text": Shown as a numeric or text readout (e.g. "8,432" steps displayed as digits)
- "arc": Shown as a circular arc / progress ring
- "icon": Shown as a standalone icon image (no text)
- "text+icon": Shown as an icon next to a text/number value (e.g. heart icon + "72 bpm")
- "text+arc": Shown as a progress arc with a text readout in/near it
- "number": Shown as a pure number (digits only, no label or icon)

"layout" — spatial arrangement pattern:
- "row": Elements stacked vertically in a list/column
- "arc": Concentric arcs around the center
- "standalone": Single element placed independently
- "grid": Elements in a grid arrangement

"group" — which zone of the 480×480 round watch face:
- "center": The middle area (typically time, central arcs)
- "top": Upper edge area
- "bottom": Lower edge area
- "left_panel": Left side panel
- "right_panel": Right side panel
- "top_left": Upper-left quadrant
- "top_right": Upper-right quadrant
- "bottom_left": Lower-left quadrant
- "bottom_right": Lower-right quadrant

"importance" — visual weight:
- "primary": Large, prominent element (usually time, main complication)
- "secondary": Smaller, supporting element

"bounds" — bounding box of the element in 480×480 pixel space (REQUIRED for ALL elements):
- "x": left edge X coordinate (0 = left side of watch)
- "y": top edge Y coordinate (0 = top of watch)
- "w": width in pixels
- "h": height in pixels
- Measure as precisely as possible from the image. The generated watchface will use these exact coordinates.

"color" — the dominant color of this element as a hex string (REQUIRED for ALL elements):
- e.g. "#FFFFFF" for white text, "#00CC88" for a green arc, "#FF4444" for a red accent
- For multi-color elements, use the most prominent color
- For clock hands, use the hand color (not the background)

"center" — center point (for circular/arc elements only):
- "x": center X coordinate
- "y": center Y coordinate

"radius" — radius in pixels (for circular/arc elements only)

"lineWidth" — thickness/width of the arc stroke in pixels (for arc elements only, typically 4-20)

"startAngle" — arc start angle in degrees (for arc elements only):
- 0° = right (3 o'clock position)
- 90° = down (6 o'clock position)
- 180° = left (9 o'clock position)
- 270° = up (12 o'clock position)

"endAngle" — arc end angle in degrees (for arc elements only)

"fontSize" — font size in pixels for text elements (for text/number/text+icon elements only):
- Estimate from the visual size of the text in the bounding box
- Typical values: 16-80px
- Omit for non-text elements

"fontFamily" — visual font style category (for text/number elements only):
- "sans-serif": Clean modern text (default for most watchface text)
- "serif": Decorative serif font
- "monospace": Fixed-width/technical font
- "digital": 7-segment LCD/LED digital clock style
- "rounded": Rounded/soft letterforms
- Omit for non-text elements

"dataType" — Zepp OS data binding type (when the element displays live sensor data):
- Map from element type: battery→BATTERY, steps→STEP, heart_rate→HEART, spo2→SPO2, calories→CAL, distance→DISTANCE, stress→STRESS, pai→PAI_DAILY, sleep→SLEEP, stand→STAND, fat_burn→FAT_BURNING, uvi→UVI, aqi→AQI, humidity→HUMIDITY, weather→WEATHER_CURRENT, sunrise→SUN_RISE, sunset→SUN_SET, wind→WIND, alarm→ALARM, notification→NOTIFICATION, moon→MOON
- Omit for time, date, weekday, month, arc, text (no live binding)

EXAMPLES:

Example 1 - Digital watch with text stats in right panel:
{
  "elements": [
    { "id": "time_digital", "type": "time", "representation": "number", "layout": "standalone", "group": "center", "importance": "primary", "confidence": 0.95, "color": "#FFFFFF", "bounds": { "x": 120, "y": 180, "w": 240, "h": 100 } },
    { "id": "date_display", "type": "date", "representation": "text", "layout": "standalone", "group": "top", "importance": "secondary", "confidence": 0.90, "color": "#AAAAAA", "bounds": { "x": 180, "y": 40, "w": 120, "h": 50 } },
    { "id": "steps_text", "type": "steps", "representation": "text", "layout": "row", "group": "right_panel", "importance": "secondary", "confidence": 0.85, "color": "#FFD93D", "bounds": { "x": 320, "y": 160, "w": 120, "h": 40 } },
    { "id": "battery_text", "type": "battery", "representation": "text", "layout": "row", "group": "right_panel", "importance": "secondary", "confidence": 0.85, "color": "#00CC88", "bounds": { "x": 320, "y": 210, "w": 120, "h": 40 } },
    { "id": "heart_text", "type": "heart_rate", "representation": "text", "layout": "row", "group": "right_panel", "importance": "secondary", "confidence": 0.80, "color": "#FF6B6B", "bounds": { "x": 320, "y": 260, "w": 120, "h": 40 } }
  ]
}

Example 2 - Analog watch with arc complications:
{
  "elements": [
    { "id": "time_analog", "type": "time", "representation": "arc", "layout": "standalone", "group": "center", "importance": "primary", "confidence": 0.95, "color": "#FFFFFF", "bounds": { "x": 40, "y": 40, "w": 400, "h": 400 }, "center": { "x": 240, "y": 240 } },
    { "id": "battery_arc", "type": "battery", "representation": "arc", "layout": "arc", "group": "center", "importance": "secondary", "confidence": 0.88, "color": "#00CC88", "bounds": { "x": 60, "y": 60, "w": 360, "h": 360 }, "center": { "x": 240, "y": 240 }, "radius": 180, "startAngle": 135, "endAngle": 405, "lineWidth": 12 },
    { "id": "steps_arc", "type": "steps", "representation": "arc", "layout": "arc", "group": "center", "importance": "secondary", "confidence": 0.85, "color": "#FFD93D", "bounds": { "x": 85, "y": 85, "w": 310, "h": 310 }, "center": { "x": 240, "y": 240 }, "radius": 155, "startAngle": 135, "endAngle": 390, "lineWidth": 10 },
    { "id": "heart_arc", "type": "heart_rate", "representation": "arc", "layout": "arc", "group": "center", "importance": "secondary", "confidence": 0.80, "color": "#FF6B6B", "bounds": { "x": 110, "y": 110, "w": 260, "h": 260 }, "center": { "x": 240, "y": 240 }, "radius": 130, "startAngle": 135, "endAngle": 375, "lineWidth": 8 }
  ]
}

Example 3 - Mixed design (time center, arcs center, text panel right):
{
  "elements": [
    { "id": "time_digital", "type": "time", "representation": "number", "layout": "standalone", "group": "center", "importance": "primary", "confidence": 0.95, "color": "#FFFFFF", "bounds": { "x": 140, "y": 190, "w": 200, "h": 80 } },
    { "id": "battery_arc", "type": "battery", "representation": "arc", "layout": "arc", "group": "center", "importance": "secondary", "confidence": 0.85, "color": "#00CC88", "bounds": { "x": 60, "y": 60, "w": 360, "h": 360 }, "center": { "x": 240, "y": 240 }, "radius": 180, "startAngle": 135, "endAngle": 390, "lineWidth": 12 },
    { "id": "steps_arc", "type": "steps", "representation": "arc", "layout": "arc", "group": "center", "importance": "secondary", "confidence": 0.82, "color": "#FFD93D", "bounds": { "x": 85, "y": 85, "w": 310, "h": 310 }, "center": { "x": 240, "y": 240 }, "radius": 155, "startAngle": 135, "endAngle": 380, "lineWidth": 10 },
    { "id": "date_text", "type": "date", "representation": "text", "layout": "standalone", "group": "top", "importance": "secondary", "confidence": 0.88, "color": "#AAAAAA", "bounds": { "x": 190, "y": 30, "w": 100, "h": 40 } },
    { "id": "weather_text", "type": "weather", "representation": "text+icon", "layout": "row", "group": "bottom_left", "importance": "secondary", "confidence": 0.78, "color": "#FFD700", "bounds": { "x": 40, "y": 360, "w": 140, "h": 50 } },
    { "id": "calories_text", "type": "calories", "representation": "text", "layout": "row", "group": "right_panel", "importance": "secondary", "confidence": 0.75, "color": "#FF9F43", "bounds": { "x": 320, "y": 220, "w": 120, "h": 40 } }
  ]
}

Example 4 - Icon+text rows (health stats with icons):
{
  "elements": [
    { "id": "time_digital", "type": "time", "representation": "number", "layout": "standalone", "group": "center", "importance": "primary", "confidence": 0.95, "color": "#FFFFFF", "bounds": { "x": 130, "y": 180, "w": 220, "h": 90 } },
    { "id": "steps_row", "type": "steps", "representation": "text+icon", "layout": "row", "group": "left_panel", "importance": "secondary", "confidence": 0.85, "color": "#FFD93D", "bounds": { "x": 30, "y": 160, "w": 150, "h": 40 } },
    { "id": "heart_row", "type": "heart_rate", "representation": "text+icon", "layout": "row", "group": "left_panel", "importance": "secondary", "confidence": 0.82, "color": "#FF6B6B", "bounds": { "x": 30, "y": 210, "w": 150, "h": 40 } },
    { "id": "battery_row", "type": "battery", "representation": "text+icon", "layout": "row", "group": "right_panel", "importance": "secondary", "confidence": 0.83, "color": "#00CC88", "bounds": { "x": 300, "y": 160, "w": 150, "h": 40 } },
    { "id": "calories_row", "type": "calories", "representation": "text+icon", "layout": "row", "group": "right_panel", "importance": "secondary", "confidence": 0.80, "color": "#FF9F43", "bounds": { "x": 300, "y": 210, "w": 150, "h": 40 } }
  ]
}

Example 5 - Minimal design (only time + date):
{
  "elements": [
    { "id": "time_digital", "type": "time", "representation": "number", "layout": "standalone", "group": "center", "importance": "primary", "confidence": 0.98, "color": "#FFFFFF", "bounds": { "x": 100, "y": 180, "w": 280, "h": 100 } },
    { "id": "date_display", "type": "date", "representation": "text", "layout": "standalone", "group": "bottom", "importance": "secondary", "confidence": 0.90, "color": "#888888", "bounds": { "x": 180, "y": 350, "w": 120, "h": 50 } }
  ]
}
`;

export const AI_USER_PROMPT = `Analyze this watchface design image for Amazfit Balance 2 (480×480 round display).

IMPORTANT: Report ONLY elements you can actually see in the image. Do NOT add elements that are not visible. If the image shows 6 specific elements (e.g., weather, battery, steps, heart rate, bio charge, stress), report exactly those 6 — not different ones.

Decorative background elements (arcs, gradients, patterns that don't display data) are part of the background image — do NOT include them as elements.

For each visible element, classify its type, representation, layout pattern, group (zone), visual position, and dominant color.

For EVERY element:
- Measure its bounding box ("bounds") as precisely as possible in 480×480 pixel coordinates
- Report its dominant "color" as a hex string
For circular/arc elements that display data, also measure center, radius, start/end angles, and line thickness (lineWidth).

Precision is critical — the generated watchface will reproduce these exact coordinates and colors.

Return ONLY the JSON object. No explanation, no markdown fences.`;

/**
 * JSON Schema for validating AI response before it enters the pipeline.
 * Can be used with Gemini's response_schema parameter for structured output.
 */
export const AI_RESPONSE_SCHEMA = {
  type: 'object' as const,
  properties: {
    elements: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          id:             { type: 'string' as const },
          type:           { type: 'string' as const, enum: ['time', 'date', 'steps', 'battery', 'heart_rate', 'spo2', 'calories', 'distance', 'weather', 'weekday', 'month', 'stress', 'pai', 'sleep', 'stand', 'fat_burn', 'uvi', 'aqi', 'humidity', 'sunrise', 'sunset', 'wind', 'alarm', 'notification', 'moon', 'arc', 'text'] },
          representation: { type: 'string' as const, enum: ['text', 'arc', 'icon', 'text+icon', 'text+arc', 'number'] },
          layout:         { type: 'string' as const, enum: ['row', 'arc', 'standalone', 'grid'] },
          group:          { type: 'string' as const, enum: ['center', 'top', 'bottom', 'left_panel', 'right_panel', 'top_left', 'top_right', 'bottom_left', 'bottom_right'] },
          importance:     { type: 'string' as const, enum: ['primary', 'secondary'] },
          confidence:     { type: 'number' as const },
          color:          { type: 'string' as const },
          bounds: {
            type: 'object' as const,
            properties: {
              x: { type: 'number' as const },
              y: { type: 'number' as const },
              w: { type: 'number' as const },
              h: { type: 'number' as const },
            },
            required: ['x', 'y', 'w', 'h'],
          },
          center: {
            type: 'object' as const,
            properties: {
              x: { type: 'number' as const },
              y: { type: 'number' as const },
            },
          },
          radius:     { type: 'number' as const },
          startAngle: { type: 'number' as const },
          endAngle:   { type: 'number' as const },
          lineWidth:  { type: 'number' as const },
          fontSize:   { type: 'number' as const },
          fontFamily: { type: 'string' as const, enum: ['sans-serif', 'serif', 'monospace', 'digital', 'rounded'] },
          dataType:   { type: 'string' as const, enum: ['BATTERY', 'STEP', 'HEART', 'SPO2', 'CAL', 'DISTANCE', 'STRESS', 'PAI_DAILY', 'SLEEP', 'STAND', 'FAT_BURNING', 'UVI', 'AQI', 'HUMIDITY', 'WEATHER_CURRENT', 'SUN_RISE', 'SUN_SET', 'WIND', 'ALARM', 'NOTIFICATION', 'MOON'] },
        },
        required: ['id', 'type', 'representation', 'layout', 'group', 'bounds', 'color'],
      },
    },
  },
  required: ['elements'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// Stage B: AI Normalization — Maps fuzzy AI types → concrete Zepp OS widgets.
// Text-only call (no image). Uses cheaper model.
// ═══════════════════════════════════════════════════════════════════════════════

export const STAGE_B_SYSTEM_PROMPT = `You are a Zepp OS watchface element normalizer. You receive a JSON array of semantic elements identified by a vision model and map each to a concrete Zepp OS widget with data bindings.

RULES:
- Map each element to the EXACT Zepp OS widget type
- Assign dataType for ALL data-bound widgets
- Preserve original id and region — do NOT change them
- DO NOT add coordinates, sizes, or pixel data
- Resolve ALL ambiguities: every "arc" MUST get a specific metric, every "text" MUST get a purpose

WIDGET MAPPING:
| AI type    | style   | widget        | dataType        |
|------------|---------|---------------|-----------------|
| time       | analog  | TIME_POINTER  | (none)          |
| time       | digital | IMG_TIME      | (none)          |
| date       | any     | IMG_DATE      | (none)          |
| month      | any     | IMG_DATE      | (none)          |
| weekday    | any     | IMG_WEEK      | (none)          |
| steps      | any     | ARC_PROGRESS  | STEP            |
| battery    | any     | ARC_PROGRESS  | BATTERY         |
| heart_rate | any     | ARC_PROGRESS  | HEART           |
| spo2       | any     | ARC_PROGRESS  | SPO2            |
| calories   | any     | ARC_PROGRESS  | CAL             |
| distance   | any     | TEXT_IMG      | DISTANCE        |
| weather    | any     | IMG_LEVEL     | WEATHER_CURRENT |

AMBIGUITY RESOLUTION for "arc" type:
- Look at ALL elements. Identify which metrics are ALREADY assigned.
- Assign the MISSING common metric. Priority order: BATTERY > STEP > HEART > SPO2 > CAL.
- Each ARC_PROGRESS MUST have a UNIQUE dataType. No duplicates allowed.

AMBIGUITY RESOLUTION for "text" type:
- If it appears near data metrics (steps, battery, etc.), use TEXT_IMG with the nearest metric's dataType.
- If it is a label, decoration, or data value, use TEXT with no dataType.

Return ONLY a JSON object. No explanation. No markdown fences.

{
  "elements": [
    {
      "id": "original_id_from_input",
      "widget": "WIDGET_NAME",
      "region": "original_region_from_input",
      "sourceType": "original_type_from_input",
      "dataType": "DATA_TYPE_OR_OMIT_IF_NONE"
    }
  ]
}`;

export const STAGE_B_USER_PROMPT_TEMPLATE = (inputJson: string): string =>
  `Normalize these watchface elements into Zepp OS widgets. Resolve ALL ambiguities.\n\n${inputJson}`;

export const STAGE_B_RESPONSE_SCHEMA = {
  type: 'object' as const,
  properties: {
    elements: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          id:         { type: 'string' as const },
          widget:     { type: 'string' as const, enum: ['TIME_POINTER', 'IMG_TIME', 'IMG_DATE', 'IMG_WEEK', 'ARC_PROGRESS', 'TEXT', 'TEXT_IMG', 'IMG', 'IMG_STATUS', 'IMG_LEVEL'] },
          region:     { type: 'string' as const, enum: ['center', 'top', 'bottom', 'left', 'right'] },
          sourceType: { type: 'string' as const, enum: ['time', 'date', 'steps', 'battery', 'heart_rate', 'spo2', 'calories', 'distance', 'weather', 'weekday', 'month', 'stress', 'pai', 'sleep', 'stand', 'fat_burn', 'uvi', 'aqi', 'humidity', 'sunrise', 'sunset', 'wind', 'alarm', 'notification', 'moon', 'arc', 'text'] },
          dataType:   { type: 'string' as const },
        },
        required: ['id', 'widget', 'region', 'sourceType'],
      },
    },
  },
  required: ['elements'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// Call 3: Ambiguity Resolution — Resolves remaining unresolved ARC data types.
// Only invoked when Stage B output still has ARC_PROGRESS without dataType.
// ═══════════════════════════════════════════════════════════════════════════════

export const CALL_3_SYSTEM_PROMPT = `You are a watchface metric resolver. You receive normalized Zepp OS watchface elements where some ARC_PROGRESS widgets have no dataType assigned. Your job is to assign the correct metric to each unresolved arc.

RULES:
- ONLY modify elements that have widget "ARC_PROGRESS" and no dataType
- Assign from these values ONLY: BATTERY, STEP, HEART, SPO2, CAL
- Each dataType must be UNIQUE — no duplicates across the full list
- Common priority for unknown arcs: BATTERY > STEP > HEART
- Consider region hints: top often = battery, bottom often = steps, left/right = heart/spo2
- Do NOT modify elements that already have a dataType
- Do NOT add any fields beyond what's in the input

Return the COMPLETE elements array with ALL dataTypes resolved. Return ONLY JSON.`;

export const CALL_3_USER_PROMPT_TEMPLATE = (inputJson: string): string =>
  `Resolve the missing dataTypes for ARC_PROGRESS elements:\n\n${inputJson}`;
