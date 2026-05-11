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

  it('baked-baked-mask element with painted mask field uses snapshot body, not live procedural', () => {
    const snapshotDataUrl = 'data:image/png;base64,SNAPSHOT';
    const maskDataUrl = 'data:image/png;base64,MASK';
    const template = {
      layout: { shape: 'circle', width: 320, height: 320, padding: 0, baseRadius: 0.5 },
      elements: [
        {
          id: 'baked-1',
          name: 'Baked Layer',
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
              height: 160,
              values: new Array(160 * 160).fill(255),
              imageDataUrl: maskDataUrl,
              updatedAt: Date.now(),
              source: 'editable-buffer',
            },
            strokes: [],
          },
          renderState: {
            sourceMode: 'snapshot',
            renderSourceMode: 'baked-baked-mask',
            maskEmbeddedInSnapshot: true,
            snapshotRenderMode: 'editable',
            snapshotStatus: 'fresh',
            snapshotRevisionHash: 'r1:h11111111',
            snapshot: {
              id: 'baked-1',
              imageDataUrl: snapshotDataUrl,
              sourceHash: 'v1:h00000000',
              snapshotRevisionHash: 'r1:h11111111',
              width: 320,
              height: 320,
            },
          },
        },
      ],
    };

    const svg = runEngine({ templateInput: template });

    // Snapshot body must be used — mask field must NOT force live rendering
    expect(svg).toContain(`href="${snapshotDataUrl}"`);
    // Mask field is applied on top of the snapshot body
    expect(svg).toContain(`href="${maskDataUrl}"`);
    // No live procedural ring geometry in body (snapshot image is the body)
  });

  it('procedural element with painted mask field still forces live rendering', () => {
    const maskDataUrl = 'data:image/png;base64,MASK';
    const staleSnapshotDataUrl = 'data:image/png;base64,STALE';
    const template = {
      layout: { shape: 'circle', width: 320, height: 320, padding: 0, baseRadius: 0.5 },
      elements: [
        {
          id: 'proc-1',
          name: 'Procedural Snapshotted Layer',
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
              height: 160,
              values: new Array(160 * 160).fill(255),
              imageDataUrl: maskDataUrl,
              updatedAt: Date.now(),
              source: 'editable-buffer',
            },
            strokes: [],
          },
          renderState: {
            sourceMode: 'snapshot',
            renderSourceMode: 'procedural',
            maskEmbeddedInSnapshot: false,
            snapshotRenderMode: 'editable',
            snapshotStatus: 'fresh',
            snapshotRevisionHash: 'r1:h22222222',
            snapshot: {
              id: 'proc-1',
              imageDataUrl: staleSnapshotDataUrl,
              sourceHash: 'v1:h00000000',
              snapshotRevisionHash: 'r1:h22222222',
              width: 320,
              height: 320,
            },
          },
        },
      ],
    };

    const svg = runEngine({ templateInput: template });

    // Stale snapshot must NOT be used — procedural element with mask field stays live
    expect(svg).not.toContain(`href="${staleSnapshotDataUrl}"`);
    // Mask field is still applied
    expect(svg).toContain(`href="${maskDataUrl}"`);
  });
});
