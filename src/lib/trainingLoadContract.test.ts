import { describe, expect, it } from 'vitest';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import { getAllowedDataTypesForElement } from './elementDataRules';
import { generateWatchFaceCode } from './jsCodeGenerator';
import { TRAINING_LOAD_ARC_WARNING, annotateLegacyTrainingLoadArcs } from './projectFileArtifact';

describe('Spec 131 T012 Training Load restriction', () => {
  it('keeps Numeric Display and removes Training Load from new Arc choices', () => {
    expect(getAllowedDataTypesForElement('TEXT_IMG')).toContain('TRAINING_LOAD');
    expect(getAllowedDataTypesForElement('ARC_PROGRESS')).not.toContain('TRAINING_LOAD');
  });

  it('preserves a legacy Arc and its runtime binding while warning', () => {
    const arc: WatchFaceElement = {
      id: 'legacy-training', type: 'ARC_PROGRESS', dataType: 'TRAINING_LOAD',
      name: 'Legacy Training Load', bounds: { x: 0, y: 0, width: 100, height: 100 },
      visible: true, zIndex: 1,
    };
    const config = {
      name: 'training', watchModel: 'Amazfit Balance 2',
      resolution: { width: 480, height: 480 }, elements: [arc],
    } as unknown as WatchFaceConfig;
    const migrated = annotateLegacyTrainingLoadArcs(config);
    expect(migrated.elements[0]).toMatchObject({
      type: 'ARC_PROGRESS', dataType: 'TRAINING_LOAD', compatibilityWarning: TRAINING_LOAD_ARC_WARNING,
    });
    expect(generateWatchFaceCode(migrated).watchfaceIndexJs).toContain('type: hmUI.data_type.TRAINING_LOAD');
  });
});
