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

  it('roundtrips independent MAIN and AOD digit typography without mutation', () => {
    const mainDigit = {
      id: 'main-steps',
      name: 'Main steps',
      type: 'TEXT_IMG',
      dataType: 'STEP',
      alignH: 'RIGHT',
      fontSize: 34,
      bounds: { x: 80, y: 90, width: 150, height: 42 },
      visible: true,
    } as WatchFaceElement;
    const aodDigit = {
      ...mainDigit,
      id: 'aod-steps',
      name: 'AOD steps',
      alignH: 'CENTER_H',
      fontSize: 28,
      bounds: { x: 120, y: 130, width: 110, height: 35 },
    } as WatchFaceElement;
    const config = { ...baseConfig, elements: [mainDigit] };

    const saved = buildProjectFileConfig(config, {
      aodElements: [aodDigit],
      backgroundTransform: transform,
      aodBackgroundMode: 'USE_MAIN_BACKGROUND',
      aodSolidColor: null,
      aodBackgroundTransform: transform,
    });
    const reloaded = JSON.parse(JSON.stringify(saved)) as WatchFaceConfig;
    const reloadedMain = reloaded.elements[0];
    const reloadedAod = reloaded.aodElements?.[0];

    expect(reloadedMain).toMatchObject({
      alignH: 'RIGHT',
      fontSize: 34,
      bounds: { x: 80, y: 90, width: 150, height: 42 },
      dataType: 'STEP',
    });
    expect(reloadedAod).toMatchObject({
      alignH: 'CENTER_H',
      fontSize: 28,
      bounds: { x: 120, y: 130, width: 110, height: 35 },
      dataType: 'STEP',
    });

    aodDigit.bounds.x = 999;
    expect(reloaded.aodElements?.[0].bounds.x).toBe(120);
    expect(reloaded.elements[0].bounds.x).toBe(80);
  });

  it('roundtrips independent MAIN/AOD day image modes', () => {
    const mainDay = {
      id: 'main-day',
      name: 'Main day',
      type: 'IMG_DATE',
      dayImageMode: 'complete',
      bounds: { x: 200, y: 110, width: 62, height: 50 },
      visible: true,
    } as WatchFaceElement;
    const aodDay = {
      ...mainDay,
      id: 'aod-day',
      name: 'AOD day',
      dayImageMode: 'digits',
    } as WatchFaceElement;

    const saved = buildProjectFileConfig({ ...baseConfig, elements: [mainDay] }, {
      aodElements: [aodDay],
      backgroundTransform: transform,
      aodBackgroundMode: 'USE_MAIN_BACKGROUND',
      aodSolidColor: null,
      aodBackgroundTransform: transform,
    });
    const reloaded = JSON.parse(JSON.stringify(saved)) as WatchFaceConfig;

    expect(reloaded.elements[0].dayImageMode).toBe('complete');
    expect(reloaded.aodElements?.[0].dayImageMode).toBe('digits');
  });
});
