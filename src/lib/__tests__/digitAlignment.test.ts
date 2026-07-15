import { describe, expect, test } from 'vitest';
import {
  getDefaultDigitAlignment,
  normalizeHorizontalDigitAlign,
} from '../digitAlignment';
import { computeDigitBitmapLayout } from '../digitLayoutEngine';

const bitmaps = Array.from({ length: 10 }, (_, digit) => ({
  char: String(digit),
  width: 10,
  height: 20,
}));

describe('digit alignment legacy defaults', () => {
  test('forces time to frame center even when legacy alignment says left', () => {
    expect(getDefaultDigitAlignment('IMG_TIME')).toBe('CENTER_H');
    const layout = computeDigitBitmapLayout({
      widgetType: 'IMG_TIME',
      bounds: { x: 100, y: 20, width: 80, height: 20 },
      value: '10',
      bitmaps,
      alignH: 'LEFT',
    });
    expect(layout.alignH).toBe('CENTER_H');
    expect(layout.startX).toBe(130);
  });

  test('keeps TEXT_IMG centered when alignH is missing', () => {
    expect(getDefaultDigitAlignment('TEXT_IMG')).toBe('CENTER_H');
    const layout = computeDigitBitmapLayout({
      widgetType: 'TEXT_IMG',
      bounds: { x: 100, y: 20, width: 80, height: 20 },
      value: '10',
      bitmaps,
      hSpace: 0,
    });
    expect(layout.alignH).toBe('CENTER_H');
    expect(layout.startX).toBe(130);
  });

  test('keeps numeric date centered when alignH is missing', () => {
    expect(getDefaultDigitAlignment('IMG_DATE')).toBe('CENTER_H');
  });

  test.each([
    ['left', 'LEFT'],
    [' CENTER_H ', 'CENTER_H'],
    ['Right', 'RIGHT'],
  ] as const)('normalizes explicit value %s', (input, expected) => {
    expect(normalizeHorizontalDigitAlign(input, 'CENTER_H')).toBe(expected);
  });

  test('uses the caller fallback for missing or invalid legacy values', () => {
    expect(normalizeHorizontalDigitAlign(undefined, 'LEFT')).toBe('LEFT');
    expect(normalizeHorizontalDigitAlign('invalid', 'CENTER_H')).toBe('CENTER_H');
  });
});
