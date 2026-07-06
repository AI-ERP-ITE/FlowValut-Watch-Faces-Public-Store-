import type { WatchFaceElement } from '@/types';
import type { PairCorrectionTable } from './digitGlyphMetrics';

export type DigitWidgetType = 'IMG_DATE' | 'IMG_TIME' | 'TEXT_IMG';
export type HorizontalAlign = 'LEFT' | 'CENTER_H' | 'RIGHT';

export interface DigitBitmapMetrics {
  char: string;
  width: number;
  height: number;
  /** @deprecated Use glyphMetrics.inkWidth instead. */
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
  /** Spec 113: visible ink metrics. When present, these drive all layout calculations. */
  inkWidth?: number;
  inkHeight?: number;
  inkLeft?: number;
  opticalCenterX?: number;
  sourceHeight?: number;
  sourceWidth?: number;
}

export interface DigitLayoutRequest {
  widgetType: DigitWidgetType;
  bounds: { x: number; y: number; width: number; height: number };
  value: string;
  alignH?: string;
  hSpace?: number;
  bitmaps?: DigitBitmapMetrics[];
  /** Spec 113: pre-computed pair correction table. When present, used for 2-char digit pairs. */
  pairCorrectionTable?: PairCorrectionTable;
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

function averageInkWidth(metrics: DigitBitmapMetrics[], fallback: number): number {
  if (metrics.length === 0) return fallback;
  // Prefer visible ink width (Spec 113), fall back to advanceWidth, then bitmap width
  const sum = metrics.reduce((acc, m) => acc + Math.max(1, m.inkWidth ?? m.advanceWidth ?? m.width), 0);
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
  const avgKnownW = averageInkWidth(request.bitmaps ?? [], fallbackW);

  // ── Spec 113: 2-digit pair correction path ───────────────────────────────
  // Only applies to digit-only 2-char values with a precomputed table available.
  const table = request.pairCorrectionTable;
  const isPair = chars.length === 2 && /^\d{2}$/.test(value) && table && table.pairs.length > 0;

  if (isPair && table) {
    const entry = table.pairs.find((p) => p.pair === value);
    const g1 = byChar.get(chars[0]);
    const g2 = byChar.get(chars[1]);

    if (entry && g1 && g2) {
      const scale = bounds.height / Math.max(1, table.sourceHeight);

      // Visible ink widths scaled to target height
      const inkW1 = Math.max(1, Math.round((g1.inkWidth ?? g1.width) * scale));
      const inkW2 = Math.max(1, Math.round((g2.inkWidth ?? g2.width) * scale));
      const gap = Math.max(1, Math.round(1 * scale));
      const dx = Math.round(entry.dx * scale);

      // Visible pair total width
      const visiblePairWidth = inkW1 + gap + inkW2;

      // Center the visible pair within bounds
      const pairStartX = alignH === 'CENTER_H'
        ? Math.floor(bounds.x + (bounds.width - visiblePairWidth) / 2)
        : alignH === 'RIGHT'
          ? Math.floor(bounds.x + bounds.width - visiblePairWidth)
          : bounds.x;

      // g1: draw at pairStartX, but offset so ink left aligns
      const inkLeft1 = Math.round((g1.inkLeft ?? 0) * scale);
      const g1DrawX = pairStartX - inkLeft1;

      // g2: placed after g1 ink, plus dx correction
      const g2NaturalX = pairStartX + inkW1 + gap;
      const inkLeft2 = Math.round((g2.inkLeft ?? 0) * scale);
      const g2DrawX = g2NaturalX - inkLeft2 + dx;

      // Bitmap draw widths (trimmed sprite width scaled)
      const drawW1 = Math.max(1, Math.round(g1.width * scale));
      const drawW2 = Math.max(1, Math.round(g2.width * scale));

      return {
        alignH,
        hSpace,
        startX: pairStartX,
        totalWidth: visiblePairWidth,
        glyphs: [
          { char: chars[0], x: g1DrawX, y: bounds.y, width: drawW1, height: bounds.height, offsetX: 0, advanceWidth: inkW1 },
          { char: chars[1], x: g2DrawX, y: bounds.y, width: drawW2, height: bounds.height, offsetX: 0, advanceWidth: inkW2 },
        ],
      };
    }
  }

  // ── Spec 113: multi-digit or fallback path — visible-ink advance ─────────
  // Use inkWidth (visible only) for advance; fall back to advanceWidth then bitmap width.
  const inkWidths = chars.map((char) => {
    const metric = byChar.get(char);
    if (metric) {
      const srcInk = Math.max(1, metric.inkWidth ?? metric.advanceWidth ?? metric.width);
      const srcH = Math.max(1, metric.inkHeight ?? metric.sourceHeight ?? metric.advanceHeight ?? metric.height);
      return Math.max(1, Math.round((srcInk / srcH) * bounds.height));
    }
    if (/[-.:]/.test(char)) return Math.max(2, Math.round(avgKnownW * 0.45));
    return Math.max(1, fallbackW);
  });

  // Bitmap draw widths (trimmed PNG width scaled to target height)
  const bitmapWidths = chars.map((char) => {
    const metric = byChar.get(char);
    if (metric) return Math.max(1, Math.round((metric.width / Math.max(1, metric.height)) * bounds.height));
    if (/[-.:]/.test(char)) return Math.max(2, Math.round(avgKnownW * 0.45));
    return Math.max(1, fallbackW);
  });

  const totalWidth = inkWidths.reduce((acc, w) => acc + w, 0) + hSpace * Math.max(0, inkWidths.length - 1);
  const startX = alignH === 'CENTER_H'
    ? Math.floor(bounds.x + (bounds.width - totalWidth) / 2)
    : alignH === 'RIGHT'
      ? Math.floor(bounds.x + bounds.width - totalWidth)
      : bounds.x;

  const glyphs: DigitGlyphBox[] = [];
  let cursor = startX;
  for (let i = 0; i < chars.length; i++) {
    const metric = byChar.get(chars[i]);
    const inkW = inkWidths[i];
    const drawW = bitmapWidths[i];
    // offsetX: align trimmed sprite's left ink edge to the cursor
    const inkLeft = metric ? Math.max(0, Math.round(((metric.inkLeft ?? metric.trimLeft ?? 0) / Math.max(1, metric.inkHeight ?? metric.sourceHeight ?? metric.advanceHeight ?? metric.height)) * bounds.height)) : 0;
    glyphs.push({
      char: chars[i],
      x: cursor - inkLeft,
      y: bounds.y,
      width: drawW,
      height: bounds.height,
      offsetX: 0,
      advanceWidth: inkW,
    });
    cursor += inkW + hSpace;
  }

  return { alignH, hSpace, startX, totalWidth, glyphs };
}
