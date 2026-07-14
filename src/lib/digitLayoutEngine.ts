import type { WatchFaceElement } from '@/types';
import { getNumericPreviewValue } from './numericFitPolicy';
// Note: PairCorrectionTable import removed by Spec 114 — pair correction path deleted.

export type DigitWidgetType = 'IMG_DATE' | 'IMG_TIME' | 'TEXT_IMG';
export type HorizontalAlign = 'LEFT' | 'CENTER_H' | 'RIGHT';

export interface DigitBitmapMetrics {
  char: string;
  width: number;
  height: number;
  /** @deprecated by Spec 114. Bitmap width now equals ink width. */
  advanceWidth?: number;
  /** @deprecated */
  advanceHeight?: number;
  /** @deprecated */
  trimLeft?: number;
  /** @deprecated */
  trimRight?: number;
  /** @deprecated */
  trimTop?: number;
  /** @deprecated */
  trimBottom?: number;
  /** @deprecated by Spec 114. Use bitmap width directly. */
  inkWidth?: number;
  /** @deprecated */
  inkHeight?: number;
  /** @deprecated */
  inkLeft?: number;
  /** @deprecated */
  opticalCenterX?: number;
  /** @deprecated */
  sourceHeight?: number;
  /** @deprecated */
  sourceWidth?: number;
}

export interface DigitLayoutRequest {
  widgetType: DigitWidgetType;
  bounds: { x: number; y: number; width: number; height: number };
  value: string;
  alignH?: string;
  hSpace?: number;
  bitmaps?: DigitBitmapMetrics[];
  /** @deprecated by Spec 114. Pair correction removed — geometry engine handles spacing. */
  pairCorrectionTable?: unknown;
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

// averageInkWidth removed by Spec 114 — layout now uses bitmap width directly

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
    return getNumericPreviewValue(element.dataType);
  }
  return '888';
}

export function computeDigitBitmapLayout(request: DigitLayoutRequest): DigitLayoutResult {
  /**
   * Spec 114 — Simplified layout: advance by bitmap width.
   * Since the geometry engine produces canvas ≈ ink, bitmap width ≈ ink width.
   * No pair correction. No centroid analysis. No alpha scanning. No runtime image processing.
   */
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

  // Spec 114: advance = bitmap.naturalWidth (scaled to bounds.height), which ≈ inkWidth.
  const bitmapWidths = chars.map((char) => {
    const metric = byChar.get(char);
    if (metric) return Math.max(1, Math.round((metric.width / Math.max(1, metric.height)) * bounds.height));
    if (/[-.:]/.test(char)) return Math.max(2, Math.round(fallbackW * 0.45));
    return Math.max(1, fallbackW);
  });

  const totalWidth = bitmapWidths.reduce((acc, w) => acc + w, 0) + hSpace * Math.max(0, bitmapWidths.length - 1);
  const startX = alignH === 'CENTER_H'
    ? Math.floor(bounds.x + (bounds.width - totalWidth) / 2)
    : alignH === 'RIGHT'
      ? Math.floor(bounds.x + bounds.width - totalWidth)
      : bounds.x;

  const glyphs: DigitGlyphBox[] = [];
  let cursor = startX;
  for (let i = 0; i < chars.length; i++) {
    const w = bitmapWidths[i];
    glyphs.push({
      char: chars[i],
      x: cursor,
      y: bounds.y,
      width: w,
      height: bounds.height,
      offsetX: 0,
      advanceWidth: w,
    });
    cursor += w + hSpace;
  }

  return { alignH, hSpace, startX, totalWidth, glyphs };
}
