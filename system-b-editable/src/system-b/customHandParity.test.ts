import { describe, expect, it } from 'vitest';
import type { ProjectFileArtifact } from '@/lib/projectFileArtifact';
import type { CustomHandRecord } from '@/lib/customHandStore';
import { hydrateArtifactCustomHands } from './customHandParity';

const hand: CustomHandRecord = {
  key: 'custom_hand:royal',
  name: 'Royal',
  hourDataUrl: 'data:image/png;base64,HOUR',
  minuteDataUrl: 'data:image/png;base64,MINUTE',
  secondDataUrl: 'data:image/png;base64,SECOND',
  coverDataUrl: 'data:image/png;base64,COVER',
  swatchDataUrl: 'data:image/png;base64,SWATCH',
  hourPosX: 11,
  hourPosY: 118,
  minutePosX: 8,
  minutePosY: 172,
  secondPosX: 4,
  secondPosY: 180,
  coverWidth: 34,
  coverHeight: 36,
  createdAt: 1,
};

const artifact: ProjectFileArtifact = {
  version: 1,
  backgroundImage: null,
  watchFaceConfig: {
    name: 'Custom pointer face',
    watchModel: 'Balance',
    resolution: { width: 480, height: 480 },
    background: { type: 'color', color: '#000000' },
    elements: [{
      id: 'pointer',
      type: 'TIME_POINTER',
      name: 'Pointer',
      bounds: { x: 0, y: 0, width: 480, height: 480 },
      visible: true,
      zIndex: 1,
      handStyle: hand.key,
    }],
    aodElements: [{
      id: 'aod-pointer',
      type: 'TIME_POINTER',
      name: 'AOD pointer',
      bounds: { x: 0, y: 0, width: 480, height: 480 },
      visible: true,
      zIndex: 1,
      handStyle: hand.key,
    }],
  },
};

describe('System B custom hand parity', () => {
  it('hydrates exact main and AOD pointer assets and geometry', () => {
    const result = hydrateArtifactCustomHands(artifact, [hand]);
    for (const pointer of [
      result.artifact.watchFaceConfig.elements[0],
      result.artifact.watchFaceConfig.aodElements![0],
    ]) {
      expect(pointer.hourHandSrc).toBe(hand.hourDataUrl);
      expect(pointer.minuteHandSrc).toBe(hand.minuteDataUrl);
      expect(pointer.secondHandSrc).toBe(hand.secondDataUrl);
      expect(pointer.coverSrc).toBe(hand.coverDataUrl);
      expect(pointer.hourPos).toEqual({ x: 11, y: 118 });
      expect(pointer.coverWidth).toBe(34);
    }
    expect(result.referencedHands).toEqual([hand]);
  });

  it('rejects a missing custom hand instead of substituting a standard pointer', () => {
    expect(() => hydrateArtifactCustomHands(artifact, [])).toThrow('custom_hand:royal');
  });
});
