import { describe, expect, it } from 'vitest';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import type { ImageSwitcherDefinition, RangeSlot } from '@/types/imageSwitcher';
import {
  auditBioChargeRanges,
  buildDefaultSlots,
  expandAbsoluteRangeFrames,
  proposeBioChargeRangeRepair,
  resolveSlot,
  validateDefinition,
} from './imageSwitcherResolver';
import { getAllowedDataTypesForElement, IMAGE_SWITCHER_POLICY } from './elementDataRules';
import { generateWatchFaceCode } from './jsCodeGenerator';

const ranges: RangeSlot[] = [
  { slotIndex: 0, label: 'Low', min: 0, max: 30 },
  { slotIndex: 1, label: 'Balanced', min: 31, max: 70 },
  { slotIndex: 2, label: 'High', min: 71, max: 100 },
];
const frames = ['low.png', 'balanced.png', 'high.png'];

function definition(input = ranges): ImageSwitcherDefinition {
  return {
    id: 'bio-ranges', name: 'HybridCharge ranges', dataType: 'BIO_CHARGE',
    policyType: 'ABSOLUTE_RANGES', slotCount: input.length, ranges: input,
    createdAt: 1, updatedAt: 1,
  };
}

describe('T022 BioCharge explicit-range Image Switcher', () => {
  it('exposes only the absolute-range policy with safe defaults', () => {
    expect(getAllowedDataTypesForElement('IMG_LEVEL')).toContain('BIO_CHARGE');
    expect(IMAGE_SWITCHER_POLICY.BIO_CHARGE).toBe('ABSOLUTE_RANGES');
    expect(buildDefaultSlots('BIO_CHARGE').map((slot) => [slot.label, slot.min, slot.max]))
      .toEqual([['Low', 0, 30], ['Balanced', 31, 70], ['High', 71, 100]]);
  });

  it('keeps preview and expanded runtime parity at every boundary', () => {
    const expanded = expandAbsoluteRangeFrames(frames, ranges, 0, 100);
    const values = [0, 30, 31, 70, 71, 100];
    expect(values.map((value) => resolveSlot(value, definition()).slotIndex)).toEqual([0, 0, 1, 1, 2, 2]);
    expect(values.map((value) => expanded[value])).toEqual([
      'low.png', 'low.png', 'balanced.png', 'balanced.png', 'high.png', 'high.png',
    ]);
    expect(expanded).toHaveLength(101);
    expect(new Set(expanded)).toEqual(new Set(frames));
  });

  it('rejects gaps/overlaps and proposes a boundary-only repair', () => {
    const invalid = [ranges[0], { ...ranges[1], min: 32 }, ranges[2]];
    expect(auditBioChargeRanges(invalid).join(' ')).toMatch(/Gap before slot 2/);
    expect(validateDefinition(definition(invalid)).join(' ')).toMatch(/Gap before slot 2/);
    const repair = proposeBioChargeRangeRepair(invalid);
    expect(repair.ranges.map((slot) => [slot.min, slot.max])).toEqual([[0, 30], [31, 70], [71, 100]]);
    expect(repair.ranges.map((slot) => slot.label)).toEqual(['Low', 'Balanced', 'High']);
  });

  it('generates a 101-index BIO_CHARGE IMG_LEVEL using repeated references', () => {
    const element: WatchFaceElement = {
      id: 'bio-switcher', type: 'IMG_LEVEL', dataType: 'BIO_CHARGE', name: 'HybridCharge ranges',
      bounds: { x: 10, y: 20, width: 60, height: 60 },
      images: expandAbsoluteRangeFrames(frames, ranges, 0, 100), visible: true, zIndex: 1,
    };
    const config = {
      name: 'bio ranges', watchModel: 'Amazfit Balance 2',
      resolution: { width: 480, height: 480 }, elements: [element],
    } as unknown as WatchFaceConfig;
    const code = generateWatchFaceCode(config).watchfaceIndexJs;
    expect(code).toContain('image_length: 101');
    expect(code).toContain('type: hmUI.data_type.BIO_CHARGE');
    expect(code.match(/"low\.png"/g)).toHaveLength(62);
    expect(code.match(/"balanced\.png"/g)).toHaveLength(80);
    expect(code.match(/"high\.png"/g)).toHaveLength(60);
  });
});
