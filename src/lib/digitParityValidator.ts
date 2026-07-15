import type { WatchFaceElement } from '@/types';
import { computeDigitBitmapLayout, getDigitPreviewValue, type DigitBitmapMetrics, type DigitWidgetType } from '@/lib/digitLayoutEngine';

interface LegacyLayoutSummary {
  startX: number;
  totalWidth: number;
}

function normalizeAlignH(value: string | undefined, fallback: 'LEFT' | 'CENTER_H' | 'RIGHT'): 'LEFT' | 'CENTER_H' | 'RIGHT' {
  const raw = String(value ?? '').toUpperCase();
  if (raw === 'LEFT' || raw === 'CENTER_H' || raw === 'RIGHT') return raw;
  return fallback;
}

function legacyPreviewLayout(element: WatchFaceElement, value: string): LegacyLayoutSummary {
  const { x, width } = element.bounds;
  const alignH = element.type === 'IMG_TIME'
    ? 'CENTER_H'
    : normalizeAlignH(element.alignH, 'CENTER_H');
  const hSpace = Number.isFinite(Number(element.hSpace)) ? Math.max(0, Math.floor(Number(element.hSpace))) : 0;
  const digitCount = Math.max(1, value.replace(/[^0-9A-Za-z]/g, '').length);
  const digitW = Math.max(1, Math.floor((width - hSpace * Math.max(0, digitCount - 1)) / digitCount));
  const totalWidth = digitW * digitCount + hSpace * Math.max(0, digitCount - 1);
  const startX = alignH === 'CENTER_H'
    ? Math.floor(x + (width - totalWidth) / 2)
    : alignH === 'RIGHT'
      ? x + width - totalWidth
      : x;
  return { startX, totalWidth };
}

function toWidgetType(element: WatchFaceElement): DigitWidgetType | null {
  if (element.type === 'IMG_DATE') return 'IMG_DATE';
  if (element.type === 'IMG_TIME') return 'IMG_TIME';
  if (element.type === 'TEXT_IMG') return 'TEXT_IMG';
  return null;
}

export function logDigitParityReport(element: WatchFaceElement, bitmaps: DigitBitmapMetrics[]): void {
  const widgetType = toWidgetType(element);
  if (!widgetType) return;

  const value = getDigitPreviewValue(element);
  const legacy = legacyPreviewLayout(element, value);
  const zeppLike = computeDigitBitmapLayout({
    widgetType,
    bounds: element.bounds,
    value,
    alignH: element.alignH,
    hSpace: element.hSpace,
    bitmaps,
  });

  const legacyCenter = legacy.startX + legacy.totalWidth / 2;
  const zeppCenter = zeppLike.startX + zeppLike.totalWidth / 2;

  console.table([
    {
      element: element.name,
      id: element.id,
      widgetType,
      value,
      legacyStartX: legacy.startX,
      zeppStartX: zeppLike.startX,
      deltaStartX: zeppLike.startX - legacy.startX,
      legacyTotalW: legacy.totalWidth,
      zeppTotalW: zeppLike.totalWidth,
      deltaTotalW: zeppLike.totalWidth - legacy.totalWidth,
      deltaCenterX: Number((zeppCenter - legacyCenter).toFixed(2)),
    },
  ]);
}
