import { describe, expect, it } from 'vitest';
import type { WatchFaceElement } from '@/types';
import { applyElementStyle, captureElementStyle } from './elementStyleClipboard';

const base = (): WatchFaceElement => ({
  id: 'source', type: 'IMG', name: 'Source', dataType: 'STEP', bounds: { x: 2, y: 3, width: 40, height: 50 }, visible: true, zIndex: 1,
  color: '#112233', fontSize: 22, iconPhotoEdit: { highlights: 25, shadows: -15 },
  dropShadow: { color: '#000000', opacity: .5, blur: 8, offsetX: 2, offsetY: 3 },
});

describe('element style clipboard', () => {
  it('copies effects but never identity, binding, content, or geometry', () => {
    const source = base();
    const target = { ...base(), id: 'target', name: 'Target', dataType: 'HEART', bounds: { x: 9, y: 8, width: 7, height: 6 } };
    const changes = applyElementStyle(target, captureElementStyle(source));
    expect(changes.iconPhotoEdit).toEqual(source.iconPhotoEdit);
    expect(changes.dropShadow).toEqual(source.dropShadow);
    expect(changes).not.toHaveProperty('id');
    expect(changes).not.toHaveProperty('name');
    expect(changes).not.toHaveProperty('dataType');
    expect(changes).not.toHaveProperty('bounds');
  });
});
