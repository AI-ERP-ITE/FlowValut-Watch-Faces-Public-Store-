import { describe, expect, it } from 'vitest';

import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import { buildProjectFileConfig } from './projectFileConfig';

const transform = { angle: 0, flipH: false, flipV: false };

const baseConfig = {
  name: 'Round trip fixture',
  elements: [{ id: 'main', name: 'Main', type: 'IMG', visible: true }],
  aodElements: null,
  backgroundTransform: transform,
  aodBackgroundTransform: transform,
} as unknown as WatchFaceConfig;

describe('buildProjectFileConfig', () => {
  it('preserves a dedicated live AOD layout in the project file config', () => {
    const liveAod = [{ id: 'aod-only', name: 'AOD only', type: 'IMG', visible: true }] as WatchFaceElement[];
    const result = buildProjectFileConfig(baseConfig, {
      aodElements: liveAod,
      backgroundTransform: transform,
      aodBackgroundMode: 'SOLID_COLOR',
      aodSolidColor: '#112233',
      aodBackgroundTransform: { angle: 15, flipH: true, flipV: false },
    });

    expect(result.aodElements).toEqual(liveAod);
    expect(result.aodElements).not.toBe(liveAod);
    expect(result.aodBackgroundMode).toBe('SOLID_COLOR');
    expect(result.aodSolidColor).toBe('#112233');
    expect(result.aodBackgroundTransform).toEqual({ angle: 15, flipH: true, flipV: false });
  });

  it('keeps AOD null when MAIN should remain the device fallback', () => {
    const result = buildProjectFileConfig(baseConfig, {
      aodElements: null,
      backgroundTransform: transform,
      aodBackgroundMode: 'USE_MAIN_BACKGROUND',
      aodSolidColor: null,
      aodBackgroundTransform: transform,
    });

    expect(result.aodElements).toBeNull();
  });
});
