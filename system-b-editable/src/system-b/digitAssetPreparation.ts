import { getFontStyle } from '@/lib/fontLibrary';
import { generateOptimizedDigitBitmaps } from '@/lib/digitBitmapGeometry';
import { getTextImgPrefixForDataType } from '@/lib/elementDataRules';
import type { WatchFaceElement } from '@/types';
import type { EditableAssetSource } from './editableV2';

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function assignGeneratedDigitPaths(
  elements: WatchFaceElement[],
  namespace: string,
): WatchFaceElement[] {
  return elements.map((element) => {
    const next = structuredClone(element);
    const id = safeId(element.id);
    if (element.type === 'TEXT_IMG' && element.dataType) {
      const prefix = getTextImgPrefixForDataType(element.dataType);
      if (prefix) next.fontArray = Array.from({ length: 10 }, (_, index) => `${namespace}/${prefix}_${id}_${index}.png`);
    } else if (element.type === 'IMG_DATE' && element.subtype !== 'month') {
      next.fontArray = Array.from({ length: 10 }, (_, index) => `${namespace}/date_${id}_${index}.png`);
    } else if (element.type === 'IMG_TIME') {
      next.fontArray = Array.from({ length: 10 }, (_, index) => `${namespace}/time_${id}_${index}.png`);
    } else if (element.type === 'IMG_WEEK') {
      next.images = Array.from({ length: 7 }, (_, index) => `${namespace}/week_${id}_${index}.png`);
    } else if (element.type === 'IMG_DATE' && element.subtype === 'month') {
      next.images = Array.from({ length: 12 }, (_, index) => `${namespace}/month_${id}_${index}.png`);
    }
    return next;
  });
}

function normalizedColor(element: WatchFaceElement): string {
  const raw = element.color ?? '#FFFFFF';
  return raw.startsWith('0x') || raw.startsWith('0X')
    ? `#${raw.slice(2, 8)}`
    : raw.substring(0, 7);
}

function labelDataUrl(
  label: string,
  element: WatchFaceElement,
  fontFamily: string,
  fontWeight: string,
): string {
  const width = Math.max(20, Math.round(element.bounds.width || 40));
  const height = Math.max(12, Math.round(element.bounds.height || 20));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to render generated label asset.');
  context.clearRect(0, 0, width, height);
  context.fillStyle = normalizedColor(element);
  let fontSize = Math.max(6, Math.floor(height * 0.8));
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  while (fontSize > 6 && context.measureText(label).width > width * 0.95) {
    fontSize -= 1;
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  }
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, width / 2, height / 2);
  return canvas.toDataURL('image/png');
}

export function renderGeneratedDigitAssets(elements: WatchFaceElement[]): EditableAssetSource[] {
  const assets: EditableAssetSource[] = [];
  for (const element of elements) {
    const fontEntry = element.fontStyle ? getFontStyle(element.fontStyle) : undefined;
    const fontFamily = fontEntry?.fontFamily ?? element.font ?? 'Arial';
    const fontWeight = fontEntry?.fontWeight ?? 'bold';
    const height = Math.max(
      (element.fontSize && element.fontSize > 0 ? element.fontSize : element.bounds.height) || 25,
      12,
    );
    if (
      (element.type === 'TEXT_IMG' || element.type === 'IMG_DATE' || element.type === 'IMG_TIME')
      && element.fontArray?.length === 10
    ) {
      const family = generateOptimizedDigitBitmaps(
        fontFamily,
        fontWeight,
        Math.max(height, 8),
        normalizedColor(element),
        { tabular: element.type !== 'TEXT_IMG' },
      );
      for (let index = 0; index < 10; index += 1) {
        assets.push({ path: element.fontArray[index], dataUrl: family[index].dataUrl });
      }
    } else if (element.type === 'IMG_WEEK' && element.images?.length === 7) {
      const full = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const short = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      const initial = ['Mo.', 'Tu.', 'We.', 'Th.', 'Fr.', 'Sa.', 'Su.'];
      const labels = element.weekFormat === 'full' ? full : element.weekFormat === 'initial' ? initial : short;
      element.images.forEach((path, index) => {
        assets.push({ path, dataUrl: labelDataUrl(labels[index], element, fontFamily, fontWeight) });
      });
    } else if (element.type === 'IMG_DATE' && element.subtype === 'month' && element.images?.length === 12) {
      const labels = element.monthFormat === 'full'
        ? ['January','February','March','April','May','June','July','August','September','October','November','December']
        : ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
      element.images.forEach((path, index) => {
        assets.push({ path, dataUrl: labelDataUrl(labels[index], element, fontFamily, fontWeight) });
      });
    }
  }
  return assets;
}
