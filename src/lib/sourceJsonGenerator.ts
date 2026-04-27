import type { WatchFaceConfig } from '@/types';

/**
 * Shape stored inside docs/zpk/{id}/source.json.
 * Used for safe ZPK regeneration without patching existing files.
 */
export interface SourceJson {
  name: string;
  specGroup: string | null;   // populated by PublishForm
  resolution: string;         // "480x480"
  shape: 'round' | 'square';
  watchModel: string;
  elements: WatchFaceConfig['elements'];
  aodElements: WatchFaceConfig['aodElements'];
  aodBackgroundMode?: WatchFaceConfig['aodBackgroundMode'];
  aodBackgroundSrc?: WatchFaceConfig['aodBackgroundSrc'];
  aodSolidColor?: WatchFaceConfig['aodSolidColor'];
  background: WatchFaceConfig['background'];
  generatorVersion: string;   // "v2" | "v3"
  createdAt: string;          // ISO date string
}

const GENERATOR_VERSION = '2'; // bump when breaking changes are made to code generator

/**
 * Serialize a WatchFaceConfig into source.json format.
 *
 * @param config - The full WatchFaceConfig used to generate the ZPK
 * @param specGroup - The spec group key (e.g. "480-round-v2"), null until PublishForm fills it
 */
export function buildSourceJson(
  config: WatchFaceConfig,
  specGroup: string | null = null
): SourceJson {
  const { width, height } = config.resolution;

  return {
    name: config.name,
    specGroup,
    resolution: `${width}x${height}`,
    shape: width === height ? 'round' : 'square',
    watchModel: config.watchModel,
    elements: config.elements,
    aodElements: config.aodElements ?? null,
    aodBackgroundMode: config.aodBackgroundMode ?? 'USE_MAIN_BACKGROUND',
    aodBackgroundSrc: config.aodBackgroundSrc ?? null,
    aodSolidColor: config.aodSolidColor ?? null,
    background: config.background,
    generatorVersion: `v${GENERATOR_VERSION}`,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Serialize source.json to a Blob ready for upload.
 */
export function sourceJsonToBlob(source: SourceJson): Blob {
  return new Blob([JSON.stringify(source, null, 2)], {
    type: 'application/json',
  });
}
