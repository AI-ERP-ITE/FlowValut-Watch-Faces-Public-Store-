import { describe, expect, it } from 'vitest';
import type { WatchFaceElement } from '@/types';

const bounds = { x: 10, y: 20, width: 120, height: 120 };

describe('Spec 132 optional PNG widget model', () => {
  it('keeps a legacy ARC_PROGRESS native when the new fields are absent', () => {
    const legacy: WatchFaceElement = {
      id: 'legacy-arc',
      type: 'ARC_PROGRESS',
      name: 'Battery Arc',
      bounds,
      visible: true,
      zIndex: 1,
      dataType: 'BATTERY',
      radius: 50,
      startAngle: -120,
      endAngle: 120,
      lineWidth: 8,
    };

    const restored = JSON.parse(JSON.stringify(legacy)) as WatchFaceElement;
    expect(restored.arcRenderMode).toBeUndefined();
    expect(restored.arcPngTrackSrc).toBeUndefined();
    expect(restored.arcPngActiveSrc).toBeUndefined();
    expect(restored.arcPngFrames).toBeUndefined();
  });

  it('round-trips layered gauge and PNG arc sources without migration', () => {
    const element: WatchFaceElement = {
      id: 'png-arc',
      type: 'ARC_PROGRESS',
      name: 'PNG Battery Arc',
      bounds,
      visible: true,
      zIndex: 2,
      dataType: 'BATTERY',
      arcRenderMode: 'png-frames',
      arcPngTrackSrc: 'data:image/png;base64,dHJhY2s=',
      arcPngActiveSrc: 'data:image/png;base64,YWN0aXZl',
      arcPngFrameCount: 11,
      arcPngDirection: 'clockwise',
      gaugePngBackgroundSrc: 'data:image/png;base64,Ymc=',
      gaugePngForegroundSrc: 'data:image/png;base64,Zmc=',
      gaugePngSwitcherFrames: ['data:image/png;base64,MQ=='],
    };

    expect(JSON.parse(JSON.stringify(element))).toEqual(element);
  });
});
