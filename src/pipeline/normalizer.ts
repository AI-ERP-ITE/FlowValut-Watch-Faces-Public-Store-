// Normalizer — Maps AI elements to Zepp widgets based on representation.
// Branches on representation (text, arc, icon, etc.) instead of hardcoded type→widget.
// IMPORTANT: Never drop element types. All types get mapped to a widget.

import type { AIElement, AIElementType, NormalizedElement, ZeppWidget, Representation } from '@/types/pipeline';

// ─── Representation → Widget Mapping ────────────────────────────────────────────

/**
 * Map an AI element type + representation to one or more Zepp OS widgets.
 * This is the core fix: representation drives widget selection, NOT type alone.
 * FR-006: Also considers geometry shape (aspect ratio, spatial pattern).
 */
function mapByRepresentation(type: AIElementType, representation: Representation, el?: AIElement): ZeppWidget | ZeppWidget[] {
  // Time is special — analog (arc) vs digital
  if (type === 'time') {
    return representation === 'arc' ? 'TIME_POINTER' : 'IMG_TIME';
  }

  // Date/weekday/month — always image-based regardless of representation
  // date_pointer: analog hand driven by month/day/week value
  if (type === 'date_pointer') return 'DATE_POINTER';
  if (type === 'date') return 'IMG_DATE';
  if (type === 'weekday') return 'IMG_WEEK';
  if (type === 'month') return 'IMG_DATE';

  // Rect/divider — solid or stroked rectangle depending on representation
  if (type === 'rect') {
    return representation === 'arc' ? 'STROKE_RECT' : 'FILL_RECT';
  }

  // Animation — frame-based image sequence
  if (type === 'animation') return 'IMG_ANIM';

  // Button — interactive shortcut
  if (type === 'button') return 'BUTTON';

  // Moon — tappable icon (IMG_CLICK) rather than IMG_LEVEL
  if (type === 'moon') return 'IMG_CLICK';

  // FR-006: If geometry indicates circular shape, prefer ARC_PROGRESS
  if (el?.bounds && el.radius !== undefined) {
    return 'ARC_PROGRESS';
  }

  // Data elements — BRANCH ON REPRESENTATION
  if (representation === 'arc') return 'ARC_PROGRESS';
  if (representation === 'text') return 'TEXT_IMG';
  if (representation === 'number') return 'TEXT_IMG';
  if (representation === 'icon') return 'IMG';
  if (representation === 'text+icon') return ['TEXT_IMG', 'IMG'];     // compound → 2 widgets
  if (representation === 'text+arc') return ['ARC_PROGRESS', 'TEXT_IMG']; // compound → 2 widgets

  return 'TEXT'; // fallback
}

// ─── Type → Data-binding Type ───────────────────────────────────────────────────

const TYPE_TO_DATA_TYPE: Partial<Record<AIElementType, string>> = {
  steps:      'STEP',
  battery:    'BATTERY',
  heart_rate: 'HEART',
  spo2:       'SPO2',
  calories:   'CAL',
  distance:   'DISTANCE',
  weather:    'WEATHER_CURRENT',
  stress:     'STRESS',
  pai:        'PAI',
  pai_weekly: 'PAI_WEEKLY',
  sleep:      'SLEEP',
  stand:      'STAND',
  fat_burn:   'FAT_BURN',
  uvi:        'UVI',
  aqi:        'AQI',
  humidity:   'HUMIDITY',
  sunrise:    'SUN_RISE',
  sunset:     'SUN_SET',
  wind:       'WIND',
  alarm:      'ALARM',
  notification: 'NOTIFICATION',
  moon:       'MOON',
  vo2max:     'VO2MAX',
  altimeter:  'ALTIMETER',
  training_load: 'TRAINING_LOAD',
};

// Fallback priority for assigning dataType to generic "arc" elements
const ARC_FALLBACK_PRIORITY = ['BATTERY', 'STEP', 'HEART', 'SPO2', 'CAL'];

// ─── Compound Expansion Cap ─────────────────────────────────────────────────────

/** Maximum widgets produced from a single compound representation (text+icon, text+arc). */
const COMPOUND_CAP = 2;

// ─── Normalizer ─────────────────────────────────────────────────────────────────

export function normalize(elements: AIElement[]): NormalizedElement[] {
  // Track which dataTypes are already assigned to avoid duplicates
  const usedDataTypes = new Set<string>();

  // First pass: collect explicitly assigned data types
  for (const el of elements) {
    const dt = TYPE_TO_DATA_TYPE[el.type];
    if (dt) usedDataTypes.add(dt);
  }

  const result: NormalizedElement[] = [];

  for (const el of elements) {
    const widgetOrWidgets = mapByRepresentation(el.type, el.representation, el);
    const widgets = Array.isArray(widgetOrWidgets)
      ? widgetOrWidgets.slice(0, COMPOUND_CAP)
      : [widgetOrWidgets];
    const isCompound = widgets.length > 1;

    let primaryId: string | undefined;

    for (let i = 0; i < widgets.length; i++) {
      const widget = widgets[i];
      // Compound elements get suffixed IDs to stay unique (e.g. "steps_text_0", "steps_text_1")
      const id = isCompound ? `${el.id}_${i}` : el.id;

      const normalized: NormalizedElement = {
        id,
        widget,
        group: el.group,
        layout: el.layout,
        sourceType: el.type,
        // Carry geometry forward from AI extraction
        bounds: el.bounds,
        center: el.center,
        radius: el.radius,
        startAngle: el.startAngle,
        endAngle: el.endAngle,
        lineWidth: el.lineWidth,
        color: el.color,
        fontFamily: el.fontFamily,
      };

      // Link second (and beyond) compound elements back to the first
      if (isCompound) {
        if (i === 0) {
          primaryId = id;
        } else {
          normalized.parentId = primaryId;
        }
      }

      // Explicit data type from known types
      const dataType = TYPE_TO_DATA_TYPE[el.type];
      if (dataType) {
        normalized.dataType = dataType;
      }
      // For generic "arc" type: assign next available metric from fallback priority
      else if (el.type === 'arc') {
        const fallback = ARC_FALLBACK_PRIORITY.find(dt => !usedDataTypes.has(dt));
        if (fallback) {
          normalized.dataType = fallback;
          usedDataTypes.add(fallback);
        }
      }

      result.push(normalized);
    }
  }

  return result;
}
