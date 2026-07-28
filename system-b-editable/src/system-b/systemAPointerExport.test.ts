import { createCanvas, Image, loadImage } from 'canvas';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { WatchFaceConfig } from '@/types';
import { prepareConfigPointersLikeSystemA } from './systemAPointerExport';

beforeAll(() => {
  vi.stubGlobal('Image', Image);
  vi.stubGlobal('document', {
    createElement: (tag: string) => {
      if (tag !== 'canvas') throw new Error(`Unexpected element ${tag}`);
      return createCanvas(1, 1);
    },
  });
});

describe('literal System A pointer export preparation', () => {
  it('bakes a custom hand at System A dimensions, effect padding, and pivots', async () => {
    const config: WatchFaceConfig = {
      name: 'Pointer fixture',
      watchModel: 'Amazfit Balance 2',
      resolution: { width: 480, height: 480 },
      background: { src: 'background.png', format: 'TGA-P' },
      elements: [{
        id: 'pointer',
        type: 'TIME_POINTER',
        name: 'Pointer',
        bounds: { x: 0, y: 0, width: 480, height: 480 },
        center: { x: 240, y: 240 },
        handStyle: 'custom_hand:fixture',
        visible: true,
        zIndex: 1,
      }],
    };

    const png = (width: number, height: number) => createCanvas(width, height).toDataURL('image/png');
    const prepared = await prepareConfigPointersLikeSystemA(config, [{
      key: 'custom_hand:fixture',
      name: 'Fixture',
      hourDataUrl: png(22, 140),
      minuteDataUrl: png(16, 200),
      secondDataUrl: png(8, 240),
      coverDataUrl: png(30, 30),
      swatchDataUrl: png(24, 24),
      hourPosX: 11,
      hourPosY: 118,
      minutePosX: 8,
      minutePosY: 172,
      secondPosX: 4,
      secondPosY: 180,
      coverWidth: 30,
      coverHeight: 30,
      createdAt: 1,
    }]);
    const pointer = prepared.elements[0];
    const [hour, minute, second, cover] = await Promise.all([
      loadImage(pointer.hourHandSrc!),
      loadImage(pointer.minuteHandSrc!),
      loadImage(pointer.secondHandSrc!),
      loadImage(pointer.coverSrc!),
    ]);

    expect({ width: hour.width, height: hour.height, pivot: pointer.hourPos })
      .toEqual({ width: 46, height: 164, pivot: { x: 23, y: 130 } });
    expect({ width: minute.width, height: minute.height, pivot: pointer.minutePos })
      .toEqual({ width: 40, height: 224, pivot: { x: 20, y: 184 } });
    expect({ width: second.width, height: second.height, pivot: pointer.secondPos })
      .toEqual({ width: 32, height: 264, pivot: { x: 16, y: 192 } });
    expect({ width: cover.width, height: cover.height }).toEqual({ width: 30, height: 30 });
  });
});
