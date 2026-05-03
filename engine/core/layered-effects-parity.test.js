import { describe, expect, it } from 'vitest';
import { buildGeometry } from './geometry.js';
import { compose } from './composer.js';
import { runEngine } from '../index.js';

function createTemplateWithLayers() {
  return {
    layout: { shape: 'circle', width: 454, height: 454, padding: 0, baseRadius: 0.5 },
    elements: [
      {
        id: 'ring-1',
        name: 'Ring 1',
        type: 'ring',
        role: 'ring',
        params: { radius: 44, width: 2.2 },
        textureLayers: [
          {
            enabled: true,
            kind: 'noise',
            opacity: 0.85,
            blendMode: 'overlay',
            noise: { amount: 2.2, radius: 18 },
            blur: { enabled: false, type: 'gaussian', amount: 0, samples: 8, angle: 0, strength: 0.5 },
            gradient: {
              kind: 'linear',
              from: [0, 0],
              to: [100, 100],
              stops: [
                { offset: 0, color: '#ffffff', opacity: 0.22 },
                { offset: 1, color: '#000000', opacity: 0.18 },
              ],
            },
          },
        ],
        gradientLayers: [
          {
            enabled: true,
            kind: 'radial',
            opacity: 0.7,
            blendMode: 'overlay',
            center: [50, 50],
            focal: [40, 40],
            radius: 60,
            stops: [
              { offset: 0, color: '#ffffff', opacity: 0.3 },
              { offset: 1, color: '#000000', opacity: 0.15 },
            ],
            blur: { enabled: false, type: 'gaussian', amount: 0, samples: 8, angle: 0, strength: 0.5 },
          },
        ],
        materialLayers: [
          {
            enabled: true,
            color: '#88aaff',
            opacity: 0.4,
            blendMode: 'multiply',
          },
        ],
        placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
        symmetry: { mode: 'none', config: {} },
      },
    ],
  };
}

function extractLayerMaskCircleRadius(svg, maskId) {
  const escapedMaskId = maskId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escapedMaskId}"[^>]*>[\\s\\S]*?<circle[^>]*r="([0-9.]+)"`);
  const match = svg.match(regex);
  return match ? Number(match[1]) : null;
}

function createTargetNameClipTemplate(keepNames) {
  return {
    layout: { width: 100, height: 100, shape: 'rectangle' },
    elements: [
      {
        ...(keepNames ? { name: 'targetA' } : {}),
        type: 'circle',
        role: 'shape',
        params: { r: 12, fill: '#ffffff' },
        placement: { mode: 'center', config: { offset: [-20, 0], rotation: 0 } },
        symmetry: { mode: 'none', config: {} },
      },
      {
        ...(keepNames ? { name: 'clipB' } : {}),
        type: 'circle',
        role: 'shape',
        params: { r: 6, fill: '#ff0000' },
        placement: { mode: 'center', config: { offset: [20, 0], rotation: 0 } },
        symmetry: { mode: 'none', config: {} },
        textureLayers: [
          {
            enabled: true,
            opacity: 0.9,
            blendMode: 'normal',
            texture: 'none',
            clip: { enabled: true, targetName: 'targetA' },
          },
        ],
      },
    ],
  };
}

function createInheritPreviousClipTemplate(keepNames) {
  return {
    layout: { width: 100, height: 100, shape: 'rectangle' },
    elements: [
      {
        ...(keepNames ? { name: 'firstA' } : {}),
        type: 'circle',
        role: 'shape',
        params: { r: 14, fill: '#ffffff' },
        placement: { mode: 'center', config: { offset: [-30, 0], rotation: 0 } },
        symmetry: { mode: 'none', config: {} },
      },
      {
        ...(keepNames ? { name: 'secondB' } : {}),
        type: 'circle',
        role: 'shape',
        params: { r: 7, fill: '#00ff00' },
        placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
        symmetry: { mode: 'none', config: {} },
      },
      {
        ...(keepNames ? { name: 'thirdC' } : {}),
        type: 'circle',
        role: 'shape',
        params: { r: 4, fill: '#ff0000' },
        placement: { mode: 'center', config: { offset: [30, 0], rotation: 0 } },
        symmetry: { mode: 'none', config: {} },
        textureLayers: [
          {
            enabled: true,
            opacity: 0.9,
            blendMode: 'normal',
            texture: 'none',
            clip: { enabled: true, inheritPrevious: true },
          },
        ],
      },
    ],
  };
}

describe('layered effects pipeline parity', () => {
  it('keeps layer arrays through geometry and compose stages', () => {
    const geometry = buildGeometry(createTemplateWithLayers());
    const element = geometry.elements[0];

    expect(Array.isArray(element.textureLayers)).toBe(true);
    expect(Array.isArray(element.gradientLayers)).toBe(true);
    expect(Array.isArray(element.materialLayers)).toBe(true);
    expect(element.textureLayers).toHaveLength(1);
    expect(element.gradientLayers).toHaveLength(1);
    expect(element.materialLayers).toHaveLength(1);

    const composed = compose(geometry, null, {}, {}, {});
    const composedElement = composed.elements[0];

    expect(Array.isArray(composedElement.textureLayers)).toBe(true);
    expect(Array.isArray(composedElement.gradientLayers)).toBe(true);
    expect(Array.isArray(composedElement.materialLayers)).toBe(true);
    expect(composedElement.textureLayers).toHaveLength(1);
    expect(composedElement.gradientLayers).toHaveLength(1);
    expect(composedElement.materialLayers).toHaveLength(1);
  });

  it('changes rendered SVG when each layered effect family is toggled', () => {
    const baseTemplate = createTemplateWithLayers();

    const baseSvg = runEngine({
      activeStyle: 'gold_dark',
      templateInput: baseTemplate,
    });

    const textureOffTemplate = createTemplateWithLayers();
    textureOffTemplate.elements[0].textureLayers[0].enabled = false;
    const textureOffSvg = runEngine({
      activeStyle: 'gold_dark',
      templateInput: textureOffTemplate,
    });
    expect(textureOffSvg).not.toBe(baseSvg);

    const gradientOffTemplate = createTemplateWithLayers();
    gradientOffTemplate.elements[0].gradientLayers[0].enabled = false;
    const gradientOffSvg = runEngine({
      activeStyle: 'gold_dark',
      templateInput: gradientOffTemplate,
    });
    expect(gradientOffSvg).not.toBe(baseSvg);

    const materialOffTemplate = createTemplateWithLayers();
    materialOffTemplate.elements[0].materialLayers[0].enabled = false;
    const materialOffSvg = runEngine({
      activeStyle: 'gold_dark',
      templateInput: materialOffTemplate,
    });
    expect(materialOffSvg).not.toBe(baseSvg);
  });

  it('uses named clip target when targetName is present and falls back without names', () => {
    const withNamesSvg = runEngine({ templateInput: createTargetNameClipTemplate(true) });
    const withoutNamesSvg = runEngine({ templateInput: createTargetNameClipTemplate(false) });

    const withNamesRadius = extractLayerMaskCircleRadius(withNamesSvg, 'layerMask-el-1-0-texture-0');
    const withoutNamesRadius = extractLayerMaskCircleRadius(withoutNamesSvg, 'layerMask-el-1-0-texture-0');

    expect(withNamesRadius).toBe(12);
    expect(withoutNamesRadius).toBe(6);
  });

  it('uses previous named element for inheritPrevious and falls back without names', () => {
    const withNamesSvg = runEngine({ templateInput: createInheritPreviousClipTemplate(true) });
    const withoutNamesSvg = runEngine({ templateInput: createInheritPreviousClipTemplate(false) });

    const withNamesRadius = extractLayerMaskCircleRadius(withNamesSvg, 'layerMask-el-2-0-texture-0');
    const withoutNamesRadius = extractLayerMaskCircleRadius(withoutNamesSvg, 'layerMask-el-2-0-texture-0');

    expect(withNamesRadius).toBe(7);
    expect(withoutNamesRadius).toBe(4);
  });
});
