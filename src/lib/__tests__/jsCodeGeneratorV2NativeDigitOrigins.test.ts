import { afterEach, describe, expect, test, vi } from 'vitest';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import { generateWatchFaceCodeV2 } from '../jsCodeGeneratorV2';

function digitElement(
  id: string,
  type: 'IMG_TIME' | 'IMG_DATE',
  subtype: 'hours' | 'minutes' | 'day',
  x: number,
  legacyLayoutStartX: number,
): WatchFaceElement {
  return {
    id,
    type,
    subtype,
    name: id,
    bounds: { x, y: 80, width: 80, height: 40 },
    fontArray: Array.from({ length: 10 }, (_, digit) => `${id}_${digit}.png`),
    layoutStartX: legacyLayoutStartX,
    visible: true,
    zIndex: 1,
  };
}

function makeConfig(): WatchFaceConfig {
  return {
    name: 'Spec 117 native digit origins',
    resolution: { width: 480, height: 480 },
    background: { src: 'background.png', format: 'TGA-32' },
    elements: [
      digitElement('main-hours', 'IMG_TIME', 'hours', 100, 121),
      digitElement('main-minutes', 'IMG_TIME', 'minutes', 220, 243),
      digitElement('main-day', 'IMG_DATE', 'day', 300, 325),
    ],
    aodElements: [
      digitElement('aod-hours', 'IMG_TIME', 'hours', 110, 132),
      digitElement('aod-minutes', 'IMG_TIME', 'minutes', 230, 254),
      digitElement('aod-day', 'IMG_DATE', 'day', 310, 336),
    ],
    watchModel: 'Amazfit Balance 2',
    configVersion: 'v2',
  };
}

function coordinates(source: string, property: string): number[] {
  const pattern = new RegExp(`${property}:\\s*px\\((\\d+)\\)`, 'g');
  return [...source.matchAll(pattern)].map((match) => Number(match[1]));
}

describe('V2 native time/date origins', () => {
  afterEach(() => vi.restoreAllMocks());

  test('uses frame origins and ignores legacy sample-derived offsets in MAIN and AOD', () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const generated = generateWatchFaceCodeV2(makeConfig()).watchfaceIndexJs;

    expect(coordinates(generated, 'hour_startX')).toEqual([100, 110]);
    expect(coordinates(generated, 'minute_startX')).toEqual([220, 230]);
    expect(coordinates(generated, 'day_startX')).toEqual([300, 310]);
  });

  test('keeps native zero-padding and left-alignment contracts', () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const generated = generateWatchFaceCodeV2(makeConfig()).watchfaceIndexJs;

    expect(generated.match(/hour_zero:\s*1/g)).toHaveLength(2);
    expect(generated.match(/minute_zero:\s*1/g)).toHaveLength(2);
    expect(generated.match(/day_zero:\s*1/g)).toHaveLength(2);
    expect(generated.match(/hour_align:\s*hmUI\.align\.LEFT/g)).toHaveLength(2);
    expect(generated.match(/minute_align:\s*hmUI\.align\.LEFT/g)).toHaveLength(2);
    expect(generated.match(/day_align:\s*hmUI\.align\.LEFT/g)).toHaveLength(2);
  });
});
