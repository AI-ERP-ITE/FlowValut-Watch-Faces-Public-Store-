import { describe, expect, it } from 'vitest';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import { measureDigitWidgetContent } from './digitFrameMeasurement';
import { generateWatchFaceCode } from './jsCodeGenerator';
import { getNumericFitPolicy } from './numericFitPolicy';
import {
  getMissingTemperatureAssets,
  getTemperatureAssetReferences,
  temperatureDigitFilenames,
} from './temperatureNumericContract';

function temperature(
  extra: Partial<WatchFaceElement> = {},
  dataType = 'WEATHER_CURRENT',
): WatchFaceElement {
  return {
    id: 'temp',
    type: 'TEXT_IMG',
    dataType,
    name: 'Current Temperature',
    bounds: { x: 10, y: 20, width: 180, height: 40 },
    visible: true,
    zIndex: 1,
    ...extra,
  };
}

describe('Spec 131 T008 temperature numeric contract', () => {
  it('uses ten digits, one negative sign, and one shared degree sign', () => {
    const element = temperature();
    expect(temperatureDigitFilenames()).toEqual(
      Array.from({ length: 10 }, (_, index) => `temp_digit_${index}.png`),
    );
    expect(getTemperatureAssetReferences(element)).toEqual([
      ...temperatureDigitFilenames(),
      'temp_negative.png',
      'temp_degree.png',
    ]);
  });

  it('emits the shared degree image for Celsius and Fahrenheit locales', () => {
    const element = temperature({
      fontArray: temperatureDigitFilenames(),
      negativeImage: 'scoped_negative.png',
      degreeImage: 'scoped_degree.png',
    });
    const config = {
      name: 'temperature',
      watchModel: 'Amazfit Balance 2',
      resolution: { width: 480, height: 480 },
      elements: [element],
    } as unknown as WatchFaceConfig;
    const code = generateWatchFaceCode(config).watchfaceIndexJs;

    expect(code).toContain("negative_image: 'scoped_negative.png'");
    // Main plus the generator's current AOD fallback, six locale fields each.
    expect(code.match(/(?:unit|imperial_unit)_(?:sc|en|tc): 'scoped_degree.png'/g)).toHaveLength(12);
    expect(code).not.toMatch(/temp_(?:c|f)\.png/i);
  });

  it('fits negative Celsius and three-digit Fahrenheit inside the five-glyph envelope', () => {
    const policy = getNumericFitPolicy('WEATHER_CURRENT');
    expect(policy).toMatchObject({
      maxValue: '-999°',
      previewValue: '-888°',
      maxDigitCount: 3,
      maxRenderedGlyphCount: 5,
    });
    const widths: Record<string, number> = { '-': 4, '°': 5, '8': 9 };
    const measure = (text: string) => widths[text] ?? 8;
    const envelope = measureDigitWidgetContent(temperature({ hSpace: 1 }), measure).width;
    const widthOf = (value: string) => value.split('').reduce((sum, char) => sum + measure(char), 0) + value.length - 1;

    expect(widthOf('-20°')).toBeLessThanOrEqual(envelope);
    expect(widthOf('104°')).toBeLessThanOrEqual(envelope);
    expect(widthOf('-128°')).toBeLessThanOrEqual(envelope);
  });

  it('rejects a package missing any referenced temperature bitmap', () => {
    const element = temperature({
      fontArray: temperatureDigitFilenames(),
      negativeImage: 'scoped_negative.png',
      degreeImage: 'scoped_degree.png',
    });
    const packaged = new Set(getTemperatureAssetReferences(element));
    packaged.delete('scoped_degree.png');
    expect(getMissingTemperatureAssets(element, packaged)).toEqual(['scoped_degree.png']);
  });

  it.each([
    ['WEATHER_LOW', 'Low Temperature'],
    ['WEATHER_HIGH', 'High Temperature'],
  ])('reuses the complete temperature pipeline for %s', (dataType, name) => {
    const element = temperature({
      name,
      fontArray: temperatureDigitFilenames(),
      negativeImage: `${dataType.toLowerCase()}_negative.png`,
      degreeImage: `${dataType.toLowerCase()}_degree.png`,
    }, dataType);
    const policy = getNumericFitPolicy(dataType);
    expect(policy).toMatchObject({ previewValue: '-888°', maxRenderedGlyphCount: 5 });
    expect(getTemperatureAssetReferences(element)).toHaveLength(12);

    const config = {
      name,
      watchModel: 'Amazfit Balance 2',
      resolution: { width: 480, height: 480 },
      elements: [element],
    } as unknown as WatchFaceConfig;
    const code = generateWatchFaceCode(config).watchfaceIndexJs;
    expect(code).toContain(`type: hmUI.data_type.${dataType}`);
    expect(code).toContain(`negative_image: '${dataType.toLowerCase()}_negative.png'`);
    expect(code).toContain(`unit_en: '${dataType.toLowerCase()}_degree.png'`);
    expect(code).toContain(`imperial_unit_en: '${dataType.toLowerCase()}_degree.png'`);
  });
});
