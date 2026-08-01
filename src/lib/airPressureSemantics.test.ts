import { describe, expect, it } from 'vitest';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import { DATA_REPRESENTATION_DESCRIPTORS } from './dataRepresentationAuthority';
import {
  DATA_TYPE_LABELS,
  getAllowedDataTypesForElement,
  getDataTypeLabel,
  getTextImgPrefixForDataType,
} from './elementDataRules';
import { getNumericFitPolicy } from './numericFitPolicy';
import { getMaxDigitMock } from '@/components/InteractiveCanvas';
import { generateWatchFaceCode } from './jsCodeGenerator';
import { parseProjectFileArtifact } from './projectFileArtifact';

const pressure: WatchFaceElement = {
  id: 'pressure', name: 'Saved pressure', type: 'TEXT_IMG', dataType: 'ALTIMETER',
  bounds: { x: 20, y: 30, width: 120, height: 40 }, visible: true, zIndex: 1,
  fontArray: Array.from({ length: 10 }, (_, i) => `custom_pressure_${i}.png`),
};

function fixture(): WatchFaceConfig {
  return {
    name: 'air pressure fixture', watchModel: 'Amazfit Balance 2',
    resolution: { width: 480, height: 480 }, elements: [pressure],
    background: { type: 'color', value: '#000000' },
  };
}

describe('T025B Air Pressure semantics', () => {
  it('defines ALTIMETER as official Air Pressure 1-1200 without exposing ALTITUDE', () => {
    expect(DATA_TYPE_LABELS.ALTIMETER).toBe('Air Pressure');
    expect(getDataTypeLabel('ALTIMETER')).toBe('Air Pressure');
    expect(DATA_REPRESENTATION_DESCRIPTORS.ALTIMETER).toMatchObject({
      label: 'Air Pressure', valueRange: { min: 1, max: 1200 },
      zeppDataType: 'ALTIMETER', evidenceStatus: 'official',
      representations: ['NUMERIC_VALUE', 'ARC_PROGRESS', 'GAUGE_POINTER'],
    });
    expect(DATA_REPRESENTATION_DESCRIPTORS.ALTITUDE).toBeUndefined();
    expect(getAllowedDataTypesForElement('TEXT_IMG')).toContain('ALTIMETER');
    expect(getAllowedDataTypesForElement('TEXT_IMG')).not.toContain('ALTITUDE');
  });

  it('fits and previews the documented maximum while preserving the asset prefix', () => {
    expect(getNumericFitPolicy('ALTIMETER')).toMatchObject({
      maxValue: '1200', previewValue: '1200', maxDigitCount: 4,
    });
    expect(getMaxDigitMock('ALTIMETER', 'TEXT_IMG')).toBe('1200');
    expect(getTextImgPrefixForDataType('ALTIMETER')).toBe('alt_digit');
  });

  it('round-trips saved assets and generates the unchanged ALTIMETER runtime binding', () => {
    const parsed = parseProjectFileArtifact(JSON.stringify({
      version: 1, backgroundImage: null, watchFaceConfig: fixture(),
    }));
    expect(parsed.watchFaceConfig.elements[0]).toEqual(pressure);
    const generated = generateWatchFaceCode(parsed.watchFaceConfig).watchfaceIndexJs;
    expect(generated).toContain('hmUI.data_type.ALTIMETER');
    expect(generated).not.toContain('hmUI.data_type.ALTITUDE');
    expect(generated).toContain("'custom_pressure_0.png'");
    expect(generated).toContain("'custom_pressure_9.png'");
  });
});
