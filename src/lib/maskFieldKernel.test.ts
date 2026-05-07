import { describe, expect, it } from 'vitest';
import { applyMaskValueU8, maskStrength } from './maskFieldKernel';

describe('maskFieldKernel recurrence', () => {
  it('repeated hide is linear to zero', () => {
    let value = 255;
    const strength = 0.2;
    const values: number[] = [value];
    for (let i = 0; i < 5; i += 1) {
      value = applyMaskValueU8(value, 'hide', strength);
      values.push(value);
    }
    expect(values).toEqual([255, 204, 153, 102, 51, 0]);
  });

  it('repeated reveal is linear to one', () => {
    let value = 0;
    const strength = 0.2;
    const values: number[] = [value];
    for (let i = 0; i < 5; i += 1) {
      value = applyMaskValueU8(value, 'reveal', strength);
      values.push(value);
    }
    expect(values).toEqual([0, 51, 102, 153, 204, 255]);
  });

  it('hide then reveal restores stably', () => {
    const s = 0.25;
    const hidden = applyMaskValueU8(255, 'hide', s);
    const restored = applyMaskValueU8(hidden, 'reveal', s);
    expect(hidden).toBe(191);
    expect(restored).toBe(255);
  });

  it('hard cut hide reaches exact zero', () => {
    const result = applyMaskValueU8(255, 'hide', 1);
    expect(result).toBe(0);
  });

  it('strength formula multiplies opacity falloff and pressure', () => {
    expect(maskStrength(0.5, 0.5, 1)).toBeCloseTo(0.25, 6);
    expect(maskStrength(1, 1, 1)).toBe(1);
    expect(maskStrength(1, 0, 1)).toBe(0);
  });
});
