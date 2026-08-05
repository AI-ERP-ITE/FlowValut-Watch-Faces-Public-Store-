import { describe, expect, it } from 'vitest';
import type { WatchFaceElement } from '@/types';
import { applyWatchTestCaptureValues, getWatchTestDisplayValue } from './watchTestValues';

const widget = (type: WatchFaceElement['type'], dataType?: string, subtype?: string): WatchFaceElement => ({
  id: `${type}-${dataType ?? subtype ?? ''}`,
  type,
  dataType,
  subtype,
  name: type,
  bounds: { x: 0, y: 0, width: 100, height: 40 },
  visible: true,
  zIndex: 1,
});

describe('watch-test canvas capture values', () => {
  it('assigns date, digital time, and approved numeric values', () => {
    expect(getWatchTestDisplayValue(widget('IMG_DATE'))).toBe('31');
    expect(getWatchTestDisplayValue(widget('IMG_TIME', undefined, 'hours'))).toBe('16');
    expect(getWatchTestDisplayValue(widget('IMG_TIME', undefined, 'minutes'))).toBe('49');
    expect(getWatchTestDisplayValue(widget('IMG_TIME', undefined, 'seconds'))).toBe('15');
    expect(getWatchTestDisplayValue(widget('TEXT_IMG', 'STEP'))).toBe('12000');
    expect(getWatchTestDisplayValue(widget('TEXT_IMG', 'HUMIDITY'))).toBe('55');
  });

  it('does not modify Time Reading values or the source objects', () => {
    const timeReading = widget('TIME_READING', 'SUN_RISE');
    const source = [timeReading, widget('TEXT_IMG', 'HEART')];
    const result = applyWatchTestCaptureValues(source);
    expect(result[0]).toBe(timeReading);
    expect(result[0].previewValue).toBeUndefined();
    expect(source[1].previewValue).toBeUndefined();
    expect(result[1].previewValue).toBe('70');
  });

  it('overrides only the derived capture view and preserves manual canvas samples', () => {
    const source = [{ ...widget('IMG_DATE'), previewValue: '88' }];
    const result = applyWatchTestCaptureValues(source);
    expect(source[0].previewValue).toBe('88');
    expect(result[0].previewValue).toBe('31');
    expect(result[0]).not.toBe(source[0]);
  });
});
