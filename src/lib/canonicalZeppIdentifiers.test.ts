import { describe, expect, it } from 'vitest';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import { generateWatchFaceCode } from './jsCodeGenerator';
import {
  getAllowedDataTypesForElement,
  getTextImgPrefixForDataType,
  normalizeDataAlias,
} from './elementDataRules';
import { parseProjectFileArtifact } from './projectFileArtifact';

const legacyPai: WatchFaceElement = {
  id: 'pai-legacy', name: 'Daily PAI', type: 'TEXT_IMG', dataType: 'PAI',
  bounds: { x: 10, y: 20, width: 90, height: 30 }, visible: true, zIndex: 1,
  fontArray: Array.from({ length: 10 }, (_, i) => `custom_pai_${i}.png`),
  imageSwitcherDefinitionId: 'keep-definition-id',
};

const legacyFatBurn: WatchFaceElement = {
  id: 'fat-legacy', name: 'Fat Burning', type: 'ARC_PROGRESS', dataType: 'FAT_BURN',
  bounds: { x: 0, y: 0, width: 200, height: 200 }, visible: true, zIndex: 2,
  centerX: 100, centerY: 100, radius: 80, startAngle: -90, endAngle: 90,
  lineWidth: 10, color: '0xff8800', images: ['custom_low.png', 'custom_high.png'],
};

function config(elements: WatchFaceElement[], aodElements?: WatchFaceElement[]): WatchFaceConfig {
  return {
    name: 'canonical identifier fixture', watchModel: 'Amazfit Balance 2',
    resolution: { width: 480, height: 480 }, elements, aodElements,
    background: { type: 'color', value: '#000000' },
  };
}

describe('T025A canonical Zepp identifiers', () => {
  it('uses only canonical choices while retaining legacy aliases', () => {
    expect(normalizeDataAlias('PAI')).toBe('PAI_DAILY');
    expect(normalizeDataAlias('FAT_BURN')).toBe('FAT_BURNING');
    expect(getAllowedDataTypesForElement('TEXT_IMG')).toContain('PAI_DAILY');
    expect(getAllowedDataTypesForElement('TEXT_IMG')).toContain('FAT_BURNING');
    expect(getAllowedDataTypesForElement('TEXT_IMG')).not.toContain('PAI');
    expect(getAllowedDataTypesForElement('TEXT_IMG')).not.toContain('FAT_BURN');
    expect(getTextImgPrefixForDataType('PAI')).toBe('pai_digit');
    expect(getTextImgPrefixForDataType('FAT_BURN')).toBe('fatburn_digit');
  });

  it('migrates main and AOD FVWF elements without changing asset fields', () => {
    const parsed = parseProjectFileArtifact(JSON.stringify({
      version: 1,
      backgroundImage: 'data:image/png;base64,keep',
      watchFaceConfig: config([legacyPai], [legacyFatBurn]),
    }));
    const pai = parsed.watchFaceConfig.elements[0]!;
    const fat = parsed.watchFaceConfig.aodElements![0]!;
    expect(pai.dataType).toBe('PAI_DAILY');
    expect(fat.dataType).toBe('FAT_BURNING');
    expect(pai.fontArray).toEqual(legacyPai.fontArray);
    expect(pai.imageSwitcherDefinitionId).toBe('keep-definition-id');
    expect(fat.images).toEqual(legacyFatBurn.images);
    expect(fat.bounds).toEqual(legacyFatBurn.bounds);
    expect(parsed.backgroundImage).toBe('data:image/png;base64,keep');
  });

  it('defensively generates canonical runtime constants from legacy in-memory elements', () => {
    const generated = generateWatchFaceCode(config([legacyPai, legacyFatBurn])).watchfaceIndexJs;
    expect(generated).toContain('hmUI.data_type.PAI_DAILY');
    expect(generated).toContain('hmUI.data_type.FAT_BURNING');
    expect(generated).not.toContain('hmUI.data_type.PAI,');
    expect(generated).not.toContain('hmUI.data_type.FAT_BURN,');
    expect(generated).toContain("'custom_pai_0.png'");
    expect(generated).toContain("'custom_pai_9.png'");
  });
});
