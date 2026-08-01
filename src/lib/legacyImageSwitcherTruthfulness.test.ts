import { describe, expect, it } from 'vitest';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import {
  IMAGE_SWITCHER_DATA_TYPES,
  IMAGE_SWITCHER_NEW_DATA_TYPES,
  getAllowedDataTypesForElement,
  getEditableImageSwitcherDataTypes,
  getNewElementAllowedDataTypes,
  hasUnprovenLegacyRepresentation,
  isNewImageSwitcherDataType,
} from './elementDataRules';
import { parseProjectFileArtifact } from './projectFileArtifact';

const ESTABLISHED_RANGE_CHOICES = [
  'BATTERY', 'STEP', 'CAL', 'DISTANCE', 'STAND', 'PAI_DAILY', 'PAI_WEEKLY',
  'FAT_BURNING', 'HEART', 'STRESS', 'SPO2', 'UVI', 'AQI',
];

describe('T025C established widget inventory restoration', () => {
  it('offers every established and approved Image Switcher source for new definitions', () => {
    expect(IMAGE_SWITCHER_NEW_DATA_TYPES).toEqual(IMAGE_SWITCHER_DATA_TYPES);
    for (const dataType of IMAGE_SWITCHER_DATA_TYPES) expect(isNewImageSwitcherDataType(dataType)).toBe(true);
  });

  it('retains the complete Image Switcher inventory for creation, editing, and validation', () => {
    expect(getAllowedDataTypesForElement('IMG_LEVEL')).toEqual(IMAGE_SWITCHER_DATA_TYPES);
    expect(getNewElementAllowedDataTypes('IMG_LEVEL')).toEqual(IMAGE_SWITCHER_DATA_TYPES);
    expect(getEditableImageSwitcherDataTypes('BATTERY')).toEqual(IMAGE_SWITCHER_DATA_TYPES);
    expect(getEditableImageSwitcherDataTypes('HUMIDITY')).toEqual(IMAGE_SWITCHER_DATA_TYPES);
    for (const dataType of ESTABLISHED_RANGE_CHOICES) expect(IMAGE_SWITCHER_DATA_TYPES).toContain(dataType);
  });

  it('does not subtract established options from other widget choosers', () => {
    expect(getNewElementAllowedDataTypes('TEXT_IMG')).toEqual(getAllowedDataTypesForElement('TEXT_IMG'));
    expect(getNewElementAllowedDataTypes('ARC_PROGRESS')).toEqual(getAllowedDataTypesForElement('ARC_PROGRESS'));
    expect(getNewElementAllowedDataTypes('GAUGE_POINTER')).toEqual(getAllowedDataTypesForElement('GAUGE_POINTER'));
    expect(getNewElementAllowedDataTypes('TEXT_IMG')).toContain('SLEEP');
    for (const dataType of ['STEP', 'CAL', 'DISTANCE', 'HEART']) {
      expect(getNewElementAllowedDataTypes('ARC_PROGRESS')).toContain(dataType);
      expect(getNewElementAllowedDataTypes('GAUGE_POINTER')).toContain(dataType);
      expect(hasUnprovenLegacyRepresentation('ARC_PROGRESS', dataType)).toBe(false);
    }
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
