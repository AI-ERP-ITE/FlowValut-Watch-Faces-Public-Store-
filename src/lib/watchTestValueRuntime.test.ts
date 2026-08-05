import { describe, expect, it, vi } from 'vitest';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import { generateWatchFaceCode } from './jsCodeGenerator';
import { applyWatchTestDisplayValues } from './watchTestValues';

const digit = (
  id: string,
  type: WatchFaceElement['type'],
  dataType?: string,
  subtype?: string,
): WatchFaceElement => ({
  id,
  type,
  dataType,
  subtype,
  name: id,
  bounds: { x: 20, y: 30, width: 120, height: 40 },
  fontArray: Array.from({ length: 10 }, (_, index) => `${id}_${index}.png`),
  timeDigitCellWidth: type === 'IMG_TIME' ? 20 : undefined,
  degreeImage: type === 'TEXT_IMG' && dataType?.startsWith('WEATHER_') ? `${id}_degree.png` : undefined,
  decimalImage: dataType === 'DISTANCE' ? `${id}_decimal.png` : undefined,
  colonImage: type === 'TIME_READING' ? `${id}_colon.png` : undefined,
  timeReadingDigitWidth: type === 'TIME_READING' ? 20 : undefined,
  timeReadingColonWidth: type === 'TIME_READING' ? 8 : undefined,
  visible: true,
  zIndex: 1,
});

function config(elements: WatchFaceElement[]): WatchFaceConfig {
  return {
    name: 'watch-test-values',
    resolution: { width: 480, height: 480 },
    background: { src: 'background.png', format: 'TGA-32' },
    elements,
    watchModel: 'Amazfit Balance 2',
  };
}

describe('watch-test static runtime generation', () => {
  it('emits static date, time, and numeric values while leaving Time Reading live', () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const source = [
      digit('hour', 'IMG_TIME', undefined, 'hours'),
      digit('minute', 'IMG_TIME', undefined, 'minutes'),
      digit('second', 'IMG_TIME', undefined, 'seconds'),
      digit('date', 'IMG_DATE'),
      digit('steps', 'TEXT_IMG', 'STEP'),
      digit('humidity', 'TEXT_IMG', 'HUMIDITY'),
      digit('temperature', 'TEXT_IMG', 'WEATHER_CURRENT'),
      digit('sunrise', 'TIME_READING', 'SUN_RISE'),
    ];
    const code = generateWatchFaceCode(config(applyWatchTestDisplayValues(source))).watchfaceIndexJs;

    for (const value of ['16', '49', '15', '31', '12000', '55', '24u']) {
      expect(code).toContain(`text: '${value}'`);
    }
    expect(code).not.toContain('hmUI.widget.IMG_TIME');
    expect(code).not.toContain('hmUI.widget.IMG_DATE');
    expect(code).not.toContain('hmUI.data_type.STEP');
    expect(code).not.toContain('hmUI.data_type.HUMIDITY');
    expect(code).toContain("unit_en: 'temperature_degree.png'");
    expect(code).toContain('day.sunrise');
    expect(code).toContain('setProperty(hmUI.prop.TEXT, hourText)');
  });

  it('retains live bindings when the export-only marker is absent', () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const code = generateWatchFaceCode(config([digit('steps', 'TEXT_IMG', 'STEP')])).watchfaceIndexJs;
    expect(code).toContain('type: hmUI.data_type.STEP');
    expect(code).not.toContain('static watch-test value');
  });
});
