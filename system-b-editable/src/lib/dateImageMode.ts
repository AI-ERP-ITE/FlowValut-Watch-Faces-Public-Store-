import type { WatchFaceElement } from '@/types';

export type DayImageMode = 'digits' | 'complete';

export function normalizeDayImageMode(value: unknown): DayImageMode {
  return value === 'complete' ? 'complete' : 'digits';
}

export function isCompleteDayImageMode(element: Pick<WatchFaceElement, 'dayImageMode'>): boolean {
  return normalizeDayImageMode(element.dayImageMode) === 'complete';
}

export function getCenteredNumericDayStartX(
  bounds: { x: number; width: number },
  cellWidth: number | undefined,
  hSpace = 0,
): number {
  const cell = Number(cellWidth);
  if (!Number.isFinite(cell) || cell <= 0) return bounds.x;
  const spacing = Math.max(0, Math.floor(Number(hSpace) || 0));
  const pairWidth = cell * 2 + spacing;
  return Math.round(bounds.x + bounds.width / 2 - pairWidth / 2);
}

export function completeDayAssetNames(scope: 'main' | 'aod', elementId: string): string[] {
  const safeId = (elementId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  return Array.from(
    { length: 31 },
    (_, index) => `date_day_${scope}_${safeId}_${String(index + 1).padStart(2, '0')}.png`,
  );
}
