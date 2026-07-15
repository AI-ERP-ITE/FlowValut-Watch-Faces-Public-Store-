import { describe, expect, test } from 'vitest';
import {
  completeDayAssetNames,
  getCenteredNumericDayStartX,
  normalizeDayImageMode,
} from '../dateImageMode';

describe('IMG_DATE day image mode helpers', () => {
  test('defaults missing and invalid persisted values to compact digits', () => {
    expect(normalizeDayImageMode(undefined)).toBe('digits');
    expect(normalizeDayImageMode('legacy')).toBe('digits');
    expect(normalizeDayImageMode('complete')).toBe('complete');
  });

  test('centers the supplied FVWF numeric day pair inside its 62px frame', () => {
    expect(getCenteredNumericDayStartX(
      { x: 201.83076923076922, width: 62 },
      25,
      0,
    )).toBe(208);
  });

  test('creates 31 isolated per-element and per-scope complete-day names', () => {
    const mainA = completeDayAssetNames('main', 'day/a');
    const mainB = completeDayAssetNames('main', 'day-b');
    const aodA = completeDayAssetNames('aod', 'day/a');

    expect(mainA).toHaveLength(31);
    expect(new Set(mainA).size).toBe(31);
    expect(mainA[0]).toBe('date_day_main_day_a_01.png');
    expect(mainA[30]).toBe('date_day_main_day_a_31.png');
    expect(new Set([...mainA, ...mainB, ...aodA]).size).toBe(93);
  });
});
