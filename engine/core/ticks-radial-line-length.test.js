import { describe, expect, it } from 'vitest';
import { renderTicksRadial } from '../elements/baseElements/ticksRadial.js';

describe('ticks radial line mode length behavior', () => {
  it('updates visible line ticks when length changes with step=5', () => {
    const baseParams = {
      count: 60,
      radius: 0.42,
      majorEvery: 5,
      majorLength: 0.035,
      width: 0.003,
      token: {
        mode: 'line',
        every: 5,
      },
    };

    const shortSvg = renderTicksRadial({ ...baseParams, length: 0.01 }, {}, {});
    const longSvg = renderTicksRadial({ ...baseParams, length: 0.08 }, {}, {});

    expect(shortSvg).not.toBe(longSvg);
    expect(shortSvg).toContain('<line ');
    expect(longSvg).toContain('<line ');
  });
});
