import { describe, expect, it } from 'vitest';
import { generateWatchFaceCode } from './jsCodeGenerator';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';

function generate(dataType: 'SUN_RISE' | 'SUN_SET') {
  const element: WatchFaceElement = {
    id: `reading-${dataType}`,
    type: 'TIME_READING',
    name: dataType === 'SUN_RISE' ? 'Sunrise' : 'Sunset',
    bounds: { x: 10, y: 20, width: 180, height: 48 },
    dataType,
    timeReadingDisplay: 'DIGITAL',
    fontArray: Array.from({ length: 10 }, (_, index) => `digit_${index}.png`),
    colonImage: 'colon.png',
    timeReadingDigitWidth: 20,
    timeReadingColonWidth: 8,
    layoutStartX: 52,
    visible: true,
    zIndex: 1,
  };
  const config: WatchFaceConfig = {
    name: 'time-reading-test',
    resolution: { width: 480, height: 480 },
    background: { src: 'background.png', format: 'TGA-32' },
    elements: [element],
    watchModel: 'balance-2',
  };
  return generateWatchFaceCode(config).watchfaceIndexJs;
}

describe('TIME_READING runtime export', () => {
  it.each(['SUN_RISE', 'SUN_SET'] as const)('exports %s as split, zero-padded HH:MM', (dataType) => {
    const code = generate(dataType);
    expect(code).toContain('hmUI.widget.TEXT_IMG');
    expect(code).toContain('hmUI.widget.IMG');
    expect(code).toContain("text: '00'");
    expect(code).toContain("src: 'colon.png'");
    expect(code).toContain(`day.${dataType === 'SUN_RISE' ? 'sunrise' : 'sunset'}`);
    expect(code).toContain("('0' + Math.max(0, Math.min(23, Math.floor(hour)))).slice(-2)");
    expect(code).toContain("('0' + Math.max(0, Math.min(59, Math.floor(minute)))).slice(-2)");
    expect(code).toContain('setProperty(hmUI.prop.TEXT, hourText)');
    expect(code).toContain('setProperty(hmUI.prop.TEXT, minuteText)');
    expect(code).not.toContain(`hmUI.data_type.${dataType}`);
    expect(code).not.toContain('dont_path:');
    expect(code).toContain("'digit_0.png'");
    expect(code).toContain("'digit_9.png'");
    expect(code).not.toContain('hmUI.widget.IMG_TIME');
    expect(code).not.toContain('hmUI.widget.TIME_POINTER');
    expect(() => new Function(code)).not.toThrow();
  });
});
