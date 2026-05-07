import { describe, expect, it } from 'vitest';
import { runEngine } from '../index.js';

describe('mask field render parity', () => {
  it('uses field-backed mask image in renderer output path', () => {
    const dataUrl = 'data:image/png;base64,AAAA';
    const template = {
      layout: { shape: 'circle', width: 320, height: 320, padding: 0, baseRadius: 0.5 },
      elements: [
        {
          id: 'el-1',
          name: 'Field Masked Layer',
          type: 'ring',
          role: 'ring',
          params: { radius: 30, width: 2, fill: '#ffffff' },
          placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
          symmetry: { mode: 'none', config: {} },
          mask: {
            enabled: true,
            coordinateSpace: 'local',
            field: {
              version: 'v1',
              valuesEncoding: 'u8',
              width: 160,
              height: 120,
              values: new Array(160 * 120).fill(255),
              imageDataUrl: dataUrl,
              updatedAt: Date.now(),
              source: 'editable-buffer',
            },
            strokes: [
              { tool: 'selection', shape: 'rect', action: 'hide', opacity: 1, x: 20, y: 20, width: 40, height: 40 },
            ],
          },
        },
      ],
    };

    const svg = runEngine({ templateInput: template });

    expect(svg).toContain('mask-type:alpha');
    expect(svg).toContain(`href="${dataUrl}"`);
    expect(svg).toContain('mask="url(#layerMask-el-0-0-mask-1-element)"');
    // Field-backed path should not need primitive fallback payload to be authoritative.
    expect(svg.includes('fill="black" fill-opacity=')).toBe(false);
  });
});
