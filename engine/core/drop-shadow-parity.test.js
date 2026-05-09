import { describe, expect, it } from 'vitest';
import { buildGeometry } from './geometry.js';
import { compose } from './composer.js';
import { runEngine } from '../index.js';

function createTemplateWithDropShadow(enabled = true) {
  return {
    layout: { shape: 'circle', width: 454, height: 454, padding: 0, baseRadius: 0.5 },
    elements: [
      {
        id: 'ring-shadow',
        name: 'Ring Shadow',
        type: 'ring',
        role: 'ring',
        params: { radius: 48, width: 2.8 },
        dropShadow: enabled
          ? {
              color: '#000000',
              opacity: 0.55,
              blur: 10,
              offsetX: 3,
              offsetY: 4,
            }
          : undefined,
        placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
        symmetry: { mode: 'none', config: {} },
      },
    ],
  };
}

function createTemplateWithDepthEffect(effect3d) {
  return {
    layout: { shape: 'circle', width: 454, height: 454, padding: 0, baseRadius: 0.5 },
    elements: [
      {
        id: 'ring-depth',
        name: 'Ring Depth',
        type: 'ring',
        role: 'ring',
        params: { radius: 48, width: 2.8 },
        effect3d,
        placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
        symmetry: { mode: 'none', config: {} },
      },
    ],
  };
}

function extractDepthAOpacity(svg) {
  const match = svg.match(/flood-opacity="([0-9.]+)" result="depthA"/);
  return match ? Number(match[1]) : null;
}

function extractDropShadowStdDeviation(svg) {
  const match = svg.match(/stdDeviation="([0-9.]+)"[^>]*result="dsOuterBlur"/);
  return match ? Number(match[1]) : null;
}

function createSnapshotTemplateWithDropShadow(snapshotRenderMode = 'frozen') {
  const template = createTemplateWithDropShadow(true);
  const element = template.elements[0];
  element.renderState = {
    sourceMode: 'snapshot',
    snapshotStatus: 'fresh',
    snapshotRenderMode,
    snapshotRevisionHash: 'rev-1',
    snapshot: {
      imageDataUrl: 'data:image/png;base64,AAAA',
      width: 454,
      height: 454,
      snapshotRevisionHash: 'rev-1',
    },
  };
  return template;
}

describe('drop shadow pipeline parity', () => {
  it('keeps dropShadow through geometry and compose stages', () => {
    const geometry = buildGeometry(createTemplateWithDropShadow(true));
    const element = geometry.elements[0];

    expect(element.dropShadow).toBeTruthy();
    expect(element.dropShadow.opacity).toBe(0.55);

    const composed = compose(geometry, null, {}, {}, {});
    const composedElement = composed.elements[0];

    expect(composedElement.dropShadow).toBeTruthy();
    expect(composedElement.dropShadow.blur).toBe(10);
    expect(composedElement.dropShadow.offsetX).toBe(3);
    expect(composedElement.dropShadow.offsetY).toBe(4);
  });

  it('changes rendered SVG and emits feDropShadow when dropShadow is present', () => {
    const baseSvg = runEngine({
      activeStyle: 'gold_dark',
      templateInput: createTemplateWithDropShadow(false),
    });

    const shadowSvg = runEngine({
      activeStyle: 'gold_dark',
      templateInput: createTemplateWithDropShadow(true),
    });

    expect(shadowSvg).not.toBe(baseSvg);
    expect(shadowSvg).toContain('result="dsOuterBlur"');
    expect(shadowSvg).toContain('result="dropShadow"');
  });

  it('does not clip outer drop-shadow to SourceAlpha', () => {
    const shadowSvg = runEngine({
      activeStyle: 'gold_dark',
      templateInput: createTemplateWithDropShadow(true),
    });

    // Clipping to SourceAlpha removes outer shadow pixels.
    expect(shadowSvg).not.toContain('in="dropShadow" in2="SourceAlpha" operator="in" result="final"');
  });

  it('keeps subtle and aggressive depth presets visually distinct', () => {
    const subtleSvg = runEngine({
      activeStyle: 'gold_dark',
      templateInput: createTemplateWithDepthEffect({
        enabled: true,
        intensity: 0.12,
        angle: -35,
        distance: 0.6,
        falloff: 2.4,
        whiteBalance: -0.1,
        spread: 0.02,
      }),
    });

    const aggressiveSvg = runEngine({
      activeStyle: 'gold_dark',
      templateInput: createTemplateWithDepthEffect({
        enabled: true,
        intensity: 0.95,
        angle: 140,
        distance: 4.8,
        falloff: 0.35,
        whiteBalance: 0.75,
        spread: 0.85,
      }),
    });

    expect(aggressiveSvg).not.toBe(subtleSvg);
    expect(subtleSvg).toContain('result="depthA"');
    expect(aggressiveSvg).toContain('result="depthA"');

    const subtleOpacity = extractDepthAOpacity(subtleSvg);
    const aggressiveOpacity = extractDepthAOpacity(aggressiveSvg);
    expect(subtleOpacity).not.toBeNull();
    expect(aggressiveOpacity).not.toBeNull();
    expect(aggressiveOpacity).toBeGreaterThan(subtleOpacity);
  });

  it('supports inner and outer depth modes', () => {
    const outerSvg = runEngine({
      activeStyle: 'gold_dark',
      templateInput: createTemplateWithDepthEffect({
        enabled: true,
        mode: 'outer',
        intensity: 0.6,
        opacity: 0.9,
        angle: -35,
        distance: 1.8,
        falloff: 1,
        whiteBalance: 0,
        spread: 0.1,
      }),
    });

    const innerSvg = runEngine({
      activeStyle: 'gold_dark',
      templateInput: createTemplateWithDepthEffect({
        enabled: true,
        mode: 'inner',
        intensity: 0.6,
        opacity: 0.9,
        angle: -35,
        distance: 1.8,
        falloff: 1,
        whiteBalance: 0,
        spread: 0.1,
      }),
    });

    expect(outerSvg).toContain('feDropShadow');
    expect(innerSvg).toContain('depthInnerMaskA');
    expect(innerSvg).toContain('depthInnerMaskB');
    expect(innerSvg).not.toBe(outerSvg);
  });

  it('uses depth opacity independently from depth intensity', () => {
    const lowOpacitySvg = runEngine({
      activeStyle: 'gold_dark',
      templateInput: createTemplateWithDepthEffect({
        enabled: true,
        mode: 'outer',
        intensity: 0.7,
        opacity: 0.2,
        angle: 15,
        distance: 2,
        falloff: 1,
        whiteBalance: 0,
        spread: 0,
      }),
    });

    const highOpacitySvg = runEngine({
      activeStyle: 'gold_dark',
      templateInput: createTemplateWithDepthEffect({
        enabled: true,
        mode: 'outer',
        intensity: 0.7,
        opacity: 1,
        angle: 15,
        distance: 2,
        falloff: 1,
        whiteBalance: 0,
        spread: 0,
      }),
    });

    const lowOpacity = extractDepthAOpacity(lowOpacitySvg);
    const highOpacity = extractDepthAOpacity(highOpacitySvg);
    expect(lowOpacity).not.toBeNull();
    expect(highOpacity).not.toBeNull();
    expect(highOpacity).toBeGreaterThan(lowOpacity);
  });

  it('supports inner and outer drop-shadow modes', () => {
    const outer = createTemplateWithDropShadow(true);
    outer.elements[0].dropShadow = {
      mode: 'outer',
      color: '#000000',
      opacity: 0.6,
      blur: 12,
      offsetX: 5,
      offsetY: 3,
    };

    const inner = createTemplateWithDropShadow(true);
    inner.elements[0].dropShadow = {
      mode: 'inner',
      color: '#000000',
      opacity: 0.6,
      blur: 12,
      offsetX: 5,
      offsetY: 3,
    };

    const outerSvg = runEngine({ activeStyle: 'gold_dark', templateInput: outer });
    const innerSvg = runEngine({ activeStyle: 'gold_dark', templateInput: inner });

    expect(outerSvg).toContain('result="dsOuterBlur"');
    expect(innerSvg).toContain('dsInnerMask');
    expect(innerSvg).not.toBe(outerSvg);
  });

  it('keeps subtle and aggressive drop-shadow presets visually distinct', () => {
    const subtle = createTemplateWithDropShadow(true);
    subtle.elements[0].dropShadow = {
      color: '#000000',
      opacity: 0.14,
      blur: 3,
      offsetX: 1,
      offsetY: 1,
    };

    const aggressive = createTemplateWithDropShadow(true);
    aggressive.elements[0].dropShadow = {
      color: '#000000',
      opacity: 0.88,
      blur: 36,
      offsetX: 12,
      offsetY: 10,
    };

    const subtleSvg = runEngine({
      activeStyle: 'gold_dark',
      templateInput: subtle,
    });
    const aggressiveSvg = runEngine({
      activeStyle: 'gold_dark',
      templateInput: aggressive,
    });

    expect(aggressiveSvg).not.toBe(subtleSvg);
    expect(subtleSvg).toContain('result="dropShadow"');
    expect(aggressiveSvg).toContain('result="dropShadow"');

    const subtleBlur = extractDropShadowStdDeviation(subtleSvg);
    const aggressiveBlur = extractDropShadowStdDeviation(aggressiveSvg);
    expect(subtleBlur).not.toBeNull();
    expect(aggressiveBlur).not.toBeNull();
    expect(aggressiveBlur).toBeGreaterThan(subtleBlur);
  });

  it('routes frozen snapshot drop-shadow alpha through visible snapshot silhouette', () => {
    const svg = runEngine({
      activeStyle: 'gold_dark',
      templateInput: createSnapshotTemplateWithDropShadow('frozen'),
    });

    expect(svg).toContain('result="silhouetteAlpha"');
    expect(svg).toContain('in="silhouetteAlpha"');
  });

  it('routes editable snapshot drop-shadow alpha through visible snapshot silhouette', () => {
    const svg = runEngine({
      activeStyle: 'gold_dark',
      templateInput: createSnapshotTemplateWithDropShadow('editable'),
    });

    expect(svg).toContain('result="silhouetteAlpha"');
    expect(svg).toContain('in="silhouetteAlpha"');
  });
});
