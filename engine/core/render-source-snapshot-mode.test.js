import { describe, expect, it } from 'vitest';
import { runEngine } from '../index.js';

function createSnapshotTemplate() {
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
  it('renders snapshot image source with transform and mask gates', () => {
    const svg = runEngine({ templateInput: createSnapshotTemplate() });

    expect(svg.includes('href="data:image/png;base64,AAAA"')).toBe(true);
    expect(svg.includes('opacity="0.650"')).toBe(true);
    expect(svg.includes('transform="translate(198.4 134.4) rotate(33)"')).toBe(true);
    expect(svg.includes('mask="url(#layerMask-el-0-0-mask-1-element)"')).toBe(true);
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
});
