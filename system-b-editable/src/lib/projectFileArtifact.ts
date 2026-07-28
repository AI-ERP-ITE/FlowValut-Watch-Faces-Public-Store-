import type { WatchFaceConfig } from '@/types';

export interface ProjectFileArtifact {
  version: 1;
  backgroundImage: string | null;
  watchFaceConfig: WatchFaceConfig;
}

export function createProjectFileArtifact(
  watchFaceConfig: WatchFaceConfig,
  backgroundImage: string | null,
): ProjectFileArtifact {
  return { version: 1, backgroundImage, watchFaceConfig };
}

export function serializeProjectFileArtifact(artifact: ProjectFileArtifact): string {
  return JSON.stringify(artifact, null, 2);
}

export function createProjectFileBlob(artifact: ProjectFileArtifact): Blob {
  return new Blob([serializeProjectFileArtifact(artifact)], { type: 'application/json' });
}

export function parseProjectFileArtifact(text: string): ProjectFileArtifact {
  const parsed = JSON.parse(text) as Partial<ProjectFileArtifact> & Partial<WatchFaceConfig>;
  const watchFaceConfig = parsed.watchFaceConfig ?? (parsed as WatchFaceConfig);
  if (!watchFaceConfig || !Array.isArray(watchFaceConfig.elements)) {
    throw new Error('Invalid project file');
  }
  return {
    version: 1,
    backgroundImage: parsed.backgroundImage ?? null,
    watchFaceConfig,
  };
}

