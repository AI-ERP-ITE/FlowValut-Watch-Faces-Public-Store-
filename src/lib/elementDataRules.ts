import type { WatchFaceElement } from '@/types';
import {
  filterLegacyCompatibleDataTypes,
  isLegacyRepresentationAllowed,
  type DataRepresentation,
} from '@/lib/dataRepresentationAuthority';

export type RuleElementKey =
  | 'TEXT'
  | 'DIGITAL_HOURS'
  | 'DIGITAL_MINUTES'
  | 'DIGITAL_SECONDS'
  | 'TIME_READING'
  | 'GAUGE_POINTER'
  | 'ARC_PROGRESS'
  | 'NUMERIC_DISPLAY'
  | 'DATE_DIGIT'
  | 'WEEKDAY_NAME'
  | 'IMAGE_SWITCHER'
  | 'STATUS_INDICATOR'
  | 'STATIC_IMAGE'
  | 'SHAPE'
  | 'ANALOG_CLOCK';

export const DATA_TYPE_LABELS: Record<string, string> = {
  BATTERY: 'Battery %',
  STEP: 'Step Count',
  CAL: 'Calories',
  DISTANCE: 'Distance',
  DIST: 'Distance (legacy)',
  STAND: 'Stand',
  PAI_DAILY: 'PAI (Daily)',
  PAI_WEEKLY: 'PAI (Weekly)',
  FAT_BURNING: 'Fat Burning Time',
  HEART: 'Heart Rate',
  STRESS: 'Stress Level',
  SPO2: 'Blood Oxygen',
  HUMIDITY: 'Humidity',
  WIND: 'Wind Level',
  UVI: 'UV Index',
  AQI: 'Air Quality',
  SLEEP: 'Sleep Duration',
  SUN_RISE: 'Sunrise Time',
  SUN_SET: 'Sunset Time',
  ALTIMETER: 'Air Pressure',
  VO2MAX: 'VO2 Max',
  TRAINING_LOAD: 'Training Load',
  BIO_CHARGE: 'HybridCharge / BioCharge',
  WEATHER_CURRENT: 'Current Temperature',
  WEATHER_LOW: 'Low Temperature',
  WEATHER_HIGH: 'High Temperature',
  WEATHER_STATUS: 'Weather Status',
  MOON: 'Moon Phase',
};

const PRIMARY_DATA_TYPES = [
  'BATTERY',
  'STEP',
  'CAL',
  'DISTANCE',
  'STAND',
  'PAI_DAILY',
  'FAT_BURNING',
  'HEART',
  'STRESS',
  'SPO2',
  'HUMIDITY',
  'WIND',
  'UVI',
  'AQI',
  'SLEEP',
  'ALTIMETER',
  'VO2MAX',
  'TRAINING_LOAD',
] as const;

const PROGRESS_DATA_TYPES = [
  'BATTERY',
  'STEP',
  'CAL',
  'DISTANCE',
  'STAND',
  'PAI_DAILY',
  'PAI_WEEKLY',
  'FAT_BURNING',
  'HEART',
  'STRESS',
  'SPO2',
  'HUMIDITY',
  'WIND',
  'UVI',
  'AQI',
  'ALTIMETER',
  'VO2MAX',
  'BIO_CHARGE',
] as const;

export const TEXT_IMG_DATA_TYPE_PREFIXES: Record<string, string> = {
  BATTERY: 'batt_digit',
  STEP: 'step_digit',
  HEART: 'heart_digit',
  SPO2: 'spo2_digit',
  CAL: 'cal_digit',
  DISTANCE: 'dist_digit',
  STRESS: 'stress_digit',
  PAI_DAILY: 'pai_digit',
  PAI_WEEKLY: 'pai_digit',
  SLEEP: 'sleep_digit',
  STAND: 'stand_digit',
  FAT_BURNING: 'fatburn_digit',
  UVI: 'uvi_digit',
  AQI: 'aqi_digit',
  HUMIDITY: 'humid_digit',
  WIND: 'wind_digit',
  ALTIMETER: 'alt_digit',
  VO2MAX: 'vo2_digit',
  TRAINING_LOAD: 'training_digit',
  BIO_CHARGE: 'bio_charge_digit',
  SUN_RISE: 'sunrise_digit',
  SUN_SET: 'sunset_digit',
  WEATHER_CURRENT: 'temp_digit',
  WEATHER_LOW: 'temp_low_digit',
  WEATHER_HIGH: 'temp_high_digit',
};

// Final authority: ELEMENT -> allowed DATA TYPE values.
export const ELEMENT_TO_DATA: Record<RuleElementKey, readonly string[]> = {
  DIGITAL_HOURS: [],
  DIGITAL_MINUTES: [],
  DIGITAL_SECONDS: [],
  TIME_READING: ['SUN_RISE', 'SUN_SET'],
  ANALOG_CLOCK: [],
  // IMG_POINTER capability completion: bounded/progress sensor and weather metrics only.
  // Rotation is handled by Zepp runtime via start_angle/end_angle normalization.
  GAUGE_POINTER: ['BATTERY', 'STEP', 'CAL', 'DISTANCE', 'STAND', 'PAI_DAILY', 'FAT_BURNING', 'STRESS', 'SPO2', 'HUMIDITY', 'WIND', 'UVI', 'AQI', 'HEART', 'BIO_CHARGE'],
  DATE_DIGIT: [],
  WEEKDAY_NAME: [],

  TEXT: [...PRIMARY_DATA_TYPES, 'PAI_WEEKLY'],
  NUMERIC_DISPLAY: [...PRIMARY_DATA_TYPES, 'WEATHER_CURRENT', 'WEATHER_LOW', 'WEATHER_HIGH', 'PAI_WEEKLY', 'BIO_CHARGE'],
  ARC_PROGRESS: [...PROGRESS_DATA_TYPES],

  IMAGE_SWITCHER: [
    'BATTERY',
    'STEP',
    'CAL',
    'DISTANCE',
    'STAND',
    'PAI_DAILY',
    'PAI_WEEKLY',
    'FAT_BURNING',
    'HEART',
    'STRESS',
    'SPO2',
    'HUMIDITY',
    'BIO_CHARGE',
    'UVI',
    'AQI',
    'WEATHER_STATUS',
    'MOON',
  ],

  STATUS_INDICATOR: ['ALARM', 'NOTIFICATION', 'DND', 'LOCK', 'BLUETOOTH'],

  STATIC_IMAGE: [],
  SHAPE: [],
};

export const DATA_TO_ELEMENT: Record<string, RuleElementKey[]> = Object.entries(ELEMENT_TO_DATA).reduce(
  (acc, [elementKey, dataTypes]) => {
    for (const dataType of dataTypes) {
      if (!acc[dataType]) acc[dataType] = [];
      acc[dataType].push(elementKey as RuleElementKey);
    }
    return acc;
  },
  {} as Record<string, RuleElementKey[]>
);

const DATA_ALIASES: Record<string, string> = {
  CALORIE: 'CAL',
  CALORIES: 'CAL',
  DIST: 'DISTANCE',
  PAI: 'PAI_DAILY',
  FAT_BURN: 'FAT_BURNING',
};

export function normalizeDataAlias(dataType: string | undefined): string | undefined {
  const normalized = dataType?.trim().toUpperCase();
  if (!normalized) return undefined;
  return DATA_ALIASES[normalized] ?? normalized;
}

/** Legacy compatibility inventory. Existing elements/definitions must remain loadable. */
export const IMAGE_SWITCHER_DATA_TYPES = ELEMENT_TO_DATA.IMAGE_SWITCHER;

/** New creation retains every established Image Switcher source. */
export const IMAGE_SWITCHER_NEW_DATA_TYPES = IMAGE_SWITCHER_DATA_TYPES;

export function isNewImageSwitcherDataType(dataType: string | undefined): boolean {
  const normalized = normalizeImageSwitcherDataType(dataType);
  return !!normalized && IMAGE_SWITCHER_NEW_DATA_TYPES.includes(normalized);
}

/** All established choices remain available while editing and creating definitions. */
export function getEditableImageSwitcherDataTypes(currentDataType?: string): readonly string[] {
  const normalized = normalizeImageSwitcherDataType(currentDataType);
  if (!normalized || isNewImageSwitcherDataType(normalized)) return IMAGE_SWITCHER_DATA_TYPES;
  return [normalized, ...IMAGE_SWITCHER_NEW_DATA_TYPES];
}

export function imageSwitcherDataTypesMatch(
  left: string | undefined,
  right: string | undefined,
): boolean {
  const normalizedLeft = normalizeImageSwitcherDataType(left);
  const normalizedRight = normalizeImageSwitcherDataType(right);
  return !!normalizedLeft && normalizedLeft === normalizedRight;
}

/** Canonicalizes only the retired condition-icon alias; numeric temperature remains unchanged. */
export function normalizeImageSwitcherDataType(dataType: string | undefined): string | undefined {
  const normalized = normalizeDataAlias(dataType);
  return normalized === 'WEATHER_CURRENT' ? 'WEATHER_STATUS' : normalized;
}

export function toRuleElementKey(type: WatchFaceElement['type'], subtype?: string): RuleElementKey | null {
  if (type === 'TEXT') return 'TEXT';
  if (type === 'TIME_READING') return 'TIME_READING';
  if (type === 'IMG_TIME') {
    if (subtype === 'hours') return 'DIGITAL_HOURS';
    if (subtype === 'minutes') return 'DIGITAL_MINUTES';
    if (subtype === 'seconds') return 'DIGITAL_SECONDS';
    return 'DIGITAL_HOURS';
  }
  if (type === 'ARC_PROGRESS') return 'ARC_PROGRESS';
  if (type === 'TEXT_IMG') return 'NUMERIC_DISPLAY';
  if (type === 'IMG_DATE') return 'DATE_DIGIT';
  if (type === 'IMG_WEEK') return 'WEEKDAY_NAME';
  if (type === 'IMG_LEVEL') return 'IMAGE_SWITCHER';
  if (type === 'IMG_STATUS') return 'STATUS_INDICATOR';
  if (type === 'IMG') return 'STATIC_IMAGE';
  if (type === 'CIRCLE') return 'SHAPE';
  if (type === 'TIME_POINTER') return 'ANALOG_CLOCK';
  if (type === 'GAUGE_POINTER') return 'GAUGE_POINTER';
  return null;
}

function ruleElementRepresentation(key: RuleElementKey): DataRepresentation | null {
  if (key === 'TEXT' || key === 'NUMERIC_DISPLAY') return 'NUMERIC_VALUE';
  if (key === 'ARC_PROGRESS') return 'ARC_PROGRESS';
  if (key === 'GAUGE_POINTER') return 'GAUGE_POINTER';
  if (key === 'IMAGE_SWITCHER') return 'IMAGE_SWITCHER';
  if (key === 'TIME_READING') return 'TIME_READING';
  return null;
}

export function getAllowedDataTypesForElement(type: WatchFaceElement['type'], subtype?: string): readonly string[] {
  const key = toRuleElementKey(type, subtype);
  if (!key) return [];
  if (key === 'STATUS_INDICATOR') return [];
  return filterLegacyCompatibleDataTypes(
    ELEMENT_TO_DATA[key] ?? [],
    ruleElementRepresentation(key),
  );
}

/** New widgets retain the established chooser inventory. */
export function getNewElementAllowedDataTypes(
  type: WatchFaceElement['type'],
  subtype?: string,
): readonly string[] {
  return getAllowedDataTypesForElement(type, subtype);
}

export function hasUnprovenLegacyRepresentation(
  _type: WatchFaceElement['type'],
  _dataType: string | undefined,
): boolean {
  return false;
}

export function getAllowedElementsForData(dataType: string): RuleElementKey[] {
  const normalized = normalizeDataAlias(dataType) ?? dataType;
  return (DATA_TO_ELEMENT[normalized] ?? []).filter((key) =>
    isLegacyRepresentationAllowed(normalized, ruleElementRepresentation(key)),
  );
}

export function normalizeDataTypeForElement(
  type: WatchFaceElement['type'],
  subtype: string | undefined,
  currentDataType: string | undefined,
  options?: { fillDefaultWhenEmpty?: boolean }
): string | undefined {
  const allowed = getAllowedDataTypesForElement(type, subtype);
  if (allowed.length === 0) return undefined;

  const normalizedCurrent = normalizeDataAlias(currentDataType);
  if (normalizedCurrent && allowed.includes(normalizedCurrent)) return normalizedCurrent;

  if (options?.fillDefaultWhenEmpty) {
    return allowed[0];
  }

  return normalizedCurrent ? allowed[0] : undefined;
}

export function getDataTypeLabel(dataType: string): string {
  return DATA_TYPE_LABELS[dataType] ?? dataType;
}

export function getTextImgPrefixForDataType(dataType: string | undefined): string | undefined {
  const normalized = normalizeDataAlias(dataType);
  if (!normalized) return undefined;
  return TEXT_IMG_DATA_TYPE_PREFIXES[normalized];
}

export const IMAGE_SWITCHER_MIN_NON_WEATHER_FRAMES = 2;
export const IMAGE_SWITCHER_WEATHER_FRAME_COUNT = 29;
export const IMAGE_SWITCHER_LEGACY_DEFAULT_FRAMES = 10;
export const IMAGE_SWITCHER_MOON_FRAME_COUNTS = [7, 13, 30] as const;
export const IMAGE_SWITCHER_DEFAULT_MOON_FRAME_COUNT = 7;

import type { PolicyType } from '@/types/imageSwitcher';

export const IMAGE_SWITCHER_POLICY: Record<string, PolicyType> = {
  WEATHER_STATUS:  'FIXED_CODES',
  MOON:            'LUNAR_CYCLE',
  BATTERY:         'PERCENT_RANGES',
  HEART:           'DYNAMIC_RANGES',
  STEP:            'ABSOLUTE_RANGES',
  CAL:             'ABSOLUTE_RANGES',
  DISTANCE:        'ABSOLUTE_RANGES',
  STAND:           'ABSOLUTE_RANGES',
  PAI_DAILY:       'ABSOLUTE_RANGES',
  PAI_WEEKLY:      'ABSOLUTE_RANGES',
  FAT_BURNING:     'ABSOLUTE_RANGES',
  STRESS:          'ABSOLUTE_RANGES',
  SPO2:            'ABSOLUTE_RANGES',
  UVI:             'ABSOLUTE_RANGES',
  AQI:             'ABSOLUTE_RANGES',
  HUMIDITY:        'ABSOLUTE_RANGES',
  BIO_CHARGE:      'ABSOLUTE_RANGES',
};

export const IMAGE_SWITCHER_FIXED_SLOT_COUNTS: Record<string, number> = {
  WEATHER_STATUS:  29,
};

export interface ImageSwitcherCountResolution {
  expectedCount: number | null;
  minCount: number;
  strictFixed: boolean;
  source: 'weather-fixed' | 'moon-cycle' | 'user-defined' | 'legacy-default' | 'unsupported';
}

export function resolveImageSwitcherFrameCount(
  dataType: string | undefined,
  options?: { explicitCount?: number | null }
): ImageSwitcherCountResolution {
  const normalized = normalizeDataAlias(dataType);
  const explicitRaw = options?.explicitCount;
  const explicitCount = Number.isFinite(explicitRaw)
    ? Math.floor(Math.max(0, Number(explicitRaw)))
    : null;

  if (!normalized || !ELEMENT_TO_DATA.IMAGE_SWITCHER.includes(normalized)) {
    return {
      expectedCount: null,
      minCount: IMAGE_SWITCHER_MIN_NON_WEATHER_FRAMES,
      strictFixed: false,
      source: 'unsupported',
    };
  }

  if (normalized === 'WEATHER_STATUS') {
    return {
      expectedCount: IMAGE_SWITCHER_WEATHER_FRAME_COUNT,
      minCount: IMAGE_SWITCHER_WEATHER_FRAME_COUNT,
      strictFixed: true,
      source: 'weather-fixed',
    };
  }

  if (normalized === 'MOON') {
    const moonCount = IMAGE_SWITCHER_MOON_FRAME_COUNTS.includes(
      explicitCount as (typeof IMAGE_SWITCHER_MOON_FRAME_COUNTS)[number],
    ) ? explicitCount! : IMAGE_SWITCHER_DEFAULT_MOON_FRAME_COUNT;
    return {
      expectedCount: moonCount,
      minCount: IMAGE_SWITCHER_DEFAULT_MOON_FRAME_COUNT,
      strictFixed: true,
      source: 'moon-cycle',
    };
  }

  if (explicitCount !== null && explicitCount >= IMAGE_SWITCHER_MIN_NON_WEATHER_FRAMES) {
    return {
      expectedCount: explicitCount,
      minCount: IMAGE_SWITCHER_MIN_NON_WEATHER_FRAMES,
      strictFixed: false,
      source: 'user-defined',
    };
  }

  return {
    expectedCount: IMAGE_SWITCHER_LEGACY_DEFAULT_FRAMES,
    minCount: IMAGE_SWITCHER_MIN_NON_WEATHER_FRAMES,
    strictFixed: false,
    source: 'legacy-default',
  };
}

export function getImageSwitcherExpectedImageCount(
  dataType: string | undefined,
  explicitCount?: number | null
): number | null {
  return resolveImageSwitcherFrameCount(dataType, { explicitCount }).expectedCount;
}
