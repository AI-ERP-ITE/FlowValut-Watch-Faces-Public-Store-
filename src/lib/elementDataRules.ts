import type { WatchFaceElement } from '@/types';

export type RuleElementKey =
  | 'TEXT'
  | 'DIGITAL_HOURS'
  | 'DIGITAL_MINUTES'
  | 'DIGITAL_SECONDS'
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
  UVI: 'UV Index',
  AQI: 'Air Quality',
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
  'UVI',
  'AQI',
] as const;

// Final authority: ELEMENT -> allowed DATA TYPE values.
export const ELEMENT_TO_DATA: Record<RuleElementKey, readonly string[]> = {
  DIGITAL_HOURS: [],
  DIGITAL_MINUTES: [],
  DIGITAL_SECONDS: [],
  ANALOG_CLOCK: [],
  DATE_DIGIT: [],
  WEEKDAY_NAME: [],

  TEXT: [...PRIMARY_DATA_TYPES, 'WEATHER_CURRENT', 'PAI_WEEKLY'],
  NUMERIC_DISPLAY: [...PRIMARY_DATA_TYPES, 'WEATHER_CURRENT', 'PAI_WEEKLY'],
  ARC_PROGRESS: [...PRIMARY_DATA_TYPES, 'PAI_WEEKLY'],

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

export function getImageSwitcherExpectedImageCount(dataType: string | undefined): number | null {
  const normalized = normalizeDataAlias(dataType);
  if (!normalized) return null;

  if (normalized === 'WEATHER_CURRENT' || normalized === 'WEATHER_STATUS') return 29;
  if (normalized === 'HEART') return 6;
  if (ELEMENT_TO_DATA.IMAGE_SWITCHER.includes(normalized)) return 10;
  return null;
}
