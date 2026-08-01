import { describe, expect, it } from 'vitest';
import type { WatchFaceElement } from '@/types';
import { resolveGaugePointerExportSource } from './gaugePointerExportSource';

const pointer = (patch: Partial<WatchFaceElement> = {}): WatchFaceElement => ({
  id: 'gauge', name: 'Gauge', type: 'GAUGE_POINTER', dataType: 'BATTERY',
  bounds: { x: 0, y: 0, width: 40, height: 120 }, visible: true, zIndex: 1,
  ...patch,
});

describe('Gauge Pointer export source parity', () => {
  it('uses the same custom-gauge record key used by canvas preview', () => {
    const dataUrl = 'data:image/png;base64,CUSTOM';
    expect(resolveGaugePointerExportSource(
      pointer({ handStyle: 'custom_gauge:needle_blue', src: 'gauge_pointer.png' }),
      'gauge_pointer.png',
      [],
      [{ key: 'custom_gauge:needle_blue', name: 'Blue', sourceHtml: '<svg/>', dataUrl, pivotX: 0.5, pivotY: 0.9, createdAt: 1 }],
    )).toBe(dataUrl);
  });

  it('prefers inline and packaged element pixels before the custom library fallback', () => {
    expect(resolveGaugePointerExportSource(pointer({ src: 'data:image/png;base64,INLINE' }), 'needle.png', [], []))
      .toBe('data:image/png;base64,INLINE');
    expect(resolveGaugePointerExportSource(pointer({ src: 'needle.png' }), 'needle.png', [
      { name: 'needle.png', dataUrl: 'data:image/png;base64,PACKAGED' },
    ], [])).toBe('data:image/png;base64,PACKAGED');
  });
});
