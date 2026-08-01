import { describe, expect, it } from 'vitest';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import {
  IMAGE_SWITCHER_DATA_TYPES,
  IMAGE_SWITCHER_NEW_DATA_TYPES,
  getAllowedDataTypesForElement,
  getEditableImageSwitcherDataTypes,
  isNewImageSwitcherDataType,
} from './elementDataRules';
import { parseProjectFileArtifact } from './projectFileArtifact';

const PROVEN_NEW_CHOICES = ['HUMIDITY', 'BIO_CHARGE', 'WEATHER_STATUS', 'MOON'];
const LEGACY_PREVIEW_ONLY = [
  'BATTERY', 'STEP', 'CAL', 'DISTANCE', 'STAND', 'PAI_DAILY', 'PAI_WEEKLY',
  'FAT_BURNING', 'HEART', 'STRESS', 'SPO2', 'UVI', 'AQI',
];

describe('T025C truthful Image Switcher creation gate', () => {
  it('offers only runtime-proven contracts for new switchers', () => {
    expect([...IMAGE_SWITCHER_NEW_DATA_TYPES]).toEqual(PROVEN_NEW_CHOICES);
    for (const dataType of PROVEN_NEW_CHOICES) expect(isNewImageSwitcherDataType(dataType)).toBe(true);
    for (const dataType of LEGACY_PREVIEW_ONLY) expect(isNewImageSwitcherDataType(dataType)).toBe(false);
  });

  it('retains the complete legacy inventory for compatibility and validation', () => {
    expect(getAllowedDataTypesForElement('IMG_LEVEL')).toEqual(IMAGE_SWITCHER_DATA_TYPES);
    for (const dataType of LEGACY_PREVIEW_ONLY) expect(IMAGE_SWITCHER_DATA_TYPES).toContain(dataType);
  });

  it('lets an existing legacy switcher keep its type but prevents switching to another unsafe type', () => {
    expect(getEditableImageSwitcherDataTypes('BATTERY')).toEqual([
      'BATTERY', ...PROVEN_NEW_CHOICES,
    ]);
    expect(getEditableImageSwitcherDataTypes('STRESS')).toEqual([
      'STRESS', ...PROVEN_NEW_CHOICES,
    ]);
    expect(getEditableImageSwitcherDataTypes('HUMIDITY')).toEqual(PROVEN_NEW_CHOICES);
  });

  it('round-trips legacy FVWF elements without changing assets or thresholds', () => {
    const legacy: WatchFaceElement = {
      id: 'legacy-battery-switcher', name: 'Battery custom ranges',
      type: 'IMG_LEVEL', dataType: 'BATTERY',
      bounds: { x: 20, y: 30, width: 80, height: 80 }, visible: true, zIndex: 1,
      images: ['battery_low_custom.png', 'battery_high_custom.png'],
      imageSwitcherDefinitionId: 'legacy-battery-definition',
      imageSwitcherFrameCount: 2,
    };
    const config: WatchFaceConfig = {
      name: 'legacy switcher fixture', watchModel: 'Amazfit Balance 2',
      resolution: { width: 480, height: 480 }, elements: [legacy],
      background: { type: 'color', value: '#000000' },
    };
    const parsed = parseProjectFileArtifact(JSON.stringify({
      version: 1, backgroundImage: null, watchFaceConfig: config,
    }));
    expect(parsed.watchFaceConfig.elements[0]).toEqual(legacy);
  });
});
