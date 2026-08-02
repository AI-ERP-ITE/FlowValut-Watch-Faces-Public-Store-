import { describe, expect, it } from 'vitest';
import type { WatchFaceElement } from '@/types';
import { composeLayeredPngGauge } from './layeredPngGauge';

const png = (value: string) => `data:image/png;base64,${value}`;

function gauge(overrides: Partial<WatchFaceElement> = {}): WatchFaceElement {
  return {
    id: 'gauge-1',
    type: 'GAUGE_POINTER',
    name: 'Battery Gauge',
    bounds: { x: 25, y: 30, width: 150, height: 150 },
    visible: true,
    zIndex: 10,
    dataType: 'BATTERY',
    src: png('needle'),
    pivotX: 0.5,
    pivotY: 0.8,
    ...overrides,
  };
}

describe('Layered PNG Gauge Set composition', () => {
  it('orders background, switcher, needle and foreground deterministically', () => {
    const result = composeLayeredPngGauge(gauge({
      gaugePngBackgroundSrc: png('background'),
      gaugePngSwitcherFrames: [png('low'), png('high')],
      gaugePngForegroundSrc: png('glass'),
    }));

    expect(result.pointerChanges).toMatchObject({
      zIndex: 10,
      gaugePairId: 'gauge_png_group_gauge-1',
      assetFilename: 'gauge_png_needle_gauge-1.png',
    });
    expect(result.siblings.map(layer => [layer.type, layer.zIndex])).toEqual([
      ['IMG', 8],
      ['IMG_LEVEL', 9],
      ['IMG', 11],
    ]);
    expect(result.siblings.every(layer => layer.gaugePairId === 'gauge_png_group_gauge-1')).toBe(true);
  });

  it('preserves switcher frame order and data binding', () => {
    const frames = [png('three'), png('one'), png('two')];
    const result = composeLayeredPngGauge(gauge({ gaugePngSwitcherFrames: frames }));
    const switcher = result.siblings.find(layer => layer.type === 'IMG_LEVEL');
    expect(switcher?.images).toEqual(frames);
    expect(switcher?.imageSwitcherFrameCount).toBe(3);
    expect(switcher?.dataType).toBe('BATTERY');
  });

  it('returns stable prefixes for scoped sibling replacement', () => {
    const result = composeLayeredPngGauge(gauge());
    expect(result.staleAssetPrefixes).toEqual([
      'gauge_png_bg_gauge-1.png',
      'gauge_png_switch_gauge-1_frame',
      'gauge_png_fg_gauge-1.png',
    ]);
  });

  it('does not invent absent optional layers', () => {
    expect(composeLayeredPngGauge(gauge()).siblings).toEqual([]);
  });

  it('rejects a non-PNG or missing needle', () => {
    expect(() => composeLayeredPngGauge(gauge({ src: 'gauge_pointer.png' })))
      .toThrow('Upload a PNG needle');
  });
});
