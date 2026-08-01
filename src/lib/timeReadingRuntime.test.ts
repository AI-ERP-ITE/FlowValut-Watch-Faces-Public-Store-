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
  it.each(['SUN_RISE', 'SUN_SET'] as const)('exports %s as isolated HH:MM TEXT_IMG', (dataType) => {
    const code = generate(dataType);
    expect(code).toContain('hmUI.widget.TEXT_IMG');
    expect(code).toContain(`hmUI.data_type.${dataType}`);
    expect(code).toContain("dont_path: 'colon.png'");
    expect(code).toContain("'digit_0.png'");
    expect(code).toContain("'digit_9.png'");
    expect(code).not.toContain('hmUI.widget.IMG_TIME');
    expect(code).not.toContain('hmUI.widget.TIME_POINTER');
  });
});
