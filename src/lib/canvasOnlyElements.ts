import type { WatchFaceElement } from '@/types';

export function isCanvasOnlyElement(element: WatchFaceElement): boolean {
  return element.type === 'SHORTCUT_ICON';
}

export function withoutCanvasOnlyElements(elements: WatchFaceElement[]): WatchFaceElement[] {
  return elements.filter((element) => !isCanvasOnlyElement(element));
}
