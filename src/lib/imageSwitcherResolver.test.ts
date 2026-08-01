import { describe, expect, it } from 'vitest';
import type { ImageSwitcherDefinition } from '@/types/imageSwitcher';
import {
  IMAGE_SWITCHER_POLICY,
  IMAGE_SWITCHER_DATA_TYPES,
  imageSwitcherDataTypesMatch,
  resolveImageSwitcherFrameCount,
} from './elementDataRules';
import { buildDefaultSlots, validateDefinition } from './imageSwitcherResolver';
import { ZEP_WEATHER_CONDITION_CODES } from './dataRepresentationAuthority';
import { WEATHER_ICON_RECIPE_BY_CODE } from './weatherIconSets';

function moonDefinition(count: number): ImageSwitcherDefinition {
  return {
    id: `moon-${count}`,
    name: `${count} phase Moon`,
    dataType: 'MOON',
    policyType: 'LUNAR_CYCLE',
    slotCount: count,
    ranges: buildDefaultSlots('MOON', undefined, count),
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('Moon Image Switcher resolution', () => {
  it('uses a dedicated lunar policy and defaults to seven ordered slots', () => {
    expect(IMAGE_SWITCHER_POLICY.MOON).toBe('LUNAR_CYCLE');
    expect(buildDefaultSlots('MOON')).toEqual(
      Array.from({ length: 7 }, (_, slotIndex) => ({
        slotIndex,
        label: `Phase ${slotIndex + 1} of 7`,
      })),
    );
  });

  it.each([7, 13, 30])('accepts the documented %i-image resolution', count => {
    const definition = moonDefinition(count);
    expect(definition.ranges).toHaveLength(count);
    expect(validateDefinition(definition)).toEqual([]);
    expect(resolveImageSwitcherFrameCount('MOON', { explicitCount: count })).toMatchObject({
      expectedCount: count,
      strictFixed: true,
      source: 'moon-cycle',
    });
  });

  it('rejects arbitrary Moon counts and numeric phase codes', () => {
    const definition = moonDefinition(8);
    definition.ranges[0].code = 0;
    expect(validateDefinition(definition)).toEqual(expect.arrayContaining([
      'Moon sets must contain exactly 7, 13, or 30 images.',
      'Moon slot 1 must not define a code or numeric range.',
    ]));
  });
});

describe('official Zepp weather condition mapping', () => {
  it('offers only Weather Condition for new switchers while matching legacy definitions', () => {
    expect(IMAGE_SWITCHER_DATA_TYPES).toContain('WEATHER_STATUS');
    expect(IMAGE_SWITCHER_DATA_TYPES).not.toContain('WEATHER_CURRENT');
    expect(imageSwitcherDataTypesMatch('WEATHER_CURRENT', 'WEATHER_STATUS')).toBe(true);
  });
  it('maps all 29 Switcher Lab slots and built-in artwork recipes by exact code', () => {
    const slots = buildDefaultSlots('WEATHER_STATUS');
    expect(slots).toHaveLength(29);
    expect(WEATHER_ICON_RECIPE_BY_CODE).toHaveLength(29);

    ZEP_WEATHER_CONDITION_CODES.forEach(condition => {
      expect(slots[condition.code]).toEqual({
        slotIndex: condition.code,
        code: condition.code,
        label: condition.label,
      });
      expect(WEATHER_ICON_RECIPE_BY_CODE[condition.code]).toMatchObject(condition);
      expect(WEATHER_ICON_RECIPE_BY_CODE[condition.code]?.kind).toBeTruthy();
    });
    const definition: ImageSwitcherDefinition = {
      id: 'official-weather', name: 'Official weather', dataType: 'WEATHER_STATUS',
      policyType: 'FIXED_CODES', slotCount: 29, ranges: slots, createdAt: 1, updatedAt: 1,
    };
    expect(validateDefinition(definition)).toEqual([]);
  });

  it('rejects a fixed weather slot whose label does not match its official code', () => {
    const ranges = buildDefaultSlots('WEATHER_STATUS');
    ranges[15].label = 'Sunny';
    const definition: ImageSwitcherDefinition = {
      id: 'weather-label-validation', name: 'Weather', dataType: 'WEATHER_STATUS',
      policyType: 'FIXED_CODES', slotCount: 29, ranges, createdAt: 1, updatedAt: 1,
    };
    expect(validateDefinition(definition)).toContain(
      'Weather code 15 must be labeled "Thunderstorm".',
    );
  });
});
