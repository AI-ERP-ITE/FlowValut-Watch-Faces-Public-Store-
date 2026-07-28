import type { WatchFaceElement } from '@/types';

export const DEFAULT_GAUGE_POINTER_FILENAME = 'gauge_pointer.png';
export const DEFAULT_GAUGE_PIVOT_X = 0.5;
export const DEFAULT_GAUGE_PIVOT_Y = 0.9;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeGaugePivot(
  element: Pick<WatchFaceElement, 'pivotX' | 'pivotY' | 'hourPos' | 'bounds'>,
): { pivotX: number; pivotY: number } {
  const width = Math.max(1, element.bounds?.width ?? 1);
  const height = Math.max(1, element.bounds?.height ?? 1);

  const fallbackX = element.hourPos?.x !== undefined ? element.hourPos.x / width : DEFAULT_GAUGE_PIVOT_X;
  const fallbackY = element.hourPos?.y !== undefined ? element.hourPos.y / height : DEFAULT_GAUGE_PIVOT_Y;

  return {
    pivotX: clamp(element.pivotX ?? fallbackX, 0, 1),
    pivotY: clamp(element.pivotY ?? fallbackY, 0, 1),
  };
}

export function gaugePointerAssetName(element: Pick<WatchFaceElement, 'src' | 'assetFilename'>): string {
  if (element.assetFilename) return element.assetFilename;
  if (element.src && !element.src.startsWith('data:')) return element.src;
  return DEFAULT_GAUGE_POINTER_FILENAME;
}

export function createDefaultGaugePointerDataUrl(width = 40, height = 120): string {
  const w = Math.max(8, Math.floor(width));
  const h = Math.max(24, Math.floor(height));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const stemTop = Math.max(3, h * 0.08);
  const baseY = h * 0.9;
  const stemWidth = Math.max(2, w * 0.16);

  ctx.fillStyle = '#f4f4f4';
  ctx.beginPath();
  ctx.moveTo(cx, stemTop);
  ctx.lineTo(cx - stemWidth, baseY);
  ctx.lineTo(cx + stemWidth, baseY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#f87171';
  ctx.beginPath();
  ctx.arc(cx, baseY, Math.max(3, w * 0.18), 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL('image/png');
}
