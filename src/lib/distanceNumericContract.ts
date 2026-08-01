import type { WatchFaceElement } from '@/types';

export const DISTANCE_DECIMAL_FALLBACK = 'dist_decimal.png';

export function getDistanceAssetReferences(element: WatchFaceElement): string[] {
  if (element.type !== 'TEXT_IMG' || element.dataType !== 'DISTANCE') return [];
  return [
    ...(element.fontArray || []).slice(0, 10),
    element.decimalImage ?? DISTANCE_DECIMAL_FALLBACK,
  ];
}

export function getMissingDistanceAssets(
  element: WatchFaceElement,
  availableAssets: ReadonlySet<string>,
): string[] {
  if (element.type !== 'TEXT_IMG' || element.dataType !== 'DISTANCE') return [];
  const missing: string[] = [];
  if ((element.fontArray?.length || 0) < 10) missing.push('DISTANCE requires ten digit assets');
  if (!element.decimalImage) missing.push('DISTANCE requires one decimal-point asset');
  for (const asset of getDistanceAssetReferences(element)) {
    if (!availableAssets.has(asset)) missing.push(asset);
  }
  return missing;
}
