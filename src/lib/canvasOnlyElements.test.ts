import { describe, expect, it } from 'vitest';
import type { WatchFaceElement } from '@/types';
import { withoutCanvasOnlyElements } from './canvasOnlyElements';

const element = (type: WatchFaceElement['type']): WatchFaceElement => ({
  id: type, type, name: type, bounds: { x: 0, y: 0, width: 10, height: 10 }, visible: true, zIndex: 1,
});

describe('canvas-only element boundary', () => {
  it('removes shortcut annotations while retaining watch widgets', () => {
    expect(withoutCanvasOnlyElements([element('IMG'), element('SHORTCUT_ICON')]).map((item) => item.type)).toEqual(['IMG']);
  });
});
