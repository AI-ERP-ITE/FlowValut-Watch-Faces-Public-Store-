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
  sourceMode?: ParametricRenderSourceMode;
  snapshotRenderMode?: SnapshotRenderMode;
  sourceHash?: string;
  snapshotStatus?: ParametricSnapshotStatus;
  snapshot?: ParametricElementSnapshot | null;
};
