import type { WatchFaceElement } from '@/types';

export type DropShadowConfig = NonNullable<WatchFaceElement['dropShadow']>;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function normalizeDropShadowForBake(ds: DropShadowConfig): DropShadowConfig {
  return {
    ...ds,
    blur: Math.max(0, Math.round(ds.blur)),
    offsetX: Math.round(ds.offsetX),
    offsetY: Math.round(ds.offsetY),
    opacity: clamp(ds.opacity, 0, 1),
  };
}
