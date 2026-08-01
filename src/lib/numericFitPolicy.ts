export interface NumericFitPolicy {
  /** Representative legal upper-bound value for documentation and runtime fixtures. */
  maxValue: string;
  /** Width-oriented sample. Repeated widest-candidate digits are resolved later from real glyph metrics. */
  previewValue: string;
  /** Maximum number of numeric glyph slots that frame fitting must accommodate. */
  maxDigitCount: number;
  /** Maximum rendered glyphs including signs, decimal points, and units. */
  maxRenderedGlyphCount?: number;
}

const DEFAULT_POLICY: NumericFitPolicy = {
  maxValue: '999',
  previewValue: '888',
  maxDigitCount: 3,
};

const NUMERIC_FIT_POLICIES: Readonly<Record<string, NumericFitPolicy>> = Object.freeze({
  STEP: { maxValue: '99999', previewValue: '88888', maxDigitCount: 5 },
  CAL: { maxValue: '9999', previewValue: '8888', maxDigitCount: 4 },
  BATTERY: { maxValue: '100', previewValue: '100', maxDigitCount: 3 },
  HEART: { maxValue: '999', previewValue: '888', maxDigitCount: 3 },
  SPO2: { maxValue: '100', previewValue: '100', maxDigitCount: 3 },
  STRESS: { maxValue: '100', previewValue: '100', maxDigitCount: 3 },
  HUMIDITY: { maxValue: '100%', previewValue: '100%', maxDigitCount: 3, maxRenderedGlyphCount: 4 },
  UVI: { maxValue: '99', previewValue: '88', maxDigitCount: 2 },
  AQI: { maxValue: '999', previewValue: '888', maxDigitCount: 3 },
  PAI_DAILY: { maxValue: '75', previewValue: '75', maxDigitCount: 3 },
  PAI_WEEKLY: { maxValue: '999', previewValue: '888', maxDigitCount: 3 },
  STAND: { maxValue: '99', previewValue: '88', maxDigitCount: 2 },
  FAT_BURNING: { maxValue: '999', previewValue: '888', maxDigitCount: 3 },
  ALTIMETER: { maxValue: '1200', previewValue: '1200', maxDigitCount: 4 },
  VO2MAX: { maxValue: '99', previewValue: '88', maxDigitCount: 2 },
  TRAINING_LOAD: { maxValue: '999', previewValue: '888', maxDigitCount: 3 },
  BIO_CHARGE: { maxValue: '100', previewValue: '100', maxDigitCount: 3 },
  WEATHER_CURRENT: {
    maxValue: '-999°',
    previewValue: '-888°',
    maxDigitCount: 3,
    maxRenderedGlyphCount: 5,
  },
  WEATHER_LOW: {
    maxValue: '-999°', previewValue: '-888°', maxDigitCount: 3, maxRenderedGlyphCount: 5,
  },
  WEATHER_HIGH: {
    maxValue: '-999°', previewValue: '-888°', maxDigitCount: 3, maxRenderedGlyphCount: 5,
  },
  WIND: { maxValue: '12', previewValue: '12', maxDigitCount: 2 },
  DISTANCE: { maxValue: '99.9', previewValue: '88.8', maxDigitCount: 3, maxRenderedGlyphCount: 4 },
});

export function getNumericFitPolicy(dataType: string | undefined): NumericFitPolicy {
  const normalized = String(dataType ?? '').trim().toUpperCase();
  return NUMERIC_FIT_POLICIES[normalized] ?? DEFAULT_POLICY;
}

export function getNumericPreviewValue(dataType: string | undefined): string {
  return getNumericFitPolicy(dataType).previewValue;
}
