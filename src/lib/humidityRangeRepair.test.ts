import { describe, expect, it } from 'vitest';
import type { ImageSwitcherDefinition, RangeSlot } from '@/types/imageSwitcher';
import { auditHumidityRanges, proposeHumidityRangeRepair, validateDefinition } from './imageSwitcherResolver';

const asset = { storagePath: 'path', downloadURL: 'url', fileHash: 'hash', bakedVersion: 2 };
const valid: RangeSlot[] = [
  { slotIndex: 0, label: 'Dry', min: 0, max: 30, dataUrl: 'dry', sourceHtml: '<svg/>', baked: asset },
  { slotIndex: 1, label: 'Comfortable', min: 31, max: 60, dataUrl: 'ok', sourceHash: 'source' },
  { slotIndex: 2, label: 'Humid', min: 61, max: 100, dataUrl: 'humid', source: asset },
];

function definition(ranges: RangeSlot[]): ImageSwitcherDefinition {
  return {
    id: 'humidity', name: 'Humidity', dataType: 'HUMIDITY', policyType: 'ABSOLUTE_RANGES',
    slotCount: ranges.length, ranges, createdAt: 1, updatedAt: 2,
  };
}

describe('Spec 131 T015 Humidity range preservation and repair', () => {
  it('preserves a valid definition and thresholds exactly', () => {
    const proposal = proposeHumidityRangeRepair(valid);
    expect(proposal.issues).toEqual([]);
    expect(proposal.changes).toEqual([]);
    expect(proposal.ranges).toBe(valid);
    expect(validateDefinition(definition(valid))).toEqual([]);
  });

  it('detects gaps, overlaps, bounds, and non-integer thresholds', () => {
    expect(auditHumidityRanges([
      { ...valid[0], min: 1, max: 30.5 },
      { ...valid[1], min: 30, max: 60 },
      { ...valid[2], min: 62, max: 99 },
    ])).toEqual(expect.arrayContaining([
      expect.stringMatching(/integer/),
      expect.stringMatching(/overlap/),
      expect.stringMatching(/Gap/),
      expect.stringMatching(/start at 0/),
      expect.stringMatching(/end at 100/),
    ]));
  });

  it('repairs boundaries only and preserves every asset/source field', () => {
    const broken = [
      { ...valid[0], min: 2, max: 30 },
      { ...valid[1], min: 33, max: 60 },
      { ...valid[2], min: 60, max: 98 },
    ];
    const proposal = proposeHumidityRangeRepair(broken);
    expect(proposal.changes.length).toBeGreaterThan(0);
    expect(proposal.ranges.map(slot => [slot.min, slot.max])).toEqual([[0, 30], [31, 60], [61, 100]]);
    proposal.ranges.forEach((slot, index) => {
      const { min: _oldMin, max: _oldMax, slotIndex: _oldIndex, ...oldContent } = broken[index];
      const { min: _newMin, max: _newMax, slotIndex: _newIndex, ...newContent } = slot;
      expect(newContent).toEqual(oldContent);
    });
    expect(validateDefinition(definition(proposal.ranges))).toEqual([]);
  });
});
