import { describe, expect, it } from 'vitest';
import {
  ELEMENT_TO_DATA,
  IMAGE_SWITCHER_DATA_TYPES,
  normalizeDataAlias,
} from './elementDataRules';
import { DATA_REPRESENTATION_DESCRIPTORS } from './dataRepresentationAuthority';

const AUDITED_DATA_TYPES = [
  'BATTERY', 'STEP', 'CAL', 'DISTANCE', 'STAND', 'PAI_DAILY', 'PAI_WEEKLY',
  'FAT_BURNING', 'HEART', 'STRESS', 'SPO2', 'HUMIDITY', 'WIND', 'UVI',
  'AQI', 'SLEEP', 'ALTIMETER', 'VO2MAX', 'TRAINING_LOAD', 'BIO_CHARGE',
  'WEATHER_CURRENT', 'WEATHER_LOW', 'WEATHER_HIGH', 'WEATHER_STATUS',
  'MOON', 'SUN_RISE', 'SUN_SET',
] as const;

describe('T025 full System A compatibility audit coverage', () => {
  it('classifies every data type exposed by a live-data element chooser', () => {
    const exposed = new Set<string>();
    for (const key of ['TEXT', 'NUMERIC_DISPLAY', 'ARC_PROGRESS', 'GAUGE_POINTER', 'IMAGE_SWITCHER', 'TIME_READING'] as const) {
      const values = ELEMENT_TO_DATA[key];
      for (const value of values) exposed.add(value);
    }
    expect([...exposed].sort()).toEqual([...AUDITED_DATA_TYPES].sort());
  });

  it('keeps non-scalar sources isolated to their correct representations', () => {
    expect(ELEMENT_TO_DATA.TIME_READING).toEqual(['SUN_RISE', 'SUN_SET']);
    expect(ELEMENT_TO_DATA.IMAGE_SWITCHER).toContain('WEATHER_STATUS');
    expect(ELEMENT_TO_DATA.IMAGE_SWITCHER).toContain('MOON');
    expect(ELEMENT_TO_DATA.NUMERIC_DISPLAY).not.toContain('WEATHER_STATUS');
    expect(ELEMENT_TO_DATA.NUMERIC_DISPLAY).not.toContain('MOON');
    expect(ELEMENT_TO_DATA.ARC_PROGRESS).not.toContain('TRAINING_LOAD');
    expect(ELEMENT_TO_DATA.GAUGE_POINTER).not.toContain('TRAINING_LOAD');
  });

  it('canonicalizes the two retired identifiers while preserving the Altimeter audit gate', () => {
    expect(normalizeDataAlias('PAI')).toBe('PAI_DAILY');
    expect(normalizeDataAlias('FAT_BURN')).toBe('FAT_BURNING');
    expect(ELEMENT_TO_DATA.NUMERIC_DISPLAY).toContain('PAI_DAILY');
    expect(ELEMENT_TO_DATA.NUMERIC_DISPLAY).toContain('FAT_BURNING');
    expect(ELEMENT_TO_DATA.NUMERIC_DISPLAY).not.toContain('PAI');
    expect(ELEMENT_TO_DATA.NUMERIC_DISPLAY).not.toContain('FAT_BURN');
    expect(ELEMENT_TO_DATA.NUMERIC_DISPLAY).toContain('ALTIMETER');
    expect(DATA_REPRESENTATION_DESCRIPTORS.PAI_DAILY.valueRange).toEqual({ min: 0, max: 75 });
    expect(DATA_REPRESENTATION_DESCRIPTORS.FAT_BURNING.valueRange).toEqual({ min: 0, max: 999 });
    expect(DATA_REPRESENTATION_DESCRIPTORS.ALTITUDE).toBeUndefined();
  });

  it('records that only Humidity and BioCharge have proven custom-range export paths', () => {
    const auditedRangeRuntimeTypes = IMAGE_SWITCHER_DATA_TYPES.filter(
      dataType => dataType === 'HUMIDITY' || dataType === 'BIO_CHARGE',
    );
    expect(auditedRangeRuntimeTypes).toEqual(['HUMIDITY', 'BIO_CHARGE']);
  });
});
