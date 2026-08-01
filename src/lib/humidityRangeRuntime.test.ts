import { describe, expect, it } from 'vitest';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import type { RangeSlot } from '@/types/imageSwitcher';
import { expandAbsoluteRangeFrames, resolveSlot } from './imageSwitcherResolver';
import { generateWatchFaceCode } from './jsCodeGenerator';

const ranges: RangeSlot[] = [
  { slotIndex: 0, label: 'Dry', min: 0, max: 30 },
  { slotIndex: 1, label: 'Comfortable', min: 31, max: 60 },
  { slotIndex: 2, label: 'Humid', min: 61, max: 100 },
];
const frames = ['dry.png', 'comfortable.png', 'humid.png'];

describe('Spec 131 T014 Humidity range runtime', () => {
  it('expands configured ranges across every live humidity value', () => {
    const expanded = expandAbsoluteRangeFrames(frames, ranges, 0, 100);
    expect(expanded).toHaveLength(101);
    expect([0, 30, 31, 60, 61, 100].map((value) => expanded[value])).toEqual([
      'dry.png', 'dry.png', 'comfortable.png', 'comfortable.png', 'humid.png', 'humid.png',
    ]);
    expect(new Set(expanded)).toEqual(new Set(frames));
  });

  it('keeps preview resolution identical at all boundary values', () => {
    const definition = {
      id: 'humidity', name: 'Humidity ranges', dataType: 'HUMIDITY',
      policyType: 'ABSOLUTE_RANGES', slotCount: 3, ranges,
      createdAt: 1, updatedAt: 1,
    } as const;
    expect([0, 30, 31, 60, 61, 100].map((value) => resolveSlot(value, definition).slotIndex))
      .toEqual([0, 0, 1, 1, 2, 2]);
  });

  it('rejects gaps and frame/slot mismatches before package generation', () => {
    expect(() => expandAbsoluteRangeFrames(frames.slice(0, 2), ranges, 0, 100))
      .toThrow(/does not match slot count/);
    expect(() => expandAbsoluteRangeFrames(frames, [
      ranges[0], { ...ranges[1], min: 32 }, ranges[2],
    ], 0, 100)).toThrow(/covers value 31/);
  });

  it('generates a 101-index HUMIDITY IMG_LEVEL without duplicating filenames', () => {
    const expanded = expandAbsoluteRangeFrames(frames, ranges, 0, 100);
    const element: WatchFaceElement = {
      id: 'humidity-switcher', type: 'IMG_LEVEL', dataType: 'HUMIDITY',
      name: 'Humidity Level', bounds: { x: 10, y: 20, width: 60, height: 60 },
      images: expanded, visible: true, zIndex: 1,
    };
    const config = {
      name: 'humidity ranges', watchModel: 'Amazfit Balance 2',
      resolution: { width: 480, height: 480 }, elements: [element],
    } as unknown as WatchFaceConfig;
    const code = generateWatchFaceCode(config).watchfaceIndexJs;
    expect(code).toContain('image_length: 101');
    expect(code).toContain('type: hmUI.data_type.HUMIDITY');
    expect(code.match(/"dry\.png"/g)).toHaveLength(62);
    expect(code.match(/"comfortable\.png"/g)).toHaveLength(60);
    expect(code.match(/"humid\.png"/g)).toHaveLength(80);
  });
});
