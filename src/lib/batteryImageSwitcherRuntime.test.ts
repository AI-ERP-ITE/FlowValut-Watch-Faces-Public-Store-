import { describe, expect, it } from 'vitest';
import type { RangeSlot } from '@/types/imageSwitcher';
import { expandAbsoluteRangeFrames } from './imageSwitcherResolver';

describe('Battery Image Switcher runtime mapping', () => {
  it('expands 0-100 in forward order and keeps 62% on the six-marker image', () => {
    const ranges: RangeSlot[] = [
      { slotIndex: 0, label: '1 marker', min: 0, max: 10 },
      { slotIndex: 1, label: '2 markers', min: 11, max: 20 },
      { slotIndex: 2, label: '3 markers', min: 21, max: 30 },
      { slotIndex: 3, label: '4 markers', min: 31, max: 40 },
      { slotIndex: 4, label: '5 markers', min: 41, max: 60 },
      { slotIndex: 5, label: '6 markers', min: 61, max: 70 },
      { slotIndex: 6, label: '7 markers', min: 71, max: 100 },
    ];
    const frames = ranges.map((_range, index) => `${index + 1}-markers.png`);
    const runtimeFrames = expandAbsoluteRangeFrames(frames, ranges, 0, 100);

    expect(runtimeFrames).toHaveLength(101);
    expect(runtimeFrames[31]).toBe('4-markers.png');
    expect(runtimeFrames[40]).toBe('4-markers.png');
    expect(runtimeFrames[61]).toBe('6-markers.png');
    expect(runtimeFrames[62]).toBe('6-markers.png');
    expect(runtimeFrames[70]).toBe('6-markers.png');
  });
});
