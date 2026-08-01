import { describe, expect, it } from 'vitest';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import { DATA_REPRESENTATION_DESCRIPTORS } from './dataRepresentationAuthority';
import { DATA_TYPE_LABELS, getAllowedDataTypesForElement } from './elementDataRules';
import { generateWatchFaceCode } from './jsCodeGenerator';
import { getNumericFitPolicy } from './numericFitPolicy';

function element(type: WatchFaceElement['type']): WatchFaceElement {
  return {
    id: `wind-${type}`,
    type,
    dataType: 'WIND',
    name: 'Wind Level',
    bounds: { x: 10, y: 20, width: 120, height: 40 },
    visible: true,
    zIndex: 1,
  };
}

function generatedFor(type: WatchFaceElement['type']): string {
  const config = {
    name: 'wind', watchModel: 'Amazfit Balance 2',
    resolution: { width: 480, height: 480 }, elements: [element(type)],
  } as unknown as WatchFaceConfig;
  return generateWatchFaceCode(config).watchfaceIndexJs;
}

describe('Spec 131 T011 Wind Level contract', () => {
  it('uses the official 0–12 domain and two-digit fit', () => {
    expect(DATA_REPRESENTATION_DESCRIPTORS.WIND.valueRange).toEqual({ min: 0, max: 12 });
    expect(getNumericFitPolicy('WIND')).toEqual({
      maxValue: '12', previewValue: '12', maxDigitCount: 2,
    });
    expect(DATA_TYPE_LABELS.WIND).toBe('Wind Level');
  });

  it('keeps Wind Level available as a numeric value without speed semantics', () => {
    expect(getAllowedDataTypesForElement('TEXT_IMG')).toContain('WIND');
    expect(generatedFor('TEXT_IMG')).toContain('type: hmUI.data_type.WIND');
  });

  it('preserves the existing legacy Arc runtime binding', () => {
    expect(getAllowedDataTypesForElement('ARC_PROGRESS')).toContain('WIND');
    const code = generatedFor('ARC_PROGRESS');
    expect(code).toContain('hmUI.widget.ARC_PROGRESS');
    expect(code).toContain('type: hmUI.data_type.WIND');
  });
});
