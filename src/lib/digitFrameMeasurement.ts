import type { WatchFaceElement } from '@/types';
import { getNumericFitPolicy } from './numericFitPolicy';

export interface DigitContentSize {
  width: number;
  height: number;
}

type TextWidthMeasurer = (text: string) => number;

const WEEK_LABELS = {
  full: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  short: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
  initial: ['Mo.', 'Tu.', 'We.', 'Th.', 'Fr.', 'Sa.', 'Su.'],
} as const;

const MONTH_LABELS = {
  full: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  short: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
  initial: ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May.', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'],
} as const;

function widestMeasured(labels: readonly string[], measureText: TextWidthMeasurer): number {
  return labels.reduce((widest, label) => Math.max(widest, measureText(label)), 0);
}

function widestDigit(measureText: TextWidthMeasurer): string {
  let selected = '0';
  let selectedWidth = -1;
  for (let digit = 0; digit <= 9; digit++) {
    const candidate = String(digit);
    const width = measureText(candidate);
    if (width > selectedWidth) {
      selected = candidate;
      selectedWidth = width;
    }
  }
  return selected;
}

export function measureDigitWidgetContent(
  element: WatchFaceElement,
  measureText: TextWidthMeasurer,
): DigitContentSize {
  const height = Math.max(1, element.fontSize ?? element.bounds.height);
  const gap = Math.max(0, Math.floor(Number(element.hSpace) || 0));

  if (element.type === 'IMG_WEEK') {
    const format = element.weekFormat ?? 'full';
    return { width: Math.ceil(widestMeasured(WEEK_LABELS[format], measureText)), height };
  }

  if (element.type === 'IMG_DATE' && element.subtype === 'month') {
    const rawFormat = (element as { monthFormat?: string }).monthFormat;
    const format = rawFormat === 'full' || rawFormat === 'initial' ? rawFormat : 'short';
    return { width: Math.ceil(widestMeasured(MONTH_LABELS[format], measureText)), height };
  }

  const widest = widestDigit(measureText);
  let sample = `${widest}${widest}`;
  if (element.type === 'TEXT_IMG') {
    const policy = getNumericFitPolicy(element.dataType);
    sample = policy.previewValue.replace(/\d/g, widest);
  }

  const glyphWidth = sample.split('').reduce((sum, char) => sum + measureText(char), 0);
  const spacingWidth = gap * Math.max(0, sample.length - 1);
  return { width: Math.ceil(glyphWidth + spacingWidth), height };
}

