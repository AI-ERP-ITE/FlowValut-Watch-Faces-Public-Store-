import { describe, expect, it } from 'vitest';
import { runEngine } from '../index.js';

function createSnapshotTemplate() {
  return {
    layout: { shape: 'circle', width: 320, height: 320, padding: 0, baseRadius: 0.5 },
    elements: [
      {
        id: 'snap-1',
        name: 'Metal Rect Snapshot Layer',
        type: 'free_rect',
        role: 'shape',
        params: {
          width: 0.36,
          height: 0.22,
          cornerRadius: 0.06,
          fill: '#9aa3b1',
          stroke: '#e9edf5',
          thickness: 0.016,
        },
        opacity: 0.65,
        materialLayers: [
          {
            enabled: true,
            color: '#9bc0ff',
            opacity: 0.28,
            blendMode: 'multiply',
          },
        ],
        dropShadow: {
          enabled: true,
          mode: 'outer',
          color: '#000000',
          opacity: 0.52,
          blur: 12,
          offsetX: 5,
          offsetY: 4,
        },
        placement: { mode: 'center', config: { offset: [12, -8], rotation: 33 } },
        symmetry: { mode: 'none', config: {} },
        mask: {
          enabled: true,
          coordinateSpace: 'local',
          strokes: [
            { tool: 'selection', shape: 'rect', action: 'reveal', opacity: 1, x: 10, y: 10, width: 80, height: 80 },
          ],
        },
        renderState: {
          sourceMode: 'snapshot',
          snapshotStatus: 'fresh',
          snapshot: {
            id: 'snap-1',
            imageDataUrl: 'data:image/png;base64,AAAA',
            sourceHash: 'v1:h00000000',
            width: 160,
            height: 160,
          },
        },
      },
    ],
  };
}

function createLiveBaselineTemplate() {
  return {
    layout: { shape: 'circle', width: 320, height: 320, padding: 0, baseRadius: 0.5 },
    elements: [
      {
        id: 'snap-1',
        name: 'Snapshot Layer',
        type: 'ring',
        role: 'ring',
        params: { radius: 30, width: 2, fill: '#ffffff' },
        opacity: 0.65,
        placement: { mode: 'center', config: { offset: [12, -8], rotation: 33 } },
        symmetry: { mode: 'none', config: {} },
      },
    ],
  };
}

describe('render source snapshot mode', () => {
  it('renders snapshot image source with transform, keeps masking, and does not re-run effect stack', () => {
    const svg = runEngine({ templateInput: createSnapshotTemplate() });
    const maskRefs = (svg.match(/mask="url\(#layerMask-el-0-0-mask-1-element\)"/g) || []).length;

    expect(svg.includes('href="data:image/png;base64,AAAA"')).toBe(true);
    expect(svg.includes('opacity="0.650"')).toBe(true);
    expect(svg.includes('transform="translate(198.4 134.4) rotate(33)"')).toBe(true);
    expect(maskRefs).toBe(1);
    expect(svg.includes('filter="url(#layerFx-el-0-0)"')).toBe(false);
    expect(svg.includes('<filter id="layerFx-el-0-0"')).toBe(false);
  });

  it('falls back safely to live rendering when snapshot payload is missing', () => {
    const fallbackTemplate = createLiveBaselineTemplate();
    fallbackTemplate.elements[0].renderState = {
      sourceMode: 'snapshot',
      snapshotStatus: 'missing',
      snapshot: null,
    };

    const liveSvg = runEngine({ templateInput: createLiveBaselineTemplate() });
    const fallbackSvg = runEngine({ templateInput: fallbackTemplate });

    expect(fallbackSvg).toBe(liveSvg);
    expect(fallbackSvg.includes('href="data:image/png;base64')).toBe(false);
  });

  it('falls back safely to live rendering when snapshot payload is corrupt', () => {
    const corruptTemplate = createLiveBaselineTemplate();
    corruptTemplate.elements[0].renderState = {
      sourceMode: 'snapshot',
      snapshotStatus: 'fresh',
      snapshot: {
        id: 'snap-1',
        imageDataUrl: '   ',
        sourceHash: 'v1:hdeadbeef',
        width: 0,
        height: 0,
      },
    };

    const liveSvg = runEngine({ templateInput: createLiveBaselineTemplate() });
    const fallbackSvg = runEngine({ templateInput: corruptTemplate });

    expect(fallbackSvg).toBe(liveSvg);
    expect(fallbackSvg.includes('href="data:image/png;base64')).toBe(false);
  });

  it('falls back to live rendering when snapshot status is outdated', () => {
    const outdatedTemplate = createLiveBaselineTemplate();
    outdatedTemplate.elements[0].renderState = {
      sourceMode: 'snapshot',
      snapshotStatus: 'outdated',
      snapshot: {
        id: 'snap-1',
        imageDataUrl: 'data:image/png;base64,AAAA',
        sourceHash: 'v1:holdstale',
        width: 160,
        height: 160,
      },
    };

    const fallbackSvg = runEngine({ templateInput: outdatedTemplate });

    expect(fallbackSvg.includes('href="data:image/png;base64,AAAA"')).toBe(false);
    expect(fallbackSvg.includes('transform="translate(198.4 134.4) rotate(33)"')).toBe(true);
    expect(fallbackSvg).toMatch(/<mask id="layerMask-el-0-0-mask-1-texture-0"[^>]*x="-160" y="-160" width="320" height="320"/);
  });

  it('keeps stale-fallback mask frame aligned to snapshot dimensions when snapshot metadata exists', () => {
    const fallbackTemplate = createLiveBaselineTemplate();
    fallbackTemplate.elements[0].mask = {
      enabled: true,
      coordinateSpace: 'local',
      strokes: [
        { tool: 'selection', shape: 'rect', action: 'reveal', opacity: 1, x: 15, y: 15, width: 60, height: 60 },
      ],
    };
    fallbackTemplate.elements[0].renderState = {
      sourceMode: 'snapshot',
      snapshotStatus: 'outdated',
      snapshot: {
        id: 'snap-1',
        imageDataUrl: 'data:image/png;base64,AAAA',
        sourceHash: 'v1:holdstale',
        width: 160,
        height: 120,
      },
    };

    const fallbackSvg = runEngine({ templateInput: fallbackTemplate });

    expect(fallbackSvg.includes('href="data:image/png;base64,AAAA"')).toBe(false);
    expect(fallbackSvg).toMatch(/<mask id="layerMask-el-0-0-mask-1-element"[^>]*width="160" height="120"/);
  });

  it('aligns multi-clip overlay mask regions to snapshot frame during live-fallback transitions', () => {
    const fallbackTemplate = createLiveBaselineTemplate();
    fallbackTemplate.elements[0].mask = {
      enabled: true,
      coordinateSpace: 'local',
      strokes: [
        { tool: 'selection', shape: 'rect', action: 'reveal', opacity: 1, x: 15, y: 15, width: 60, height: 60 },
      ],
    };
    fallbackTemplate.elements[0].textureLayers = [
      {
        enabled: true,
        kind: 'noise',
        opacity: 0.7,
        blendMode: 'overlay',
        clip: { enabled: true },
      },
    ];
    fallbackTemplate.elements[0].gradientLayers = [
      {
        enabled: true,
        kind: 'radial',
        opacity: 0.65,
        blendMode: 'overlay',
        center: [50, 50],
        focal: [50, 50],
        radius: 50,
        stops: [
          { offset: 0, color: '#ffffff', opacity: 0.3 },
          { offset: 1, color: '#000000', opacity: 0.15 },
        ],
        clip: { enabled: true },
      },
    ];
    fallbackTemplate.elements[0].materialLayers = [
      {
        enabled: true,
        color: '#88aaff',
        opacity: 0.25,
        blendMode: 'multiply',
        clip: { enabled: true },
      },
    ];
    fallbackTemplate.elements[0].renderState = {
      sourceMode: 'snapshot',
      snapshotStatus: 'outdated',
      snapshot: {
        id: 'snap-1',
        imageDataUrl: 'data:image/png;base64,AAAA',
        sourceHash: 'v1:holdstale',
        width: 160,
        height: 120,
      },
    };

    const fallbackSvg = runEngine({ templateInput: fallbackTemplate });

    expect(fallbackSvg).toMatch(/<mask id="layerMask-el-0-0-mask-1-texture-0"[^>]*x="-160" y="-120" width="320" height="240"/);
    expect(fallbackSvg).toMatch(/<mask id="layerMask-el-0-0-mask-1-gradient-0"[^>]*x="-160" y="-120" width="320" height="240"/);
    expect(fallbackSvg).toMatch(/<mask id="layerMask-el-0-0-mask-1-material-0"[^>]*x="-160" y="-120" width="320" height="240"/);
  });

  it('keeps delete-transition live rendering mask frame aligned via lastSnapshotFrame cache', () => {
    const liveTemplate = createLiveBaselineTemplate();
    liveTemplate.elements[0].mask = {
      enabled: true,
      coordinateSpace: 'local',
      strokes: [
        { tool: 'selection', shape: 'rect', action: 'reveal', opacity: 1, x: 20, y: 20, width: 40, height: 40 },
      ],
    };
    liveTemplate.elements[0].renderState = {
      sourceMode: 'live',
      snapshotStatus: 'missing',
      lastSnapshotFrame: {
        width: 180,
        height: 140,
      },
      snapshot: null,
    };

    const svg = runEngine({ templateInput: liveTemplate });

    expect(svg).toMatch(/<mask id="layerMask-el-0-0-mask-1-element"[^>]*width="180" height="140"/);
    expect(svg.includes('href="data:image/png;base64,AAAA"')).toBe(false);
  });

  it('preserves alpha-relevant rendering across live -> mask -> snapshot -> live flow', () => {
    const liveMaskedTemplate = createLiveBaselineTemplate();
    liveMaskedTemplate.elements[0].mask = {
      enabled: true,
      coordinateSpace: 'local',
      strokes: [
        { tool: 'selection', shape: 'rect', action: 'reveal', opacity: 1, x: 16, y: 16, width: 48, height: 48 },
      ],
    };

    const snapshotTemplate = JSON.parse(JSON.stringify(liveMaskedTemplate));
    snapshotTemplate.elements[0].renderState = {
      sourceMode: 'snapshot',
      snapshotStatus: 'fresh',
      snapshot: {
        id: 'snap-1',
        imageDataUrl: 'data:image/png;base64,AAAA',
        sourceHash: 'v1:h00000000',
        width: 160,
        height: 160,
      },
    };

    const backToLiveTemplate = JSON.parse(JSON.stringify(liveMaskedTemplate));
    backToLiveTemplate.elements[0].renderState = {
      sourceMode: 'live',
      snapshotStatus: 'missing',
      snapshot: null,
    };

    const liveSvg = runEngine({ templateInput: liveMaskedTemplate });
    const snapshotSvg = runEngine({ templateInput: snapshotTemplate });
    const backToLiveSvg = runEngine({ templateInput: backToLiveTemplate });

    expect(liveSvg).toMatch(/mask="url\(#layerMask-el-0-0-mask-1-element\)"/);
    expect(snapshotSvg).toMatch(/mask="url\(#layerMask-el-0-0-mask-1-element\)"/);
    expect(snapshotSvg.includes('href="data:image/png;base64,AAAA"')).toBe(true);
    expect(backToLiveSvg).toBe(liveSvg);
  });

  it('preserves snapshot rendering through mask stroke edit in live -> snapshot -> mask flow', () => {
    const snapshotTemplate = createSnapshotTemplate();
    const strokeEditedTemplate = JSON.parse(JSON.stringify(snapshotTemplate));
    strokeEditedTemplate.elements[0].mask.strokes = [
      { tool: 'selection', shape: 'rect', action: 'reveal', opacity: 1, x: 28, y: 24, width: 52, height: 56 },
    ];

    const snapshotSvg = runEngine({ templateInput: snapshotTemplate });
    const editedSvg = runEngine({ templateInput: strokeEditedTemplate });

    expect(snapshotSvg.includes('href="data:image/png;base64,AAAA"')).toBe(true);
    expect(editedSvg.includes('href="data:image/png;base64,AAAA"')).toBe(true);
    expect((snapshotSvg.match(/mask="url\(#layerMask-el-0-0-mask-1-element\)"/g) || []).length).toBe(1);
    expect((editedSvg.match(/mask="url\(#layerMask-el-0-0-mask-1-element\)"/g) || []).length).toBe(1);
    expect(snapshotSvg).not.toBe(editedSvg);
    expect(snapshotSvg.includes('filter="url(#layerFx-el-0-0)"')).toBe(false);
    expect(editedSvg.includes('filter="url(#layerFx-el-0-0)"')).toBe(false);
  });
});
