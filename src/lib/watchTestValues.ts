import type { WatchFaceElement } from '@/types';
import { normalizeDataAlias } from './elementDataRules';

export const WATCH_TEST_NUMERIC_VALUES: Readonly<Record<string, string>> = Object.freeze({
  BATTERY: '78',
  STEP: '12000',
  CAL: '650',
  DISTANCE: '8.5',
  DIST: '8.5',
  STAND: '10',
  PAI_DAILY: '45',
  PAI_WEEKLY: '125',
  FAT_BURNING: '45',
  HEART: '70',
  STRESS: '32',
  SPO2: '98',
  HUMIDITY: '55',
  WIND: '3',
  UVI: '5',
  AQI: '42',
  ALTIMETER: '1013',
  VO2MAX: '48',
  TRAINING_LOAD: '125',
  BIO_CHARGE: '75',
  WEATHER_CURRENT: '24°',
  WEATHER_LOW: '18°',
  WEATHER_HIGH: '30°',
});

export function getWatchTestDisplayValue(element: WatchFaceElement): string | undefined {
  if (element.type === 'IMG_DATE' && element.subtype !== 'month') return '31';
  if (element.type === 'IMG_TIME') {
    if (element.subtype === 'minutes') return '49';
    if (element.subtype === 'seconds') return '15';
    return '16';
  }
  if (element.type !== 'TEXT_IMG') return undefined;
  const dataType = normalizeDataAlias(element.dataType);
  return dataType ? WATCH_TEST_NUMERIC_VALUES[dataType] : undefined;
}

export function applyWatchTestDisplayValues(elements: WatchFaceElement[]): WatchFaceElement[] {
  return elements.map((element) => {
    const testDisplayValue = getWatchTestDisplayValue(element);
    return testDisplayValue === undefined ? element : { ...element, testDisplayValue };
  });
}
