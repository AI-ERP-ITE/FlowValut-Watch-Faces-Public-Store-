import { afterEach, describe, expect, test, vi } from 'vitest';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import { generateWatchFaceCode } from '../jsCodeGenerator';

function makeConfig(alignH?: string): WatchFaceConfig {
  const numeric: WatchFaceElement = {
    id: 'numeric-1',
    type: 'TEXT_IMG',
    name: 'Steps',
    bounds: { x: 100, y: 120, width: 140, height: 40 },
    dataType: 'STEP',
    fontArray: Array.from({ length: 10 }, (_, digit) => `step_${digit}.png`),
    hSpace: 1,
    alignH,
    visible: true,
    zIndex: 1,
  };

  return {
    name: 'Spec 117 V3 alignment fixture',
    resolution: { width: 480, height: 480 },
    background: { src: 'background.png', format: 'TGA-32' },
    elements: [numeric],
    aodElements: [{ ...numeric, id: 'aod-numeric-1' }],
    watchModel: 'GTR 4',
    configVersion: 'v3',
  };
}

describe('V3 TEXT_IMG alignment export', () => {
  afterEach(() => vi.restoreAllMocks());

  test.each([
    ['LEFT', 'LEFT'],
    ['CENTER_H', 'CENTER_H'],
    ['RIGHT', 'RIGHT'],
    [undefined, 'LEFT'],
  ] as const)('exports stored alignment %s as %s', (stored, expected) => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const generated = generateWatchFaceCode(makeConfig(stored));
    const matches = [...generated.watchfaceIndexJs.matchAll(/align_h:\s*hmUI\.align\.(LEFT|CENTER_H|RIGHT)/g)]
      .map((match) => match[1]);

    expect(matches).toEqual([expected]);
  });

  test('normalizes invalid legacy alignment to the V3 left fallback', () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const generated = generateWatchFaceCode(makeConfig('sideways'));
    expect(generated.watchfaceIndexJs).toContain('align_h: hmUI.align.LEFT');
  });
});
