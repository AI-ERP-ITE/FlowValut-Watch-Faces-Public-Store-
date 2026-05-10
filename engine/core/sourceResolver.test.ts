import { describe, it, expect } from 'vitest';
import {
  resolveRenderSourceMode,
  resolveSurfaceSource,
  resolveSilhouetteSource,
} from './sourceResolver';
import {
  migrateElementRenderSourceMode,
  inferLegacyRenderSourceMode,
} from '../../src/lib/renderSourceModeMigration';
import {
  transitionToBakedLiveMask,
  transitionToBakedBakedMask,
  transitionToProcedural,
} from '../../src/lib/renderSourceModeTransitions';

const PNG = 'data:image/png;base64,AAAA';

function proceduralEl(): Record<string, unknown> {
  return {
    id: 'el-proc',
    type: 'ring',
    renderState: { sourceMode: 'live', snapshotStatus: 'missing', snapshot: null },
  };
}

function bakedLiveMaskEl(): Record<string, unknown> {
  return {
    id: 'el-blm',
    type: 'ring',
    mask: { kind: 'circle', radius: 50 },
    renderState: {
      sourceMode: 'snapshot',
      snapshotStatus: 'fresh',
      snapshot: { imageDataUrl: PNG, width: 100, height: 100 },
      renderSourceMode: 'baked-live-mask',
      maskEmbeddedInSnapshot: false,
    },
  };
}

function bakedBakedMaskEl(): Record<string, unknown> {
  return {
    id: 'el-bbm',
    type: 'ring',
    renderState: {
      sourceMode: 'snapshot',
      snapshotStatus: 'fresh',
      snapshot: { imageDataUrl: PNG, width: 100, height: 100 },
      renderSourceMode: 'baked-baked-mask',
      maskEmbeddedInSnapshot: true,
    },
  };
}

describe('renderSourceMode resolver — STATE A: procedural', () => {
  it('resolves mode procedural', () => {
    expect(resolveRenderSourceMode(proceduralEl())).toBe('procedural');
  });
  it('surface=procedural, silhouette=procedural-vector with no mask', () => {
    const el = proceduralEl();
    expect(resolveSurfaceSource(el)).toEqual({ kind: 'procedural', elementId: 'el-proc' });
    expect(resolveSilhouetteSource(el)).toEqual({
      kind: 'procedural-vector',
      elementId: 'el-proc',
      liveMaskKey: null,
    });
  });
  it('silhouette intersects current live mask key', () => {
    const el = { ...proceduralEl(), mask: { kind: 'circle', radius: 30 } };
    const sil = resolveSilhouetteSource(el);
    expect(sil.kind).toBe('procedural-vector');
    expect((sil as { liveMaskKey: string | null }).liveMaskKey).toBe('circle');
  });
});

describe('renderSourceMode resolver — STATE B: baked-live-mask', () => {
  it('resolves mode baked-live-mask', () => {
    expect(resolveRenderSourceMode(bakedLiveMaskEl())).toBe('baked-live-mask');
  });
  it('surface=baked-image, silhouette=baked-alpha intersected with live mask', () => {
    const el = bakedLiveMaskEl();
    const surface = resolveSurfaceSource(el);
    expect(surface).toEqual({ kind: 'baked-image', imageDataUrl: PNG, width: 100, height: 100 });
    const sil = resolveSilhouetteSource(el);
    expect(sil.kind).toBe('baked-alpha');
    expect((sil as { additionalLiveMaskKey: string | null }).additionalLiveMaskKey).toBe('circle');
  });
});

describe('renderSourceMode resolver — STATE C: baked-baked-mask', () => {
  it('resolves mode baked-baked-mask', () => {
    expect(resolveRenderSourceMode(bakedBakedMaskEl())).toBe('baked-baked-mask');
  });
  it('surface=baked-image, silhouette=baked-alpha with no extra mask', () => {
    const el = bakedBakedMaskEl();
    expect(resolveSurfaceSource(el)).toEqual({ kind: 'baked-image', imageDataUrl: PNG, width: 100, height: 100 });
    const sil = resolveSilhouetteSource(el);
    expect(sil.kind).toBe('baked-alpha');
    expect((sil as { additionalLiveMaskKey: string | null }).additionalLiveMaskKey).toBeNull();
  });
  it('additional live mask added later is exposed via additionalLiveMaskKey', () => {
    const el = { ...bakedBakedMaskEl(), mask: { kind: 'rect', width: 10, height: 10 } };
    const sil = resolveSilhouetteSource(el);
    expect(sil.kind).toBe('baked-alpha');
    expect((sil as { additionalLiveMaskKey: string | null }).additionalLiveMaskKey).toBe('rect');
  });
});

describe('renderSourceMode migration', () => {
  it('legacy: no snapshot -> procedural', () => {
    const el = { id: 'a', renderState: { sourceMode: 'live', snapshot: null } };
    expect(inferLegacyRenderSourceMode(el)).toBe('procedural');
    const migrated = migrateElementRenderSourceMode(el);
    expect((migrated.renderState as { renderSourceMode: string }).renderSourceMode).toBe('procedural');
    expect((migrated.renderState as { maskEmbeddedInSnapshot: boolean }).maskEmbeddedInSnapshot).toBe(false);
  });
  it('legacy: snapshot + mask -> baked-live-mask', () => {
    const el = {
      id: 'b',
      mask: { kind: 'circle' },
      renderState: { sourceMode: 'snapshot', snapshot: { imageDataUrl: PNG, width: 1, height: 1 } },
    };
    expect(inferLegacyRenderSourceMode(el)).toBe('baked-live-mask');
    const migrated = migrateElementRenderSourceMode(el);
    expect((migrated.renderState as { renderSourceMode: string }).renderSourceMode).toBe('baked-live-mask');
    expect((migrated.renderState as { maskEmbeddedInSnapshot: boolean }).maskEmbeddedInSnapshot).toBe(false);
  });
  it('legacy: snapshot + no mask -> baked-baked-mask', () => {
    const el = {
      id: 'c',
      renderState: { sourceMode: 'snapshot', snapshot: { imageDataUrl: PNG, width: 1, height: 1 } },
    };
    expect(inferLegacyRenderSourceMode(el)).toBe('baked-baked-mask');
    const migrated = migrateElementRenderSourceMode(el);
    expect((migrated.renderState as { renderSourceMode: string }).renderSourceMode).toBe('baked-baked-mask');
    expect((migrated.renderState as { maskEmbeddedInSnapshot: boolean }).maskEmbeddedInSnapshot).toBe(true);
  });
  it('idempotent: explicit value is preserved as-is', () => {
    const el = { id: 'd', renderState: { renderSourceMode: 'procedural', snapshot: null } };
    const migrated = migrateElementRenderSourceMode(el);
    expect(migrated).toBe(el);
  });
});

describe('renderSourceMode transitions', () => {
  it('transitionToBakedLiveMask stamps mode + flag', () => {
    const next = transitionToBakedLiveMask(proceduralEl());
    expect((next.renderState as { renderSourceMode: string }).renderSourceMode).toBe('baked-live-mask');
    expect((next.renderState as { maskEmbeddedInSnapshot: boolean }).maskEmbeddedInSnapshot).toBe(false);
  });
  it('transitionToBakedBakedMask stamps mode + flag', () => {
    const next = transitionToBakedBakedMask(proceduralEl());
    expect((next.renderState as { renderSourceMode: string }).renderSourceMode).toBe('baked-baked-mask');
    expect((next.renderState as { maskEmbeddedInSnapshot: boolean }).maskEmbeddedInSnapshot).toBe(true);
  });
  it('transitionToProcedural restores procedural', () => {
    const next = transitionToProcedural(bakedBakedMaskEl());
    expect((next.renderState as { renderSourceMode: string }).renderSourceMode).toBe('procedural');
    expect((next.renderState as { maskEmbeddedInSnapshot: boolean }).maskEmbeddedInSnapshot).toBe(false);
  });
});

describe('resolver does NOT consult historical geometry', () => {
  it('ignores ghost geometry / params when mode is baked-*', () => {
    // Element claims baked-baked-mask. We add wild ghost params that would
    // suggest an entirely different shape. The resolver MUST ignore them
    // and trust ONLY the explicit metadata + snapshot pixels.
    const el = {
      ...bakedBakedMaskEl(),
      params: { radius: 999, sides: 17, ghostGeometry: 'star' },
      // Pretend a previous procedural render existed.
      __previousSilhouette: 'rectangle-ghost',
    };
    const sil = resolveSilhouetteSource(el);
    expect(sil.kind).toBe('baked-alpha');
    // Result depends ONLY on snapshot fields.
    expect((sil as { width: number }).width).toBe(100);
    expect((sil as { imageDataUrl: string }).imageDataUrl).toBe(PNG);
  });
  it('degrades safely if baked mode is declared but snapshot pixels missing', () => {
    const el = {
      id: 'el-broken',
      renderState: {
        renderSourceMode: 'baked-live-mask',
        snapshot: null,
      },
    };
    expect(resolveSurfaceSource(el).kind).toBe('procedural');
    expect(resolveSilhouetteSource(el).kind).toBe('procedural-vector');
  });
});
