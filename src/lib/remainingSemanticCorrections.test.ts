import { describe, expect, it } from 'vitest';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import { DATA_REPRESENTATION_DESCRIPTORS } from './dataRepresentationAuthority';
import {
  getAllowedDataTypesForElement,
  getNewElementAllowedDataTypes,
  hasUnprovenLegacyRepresentation,
} from './elementDataRules';
import { generateWatchFaceCode } from './jsCodeGenerator';
import { getMissingDistanceAssets } from './distanceNumericContract';
import {
  AQI_COMPATIBILITY_WARNING,
  parseProjectFileArtifact,
} from './projectFileArtifact';

function config(elements: WatchFaceElement[], aodElements?: WatchFaceElement[]): WatchFaceConfig {
  return {
    name: 'T025D fixture', watchModel: 'Amazfit Balance 2',
    resolution: { width: 480, height: 480 }, elements, aodElements,
    background: { type: 'color', value: '#000000' },
  };
}

describe('T025D remaining semantic corrections', () => {
  it('renders the established Sleep numeric option as H:MM from total minutes', () => {
    expect(DATA_REPRESENTATION_DESCRIPTORS.SLEEP).toMatchObject({
      semanticKind: 'duration', representations: [],
      legacyRepresentations: ['NUMERIC_VALUE'], requiredSymbols: ['colon'],
    });
    expect(getAllowedDataTypesForElement('TEXT_IMG')).toContain('SLEEP');
    expect(getNewElementAllowedDataTypes('TEXT_IMG')).toContain('SLEEP');
    expect(hasUnprovenLegacyRepresentation('TEXT_IMG', 'SLEEP')).toBe(false);
    const sleep: WatchFaceElement = {
      id: 'sleep', name: 'Sleep Duration', type: 'TEXT_IMG', dataType: 'SLEEP',
      bounds: { x: 20, y: 30, width: 120, height: 40 }, visible: true, zIndex: 1,
      fontArray: Array.from({ length: 10 }, (_, i) => `sleep_${i}.png`),
      colonImage: 'sleep_colon.png', timeReadingDigitWidth: 18, timeReadingColonWidth: 8,
    };
    const generated = generateWatchFaceCode(config([sleep])).watchfaceIndexJs;
    expect(generated).toContain('hmSensor.id.SLEEP');
    expect(generated).toContain("src: 'sleep_colon.png'");
    expect(generated).toContain('sleepSensor.getTotalTime()');
    expect(generated).toContain('Math.floor(totalMinutes / 60)');
    expect(generated).toContain('Math.floor(totalMinutes % 60)');
    expect(generated).not.toContain('hmUI.data_type.SLEEP');
  });

  it.each(['STEP', 'CAL', 'DISTANCE', 'HEART'])('%s retains its established Numeric, Arc, and Gauge choices', dataType => {
    expect(getNewElementAllowedDataTypes('TEXT_IMG')).toContain(dataType);
    expect(getNewElementAllowedDataTypes('ARC_PROGRESS')).toContain(dataType);
    expect(getNewElementAllowedDataTypes('GAUGE_POINTER')).toContain(dataType);
    expect(getAllowedDataTypesForElement('ARC_PROGRESS')).toContain(dataType);
    expect(getAllowedDataTypesForElement('GAUGE_POINTER')).toContain(dataType);
    expect(hasUnprovenLegacyRepresentation('ARC_PROGRESS', dataType)).toBe(false);
  });

  it('models SpO2 as 51-100 and AQI as region-gated 1-999', () => {
    expect(DATA_REPRESENTATION_DESCRIPTORS.SPO2).toMatchObject({
      valueRange: { min: 51, max: 100 },
      representations: ['NUMERIC_VALUE', 'ARC_PROGRESS', 'GAUGE_POINTER'],
    });
    expect(DATA_REPRESENTATION_DESCRIPTORS.AQI).toMatchObject({
      valueRange: { min: 1, max: 999 },
      representations: ['NUMERIC_VALUE', 'ARC_PROGRESS', 'GAUGE_POINTER'],
    });
  });

  it('adds the AQI regional warning to main and AOD without overwriting an existing warning', () => {
    const aqi = (id: string, warning?: string): WatchFaceElement => ({
      id, name: id, type: 'TEXT_IMG', dataType: 'AQI',
      bounds: { x: 0, y: 0, width: 80, height: 30 }, visible: true, zIndex: 1,
      ...(warning ? { compatibilityWarning: warning } : {}),
    });
    const parsed = parseProjectFileArtifact(JSON.stringify({
      version: 1, backgroundImage: null,
      watchFaceConfig: config([aqi('main')], [aqi('aod', 'keep my warning')]),
    }));
    expect(parsed.watchFaceConfig.elements[0]?.compatibilityWarning).toBe(AQI_COMPATIBILITY_WARNING);
    expect(parsed.watchFaceConfig.aodElements?.[0]?.compatibilityWarning).toBe('keep my warning');
  });

  it('generates the official Distance decimal bitmap property and preserves custom digits', () => {
    const distance: WatchFaceElement = {
      id: 'distance', name: 'Distance', type: 'TEXT_IMG', dataType: 'DISTANCE',
      bounds: { x: 20, y: 30, width: 120, height: 40 }, visible: true, zIndex: 1,
      fontArray: Array.from({ length: 10 }, (_, i) => `distance_custom_${i}.png`),
      decimalImage: 'distance_custom_decimal.png',
    };
    const generated = generateWatchFaceCode(config([distance])).watchfaceIndexJs;
    expect(generated).toContain('hmUI.data_type.DISTANCE');
    expect(generated).toContain("dont_path: 'distance_custom_decimal.png'");
    expect(generated).toContain("'distance_custom_0.png'");
    expect(generated).toContain("'distance_custom_9.png'");
    const complete = new Set([...(distance.fontArray || []), distance.decimalImage!]);
    expect(getMissingDistanceAssets(distance, complete)).toEqual([]);
    expect(getMissingDistanceAssets(distance, new Set(distance.fontArray))).toEqual([
      'distance_custom_decimal.png',
    ]);
  });
});
