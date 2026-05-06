export type ParametricRenderSourceMode = 'live' | 'snapshot';

export type ParametricSnapshotStatus = 'missing' | 'fresh' | 'outdated';

export type ParametricElementSnapshot = {
  id?: string;
  imageDataUrl?: string;
  sourceHash?: string;
  createdAt?: number;
  updatedAt?: number;
  width?: number;
  height?: number;
  mimeType?: string;
};

export type ParametricElementRenderState = {
  sourceMode?: ParametricRenderSourceMode;
  sourceHash?: string;
  snapshotStatus?: ParametricSnapshotStatus;
  snapshot?: ParametricElementSnapshot | null;
};
