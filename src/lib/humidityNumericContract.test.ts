import { describe, expect, it } from 'vitest';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import { measureDigitWidgetContent } from './digitFrameMeasurement';
import { generateWatchFaceCode } from './jsCodeGenerator';
import { getNumericFitPolicy } from './numericFitPolicy';
import { getHumidityAssetReferences, getMissingHumidityAssets } from './humidityNumericContract';

function humidity(extra: Partial<WatchFaceElement> = {}): WatchFaceElement {
  return {
    id: 'humidity',
    type: 'TEXT_IMG',
    dataType: 'HUMIDITY',
    name: 'Humidity',
    bounds: { x: 10, y: 20, width: 150, height: 40 },
    visible: true,
    zIndex: 1,
    ...extra,
  };
}

describe('Spec 131 T010 humidity numeric contract', () => {
  it('fits the official 100% four-glyph display', () => {
    expect(getNumericFitPolicy('HUMIDITY')).toMatchObject({
      maxValue: '100%', previewValue: '100%', maxDigitCount: 3, maxRenderedGlyphCount: 4,
    });
    const measure = (char: string) => char === '%' ? 7 : char === '8' ? 9 : 8;
    const fitted = measureDigitWidgetContent(humidity({ hSpace: 1 }), measure).width;
    const actual = '100%'.split('').reduce((sum, char) => sum + measure(char), 0) + 3;
    expect(actual).toBeLessThanOrEqual(fitted);
  });

  it('emits one shared percent unit for every locale contract', () => {
    const element = humidity({
      fontArray: Array.from({ length: 10 }, (_, index) => `humid_${index}.png`),
      percentImage: 'humidity_percent_scoped.png',
    });
    const config = {
      name: 'humidity', watchModel: 'Amazfit Balance 2',
      resolution: { width: 480, height: 480 }, elements: [element],
    } as unknown as WatchFaceConfig;
    const code = generateWatchFaceCode(config).watchfaceIndexJs;
    expect(code).toContain('type: hmUI.data_type.HUMIDITY');
    expect(code.match(/(?:unit|imperial_unit)_(?:sc|en|tc): 'humidity_percent_scoped.png'/g)).toHaveLength(12);
  });

  it('rejects a package missing the referenced percent bitmap', () => {
    const element = humidity({
      fontArray: Array.from({ length: 10 }, (_, index) => `humid_${index}.png`),
      percentImage: 'humidity_percent_scoped.png',
    });
    const packaged = new Set(getHumidityAssetReferences(element));
    packaged.delete('humidity_percent_scoped.png');
    expect(getMissingHumidityAssets(element, packaged)).toEqual(['humidity_percent_scoped.png']);
  });
});
