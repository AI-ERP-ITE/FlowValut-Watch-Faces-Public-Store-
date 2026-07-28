export type HorizontalDigitAlign = 'LEFT' | 'CENTER_H' | 'RIGHT';

export function normalizeHorizontalDigitAlign(
  value: string | undefined,
  fallback: HorizontalDigitAlign,
): HorizontalDigitAlign {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'LEFT' || normalized === 'CENTER_H' || normalized === 'RIGHT') {
    return normalized;
  }
  return fallback;
}

export function getDefaultDigitAlignment(
  _widgetType: 'IMG_DATE' | 'IMG_TIME' | 'IMG_WEEK' | 'TEXT_IMG',
): HorizontalDigitAlign {
  return 'CENTER_H';
}
