import { describe, expect, it } from 'vitest';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import type { ImageSwitcherDefinition } from '@/types/imageSwitcher';
import {
  IMAGE_SWITCHER_MOON_FRAME_COUNTS,
  IMAGE_SWITCHER_POLICY,
  resolveImageSwitcherFrameCount,
} from './elementDataRules';
import { buildDefaultSlots, validateDefinition } from './imageSwitcherResolver';
import { generateWatchFaceCode } from './jsCodeGenerator';
import { createProjectFileArtifact, parseProjectFileArtifact, serializeProjectFileArtifact } from './projectFileArtifact';

function definition(count: 7 | 13 | 30): ImageSwitcherDefinition {
  return {
    id: `moon-${count}`, name: `Moon ${count}`, dataType: 'MOON',
    policyType: 'LUNAR_CYCLE', slotCount: count,
    ranges: buildDefaultSlots('MOON', undefined, count), createdAt: 1, updatedAt: 1,
  };
}

function element(count: 7 | 13 | 30): WatchFaceElement {
  return {
    id: `moon-${count}`, type: 'IMG_LEVEL', name: `Moon ${count}`, dataType: 'MOON',
    bounds: { x: 20, y: 30, width: 80, height: 80 }, visible: true, zIndex: 1,
    images: Array.from({ length: count }, (_, index) => `moon_${count}_${index}.png`),
    imageSwitcherDefinitionId: `moon-${count}`, imageSwitcherFrameCount: count,
  };
}

function config(widget: WatchFaceElement): WatchFaceConfig {
  return {
    name: 'Moon characterization', watchModel: 'Amazfit Balance 2',
    resolution: { width: 480, height: 480 },
    background: { src: 'background.png', format: 'TGA-32' }, elements: [widget],
  };
}

describe('T023 current Moon behavior characterization', () => {
  it('accepts exactly the official 7/13/30 image resolutions', () => {
    expect(IMAGE_SWITCHER_MOON_FRAME_COUNTS).toEqual([7, 13, 30]);
    expect(IMAGE_SWITCHER_POLICY.MOON).toBe('LUNAR_CYCLE');
    for (const count of IMAGE_SWITCHER_MOON_FRAME_COUNTS) {
      expect(validateDefinition(definition(count))).toEqual([]);
      expect(resolveImageSwitcherFrameCount('MOON', { explicitCount: count })).toMatchObject({
        expectedCount: count, strictFixed: true, source: 'moon-cycle',
      });
    }
    expect(resolveImageSwitcherFrameCount('MOON', { explicitCount: 15 }).expectedCount).toBe(7);
  });

  it.each(IMAGE_SWITCHER_MOON_FRAME_COUNTS)('freezes current %i-frame generator output', (count) => {
    const code = generateWatchFaceCode(config(element(count))).watchfaceIndexJs;
    expect(code).toContain('hmUI.widget.IMG_LEVEL');
    expect(code).toContain(`image_length: ${count}`);
    expect(code).toContain('type: hmUI.data_type.MOON');
    expect(code).toContain(`"moon_${count}_0.png"`);
    expect(code).toContain(`"moon_${count}_${count - 1}.png"`);
  });

  it.each(IMAGE_SWITCHER_MOON_FRAME_COUNTS)('round-trips %i ordered Moon assets through FVWF', (count) => {
    const original = element(count);
    const restored = parseProjectFileArtifact(serializeProjectFileArtifact(
      createProjectFileArtifact(config(original), null),
    )).watchFaceConfig.elements[0];
    expect(restored).toEqual(original);
  });
});
