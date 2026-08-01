import { describe, expect, it } from 'vitest';
import type { WatchFaceElement } from '@/types';
import { DATA_REPRESENTATION_DESCRIPTORS } from './dataRepresentationAuthority';
import { getAllowedDataTypesForElement, getAllowedElementsForData } from './elementDataRules';

describe('Spec 131 T016 Time Readings schema and chooser', () => {
  it('offers only Sunrise and Sunset in the isolated widget', () => {
    expect(getAllowedDataTypesForElement('TIME_READING')).toEqual(['SUN_RISE', 'SUN_SET']);
    expect(getAllowedElementsForData('SUN_RISE')).toEqual(['TIME_READING']);
    expect(getAllowedElementsForData('SUN_SET')).toEqual(['TIME_READING']);
  });

  it('removes Sunrise and Sunset from generic Text and Numeric Display choices', () => {
    expect(getAllowedDataTypesForElement('TEXT')).not.toContain('SUN_RISE');
    expect(getAllowedDataTypesForElement('TEXT')).not.toContain('SUN_SET');
    expect(getAllowedDataTypesForElement('TEXT_IMG')).not.toContain('SUN_RISE');
    expect(getAllowedDataTypesForElement('TEXT_IMG')).not.toContain('SUN_SET');
  });

  it('does not alter current clock choices', () => {
    expect(getAllowedDataTypesForElement('IMG_TIME', 'hours')).toEqual([]);
    expect(getAllowedDataTypesForElement('IMG_TIME', 'minutes')).toEqual([]);
    expect(getAllowedDataTypesForElement('TIME_POINTER')).toEqual([]);
  });

  it('supports Digital mode only in the persisted element schema', () => {
    const reading: WatchFaceElement = {
      id: 'sunrise', type: 'TIME_READING', dataType: 'SUN_RISE',
      timeReadingDisplay: 'DIGITAL', name: 'Sunrise Time',
      bounds: { x: 10, y: 20, width: 200, height: 80 }, visible: true, zIndex: 1,
    };
    expect(reading).toMatchObject({ type: 'TIME_READING', dataType: 'SUN_RISE', timeReadingDisplay: 'DIGITAL' });
    expect(DATA_REPRESENTATION_DESCRIPTORS.SUN_RISE.representations).toEqual(['TIME_READING']);
    expect(DATA_REPRESENTATION_DESCRIPTORS.SUN_SET.representations).toEqual(['TIME_READING']);
  });
});
