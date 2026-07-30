import { describe, expect, it } from 'vitest';
import { finalizeWatchSafeTextAlpha } from './watchSafeTextAlpha';

function rgba(width: number, height: number, pixels: Array<[number, number, number, number]>) {
  const data = new Uint8ClampedArray(width * height * 4);
  pixels.forEach((pixel, index) => data.set(pixel, index * 4));
  return data;
}

describe('watch-safe baked text alpha', () => {
  it('produces a binary mask while preserving coverage and centroid thresholds', () => {
    const source = rgba(5, 1, [
      [230, 154, 90, 64],
      [230, 154, 90, 192],
      [230, 154, 90, 255],
      [230, 154, 90, 192],
      [230, 154, 90, 64],
    ]);
    const transformed = finalizeWatchSafeTextAlpha(source, 5, 1);
    const alpha = [...transformed.data].filter((_, index) => index % 4 === 3);
    expect(new Set(alpha)).toEqual(new Set([0, 255]));
    expect(Math.abs(transformed.result.coverage - transformed.source.coverage)).toBeLessThan(0.5);
    expect(Math.hypot(
      transformed.result.centroidX - transformed.source.centroidX,
      transformed.result.centroidY - transformed.source.centroidY,
    )).toBeLessThan(0.01);
    expect(transformed.dominantRgb).toEqual([230, 154, 90]);
    expect(transformed.data).toHaveLength(source.length);
  });

  it('does not mutate its source buffer', () => {
    const source = rgba(2, 1, [[1, 2, 3, 255], [1, 2, 3, 100]]);
    const snapshot = new Uint8ClampedArray(source);
    finalizeWatchSafeTextAlpha(source, 2, 1);
    expect(source).toEqual(snapshot);
  });

  it('leaves an empty transparent mask empty', () => {
    const source = new Uint8ClampedArray(3 * 2 * 4);
    expect(finalizeWatchSafeTextAlpha(source, 3, 2).data).toEqual(source);
  });
});

