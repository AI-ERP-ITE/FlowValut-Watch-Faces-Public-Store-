import { describe, expect, it } from 'vitest';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import { getAllowedDataTypesForElement, getTextImgPrefixForDataType } from './elementDataRules';
import { getNumericFitPolicy, getNumericPreviewValue } from './numericFitPolicy';
import { generateWatchFaceCode } from './jsCodeGenerator';
import { createProjectFileArtifact, parseProjectFileArtifact, serializeProjectFileArtifact } from './projectFileArtifact';

const element: WatchFaceElement = {
  id: 'hybrid-charge', type: 'TEXT_IMG', name: 'HybridCharge', dataType: 'BIO_CHARGE',
  bounds: { x: 20, y: 30, width: 120, height: 42 }, visible: true, zIndex: 1,
  clickAction: 'BIO_CHARGE',
  fontArray: Array.from({ length: 10 }, (_, digit) => `bio_charge_custom_${digit}.png`),
  compatibilityWarning: 'HybridCharge / BioCharge requires a compatible watch and firmware (reported Zepp OS API level 4.2+).',
};

const config: WatchFaceConfig = {
  name: 'BioCharge numeric', watchModel: 'Amazfit Balance 2',
  resolution: { width: 480, height: 480 },
  background: { src: 'background.png', format: 'TGA-32' }, elements: [element],
};

describe('T020 BioCharge Numeric contract', () => {
  it('preserves Numeric Values while plain Text remains excluded', () => {
    expect(getAllowedDataTypesForElement('TEXT_IMG')).toContain('BIO_CHARGE');
    expect(getAllowedDataTypesForElement('TEXT')).not.toContain('BIO_CHARGE');
  });

  it('uses the fixed 0-100 three-digit fit and scoped digit prefix', () => {
    expect(getNumericFitPolicy('BIO_CHARGE')).toEqual({
      maxValue: '100', previewValue: '100', maxDigitCount: 3,
    });
    expect(getNumericPreviewValue('BIO_CHARGE')).toBe('100');
    expect(getTextImgPrefixForDataType('BIO_CHARGE')).toBe('bio_charge_digit');
  });

  it('emits the BIO_CHARGE TEXT_IMG runtime binding and all ten supplied digits', () => {
    const code = generateWatchFaceCode(config).watchfaceIndexJs;
    expect(code).toContain('hmUI.widget.TEXT_IMG');
    expect(code).toContain('type: hmUI.data_type.BIO_CHARGE');
    expect(code).toContain('hmUI.widget.IMG_CLICK');
    expect(code).toContain("'bio_charge_custom_0.png'");
    expect(code).toContain("'bio_charge_custom_9.png'");
  });

  it('round-trips numeric assets and compatibility warning through FVWF', () => {
    const restored = parseProjectFileArtifact(serializeProjectFileArtifact(
      createProjectFileArtifact(config, null),
    )).watchFaceConfig.elements[0];
    expect(restored).toEqual(element);
  });
});
