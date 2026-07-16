import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import { generateWatchFaceCode } from '@/lib/jsCodeGenerator';
import { generateWatchFaceCodeV2 } from '@/lib/jsCodeGeneratorV2';
import { rearrangeProjectPositions } from '@/lib/projectCanvasGeometry';

function image(
  id: string,
  src: string,
  bounds: WatchFaceElement['bounds'],
  extra: Partial<WatchFaceElement> = {},
): WatchFaceElement {
  return {
    id,
    type: 'IMG',
    name: id,
    bounds,
    src,
    visible: true,
    zIndex: 1,
    ...extra,
  };
}

function fixture(version: 'v2' | 'v3'): WatchFaceConfig {
  return {
    name: `Spec 119 ${version}`,
    resolution: { width: 466, height: 466 },
    background: { src: 'background.png', format: 'TGA-32' },
    elements: [
      image('resolution-sized', 'project_bg.png', { x: 0, y: 0, width: 466, height: 466 }),
      image('authored-480-artwork', 'authored_480.png', { x: 0, y: 0, width: 480, height: 480 }),
      image('gauge-background', 'gauge_bg.png', { x: 0, y: 0, width: 466, height: 466 }, { gaugePairId: 'gauge-1' }),
      {
        id: 'hands',
        type: 'TIME_POINTER',
        name: 'Hands',
        bounds: { x: 0, y: 0, width: 10, height: 10 },
        center: { x: 240, y: 239 },
        hourPos: { x: 11, y: 118 },
        minutePos: { x: 8, y: 172 },
        secondPos: { x: 4, y: 180 },
        visible: true,
        zIndex: 2,
      },
      {
        id: 'date-pointer',
        type: 'DATE_POINTER',
        name: 'Date pointer',
        bounds: { x: 0, y: 0, width: 20, height: 80 },
        visible: true,
        zIndex: 3,
      },
    ],
    watchModel: version === 'v2' ? 'Amazfit Balance 2' : 'GTR 4',
    configVersion: version,
  };
}

describe.each([
  ['V2', (config: WatchFaceConfig) => generateWatchFaceCodeV2(config).watchfaceIndexJs],
  ['V3', (config: WatchFaceConfig) => generateWatchFaceCode(config).watchfaceIndexJs],
] as const)('%s project canvas export', (_label, generate) => {
  afterEach(() => vi.restoreAllMocks());

  it('uses config resolution for background recognition without hiding authored or gauge artwork', () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const source = generate(fixture(_label === 'V2' ? 'v2' : 'v3'));

    expect(source).not.toContain('project_bg.png');
    expect(source).toContain('authored_480.png');
    expect(source).toContain('gauge_bg.png');
  });

  it('preserves TIME_POINTER centers and local pivots', () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const source = generate(fixture(_label === 'V2' ? 'v2' : 'v3'));

    expect(source).toContain('hour_centerX: px(240)');
    expect(source).toContain('hour_centerY: px(239)');
    expect(source).toContain('hour_posX: px(11)');
    expect(source).toContain('hour_posY: px(118)');
    expect(source).toContain('minute_posX: px(8)');
    expect(source).toContain('minute_posY: px(172)');
  });

  it('uses the project center for a legacy DATE_POINTER without a stored center', () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const source = generate(fixture(_label === 'V2' ? 'v2' : 'v3'));

    expect(source).toContain('center_x: px(233)');
    expect(source).toContain('center_y: px(233)');
  });

  it('emits an explicitly rearranged TIME_POINTER center exactly once', () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const input = fixture(_label === 'V2' ? 'v2' : 'v3');
    input.resolution = { width: 480, height: 480 };
    const pointer = input.elements.find((element) => element.type === 'TIME_POINTER')!;
    pointer.bounds = { x: 0, y: 0, width: 480, height: 480 };
    pointer.center = { x: 240, y: 240 };
    const rearranged = rearrangeProjectPositions(input, { width: 466, height: 466 });
    const source = generate(rearranged);

    expect(source).toContain('hour_centerX: px(233)');
    expect(source).toContain('hour_centerY: px(233)');
    expect(source).toContain('hour_posX: px(11)');
    expect(source).toContain('hour_posY: px(118)');
  });
});
