import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addSourceBuild,
  addVariantToSlot,
  createComponentGroup,
  createFvwcProject,
  createSlotFromGroup,
  parseFvwc,
  resolveCanvasPresentation,
  serializeFvwc,
  setBaseBuild,
  setDefaultVariant,
  validateComposerProject,
  type ComposerSourceBuild,
  type FvwcProjectV1,
} from './composerDomain';
import type { ProjectFileArtifact } from '@/lib/projectFileArtifact';

const artifact: ProjectFileArtifact = {
  version: 1,
  backgroundImage: 'data:image/png;base64,AA==',
  watchFaceConfig: {
    name: 'Heart',
    watchModel: 'Amazfit Balance 2',
    resolution: { width: 480, height: 480 },
    background: { src: 'background.png', format: 'TGA-P' },
    elements: [{
      id: 'heart_value',
      type: 'TEXT_IMG',
      name: 'Heart Value',
      bounds: { x: 40, y: 40, width: 100, height: 40 },
      visible: true,
      zIndex: 1,
      dataType: 'HEART',
    }],
  },
};

function source(id: string, sha256: string, nextArtifact = artifact): ComposerSourceBuild {
  return {
    id,
    fileName: `${id}.fvwf`,
    sha256,
    importedAt: '2026-07-27T00:00:00.000Z',
    canonicalModelId: 'balance-2',
    canonicalModelName: 'Amazfit Balance 2',
    specGroup: '480-round',
    artifact: structuredClone(nextArtifact),
  };
}

describe('FVWC composer domain', () => {
  let project: FvwcProjectV1;

  beforeEach(() => {
    let idCounter = 0;
    vi.stubGlobal('crypto', {
      randomUUID: () => {
        idCounter += 1;
        return `11111111-2222-4333-8444-${idCounter.toString().padStart(12, '0')}`;
      },
    });
    project = createFvwcProject('Test');
  });

  it('registers immutable source snapshots and selects the first base', () => {
    project = addSourceBuild(project, source('build_a', 'aaa'));
    expect(project.baseBuildId).toBe('build_a');
    expect(project.sourceBuilds).toHaveLength(1);
  });

  it('rejects duplicate source hashes', () => {
    project = addSourceBuild(project, source('build_a', 'same'));
    expect(() => addSourceBuild(project, source('build_b', 'same'))).toThrow(/already registered/);
  });

  it('rejects an unknown base build', () => {
    expect(() => setBaseBuild(project, 'missing')).toThrow(/registered source/);
  });

  it('creates a group, slot, variant, and valid default', () => {
    project = addSourceBuild(project, source('build_a', 'aaa'));
    project = createComponentGroup(project, {
      name: 'Heart Readout',
      sourceBuildId: 'build_a',
      layerIds: ['heart_value'],
    });
    const group = project.componentGroups[0];
    project = createSlotFromGroup(project, group.id, 'Left Readout');
    const slot = project.slots[0];
    expect(slot.variants).toHaveLength(1);
    expect(slot.defaultVariantId).toBe(slot.variants[0].id);
    expect(validateComposerProject(project).filter((issue) => issue.severity === 'ERROR')).toEqual([]);
  });

  it('rejects duplicate layer ownership', () => {
    project = addSourceBuild(project, source('build_a', 'aaa'));
    project = createComponentGroup(project, {
      name: 'First',
      sourceBuildId: 'build_a',
      layerIds: ['heart_value'],
    });
    expect(() => createComponentGroup(project, {
      name: 'Second',
      sourceBuildId: 'build_a',
      layerIds: ['heart_value'],
    })).toThrow(/already belong/);
  });

  it('adds a compatible variant and changes the default', () => {
    const stepsArtifact = structuredClone(artifact);
    stepsArtifact.watchFaceConfig.name = 'Steps';
    stepsArtifact.watchFaceConfig.elements[0] = {
      ...stepsArtifact.watchFaceConfig.elements[0],
      id: 'steps_value',
      name: 'Steps Value',
      dataType: 'STEP',
    };
    project = addSourceBuild(project, source('build_a', 'aaa'));
    project = addSourceBuild(project, source('build_b', 'bbb', stepsArtifact));
    project = createComponentGroup(project, {
      name: 'Heart',
      sourceBuildId: 'build_a',
      layerIds: ['heart_value'],
    });
    project = createComponentGroup(project, {
      name: 'Steps',
      sourceBuildId: 'build_b',
      layerIds: ['steps_value'],
    });
    project = createSlotFromGroup(project, project.componentGroups[0].id, 'Readout');
    project = addVariantToSlot(project, project.slots[0].id, project.componentGroups[1].id, 'DATA_ONLY');
    const second = project.slots[0].variants[1];
    project = setDefaultVariant(project, project.slots[0].id, second.id);
    expect(project.slots[0].defaultVariantId).toBe(second.id);
  });

  it('resolves variant layers and background from the same default-variant source', () => {
    const secondArtifact = structuredClone(artifact);
    secondArtifact.backgroundImage = 'data:image/png;base64,AQ==';
    secondArtifact.watchFaceConfig.name = 'Steps';
    secondArtifact.watchFaceConfig.elements[0] = {
      ...secondArtifact.watchFaceConfig.elements[0],
      id: 'steps_value',
      name: 'Steps Value',
      dataType: 'STEP',
    };
    project = addSourceBuild(project, source('build_a', 'aaa'));
    project = addSourceBuild(project, source('build_b', 'bbb', secondArtifact));
    project = createComponentGroup(project, {
      name: 'Heart',
      sourceBuildId: 'build_a',
      layerIds: ['heart_value'],
    });
    project = createComponentGroup(project, {
      name: 'Steps',
      sourceBuildId: 'build_b',
      layerIds: ['steps_value'],
    });
    project = createSlotFromGroup(project, project.componentGroups[0].id, 'Readout');
    project = addVariantToSlot(project, project.slots[0].id, project.componentGroups[1].id, 'DATA_ONLY');
    project = setDefaultVariant(project, project.slots[0].id, project.slots[0].variants[1].id);

    const presentation = resolveCanvasPresentation(
      project,
      'VARIANT',
      'build_a',
      project.slots[0].id,
    );

    expect(presentation.source?.id).toBe('build_b');
    expect(presentation.source?.artifact.backgroundImage).toBe('data:image/png;base64,AQ==');
    expect(presentation.elements.map((element) => element.id)).toEqual(['steps_value']);
  });

  it('round-trips the FVWC schema', () => {
    project = addSourceBuild(project, source('build_a', 'aaa'));
    const parsed = parseFvwc(serializeFvwc(project));
    expect(parsed.format).toBe('flowvault-editable-watchface-composer');
    expect(parsed.fvwcSchemaVersion).toBe(1);
    expect(parsed.sourceBuilds[0].artifact).toEqual(artifact);
  });
});
