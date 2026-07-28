import type { BackgroundTransform, WatchFaceConfig, WatchFaceElement } from '@/types';

export interface ProjectFileEditorState {
  aodElements: WatchFaceElement[] | null;
  backgroundTransform: BackgroundTransform;
  aodBackgroundMode: WatchFaceConfig['aodBackgroundMode'];
  aodSolidColor: WatchFaceConfig['aodSolidColor'];
  aodBackgroundTransform: BackgroundTransform;
}

/**
 * Merge editor-local AOD state into the config serialized to .fvwf.
 * A null AOD set is intentional: the device generator then falls back to MAIN.
 */
export function buildProjectFileConfig(
  config: WatchFaceConfig,
  editorState: ProjectFileEditorState,
): WatchFaceConfig {
  return {
    ...config,
    backgroundTransform: editorState.backgroundTransform,
    aodElements: editorState.aodElements
      ? structuredClone(editorState.aodElements)
      : null,
    aodBackgroundMode: editorState.aodBackgroundMode,
    aodSolidColor: editorState.aodSolidColor,
    aodBackgroundTransform: editorState.aodBackgroundTransform,
  };
}
