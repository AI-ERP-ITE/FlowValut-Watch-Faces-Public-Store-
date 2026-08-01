import { describe, expect, it } from 'vitest';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import { normalizeBoundedDataValue, resolveBoundedGaugeAngle } from './boundedGaugeRange';
import { DATA_REPRESENTATION_DESCRIPTORS } from './dataRepresentationAuthority';
import { getAllowedDataTypesForElement } from './elementDataRules';
import { generateWatchFaceCode } from './jsCodeGenerator';

describe('Spec 131 T013 descriptor-driven Gauge eligibility', () => {
  it('allows proven Wind Level and approved fixed-range BioCharge Gauge', () => {
    const allowed = getAllowedDataTypesForElement('GAUGE_POINTER');
    expect(allowed).toContain('WIND');
    expect(allowed).toContain('BIO_CHARGE');
    expect(DATA_REPRESENTATION_DESCRIPTORS.WIND).toMatchObject({
      valueRange: { min: 0, max: 12 }, zeppDataType: 'WIND', evidenceStatus: 'official',
    });
    expect(DATA_REPRESENTATION_DESCRIPTORS.BIO_CHARGE).toMatchObject({
      zeppDataType: 'BIO_CHARGE', sourceAdapter: 'data-type',
      representations: ['NUMERIC_VALUE', 'ARC_PROGRESS', 'GAUGE_POINTER', 'IMAGE_SWITCHER'],
    });
  });

  it('maps Wind 0, 6, and 12 exactly to pointer endpoints and midpoint', () => {
    expect(normalizeBoundedDataValue('WIND', 0)).toBe(0);
    expect(normalizeBoundedDataValue('WIND', 6)).toBe(0.5);
    expect(normalizeBoundedDataValue('WIND', 12)).toBe(1);
    expect(resolveBoundedGaugeAngle('WIND', 0, -120, 120)).toBe(-120);
    expect(resolveBoundedGaugeAngle('WIND', 6, -120, 120)).toBe(0);
    expect(resolveBoundedGaugeAngle('WIND', 12, -120, 120)).toBe(120);
    expect(resolveBoundedGaugeAngle('WIND', 99, -120, 120)).toBe(120);
  });

  it('generates a direct Zepp WIND IMG_POINTER binding with unchanged endpoints', () => {
    const element: WatchFaceElement = {
      id: 'wind-gauge', type: 'GAUGE_POINTER', dataType: 'WIND', name: 'Wind Level Gauge',
      bounds: { x: 100, y: 80, width: 40, height: 120 }, visible: true, zIndex: 1,
      startAngle: -120, endAngle: 120, src: 'wind_pointer.png',
    };
    const config = {
      name: 'wind gauge', watchModel: 'Amazfit Balance 2',
      resolution: { width: 480, height: 480 }, elements: [element],
    } as unknown as WatchFaceConfig;
    const code = generateWatchFaceCode(config).watchfaceIndexJs;
    expect(code).toContain('hmUI.widget.IMG_POINTER');
    expect(code).toContain('type: hmUI.data_type.WIND');
    expect(code).toContain('start_angle: -120');
    expect(code).toContain('end_angle: 120');
  });
});
