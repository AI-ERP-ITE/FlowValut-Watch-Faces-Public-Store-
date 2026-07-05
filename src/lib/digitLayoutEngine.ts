import type { WatchFaceElement } from '@/types';

export type DigitWidgetType = 'IMG_DATE' | 'IMG_TIME' | 'TEXT_IMG';
export type HorizontalAlign = 'LEFT' | 'CENTER_H' | 'RIGHT';

export interface DigitBitmapMetrics {
  char: string;
  width: number;
  height: number;
  advanceWidth?: number;
  advanceHeight?: number;
  trimLeft?: number;
  trimRight?: number;
  trimTop?: number;
  trimBottom?: number;
}

export interface DigitLayoutRequest {
  widgetType: DigitWidgetType;
  bounds: { x: number; y: number; width: number; height: number };
  value: string;
  alignH?: string;
  hSpace?: number;
  bitmaps?: DigitBitmapMetrics[];
}

export interface DigitGlyphBox {
  char: string;
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX: number;
  advanceWidth: number;
}

export interface DigitLayoutResult {
  alignH: HorizontalAlign;
  hSpace: number;
  startX: number;
  totalWidth: number;
  glyphs: DigitGlyphBox[];
}

function normalizeAlignH(value: string | undefined, fallback: HorizontalAlign): HorizontalAlign {
  const raw = String(value ?? '').toUpperCase();
  if (raw === 'LEFT' || raw === 'CENTER_H' || raw === 'RIGHT') return raw;
  return fallback;
}

function defaultAlign(widgetType: DigitWidgetType): HorizontalAlign {
  if (widgetType === 'IMG_TIME') return 'LEFT';
  return 'CENTER_H';
}

function resolveSpacing(widgetType: DigitWidgetType, hSpace?: number): number {
  if (widgetType === 'TEXT_IMG') return Number.isFinite(Number(hSpace)) ? Math.max(0, Math.floor(Number(hSpace))) : 1;
  return 0;
}

function fallbackValue(widgetType: DigitWidgetType): string {
  if (widgetType === 'IMG_DATE') return '31';
  if (widgetType === 'IMG_TIME') return '10';
  return '888';
}

function averageWidth(metrics: DigitBitmapMetrics[], fallback: number): number {
  if (metrics.length === 0) return fallback;
  const sum = metrics.reduce((acc, m) => acc + Math.max(1, m.advanceWidth ?? m.width), 0);
  return sum / metrics.length;
}

export function getDigitPreviewValue(element: WatchFaceElement): string {
  if (element.previewValue && element.previewValue.trim().length > 0) {
    return element.previewValue.trim();
  }
  if (element.type === 'IMG_DATE') return '31';
  if (element.type === 'IMG_TIME') {
    if (element.subtype === 'minutes' || element.subtype === 'seconds') return '58';
    return '10';
  }
  if (element.type === 'TEXT_IMG') {
    switch (element.dataType) {
      case 'STEP':
        return '88888';
      case 'BATTERY':
      case 'HEART':
      case 'SPO2':
      case 'STRESS':
      case 'HUMIDITY':
        return '100';
      case 'CAL':
        return '8888';
      case 'DISTANCE':
        return '99.9';
      case 'UVI':
        return '5';
      default:
        return '888';
    }
  }
  return '888';
}

export function computeDigitBitmapLayout(request: DigitLayoutRequest): DigitLayoutResult {
  const value = request.value && request.value.length > 0 ? request.value : fallbackValue(request.widgetType);
  const alignH = normalizeAlignH(request.alignH, defaultAlign(request.widgetType));
  const hSpace = resolveSpacing(request.widgetType, request.hSpace);
  const bounds = request.bounds;
  const chars = value.split('');

  const byChar = new Map<string, DigitBitmapMetrics>();
  for (const m of request.bitmaps ?? []) {
    byChar.set(m.char, m);
  }

  const fallbackW = Math.max(1, Math.floor(bounds.width / Math.max(1, chars.length)));
  const avgKnownW = averageWidth(request.bitmaps ?? [], fallbackW);

  const widths = chars.map((char) => {
    const metric = byChar.get(char);
    if (metric) return Math.max(1, Math.round((metric.width / Math.max(1, metric.height)) * bounds.height));
    if (/[-.:]/.test(char)) return Math.max(2, Math.round(avgKnownW * 0.45));
    return Math.max(1, fallbackW);
  });

  const advanceWidths = chars.map((char, index) => {
    const metric = byChar.get(char);
    if (metric) {
      const sourceAdvance = Math.max(1, metric.advanceWidth ?? metric.width);
      const sourceHeight = Math.max(1, metric.advanceHeight ?? metric.height);
      return Math.max(1, Math.round((sourceAdvance / sourceHeight) * bounds.height));
    }
    if (/[-.:]/.test(char)) return Math.max(2, Math.round(avgKnownW * 0.5));
    return widths[index];
  });

  const totalWidth = advanceWidths.reduce((acc, w) => acc + w, 0) + hSpace * Math.max(0, advanceWidths.length - 1);
  const startX = alignH === 'CENTER_H'
    ? Math.floor(bounds.x + (bounds.width - totalWidth) / 2)
    : alignH === 'RIGHT'
      ? Math.floor(bounds.x + bounds.width - totalWidth)
      : bounds.x;

  const glyphs: DigitGlyphBox[] = [];
  let cursor = startX;
  for (let i = 0; i < chars.length; i++) {
    const metric = byChar.get(chars[i]);
    const w = widths[i];
    const advanceWidth = advanceWidths[i];
    const offsetX = metric
      ? Math.max(0, Math.round(((metric.trimLeft ?? 0) / Math.max(1, metric.advanceHeight ?? metric.height)) * bounds.height))
      : 0;
    glyphs.push({
      char: chars[i],
      x: cursor,
      y: bounds.y,
      width: w,
      height: bounds.height,
      offsetX,
      advanceWidth,
    });
    cursor += advanceWidth + hSpace;
  }

  return {
    alignH,
    hSpace,
    startX,
    totalWidth,
    glyphs,
  };
}
