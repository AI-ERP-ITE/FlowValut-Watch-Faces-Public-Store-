// Asset Resolver — Maps widget types to predefined asset paths.
// NO dynamic icon generation. Uses fixed, known assets.

import type { GeometryElement, ResolvedElement, ResolvedAssets, ZeppWidget } from '@/types/pipeline';

// ─── Data-type → digit prefix mapping ───────────────────────────────────────────

const DATA_TYPE_DIGIT_PREFIX: Record<string, string> = {
  BATTERY:  'batt_digit',
  STEP:     'step_digit',
  HEART:    'heart_digit',
  SPO2:     'spo2_digit',
  CAL:      'cal_digit',
  DISTANCE: 'dist_digit',
};

// ─── Asset Resolver ─────────────────────────────────────────────────────────────

export function resolveAssets(elements: GeometryElement[]): ResolvedElement[] {
  return elements.map((el) => {
    const assets = resolveForWidget(el.widget, el.dataType, el.sourceType);
    return { ...el, assets };
  });
}

function resolveForWidget(
  widget: ZeppWidget,
  dataType?: string,
  sourceType?: string,
): ResolvedAssets {
  switch (widget) {
    case 'TIME_POINTER':
      return {
        hourHandSrc:   'hour_hand.png',
        minuteHandSrc: 'minute_hand.png',
        secondHandSrc: 'second_hand.png',
        coverSrc:      'hand_cover.png',
      };

    case 'GAUGE_POINTER':
      return {
        src: 'gauge_pointer.png',
      };

    case 'IMG_TIME':
      return {
        fontArray: digitArray('time_digit'),
      };

    case 'IMG_DATE':
      if (sourceType === 'month') {
        return {
          monthArray: monthArray(),
        };
      }
      return {
        fontArray: digitArray('date_digit'),
      };

    case 'IMG_WEEK':
      return {
        weekArray: weekArray(),
      };

    case 'ARC_PROGRESS':
      return {}; // ARC_PROGRESS uses color, no image assets needed

    case 'TEXT_IMG': {
      const prefix = dataType ? DATA_TYPE_DIGIT_PREFIX[dataType] || 'digit' : 'digit';
      return {
        fontArray: digitArray(prefix),
      };
    }

    case 'IMG_LEVEL':
      if (sourceType === 'weather') {
        return {
          imageArray: weatherArray(),
        };
      }
      return {};

    case 'IMG_STATUS':
      return {
        src: 'bluetooth_5_b_30x30.png',
      };

    case 'IMG': {
      // If IMG element has a sourceType that maps to a known icon, assign icon src
      const iconKey = resolveIconKey(sourceType, dataType);
      if (iconKey) {
        const safeKey = iconKey.replace(/[^a-zA-Z0-9_-]/g, '_');
        return { src: `icon_${safeKey}.png` };
      }
      return {};
    }

    case 'TEXT':
      return {};

    case 'FILL_RECT':
    case 'STROKE_RECT':
    case 'CIRCLE':
      return {}; // no image assets — color only

    case 'IMG_ANIM':
      return {}; // animPath set from element.animPath

    case 'IMG_PROGRESS':
    case 'DATE_POINTER':
      return {}; // assets handled via element.images / element.src

    case 'IMG_CLICK': {
      // Same icon resolution as IMG
      const iconKey = resolveIconKey(sourceType, dataType);
      if (iconKey) {
        const safeKey = iconKey.replace(/[^a-zA-Z0-9_-]/g, '_');
        return { src: `icon_${safeKey}.png` };
      }
      return {};
    }

    case 'BUTTON':
      return {}; // uses normalSrc / pressSrc from element props

    default:
      return {};
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function digitArray(prefix: string): string[] {
  return Array.from({ length: 10 }, (_, i) => `${prefix}_${i}.png`);
}

function weekArray(): string[] {
  return Array.from({ length: 7 }, (_, i) => `week_${i}.png`);
}

function monthArray(): string[] {
  return Array.from({ length: 12 }, (_, i) => `month_${i}.png`);
}

function weatherArray(): string[] {
  return Array.from({ length: 29 }, (_, i) => `weather_${i}.png`);
}

// ─── Icon key resolution ─────────────────────────────────────────────────────────

const SOURCE_TYPE_ICON_MAP: Record<string, string> = {
  battery:      'battery',
  heart_rate:   'heart',
  steps:        'steps',
  spo2:         'spo2',
  calories:     'calories',
  distance:     'distance',
  stress:       'stress',
  pai:          'pai',
  sleep:        'sleep',
  stand:        'stand',
  fat_burn:     'fat_burn',
  uvi:          'uvi',
  aqi:          'aqi',
  humidity:     'humidity',
  alarm:        'alarm',
  notification: 'notification',
  moon:         'moon',
  sunrise:      'sunrise',
  sunset:       'sunset',
  wind:         'wind',
};

const DATA_TYPE_ICON_MAP: Record<string, string> = {
  BATTERY:      'battery',
  HEART:        'heart',
  STEP:         'steps',
  SPO2:         'spo2',
  CAL:          'calories',
  DISTANCE:     'distance',
  STRESS:       'stress',
  PAI:          'pai',
  SLEEP:        'sleep',
  STAND:        'stand',
  FAT_BURN:     'fat_burn',
  UVI:          'uvi',
  AQI:          'aqi',
  HUMIDITY:     'humidity',
  ALARM:        'alarm',
  NOTIFICATION: 'notification',
  MOON:         'moon',
  SUN_RISE:     'sunrise',
  SUN_SET:      'sunset',
  WIND:         'wind',
};

function resolveIconKey(sourceType?: string, dataType?: string): string | null {
  if (sourceType && SOURCE_TYPE_ICON_MAP[sourceType]) return SOURCE_TYPE_ICON_MAP[sourceType];
  if (dataType && DATA_TYPE_ICON_MAP[dataType]) return DATA_TYPE_ICON_MAP[dataType];
  return null;
}
