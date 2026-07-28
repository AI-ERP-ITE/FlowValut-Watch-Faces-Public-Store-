import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectFileArtifact } from '@/lib/projectFileArtifact';
import {
  addSourceBuild,
  addVariantToSlot,
  createComponentGroup,
  createFvwcProject,
  createSlotFromGroup,
  type ComposerSourceBuild,
  type FvwcProjectV1,
} from './composerDomain';
import { compileEditableV2Plan } from './editableV2';

function artifact(name: string, id: string, dataType: string): ProjectFileArtifact {
  return {
    version: 1,
    backgroundImage: 'data:image/png;base64,AA==',
    watchFaceConfig: {
      name,
      watchModel: 'Amazfit Balance 2',
      resolution: { width: 480, height: 480 },
      background: { src: 'background.png', format: 'TGA-P' },
      elements: [{
        id,
        type: 'TEXT',
        name: `${name} Value`,
        bounds: { x: 80, y: 90, width: 120, height: 50 },
        visible: true,
        zIndex: 2,
        dataType,
        text: name,
      }],
      aodElements: [],
    },
  };
}

function source(id: string, nextArtifact: ProjectFileArtifact): ComposerSourceBuild {
  return {
    id,
    fileName: `${id}.fvwf`,
    sha256: id.repeat(8),
    importedAt: '2026-07-27T00:00:00.000Z',
    canonicalModelId: 'balance-2',
    canonicalModelName: 'Amazfit Balance 2',
    specGroup: '480-round',
    artifact: nextArtifact,
  };
}

function completeProject(): FvwcProjectV1 {
  let project = createFvwcProject('Heart Steps');
  project = addSourceBuild(project, source('heart', artifact('Heart', 'heart_value', 'HEART')));
  project = addSourceBuild(project, source('steps', artifact('Steps', 'steps_value', 'STEP')));
  project = createComponentGroup(project, {
    name: 'Heart',
    sourceBuildId: 'heart',
    layerIds: ['heart_value'],
  });
  project = createComponentGroup(project, {
    name: 'Steps',
    sourceBuildId: 'steps',
    layerIds: ['steps_value'],
  });
  project = createSlotFromGroup(project, project.componentGroups[0].id, 'Left Readout');
  return addVariantToSlot(
    project,
    project.slots[0].id,
    project.componentGroups[1].id,
    'DATA_ONLY',
  );
}

describe('editable V2 compiler', () => {
  beforeEach(() => {
    let counter = 0;
    vi.stubGlobal('crypto', {
      randomUUID: () => {
        counter += 1;
        return `aaaaaaaa-bbbb-4ccc-8ddd-${counter.toString().padStart(12, '0')}`;
      },
    });
  });

  it('compiles one slot into a V2 editable manifest and runtime', () => {
    const plan = compileEditableV2Plan(completeProject());
    const appJson = JSON.parse(plan.generatedCode.appJson) as {
      configVersion: string;
      module: { watchface: { editable: number } };
    };

    expect(appJson.configVersion).toBe('v2');
    expect(appJson.module.watchface.editable).toBe(1);
    expect(plan.slot.variants.map((variant) => variant.typeId)).toEqual([100000, 100001]);
    expect(plan.generatedCode.watchfaceIndexJs).toContain('WATCHFACE_EDIT_GROUP');
    expect(plan.generatedCode.watchfaceIndexJs).toContain('CURRENT_TYPE');
    expect(plan.generatedCode.watchfaceIndexJs).toContain('select_list');
    expect(plan.generatedCode.watchfaceIndexJs).toContain(plan.slot.selectImagePath);
    expect(plan.generatedCode.watchfaceIndexJs).toContain(plan.slot.unselectImagePath);
    expect(plan.generatedCode.watchfaceIndexJs).not.toContain('WATCHFACE_EDIT_MASK');
    expect(() => new Function(plan.generatedCode.watchfaceIndexJs)).not.toThrow();
  });

  it('keeps the editable slot out of fixed base elements', () => {
    const plan = compileEditableV2Plan(completeProject());
    expect(plan.baseConfig.elements).toHaveLength(0);
    expect(plan.slot.variants[0].elements[0].id).not.toBe('heart_value');
    expect(plan.packagingConfig.elements).toHaveLength(2);
  });

  it('allocates a deterministic edit id', () => {
    const project = completeProject();
    expect(compileEditableV2Plan(project).slot.editId).toBe(compileEditableV2Plan(project).slot.editId);
  });

  it('preserves every non-editable base element as a fixed runtime widget', () => {
    const project = completeProject();
    project.sourceBuilds[0].artifact.watchFaceConfig.elements.push({
      id: 'fixed_label',
      type: 'TEXT',
      name: 'Fixed label',
      bounds: { x: 20, y: 20, width: 100, height: 30 },
      visible: true,
      zIndex: 1,
      text: 'Fixed',
    });
    const plan = compileEditableV2Plan(project);
    expect(plan.baseConfig.elements.some((element) => element.id.includes('fixed_label'))).toBe(true);
    expect(plan.generatedCode.watchfaceIndexJs).toContain('Fixed label');
  });

  it('uses fixed base AOD when any variant has no dedicated AOD', () => {
    const plan = compileEditableV2Plan(completeProject());
    expect(plan.aodPolicy).toBe('FIXED_BASE_AOD');
    expect(plan.slot.variants.every((variant) => variant.aodElements.length === 0)).toBe(true);
  });

  it('makes the selected variant control AOD when every source has dedicated AOD', () => {
    const project = completeProject();
    project.sourceBuilds.forEach((item) => {
      item.artifact.watchFaceConfig.aodElements = [{
        id: `${item.id}_aod`,
        type: 'TEXT',
        name: `${item.id} AOD`,
        bounds: { x: 100, y: 100, width: 120, height: 40 },
        visible: true,
        zIndex: 1,
        dataType: 'TIME',
        text: item.id,
      }];
    });
    const plan = compileEditableV2Plan(project);
    expect(plan.aodPolicy).toBe('FOLLOW_VARIANT_AOD');
    expect(plan.slot.variants.every((variant) => variant.aodElements.length === 1)).toBe(true);
    expect(plan.generatedCode.watchfaceIndexJs).toContain('ONLY_AOD');
  });

  it('packages a distinct embedded background for every full-theme variant', () => {
    const themedArtifact = (name: string, backgroundImage: string): ProjectFileArtifact => ({
      ...artifact(name, `${name}_value`, 'DATE'),
      backgroundImage,
      watchFaceConfig: {
        ...artifact(name, `${name}_value`, 'DATE').watchFaceConfig,
        elements: [{
          id: `${name}_background`,
          type: 'IMG',
          name: 'Background',
          src: 'background.png',
          assetFilename: 'background.png',
          bounds: { x: 0, y: 0, width: 480, height: 480 },
          visible: true,
          zIndex: 0,
        }],
      },
    });

    let project = createFvwcProject('Two Themes');
    project = addSourceBuild(project, source('theme1', themedArtifact('theme1', 'data:image/png;base64,AA==')));
    project = addSourceBuild(project, source('theme2', themedArtifact('theme2', 'data:image/png;base64,AQ==')));
    project = createComponentGroup(project, {
      name: 'Theme 1',
      sourceBuildId: 'theme1',
      layerIds: ['theme1_background'],
    });
    project = createComponentGroup(project, {
      name: 'Theme 2',
      sourceBuildId: 'theme2',
      layerIds: ['theme2_background'],
    });
    project = createSlotFromGroup(project, project.componentGroups[0].id, 'Color Theme');
    project = addVariantToSlot(project, project.slots[0].id, project.componentGroups[1].id, 'STYLE_AND_DATA');

    const plan = compileEditableV2Plan(project);
    const paths = plan.slot.variants.map((variant) => variant.elements[0].src);

    expect(paths[0]).toMatch(/^editable\/variant_.*\/Background_0\.png$/);
    expect(paths[1]).toMatch(/^editable\/variant_.*\/Background_0\.png$/);
    expect(paths[0]).not.toBe(paths[1]);
    expect(plan.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: paths[0], dataUrl: 'data:image/png;base64,AA==' }),
      expect.objectContaining({ path: paths[1], dataUrl: 'data:image/png;base64,AQ==' }),
    ]));
    expect(plan.generatedCode.watchfaceIndexJs).toContain(paths[0]);
    expect(plan.generatedCode.watchfaceIndexJs).toContain(paths[1]);
  });

  it('blocks a single-variant first slice', () => {
    let project = createFvwcProject('Incomplete');
    project = addSourceBuild(project, source('heart', artifact('Heart', 'heart_value', 'HEART')));
    project = createComponentGroup(project, {
      name: 'Heart',
      sourceBuildId: 'heart',
      layerIds: ['heart_value'],
    });
    project = createSlotFromGroup(project, project.componentGroups[0].id, 'Readout');
    expect(() => compileEditableV2Plan(project)).toThrow(/two or three variants/);
  });
});
