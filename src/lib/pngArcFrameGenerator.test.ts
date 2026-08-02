import { describe, expect, it } from 'vitest';
import { revealPngArcRgba, selectPngArcFrame } from './pngArcFrameGenerator';

function cardinalPixels(): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(5 * 5 * 4);
  for (const [x, y] of [[2, 0], [4, 2], [2, 4], [0, 2]]) {
    const index = (y * 5 + x) * 4;
    pixels.set([10, 20, 30, 255], index);
  }
  return pixels;
}

function alphaAt(pixels: Uint8ClampedArray, x: number, y: number): number {
  return pixels[(y * 5 + x) * 4 + 3];
}

describe('PNG Arc angular reveal', () => {
  it('makes the 0% frame fully transparent', () => {
    const result = revealPngArcRgba(cardinalPixels(), {
      width: 5, height: 5, startAngle: 0, endAngle: 270,
      direction: 'clockwise', progress: 0,
    });
    expect([...result.filter((_, index) => index % 4 === 3)]).not.toContain(255);
  });

  it('reveals clockwise pixels monotonically at an intermediate frame', () => {
    const result = revealPngArcRgba(cardinalPixels(), {
      width: 5, height: 5, startAngle: 0, endAngle: 270,
      direction: 'clockwise', progress: 0.5,
    });
    expect(alphaAt(result, 2, 0)).toBe(255); // 0° top
    expect(alphaAt(result, 4, 2)).toBe(255); // 90° right
    expect(alphaAt(result, 2, 4)).toBe(0);   // 180° bottom
    expect(alphaAt(result, 0, 2)).toBe(0);   // 270° left
  });

  it('uses the opposite sweep for counter-clockwise frames', () => {
    const result = revealPngArcRgba(cardinalPixels(), {
      width: 5, height: 5, startAngle: 0, endAngle: 90,
      direction: 'counter-clockwise', progress: 0.5,
    });
    expect(alphaAt(result, 2, 0)).toBe(255);
    expect(alphaAt(result, 0, 2)).toBe(255);
    expect(alphaAt(result, 4, 2)).toBe(0);
  });

  it('returns the original RGBA bytes at 100%', () => {
    const source = cardinalPixels();
    const result = revealPngArcRgba(source, {
      width: 5, height: 5, startAngle: -120, endAngle: 120,
      direction: 'clockwise', progress: 1,
    });
    expect(result).toEqual(source);
    expect(result).not.toBe(source);
  });

  it('rejects mismatched RGBA geometry', () => {
    expect(() => revealPngArcRgba(new Uint8ClampedArray(3), {
      width: 5, height: 5, startAngle: 0, endAngle: 90,
      direction: 'clockwise', progress: 0.5,
    })).toThrow('RGBA buffer dimensions');
  });

  it('selects the nearest stored preview frame', () => {
    const frames = ['0', '1', '2', '3', '4'];
    expect(selectPngArcFrame(frames, 0)).toBe('0');
    expect(selectPngArcFrame(frames, 0.51)).toBe('2');
    expect(selectPngArcFrame(frames, 1)).toBe('4');
    expect(selectPngArcFrame([], 0.5)).toBeUndefined();
  });
});
