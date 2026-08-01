import { describe, expect, it } from 'vitest';
import {
  DATA_REPRESENTATION_DESCRIPTORS,
  ZEP_WEATHER_CONDITION_CODES,
  getDataRepresentationDescriptor,
} from './dataRepresentationAuthority';
import * as mainRules from './elementDataRules';

describe('Spec 131 semantic authority', () => {
  it('defines the official contiguous 29-code weather manifest', () => {
    expect(ZEP_WEATHER_CONDITION_CODES).toHaveLength(29);
    expect(ZEP_WEATHER_CONDITION_CODES.map(item => item.code)).toEqual(
      Array.from({ length: 29 }, (_, code) => code),
    );
    expect(ZEP_WEATHER_CONDITION_CODES[0]?.label).toBe('Cloudy');
    expect(ZEP_WEATHER_CONDITION_CODES[3]?.label).toBe('Sunny');
    expect(ZEP_WEATHER_CONDITION_CODES[25]?.label).toBe('Unknown');
    expect(ZEP_WEATHER_CONDITION_CODES[28]?.label).toBe('Clear Night');
  });

  it('keeps temperature numeric-only and records every required glyph', () => {
    const current = getDataRepresentationDescriptor('weather_current');
    expect(current).toMatchObject({
      label: 'Current Temperature',
      representations: ['NUMERIC_VALUE'],
      maxDigitCount: 3,
      maxRenderedGlyphCount: 5,
      requiredSymbols: ['negative', 'degree'],
    });
    expect(mainRules.getAllowedDataTypesForElement('TEXT')).not.toContain('WEATHER_CURRENT');
    expect(mainRules.getAllowedDataTypesForElement('TEXT_IMG')).toContain('WEATHER_CURRENT');
    expect(mainRules.getAllowedDataTypesForElement('TEXT_IMG')).toContain('WEATHER_LOW');
    expect(mainRules.getAllowedDataTypesForElement('TEXT_IMG')).toContain('WEATHER_HIGH');
    expect(mainRules.getAllowedDataTypesForElement('TEXT')).not.toContain('WEATHER_LOW');
    expect(mainRules.getAllowedDataTypesForElement('TEXT')).not.toContain('WEATHER_HIGH');
    expect(mainRules.getAllowedElementsForData('WEATHER_CURRENT')).toEqual(['NUMERIC_DISPLAY']);
    expect(mainRules.getAllowedElementsForData('WEATHER_LOW')).toEqual(['NUMERIC_DISPLAY']);
    expect(mainRules.getAllowedElementsForData('WEATHER_HIGH')).toEqual(['NUMERIC_DISPLAY']);
  });

  it('separates fixed codes, bounded values, time readings, and unbounded scalars', () => {
    expect(DATA_REPRESENTATION_DESCRIPTORS.WEATHER_STATUS).toMatchObject({
      semanticKind: 'fixed-code',
      representations: ['IMAGE_SWITCHER'],
      sourceAdapter: 'weather-index',
      fixedAssetCounts: [29],
    });
    expect(DATA_REPRESENTATION_DESCRIPTORS.HUMIDITY.valueRange).toEqual({ min: 0, max: 100 });
    expect(DATA_REPRESENTATION_DESCRIPTORS.WIND.valueRange).toEqual({ min: 0, max: 12 });
    expect(DATA_REPRESENTATION_DESCRIPTORS.SUN_RISE.representations).toEqual(['TIME_READING']);
    expect(DATA_REPRESENTATION_DESCRIPTORS.TRAINING_LOAD.representations).toEqual(['NUMERIC_VALUE']);
  });

  it('records the approved BioCharge Numeric, Arc, and Gauge binding while preserving the Switcher gate', () => {
    expect(DATA_REPRESENTATION_DESCRIPTORS.BIO_CHARGE).toMatchObject({
      valueRange: { min: 0, max: 100 },
      representations: ['NUMERIC_VALUE', 'ARC_PROGRESS', 'GAUGE_POINTER', 'IMAGE_SWITCHER'],
      zeppDataType: 'BIO_CHARGE',
      sourceAdapter: 'data-type',
      evidenceStatus: 'community-runtime-evidence',
    });
    expect(DATA_REPRESENTATION_DESCRIPTORS.MOON.evidenceStatus).toBe('runtime-adapter-pending');
  });

  it('keeps the approved compatibility rules and runtime authority aligned', async () => {
    const legacyRules = await import('./elementDataRules');
    expect(legacyRules.ELEMENT_TO_DATA.IMAGE_SWITCHER).not.toContain('WEATHER_CURRENT');
    expect(legacyRules.ELEMENT_TO_DATA.IMAGE_SWITCHER).toContain('WEATHER_STATUS');
    expect(legacyRules.ELEMENT_TO_DATA.ARC_PROGRESS).not.toContain('TRAINING_LOAD');
    expect(legacyRules.ELEMENT_TO_DATA.NUMERIC_DISPLAY).toContain('TRAINING_LOAD');
    expect(legacyRules.ELEMENT_TO_DATA.NUMERIC_DISPLAY).toContain('BIO_CHARGE');
    expect(legacyRules.ELEMENT_TO_DATA.ARC_PROGRESS).toContain('BIO_CHARGE');
    expect(legacyRules.ELEMENT_TO_DATA.GAUGE_POINTER).toContain('BIO_CHARGE');
    expect(legacyRules.ELEMENT_TO_DATA.IMAGE_SWITCHER).toContain('BIO_CHARGE');
  });

  it('routes ordered chooser validation through legacy descriptor eligibility without drift', () => {
    const cases = [
      ['TEXT', undefined, 'TEXT'],
      ['TEXT_IMG', undefined, 'NUMERIC_DISPLAY'],
      ['ARC_PROGRESS', undefined, 'ARC_PROGRESS'],
      ['GAUGE_POINTER', undefined, 'GAUGE_POINTER'],
      ['IMG_LEVEL', undefined, 'IMAGE_SWITCHER'],
    ] as const;

    for (const [type, subtype, key] of cases) {
      expect(mainRules.getAllowedDataTypesForElement(type, subtype)).toEqual(
        mainRules.ELEMENT_TO_DATA[key],
      );
    }
  });

  it('keeps System A reverse validation aligned with its legacy table', () => {
    for (const dataType of [
      'WEATHER_CURRENT',
      'WEATHER_STATUS',
      'HUMIDITY',
      'WIND',
      'SUN_RISE',
      'SUN_SET',
      'TRAINING_LOAD',
      'MOON',
      'UVI',
      'AQI',
    ]) {
      expect(mainRules.getAllowedElementsForData(dataType)).toEqual(
        mainRules.DATA_TO_ELEMENT[dataType],
      );
    }
  });
});
