export type DataSemanticKind =
  | 'scalar'
  | 'bounded-scalar'
  | 'time-of-day'
  | 'duration'
  | 'fixed-code'
  | 'phase-cycle';

export type DataRepresentation =
  | 'NUMERIC_VALUE'
  | 'ARC_PROGRESS'
  | 'GAUGE_POINTER'
  | 'IMAGE_SWITCHER'
  | 'TIME_READING';

export type DataSymbol = 'negative' | 'degree' | 'percent' | 'colon';

export type DataEvidenceStatus =
  | 'official'
  | 'community-runtime-evidence'
  | 'user-confirmed-runtime-id-pending'
  | 'runtime-adapter-pending';

export interface ValueRange {
  min: number;
  max: number;
}

export interface DataRepresentationDescriptor {
  id: string;
  label: string;
  semanticKind: DataSemanticKind;
  representations: readonly DataRepresentation[];
  /** Transitional eligibility used until the approved removals are applied. */
  legacyRepresentations: readonly DataRepresentation[];
  zeppDataType: string | null;
  sourceAdapter: 'data-type' | 'weather-index' | 'moon-phase' | 'pending';
  valueRange?: ValueRange;
  maxDigitCount?: number;
  maxRenderedGlyphCount?: number;
  requiredSymbols?: readonly DataSymbol[];
  switcherPolicy?: 'FIXED_CODES' | 'ABSOLUTE_RANGES' | 'LUNAR_CYCLE';
  fixedAssetCounts?: readonly number[];
  evidenceStatus: DataEvidenceStatus;
  notes?: string;
}

export interface WeatherConditionCode {
  code: number;
  label: string;
}

export const ZEP_WEATHER_CONDITION_CODES: readonly WeatherConditionCode[] = Object.freeze([
  { code: 0, label: 'Cloudy' },
  { code: 1, label: 'Showers' },
  { code: 2, label: 'Snow Showers' },
  { code: 3, label: 'Sunny' },
  { code: 4, label: 'Overcast' },
  { code: 5, label: 'Light Rain' },
  { code: 6, label: 'Light Snow' },
  { code: 7, label: 'Moderate Rain' },
  { code: 8, label: 'Moderate Snow' },
  { code: 9, label: 'Heavy Snow' },
  { code: 10, label: 'Heavy Rain' },
  { code: 11, label: 'Sandstorm' },
  { code: 12, label: 'Rain and Snow' },
  { code: 13, label: 'Fog' },
  { code: 14, label: 'Haze' },
  { code: 15, label: 'Thunderstorm' },
  { code: 16, label: 'Snowstorm' },
  { code: 17, label: 'Floating Dust' },
  { code: 18, label: 'Extreme Rainstorm' },
  { code: 19, label: 'Rain and Hail' },
  { code: 20, label: 'Thunderstorm and Hail' },
  { code: 21, label: 'Heavy Rainstorm' },
  { code: 22, label: 'Dust' },
  { code: 23, label: 'Heavy Sandstorm' },
  { code: 24, label: 'Rainstorm' },
  { code: 25, label: 'Unknown' },
  { code: 26, label: 'Cloudy Night' },
  { code: 27, label: 'Showers Night' },
  { code: 28, label: 'Clear Night' },
]);

const NUMERIC_ONLY = Object.freeze(['NUMERIC_VALUE'] as const);
const BOUNDED_VISUALS = Object.freeze([
  'NUMERIC_VALUE',
  'ARC_PROGRESS',
  'GAUGE_POINTER',
  'IMAGE_SWITCHER',
] as const);

export const DATA_REPRESENTATION_DESCRIPTORS: Readonly<
  Record<string, DataRepresentationDescriptor>
> = Object.freeze({
  STEP: {
    id: 'STEP',
    label: 'Step Count',
    semanticKind: 'scalar',
    representations: ['NUMERIC_VALUE'],
    legacyRepresentations: ['NUMERIC_VALUE', 'ARC_PROGRESS', 'GAUGE_POINTER', 'IMAGE_SWITCHER'],
    zeppDataType: 'STEP',
    sourceAdapter: 'data-type',
    valueRange: { min: 0, max: 99999 },
    maxDigitCount: 5,
    evidenceStatus: 'official',
    notes: 'Raw count. Bounded progress requires separately proven STEP_TARGET semantics.',
  },
  CAL: {
    id: 'CAL',
    label: 'Calories',
    semanticKind: 'scalar',
    representations: ['NUMERIC_VALUE'],
    legacyRepresentations: ['NUMERIC_VALUE', 'ARC_PROGRESS', 'GAUGE_POINTER', 'IMAGE_SWITCHER'],
    zeppDataType: 'CAL',
    sourceAdapter: 'data-type',
    valueRange: { min: 0, max: 9999 },
    maxDigitCount: 4,
    evidenceStatus: 'official',
    notes: 'Raw count. Bounded progress requires separately proven CAL_TARGET semantics.',
  },
  HEART: {
    id: 'HEART',
    label: 'Heart Rate',
    semanticKind: 'scalar',
    representations: ['NUMERIC_VALUE'],
    legacyRepresentations: ['NUMERIC_VALUE', 'ARC_PROGRESS', 'GAUGE_POINTER', 'IMAGE_SWITCHER'],
    zeppDataType: 'HEART',
    sourceAdapter: 'data-type',
    maxDigitCount: 3,
    evidenceStatus: 'official',
    notes: 'Upper bound depends on user age (220-age); no universal bounded scale.',
  },
  DISTANCE: {
    id: 'DISTANCE',
    label: 'Distance',
    semanticKind: 'scalar',
    representations: ['NUMERIC_VALUE'],
    legacyRepresentations: ['NUMERIC_VALUE', 'ARC_PROGRESS', 'GAUGE_POINTER', 'IMAGE_SWITCHER'],
    zeppDataType: 'DISTANCE',
    sourceAdapter: 'data-type',
    valueRange: { min: 0, max: 99 },
    maxDigitCount: 3,
    maxRenderedGlyphCount: 4,
    evidenceStatus: 'official',
    notes: 'Numeric output requires a decimal-point bitmap; bounded progress has no universal goal.',
  },
  SPO2: {
    id: 'SPO2',
    label: 'Blood Oxygen',
    semanticKind: 'bounded-scalar',
    representations: ['NUMERIC_VALUE', 'ARC_PROGRESS', 'GAUGE_POINTER'],
    legacyRepresentations: ['NUMERIC_VALUE', 'ARC_PROGRESS', 'GAUGE_POINTER', 'IMAGE_SWITCHER'],
    zeppDataType: 'SPO2',
    sourceAdapter: 'data-type',
    valueRange: { min: 51, max: 100 },
    maxDigitCount: 3,
    evidenceStatus: 'official',
  },
  SLEEP: {
    id: 'SLEEP',
    label: 'Sleep Duration',
    semanticKind: 'duration',
    representations: [],
    legacyRepresentations: ['NUMERIC_VALUE'],
    zeppDataType: 'SLEEP',
    sourceAdapter: 'data-type',
    maxRenderedGlyphCount: 5,
    requiredSymbols: ['colon'],
    evidenceStatus: 'official',
    notes: 'Deferred until a dedicated H:MM Duration Reading exists.',
  },
  WEATHER_CURRENT: {
    id: 'WEATHER_CURRENT',
    label: 'Current Temperature',
    semanticKind: 'scalar',
    representations: NUMERIC_ONLY,
    legacyRepresentations: ['NUMERIC_VALUE'],
    zeppDataType: 'WEATHER_CURRENT',
    sourceAdapter: 'data-type',
    maxDigitCount: 3,
    maxRenderedGlyphCount: 5,
    requiredSymbols: ['negative', 'degree'],
    evidenceStatus: 'official',
  },
  WEATHER_LOW: {
    id: 'WEATHER_LOW',
    label: 'Low Temperature',
    semanticKind: 'scalar',
    representations: NUMERIC_ONLY,
    legacyRepresentations: ['NUMERIC_VALUE'],
    zeppDataType: 'WEATHER_LOW',
    sourceAdapter: 'data-type',
    maxDigitCount: 3,
    maxRenderedGlyphCount: 5,
    requiredSymbols: ['negative', 'degree'],
    evidenceStatus: 'official',
  },
  WEATHER_HIGH: {
    id: 'WEATHER_HIGH',
    label: 'High Temperature',
    semanticKind: 'scalar',
    representations: NUMERIC_ONLY,
    legacyRepresentations: ['NUMERIC_VALUE'],
    zeppDataType: 'WEATHER_HIGH',
    sourceAdapter: 'data-type',
    maxDigitCount: 3,
    maxRenderedGlyphCount: 5,
    requiredSymbols: ['negative', 'degree'],
    evidenceStatus: 'official',
  },
  WEATHER_STATUS: {
    id: 'WEATHER_STATUS',
    label: 'Weather Condition',
    semanticKind: 'fixed-code',
    representations: ['IMAGE_SWITCHER'],
    legacyRepresentations: ['IMAGE_SWITCHER'],
    zeppDataType: null,
    sourceAdapter: 'weather-index',
    switcherPolicy: 'FIXED_CODES',
    fixedAssetCounts: [29],
    evidenceStatus: 'official',
  },
  HUMIDITY: {
    id: 'HUMIDITY',
    label: 'Humidity',
    semanticKind: 'bounded-scalar',
    representations: BOUNDED_VISUALS,
    legacyRepresentations: BOUNDED_VISUALS,
    zeppDataType: 'HUMIDITY',
    sourceAdapter: 'data-type',
    valueRange: { min: 0, max: 100 },
    maxDigitCount: 3,
    maxRenderedGlyphCount: 4,
    requiredSymbols: ['percent'],
    switcherPolicy: 'ABSOLUTE_RANGES',
    evidenceStatus: 'official',
  },
  WIND: {
    id: 'WIND',
    label: 'Wind Level',
    semanticKind: 'bounded-scalar',
    representations: ['NUMERIC_VALUE', 'ARC_PROGRESS', 'GAUGE_POINTER'],
    legacyRepresentations: ['NUMERIC_VALUE', 'ARC_PROGRESS', 'GAUGE_POINTER'],
    zeppDataType: 'WIND',
    sourceAdapter: 'data-type',
    valueRange: { min: 0, max: 12 },
    maxDigitCount: 2,
    evidenceStatus: 'official',
    notes: 'Zepp exposes wind force level, not wind speed.',
  },
  SUN_RISE: {
    id: 'SUN_RISE',
    label: 'Sunrise Time',
    semanticKind: 'time-of-day',
    representations: ['TIME_READING'],
    legacyRepresentations: ['TIME_READING'],
    zeppDataType: 'SUN_RISE',
    sourceAdapter: 'data-type',
    maxRenderedGlyphCount: 5,
    requiredSymbols: ['colon'],
    evidenceStatus: 'official',
  },
  SUN_SET: {
    id: 'SUN_SET',
    label: 'Sunset Time',
    semanticKind: 'time-of-day',
    representations: ['TIME_READING'],
    legacyRepresentations: ['TIME_READING'],
    zeppDataType: 'SUN_SET',
    sourceAdapter: 'data-type',
    maxRenderedGlyphCount: 5,
    requiredSymbols: ['colon'],
    evidenceStatus: 'official',
  },
  SUN_CURRENT: {
    id: 'SUN_CURRENT',
    label: 'Time Until Sun Event',
    semanticKind: 'duration',
    representations: [],
    legacyRepresentations: [],
    zeppDataType: 'SUN_CURRENT',
    sourceAdapter: 'data-type',
    maxRenderedGlyphCount: 5,
    requiredSymbols: ['colon'],
    evidenceStatus: 'official',
    notes: 'Deferred: duration must not be mixed with time-of-day readings.',
  },
  MOON: {
    id: 'MOON',
    label: 'Moon Phase',
    semanticKind: 'phase-cycle',
    representations: ['IMAGE_SWITCHER'],
    legacyRepresentations: ['IMAGE_SWITCHER'],
    zeppDataType: 'MOON',
    sourceAdapter: 'moon-phase',
    switcherPolicy: 'LUNAR_CYCLE',
    fixedAssetCounts: [7, 13, 30],
    evidenceStatus: 'runtime-adapter-pending',
  },
  TRAINING_LOAD: {
    id: 'TRAINING_LOAD',
    label: 'Training Load',
    semanticKind: 'scalar',
    representations: NUMERIC_ONLY,
    legacyRepresentations: ['NUMERIC_VALUE'],
    zeppDataType: 'TRAINING_LOAD',
    sourceAdapter: 'data-type',
    maxDigitCount: 3,
    evidenceStatus: 'official',
    notes: 'No documented meaningful progress maximum.',
  },
  PAI_DAILY: {
    id: 'PAI_DAILY',
    label: 'PAI (Daily)',
    semanticKind: 'bounded-scalar',
    representations: ['NUMERIC_VALUE', 'ARC_PROGRESS', 'GAUGE_POINTER'],
    legacyRepresentations: BOUNDED_VISUALS,
    zeppDataType: 'PAI_DAILY',
    sourceAdapter: 'data-type',
    valueRange: { min: 0, max: 75 },
    maxDigitCount: 3,
    switcherPolicy: 'ABSOLUTE_RANGES',
    evidenceStatus: 'official',
  },
  FAT_BURNING: {
    id: 'FAT_BURNING',
    label: 'Fat Burning Time',
    semanticKind: 'bounded-scalar',
    representations: ['NUMERIC_VALUE', 'ARC_PROGRESS', 'GAUGE_POINTER'],
    legacyRepresentations: BOUNDED_VISUALS,
    zeppDataType: 'FAT_BURNING',
    sourceAdapter: 'data-type',
    valueRange: { min: 0, max: 999 },
    maxDigitCount: 3,
    switcherPolicy: 'ABSOLUTE_RANGES',
    evidenceStatus: 'official',
  },
  ALTIMETER: {
    id: 'ALTIMETER',
    label: 'Air Pressure',
    semanticKind: 'bounded-scalar',
    representations: ['NUMERIC_VALUE', 'ARC_PROGRESS', 'GAUGE_POINTER'],
    legacyRepresentations: ['NUMERIC_VALUE', 'ARC_PROGRESS', 'GAUGE_POINTER'],
    zeppDataType: 'ALTIMETER',
    sourceAdapter: 'data-type',
    valueRange: { min: 1, max: 1200 },
    maxDigitCount: 4,
    evidenceStatus: 'official',
    notes: 'Zepp ALTIMETER is air pressure, not altitude. ALTITUDE is a separate source and is not exposed.',
  },
  BIO_CHARGE: {
    id: 'BIO_CHARGE',
    label: 'BioCharge',
    semanticKind: 'bounded-scalar',
    representations: ['NUMERIC_VALUE', 'ARC_PROGRESS', 'GAUGE_POINTER', 'IMAGE_SWITCHER'],
    legacyRepresentations: ['NUMERIC_VALUE', 'ARC_PROGRESS', 'GAUGE_POINTER', 'IMAGE_SWITCHER'],
    zeppDataType: 'BIO_CHARGE',
    sourceAdapter: 'data-type',
    valueRange: { min: 0, max: 100 },
    maxDigitCount: 3,
    maxRenderedGlyphCount: 3,
    switcherPolicy: 'ABSOLUTE_RANGES',
    evidenceStatus: 'community-runtime-evidence',
    notes: 'HybridCharge/BioCharge binding; requires supported firmware (reported API level 4.2+). Numeric, Arc, Gauge, and explicit-range Image Switcher use fixed 0-100.',
  },
  UVI: {
    id: 'UVI',
    label: 'UV Index',
    semanticKind: 'bounded-scalar',
    representations: ['NUMERIC_VALUE', 'ARC_PROGRESS', 'GAUGE_POINTER'],
    legacyRepresentations: BOUNDED_VISUALS,
    zeppDataType: 'UVI',
    sourceAdapter: 'data-type',
    valueRange: { min: 1, max: 5 },
    maxDigitCount: 2,
    switcherPolicy: 'ABSOLUTE_RANGES',
    evidenceStatus: 'official',
  },
  AQI: {
    id: 'AQI',
    label: 'Air Quality',
    semanticKind: 'bounded-scalar',
    representations: ['NUMERIC_VALUE', 'ARC_PROGRESS', 'GAUGE_POINTER'],
    legacyRepresentations: BOUNDED_VISUALS,
    zeppDataType: 'AQI',
    sourceAdapter: 'data-type',
    valueRange: { min: 1, max: 999 },
    maxDigitCount: 3,
    switcherPolicy: 'ABSOLUTE_RANGES',
    evidenceStatus: 'official',
    notes: 'Zepp documents regional availability restrictions.',
  },
});

export function getDataRepresentationDescriptor(
  id: string | undefined,
): DataRepresentationDescriptor | undefined {
  const normalized = String(id ?? '').trim().toUpperCase();
  return DATA_REPRESENTATION_DESCRIPTORS[normalized];
}

/**
 * Transitional validator used while consumers move to the new authority.
 * Uncatalogued data types retain their legacy behavior until the full audit.
 */
export function filterLegacyCompatibleDataTypes(
  candidates: readonly string[],
  representation: DataRepresentation | null,
): readonly string[] {
  if (!representation) return candidates;
  return candidates.filter((candidate) => {
    const descriptor = getDataRepresentationDescriptor(candidate);
    return !descriptor || descriptor.legacyRepresentations.includes(representation);
  });
}

export function isLegacyRepresentationAllowed(
  dataType: string | undefined,
  representation: DataRepresentation | null,
): boolean {
  if (!representation) return true;
  const descriptor = getDataRepresentationDescriptor(dataType);
  return !descriptor || descriptor.legacyRepresentations.includes(representation);
}
