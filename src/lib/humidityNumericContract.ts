import type { WatchFaceElement } from '@/types';

export const HUMIDITY_PERCENT_FALLBACK = 'humidity_percent.png';

export function getHumidityAssetReferences(element: WatchFaceElement): string[] {
  if (element.type !== 'TEXT_IMG' || element.dataType !== 'HUMIDITY') return [];
  return [
    ...(element.fontArray?.length === 10
      ? element.fontArray
      : Array.from({ length: 10 }, (_, index) => `humid_digit_${index}.png`)),
    element.percentImage ?? HUMIDITY_PERCENT_FALLBACK,
  ];
}

export function getMissingHumidityAssets(
  element: WatchFaceElement,
  packagedAssetNames: ReadonlySet<string>,
): string[] {
  return getHumidityAssetReferences(element).filter((name) => !packagedAssetNames.has(name));
}

