import { describe, expect, test, vi } from 'vitest';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import { generateWatchFaceCodeV2 } from '../jsCodeGeneratorV2';

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
    name: 'Spec 117 V2 alignment fixture',
    resolution: { width: 480, height: 480 },
    background: { src: 'background.png', format: 'TGA-32' },
    elements: [numeric],
    aodElements: [{ ...numeric, id: 'aod-numeric-1' }],
    watchModel: 'Amazfit Balance 2',
    configVersion: 'v2',
  };
}

describe('V2 TEXT_IMG alignment export', () => {
  test.each([
    ['LEFT', 'LEFT'],
    ['CENTER_H', 'CENTER_H'],
    ['RIGHT', 'RIGHT'],
    [undefined, 'CENTER_H'],
  ] as const)('exports stored alignment %s as %s', (stored, expected) => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const generated = generateWatchFaceCodeV2(makeConfig(stored));
    const matches = [...generated.watchfaceIndexJs.matchAll(/align_h:\s*hmUI\.align\.(LEFT|CENTER_H|RIGHT)/g)]
      .map((match) => match[1]);

    expect(matches).toEqual([expected, expected]);
    vi.restoreAllMocks();
  });

  test('normalizes invalid legacy alignment to the V2 center fallback', () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const generated = generateWatchFaceCodeV2(makeConfig('sideways'));
    expect(generated.watchfaceIndexJs).toContain('align_h: hmUI.align.CENTER_H');
    vi.restoreAllMocks();
  });
});
