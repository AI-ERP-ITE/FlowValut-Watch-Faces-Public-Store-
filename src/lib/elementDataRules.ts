import type { WatchFaceElement } from '@/types';

export type RuleElementKey =
  | 'TEXT'
  | 'DIGITAL_HOURS'
  | 'DIGITAL_MINUTES'
  | 'DIGITAL_SECONDS'
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
  PAI: 'PAI',
  PAI_WEEKLY: 'PAI (Weekly)',
  FAT_BURN: 'Fat Burn',
  HEART: 'Heart Rate',
  STRESS: 'Stress Level',
  SPO2: 'Blood Oxygen',
  HUMIDITY: 'Humidity',
  WIND: 'Wind',
  UVI: 'UV Index',
  AQI: 'Air Quality',
  SLEEP: 'Sleep Duration',
  SUN_RISE: 'Sunrise Time',
  SUN_SET: 'Sunset Time',
  ALTIMETER: 'Altitude',
  VO2MAX: 'VO2 Max',
  TRAINING_LOAD: 'Training Load',
  WEATHER_CURRENT: 'Weather Current',
  WEATHER_STATUS: 'Weather Status',
  MOON: 'Moon Phase',
};

const PRIMARY_DATA_TYPES = [
  'BATTERY',
  'STEP',
  'CAL',
  'DISTANCE',
  'STAND',
  'PAI',
  'FAT_BURN',
  'HEART',
  'STRESS',
  'SPO2',
  'HUMIDITY',
  'WIND',
  'UVI',
  'AQI',
  'SLEEP',
  'SUN_RISE',
  'SUN_SET',
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
  'PAI',
  'PAI_WEEKLY',
  'FAT_BURN',
  'HEART',
  'STRESS',
  'SPO2',
  'HUMIDITY',
  'UVI',
  'AQI',
  'ALTIMETER',
  'VO2MAX',
  'TRAINING_LOAD',
] as const;

export const TEXT_IMG_DATA_TYPE_PREFIXES: Record<string, string> = {
  BATTERY: 'batt_digit',
  STEP: 'step_digit',
  HEART: 'heart_digit',
  SPO2: 'spo2_digit',
  CAL: 'cal_digit',
  DISTANCE: 'dist_digit',
  STRESS: 'stress_digit',
  PAI: 'pai_digit',
  PAI_WEEKLY: 'pai_digit',
  SLEEP: 'sleep_digit',
  STAND: 'stand_digit',
  FAT_BURN: 'fatburn_digit',
  UVI: 'uvi_digit',
  AQI: 'aqi_digit',
  HUMIDITY: 'humid_digit',
  WIND: 'wind_digit',
  ALTIMETER: 'alt_digit',
  VO2MAX: 'vo2_digit',
  TRAINING_LOAD: 'training_digit',
  SUN_RISE: 'sunrise_digit',
  SUN_SET: 'sunset_digit',
  WEATHER_CURRENT: 'temp_digit',
};

// Final authority: ELEMENT -> allowed DATA TYPE values.
export const ELEMENT_TO_DATA: Record<RuleElementKey, readonly string[]> = {
  DIGITAL_HOURS: [],
  DIGITAL_MINUTES: [],
  DIGITAL_SECONDS: [],
  ANALOG_CLOCK: [],
  // IMG_POINTER capability completion: bounded/progress sensor and weather metrics only.
  // Rotation is handled by Zepp runtime via start_angle/end_angle normalization.
  GAUGE_POINTER: ['BATTERY', 'STEP', 'CAL', 'DISTANCE', 'STAND', 'PAI', 'FAT_BURN', 'STRESS', 'SPO2', 'HUMIDITY', 'UVI', 'AQI', 'HEART'],
  DATE_DIGIT: [],
  WEEKDAY_NAME: [],

  TEXT: [...PRIMARY_DATA_TYPES, 'WEATHER_CURRENT', 'PAI_WEEKLY'],
  NUMERIC_DISPLAY: [...PRIMARY_DATA_TYPES, 'WEATHER_CURRENT', 'PAI_WEEKLY'],
  ARC_PROGRESS: [...PROGRESS_DATA_TYPES],

  IMAGE_SWITCHER: [
    'BATTERY',
    'STEP',
    'CAL',
    'DISTANCE',
    'STAND',
    'PAI',
    'PAI_WEEKLY',
    'FAT_BURN',
    'HEART',
    'WEATHER_CURRENT',
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
  DIST: 'DISTANCE',
  PAI_DAILY: 'PAI',
};

export function normalizeDataAlias(dataType: string | undefined): string | undefined {
  if (!dataType) return undefined;
  return DATA_ALIASES[dataType] ?? dataType;
}

export function toRuleElementKey(type: WatchFaceElement['type'], subtype?: string): RuleElementKey | null {
  if (type === 'TEXT') return 'TEXT';
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

export function getAllowedDataTypesForElement(type: WatchFaceElement['type'], subtype?: string): readonly string[] {
  const key = toRuleElementKey(type, subtype);
  if (!key) return [];
  if (key === 'STATUS_INDICATOR') return [];
  return ELEMENT_TO_DATA[key] ?? [];
}

export function getAllowedElementsForData(dataType: string): RuleElementKey[] {
  const normalized = normalizeDataAlias(dataType) ?? dataType;
  return DATA_TO_ELEMENT[normalized] ?? [];
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

export interface ImageSwitcherCountResolution {
  expectedCount: number | null;
  minCount: number;
  strictFixed: boolean;
  source: 'weather-fixed' | 'user-defined' | 'legacy-default' | 'unsupported';
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

  if (normalized === 'WEATHER_CURRENT' || normalized === 'WEATHER_STATUS') {
    return {
      expectedCount: IMAGE_SWITCHER_WEATHER_FRAME_COUNT,
      minCount: IMAGE_SWITCHER_WEATHER_FRAME_COUNT,
      strictFixed: true,
      source: 'weather-fixed',
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
