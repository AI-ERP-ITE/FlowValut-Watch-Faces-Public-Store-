import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import {
  ELEMENT_TO_DATA,
  IMAGE_SWITCHER_POLICY,
  resolveImageSwitcherFrameCount,
} from './elementDataRules';
import { buildDefaultSlots } from './imageSwitcherResolver';
import { generateWatchFaceCode } from './jsCodeGenerator';
import { getNumericPreviewValue } from './numericFitPolicy';
import { WEATHER_ICON_RECIPE_BY_CODE } from './weatherIconSets';
import {
  createProjectFileArtifact,
  parseProjectFileArtifact,
  serializeProjectFileArtifact,
} from './projectFileArtifact';

interface CurrentBaselineFixture {
  officialWeatherCodes: string[];
  observedSwitcherLabels: Record<string, string>;
  observedBuiltInWeatherComments: Record<string, string>;
  observedRules: {
    weatherCurrentIsNumeric: boolean;
    weatherCurrentIsImageSwitcher: boolean;
    weatherStatusIsImageSwitcher: boolean;
    trainingLoadIsArcProgress: boolean;
    windNumericPreview: string;
  };
  observedGenerator: {
    weatherConditionType: string;
    temperatureHasNegativeImage: boolean;
    temperatureHasDegreeUnit: boolean;
  };
}

const fixture = JSON.parse(readFileSync(resolve(
  process.cwd(),
  'specs/131-zepp-data-representation-authority/fixtures/current-baseline.json',
), 'utf8')) as CurrentBaselineFixture;

function element(
  id: string,
  type: WatchFaceElement['type'],
  dataType: string,
  extra: Partial<WatchFaceElement> = {},
): WatchFaceElement {
  return {
    id,
    type,
    dataType,
    name: id,
    bounds: { x: 10, y: 20, width: 100, height: 40 },
    visible: true,
    zIndex: 1,
    ...extra,
  };
}

function config(elements: WatchFaceElement[]): WatchFaceConfig {
  return {
    name: 'Spec 131 characterization',
    watchModel: 'Amazfit Balance 2',
    resolution: { width: 480, height: 480 },
    elements,
  } as unknown as WatchFaceConfig;
}

describe('Spec 131 current behavior characterization', () => {
  it('freezes the currently exposed compatibility choices before consolidation', () => {
    expect(ELEMENT_TO_DATA.NUMERIC_DISPLAY.includes('WEATHER_CURRENT')).toBe(
      fixture.observedRules.weatherCurrentIsNumeric,
    );
    expect(ELEMENT_TO_DATA.IMAGE_SWITCHER.includes('WEATHER_CURRENT')).toBe(
      false,
    );
    expect(ELEMENT_TO_DATA.IMAGE_SWITCHER.includes('WEATHER_STATUS')).toBe(
      fixture.observedRules.weatherStatusIsImageSwitcher,
    );
    expect(ELEMENT_TO_DATA.ARC_PROGRESS.includes('TRAINING_LOAD')).toBe(false);
    expect(ELEMENT_TO_DATA.NUMERIC_DISPLAY.includes('TRAINING_LOAD')).toBe(true);
    expect(IMAGE_SWITCHER_POLICY.WEATHER_CURRENT).toBeUndefined();
    expect(resolveImageSwitcherFrameCount('WEATHER_CURRENT')).toMatchObject({
      expectedCount: null,
      strictFixed: false,
      source: 'unsupported',
    });
  });

  it('keeps remaining preview assumptions and fits the completed temperature envelope', () => {
    expect(getNumericPreviewValue('WIND')).toBe('12');
    expect(getNumericPreviewValue('WEATHER_CURRENT')).toBe('-888°');
    expect(getNumericPreviewValue('HUMIDITY')).toBe('100%');
    expect(getNumericPreviewValue('TRAINING_LOAD')).toBe('888');
  });

  it('keeps Switcher Lab weather labels aligned with the official manifest', () => {
    const slots = buildDefaultSlots('WEATHER_STATUS');
    expect(slots).toHaveLength(29);
    expect(slots.map(slot => slot.label)).toEqual(fixture.officialWeatherCodes);
    expect(fixture.officialWeatherCodes).toHaveLength(29);
  });

  it('keeps built-in artwork recipes aligned with the official manifest', () => {
    expect(WEATHER_ICON_RECIPE_BY_CODE.map(recipe => recipe.label)).toEqual(fixture.officialWeatherCodes);
  });

  it('freezes the current generated weather and temperature contracts', () => {
    const weather = element('weather-condition', 'IMG_LEVEL', 'WEATHER_STATUS', {
      images: Array.from({ length: 29 }, (_, index) => `weather_${index}.png`),
    });
    const temperature = element('current-temperature', 'TEXT_IMG', 'WEATHER_CURRENT', {
      fontArray: Array.from({ length: 10 }, (_, index) => `temp_digit_${index}.png`),
    });
    const generated = generateWatchFaceCode(config([weather, temperature])).watchfaceIndexJs;

    expect(generated).toContain(`type: ${fixture.observedGenerator.weatherConditionType},`);
    expect(generated).toContain("negative_image: 'temp_negative.png'");
    // The generator emits the main widget and its current AOD fallback.
    expect(generated.match(/(?:unit|imperial_unit)_(?:sc|en|tc): 'temp_degree.png'/g)).toHaveLength(12);
  });

  it('proves FVWF round-trip currently preserves ambiguous legacy elements exactly', () => {
    const legacyElements = [
      element('legacy-weather-current-switcher', 'IMG_LEVEL', 'WEATHER_CURRENT', {
        images: Array.from({ length: 29 }, (_, index) => `custom_${index}.png`),
      }),
      element('legacy-sunrise', 'TEXT_IMG', 'SUN_RISE'),
      element('legacy-training-arc', 'ARC_PROGRESS', 'TRAINING_LOAD'),
    ];
    const original = createProjectFileArtifact(config(legacyElements), null);
    const restored = parseProjectFileArtifact(serializeProjectFileArtifact(original));

    expect(restored).not.toEqual(original);
    expect(restored.watchFaceConfig.elements.map(item => [item.type, item.dataType])).toEqual([
      ['IMG_LEVEL', 'WEATHER_STATUS'],
      ['TIME_READING', 'SUN_RISE'],
      ['ARC_PROGRESS', 'TRAINING_LOAD'],
    ]);
  });
});
