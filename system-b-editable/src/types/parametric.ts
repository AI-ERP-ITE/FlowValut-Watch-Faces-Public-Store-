import type { RenderSourceMode } from './renderSourceMode';

export type ParametricRenderSourceMode = 'live' | 'snapshot';

export type SnapshotRenderMode = 'frozen' | 'editable';

export type ParametricSnapshotStatus = 'missing' | 'fresh' | 'outdated';

export type ParametricElementSnapshot = {
  id?: string;
  imageDataUrl?: string;
  sourceHash?: string;
  snapshotRevisionHash?: string;
  createdAt?: number;
  updatedAt?: number;
  width?: number;
  height?: number;
  mimeType?: string;
};

export type ParametricElementRenderState = {
  /**
   * Legacy view-toggle: which surface is being rendered right now.
   * Kept for backward compatibility. The CANONICAL state is `renderSourceMode`.
   */
  sourceMode?: ParametricRenderSourceMode;
  snapshotRenderMode?: SnapshotRenderMode;
  sourceHash?: string;
  snapshotStatus?: ParametricSnapshotStatus;
  snapshot?: ParametricElementSnapshot | null;
  /**
   * Explicit, persistent canonical render-source state.
   * After one-time migration this is the ONLY field consumed by the source
   * resolver. Renderer/effects MUST NOT re-infer this from visuals.
   */
  renderSourceMode?: RenderSourceMode;
  /**
   * Explicit metadata: was the live mask embedded into the baked snapshot at
   * capture time? Required to disambiguate `baked-live-mask` vs
   * `baked-baked-mask` in future rebake chains. Only meaningful when a
   * snapshot exists.
   */
  maskEmbeddedInSnapshot?: boolean;
};
