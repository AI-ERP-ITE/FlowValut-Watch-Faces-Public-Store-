import type { WatchFaceElement } from '@/types';

export const TEMPERATURE_NEGATIVE_FALLBACK = 'temp_negative.png';
export const TEMPERATURE_DEGREE_FALLBACK = 'temp_degree.png';

const TEMPERATURE_DATA_TYPES = new Set(['WEATHER_CURRENT', 'WEATHER_LOW', 'WEATHER_HIGH']);

export function isTemperatureDataType(dataType: string | undefined): boolean {
  return TEMPERATURE_DATA_TYPES.has(String(dataType ?? '').trim().toUpperCase());
}

export function temperatureDigitFilenames(): string[] {
  return Array.from({ length: 10 }, (_, index) => `temp_digit_${index}.png`);
}

export function getTemperatureAssetReferences(element: WatchFaceElement): string[] {
  if (element.type !== 'TEXT_IMG' || !isTemperatureDataType(element.dataType)) return [];
  return [
    ...(element.fontArray?.length === 10 ? element.fontArray : temperatureDigitFilenames()),
    element.negativeImage ?? TEMPERATURE_NEGATIVE_FALLBACK,
    element.degreeImage ?? TEMPERATURE_DEGREE_FALLBACK,
  ];
}

export function getMissingTemperatureAssets(
  element: WatchFaceElement,
  packagedAssetNames: ReadonlySet<string>,
): string[] {
  return getTemperatureAssetReferences(element).filter((name) => !packagedAssetNames.has(name));
}
