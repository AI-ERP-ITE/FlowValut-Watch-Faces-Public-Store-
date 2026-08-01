import { describe, expect, it } from 'vitest';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import { normalizeBoundedDataValue, resolveBoundedGaugeAngle } from './boundedGaugeRange';
import { getAllowedDataTypesForElement } from './elementDataRules';
import { generateWatchFaceCode } from './jsCodeGenerator';

function element(type: 'ARC_PROGRESS' | 'GAUGE_POINTER'): WatchFaceElement {
  return {
    id: `bio-${type}`, type, dataType: 'BIO_CHARGE', name: `HybridCharge ${type}`,
    bounds: { x: 100, y: 80, width: 200, height: 200 }, visible: true, zIndex: 1,
    startAngle: -120, endAngle: 120,
    ...(type === 'GAUGE_POINTER' ? { src: 'bio_charge_pointer.png' } : { radius: 90, lineWidth: 10 }),
    compatibilityWarning: 'HybridCharge / BioCharge requires a compatible watch and firmware (reported Zepp OS API level 4.2+).',
  };
}

function generate(widget: WatchFaceElement): string {
  const config: WatchFaceConfig = {
    name: 'BioCharge bounded visuals', watchModel: 'Amazfit Balance 2',
    resolution: { width: 480, height: 480 },
    background: { src: 'background.png', format: 'TGA-32' }, elements: [widget],
  };
  return generateWatchFaceCode(config).watchfaceIndexJs;
}

describe('T021 BioCharge Arc and Gauge contract', () => {
  it('preserves approved Arc and Gauge eligibility', () => {
    expect(getAllowedDataTypesForElement('ARC_PROGRESS')).toContain('BIO_CHARGE');
    expect(getAllowedDataTypesForElement('GAUGE_POINTER')).toContain('BIO_CHARGE');
  });

  it('normalizes 0/50/100 exactly and clamps outside values', () => {
    expect(normalizeBoundedDataValue('BIO_CHARGE', 0)).toBe(0);
    expect(normalizeBoundedDataValue('BIO_CHARGE', 50)).toBe(0.5);
    expect(normalizeBoundedDataValue('BIO_CHARGE', 100)).toBe(1);
    expect(normalizeBoundedDataValue('BIO_CHARGE', -1)).toBe(0);
    expect(normalizeBoundedDataValue('BIO_CHARGE', 101)).toBe(1);
  });

  it('maps 0/50/100 to exact Gauge endpoints and midpoint', () => {
    expect(resolveBoundedGaugeAngle('BIO_CHARGE', 0, -120, 120)).toBe(-120);
    expect(resolveBoundedGaugeAngle('BIO_CHARGE', 50, -120, 120)).toBe(0);
    expect(resolveBoundedGaugeAngle('BIO_CHARGE', 100, -120, 120)).toBe(120);
  });

  it('emits direct BIO_CHARGE bindings for Arc and Gauge', () => {
    const arc = generate(element('ARC_PROGRESS'));
    const gauge = generate(element('GAUGE_POINTER'));
    expect(arc).toContain('hmUI.widget.ARC_PROGRESS');
    expect(arc).toContain('type: hmUI.data_type.BIO_CHARGE');
    expect(gauge).toContain('hmUI.widget.IMG_POINTER');
    expect(gauge).toContain('type: hmUI.data_type.BIO_CHARGE');
    expect(gauge).toContain('start_angle: -120');
    expect(gauge).toContain('end_angle: 120');
  });
});
