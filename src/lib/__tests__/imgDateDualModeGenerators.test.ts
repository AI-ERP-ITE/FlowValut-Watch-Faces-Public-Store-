import { afterEach, describe, expect, test, vi } from 'vitest';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import { completeDayAssetNames } from '../dateImageMode';
import { generateWatchFaceCode } from '../jsCodeGenerator';
import { generateWatchFaceCodeV2 } from '../jsCodeGeneratorV2';

function dayElement(
  id: string,
  mode: 'digits' | 'complete' | undefined,
  scope: 'main' | 'aod',
): WatchFaceElement {
  return {
    id,
    type: 'IMG_DATE',
    name: id,
    bounds: { x: 201.83076923076922, y: 113.58461538461538, width: 62, height: 50 },
    dayImageMode: mode,
    dayDigitCellWidth: mode === 'complete' ? undefined : 25,
    hSpace: 0,
    fontArray: mode === 'complete'
      ? completeDayAssetNames(scope, id)
      : Array.from({ length: 10 }, (_, digit) => `date_digit_${scope}_${id}_${digit}.png`),
    visible: true,
    zIndex: 1,
  };
}

function config(version: 'v2' | 'v3', mode: 'digits' | 'complete' | undefined): WatchFaceConfig {
  return {
    name: `Spec 118 ${version} ${mode ?? 'legacy'}`,
    resolution: { width: 480, height: 480 },
    background: { src: 'background.png', format: 'TGA-32' },
    elements: [dayElement('main-day', mode, 'main')],
    aodElements: version === 'v2' ? [dayElement('aod-day', mode, 'aod')] : undefined,
    watchModel: version === 'v2' ? 'Amazfit Balance 2' : 'GTR 4',
    configVersion: version,
  };
}

function firstDayArray(source: string): string[] {
  const match = source.match(/day_sc_array:\s*\[([^\]]+)\]/);
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map(item => item[1]);
}

describe.each([
  ['V2', (mode: 'digits' | 'complete' | undefined) => generateWatchFaceCodeV2(config('v2', mode)).watchfaceIndexJs],
  ['V3', (mode: 'digits' | 'complete' | undefined) => generateWatchFaceCode(config('v3', mode)).watchfaceIndexJs],
] as const)('%s IMG_DATE dual mode', (_label, generate) => {
  afterEach(() => vi.restoreAllMocks());

  test('legacy/numeric mode exports ten digits from the centered two-cell origin', () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const source = generate(undefined);

    expect(firstDayArray(source)).toHaveLength(10);
    expect(source).toContain('day_startX: px(208)');
    expect(source).toContain('day_zero: 1');
    expect(source).toContain('day_align: hmUI.align.LEFT');
    expect(source).toContain('day_is_character: false');
  });

  test('complete mode exports exactly 31 character images from the frame origin', () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const source = generate('complete');
    const images = firstDayArray(source);

    expect(images).toHaveLength(31);
    expect(images[0]).toContain('_01.png');
    expect(images[30]).toContain('_31.png');
    expect(source).toContain('day_startX: px(201.83076923076922)');
    expect(source).toContain('day_zero: 0');
    expect(source).toContain('day_is_character: true');
  });
});
