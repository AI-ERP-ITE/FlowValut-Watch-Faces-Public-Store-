import { describe, expect, test } from 'vitest';
import { fitDigitFrameToContent } from '../digitFrameFit';

const original = Object.freeze({ x: 100, y: 40, width: 120, height: 50 });

describe('fitDigitFrameToContent', () => {
  test('LEFT preserves the left edge', () => {
    const result = fitDigitFrameToContent({
      bounds: original,
      contentWidth: 60,
      contentHeight: 30,
      alignH: 'LEFT',
    });

    expect(result).toEqual({ x: 100, y: 40, width: 60, height: 30 });
  });

  test('CENTER_H preserves the horizontal center', () => {
    const result = fitDigitFrameToContent({
      bounds: original,
      contentWidth: 60,
      contentHeight: 30,
      alignH: 'CENTER_H',
    });

    expect(result.x + result.width / 2).toBe(original.x + original.width / 2);
    expect(result.y).toBe(original.y);
  });

  test('RIGHT preserves the right edge', () => {
    const result = fitDigitFrameToContent({
      bounds: original,
      contentWidth: 60,
      contentHeight: 30,
      alignH: 'RIGHT',
    });

    expect(result.x + result.width).toBe(original.x + original.width);
    expect(result.y).toBe(original.y);
  });

  test('adds symmetric padding before preserving the anchor', () => {
    const result = fitDigitFrameToContent({
      bounds: original,
      contentWidth: 60,
      contentHeight: 30,
      alignH: 'CENTER_H',
      paddingX: 3,
      paddingY: 2,
    });

    expect(result).toEqual({ x: 127, y: 40, width: 66, height: 34 });
  });

  test('rounds fractional measurements and clamps invalid measurements', () => {
    const fractional = fitDigitFrameToContent({
      bounds: original,
      contentWidth: 60.2,
      contentHeight: 30.1,
      alignH: 'LEFT',
    });
    const invalid = fitDigitFrameToContent({
      bounds: original,
      contentWidth: Number.NaN,
      contentHeight: -20,
      alignH: 'LEFT',
    });

    expect(fractional.width).toBe(61);
    expect(fractional.height).toBe(31);
    expect(invalid.width).toBe(1);
    expect(invalid.height).toBe(1);
  });

  test('does not mutate the input bounds', () => {
    const mutableBounds = { x: 5, y: 6, width: 70, height: 20 };
    const snapshot = { ...mutableBounds };

    const result = fitDigitFrameToContent({
      bounds: mutableBounds,
      contentWidth: 42,
      contentHeight: 18,
      alignH: 'RIGHT',
    });

    expect(mutableBounds).toEqual(snapshot);
    expect(result).not.toBe(mutableBounds);
  });
});

