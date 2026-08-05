import type { WatchFaceElement } from '@/types';
import { isCanvasOnlyElement } from './canvasOnlyElements';

export interface DuplicateWidgetBinding {
  mode: 'MAIN' | 'AOD';
  type: WatchFaceElement['type'];
  dataType: string;
  names: string[];
}

export function findDuplicateWidgetBindings(mode: DuplicateWidgetBinding['mode'], elements: WatchFaceElement[]): DuplicateWidgetBinding[] {
  const groups = new Map<string, WatchFaceElement[]>();
  for (const element of elements) {
    const dataType = element.dataType?.trim();
    if (!element.visible || !dataType || isCanvasOnlyElement(element)) continue;
    const key = `${element.type}\u0000${dataType}`;
    groups.set(key, [...(groups.get(key) ?? []), element]);
  }
  return [...groups.values()].filter((group) => group.length > 1).map((group) => ({
    mode, type: group[0].type, dataType: group[0].dataType!.trim(), names: group.map((element) => element.name),
  }));
}
