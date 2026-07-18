import { describe, expect, it } from 'vitest';
import type { ImageSwitcherDefinition } from '@/types/imageSwitcher';
import {
  IMAGE_SWITCHER_POLICY,
  resolveImageSwitcherFrameCount,
} from './elementDataRules';
import { buildDefaultSlots, validateDefinition } from './imageSwitcherResolver';

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
