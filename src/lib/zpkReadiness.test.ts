import { describe, expect, it } from 'vitest';
import type { WatchFaceElement } from '@/types';
import { findDuplicateWidgetBindings } from './zpkReadiness';

const element = (id: string, type: WatchFaceElement['type'], dataType?: string): WatchFaceElement => ({
  id, type, dataType, name: id, bounds: { x: 0, y: 0, width: 10, height: 10 }, visible: true, zIndex: 1,
});

describe('ZPK duplicate readiness checks', () => {
  it('warns only for exact type and data-type matches', () => {
    const result = findDuplicateWidgetBindings('MAIN', [element('a', 'TEXT_IMG', 'STEP'), element('b', 'TEXT_IMG', 'STEP'), element('c', 'ARC_PROGRESS', 'STEP')]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ mode: 'MAIN', type: 'TEXT_IMG', dataType: 'STEP' });
  });

  it('ignores hidden and canvas-only elements', () => {
    const hidden = element('hidden', 'TEXT_IMG', 'STEP');
    hidden.visible = false;
    expect(findDuplicateWidgetBindings('AOD', [hidden, element('one', 'TEXT_IMG', 'STEP'), element('icon', 'SHORTCUT_ICON', 'STEP')])).toHaveLength(0);
  });
});
