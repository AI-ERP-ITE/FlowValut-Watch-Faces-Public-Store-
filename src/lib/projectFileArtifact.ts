import type { WatchFaceConfig, WatchFaceElement } from '@/types';

export interface ProjectFileArtifact {
  version: 1;
  backgroundImage: string | null;
  /** Embedded uploaded AOD background. Optional for backward compatibility. */
  aodBackgroundImage?: string | null;
  watchFaceConfig: WatchFaceConfig;
}

export function createProjectFileArtifact(
  watchFaceConfig: WatchFaceConfig,
  backgroundImage: string | null,
  aodBackgroundImage: string | null = null,
): ProjectFileArtifact {
  return { version: 1, backgroundImage, aodBackgroundImage, watchFaceConfig };
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
    aodBackgroundImage: parsed.aodBackgroundImage ?? null,
    watchFaceConfig: annotateAqiCompatibility(
      migrateCanonicalZeppDataTypes(
        migrateTimeReadingElements(
          migrateLegacyTemperatureElements(
            annotateLegacyTrainingLoadArcs(
              migrateLegacyWeatherCurrentSwitchers(watchFaceConfig),
            ),
          ),
        ),
      ),
    ),
  };
}

export const AQI_COMPATIBILITY_WARNING =
  'Air Quality data is documented by Zepp as available only in mainland China.';

function annotateAqiElement(element: WatchFaceElement): WatchFaceElement {
  if (element.dataType !== 'AQI' || element.compatibilityWarning) return element;
  return { ...element, compatibilityWarning: AQI_COMPATIBILITY_WARNING };
}

/** Adds the official regional-availability warning without overwriting existing warnings. */
export function annotateAqiCompatibility(config: WatchFaceConfig): WatchFaceConfig {
  const elements = config.elements.map(annotateAqiElement);
  const aodElements = Array.isArray(config.aodElements)
    ? config.aodElements.map(annotateAqiElement)
    : config.aodElements;
  const mainChanged = elements.some((element, index) => element !== config.elements[index]);
  const aodChanged = Array.isArray(config.aodElements)
    && aodElements?.some((element, index) => element !== config.aodElements?.[index]);
  return mainChanged || aodChanged ? { ...config, elements, aodElements } : config;
}

function migrateCanonicalZeppDataTypeElement(element: WatchFaceElement): WatchFaceElement {
  const dataType = element.dataType === 'PAI'
    ? 'PAI_DAILY'
    : element.dataType === 'FAT_BURN'
      ? 'FAT_BURNING'
      : element.dataType;
  return dataType === element.dataType ? element : { ...element, dataType };
}

/** Canonicalizes two retired System A identifiers without touching any asset field. */
export function migrateCanonicalZeppDataTypes(config: WatchFaceConfig): WatchFaceConfig {
  const elements = config.elements.map(migrateCanonicalZeppDataTypeElement);
  const aodElements = Array.isArray(config.aodElements)
    ? config.aodElements.map(migrateCanonicalZeppDataTypeElement)
    : config.aodElements;
  const mainChanged = elements.some((element, index) => element !== config.elements[index]);
  const aodChanged = Array.isArray(config.aodElements)
    && aodElements?.some((element, index) => element !== config.aodElements?.[index]);
  return mainChanged || aodChanged ? { ...config, elements, aodElements } : config;
}

export const T016_TIME_READING_WARNING =
  'Time Readings rendering is pending T017; ZPK generation is blocked until implemented.';

function migrateTimeReadingElement(element: WatchFaceElement): WatchFaceElement {
  const isTimeSource = element.dataType === 'SUN_RISE' || element.dataType === 'SUN_SET';
  const isLegacyGeneric = isTimeSource && (element.type === 'TEXT' || element.type === 'TEXT_IMG');
  const isTimeReading = element.type === 'TIME_READING';
  if (!isLegacyGeneric && !isTimeReading) return element;

  const next: WatchFaceElement = {
    ...element,
    type: 'TIME_READING',
    timeReadingDisplay: 'DIGITAL',
  };
  if (next.compatibilityWarning === T016_TIME_READING_WARNING) {
    delete next.compatibilityWarning;
  }
  const changed = element.type !== next.type
    || element.timeReadingDisplay !== 'DIGITAL'
    || element.compatibilityWarning === T016_TIME_READING_WARNING;
  return changed ? next : element;
}

/** Canonicalizes Sunrise/Sunset files to the isolated, Digital-only Time Reading model. */
export function migrateTimeReadingElements(config: WatchFaceConfig): WatchFaceConfig {
  const elements = config.elements.map(migrateTimeReadingElement);
  const aodElements = Array.isArray(config.aodElements)
    ? config.aodElements.map(migrateTimeReadingElement)
    : config.aodElements;
  const mainChanged = elements.some((element, index) => element !== config.elements[index]);
  const aodChanged = Array.isArray(config.aodElements)
    && aodElements?.some((element, index) => element !== config.aodElements?.[index]);
  return mainChanged || aodChanged ? { ...config, elements, aodElements } : config;
}

export const TRAINING_LOAD_ARC_WARNING =
  'Legacy Training Load arc preserved. Training Load has no documented progress maximum; use Numeric Display for new designs.';

function annotateLegacyTrainingLoadArc(element: WatchFaceElement): WatchFaceElement {
  if (element.type !== 'ARC_PROGRESS' || element.dataType !== 'TRAINING_LOAD') return element;
  if (element.compatibilityWarning === TRAINING_LOAD_ARC_WARNING) return element;
  return { ...element, compatibilityWarning: TRAINING_LOAD_ARC_WARNING };
}

/** Preserves legacy Training Load arcs and adds a visible, idempotent warning. */
export function annotateLegacyTrainingLoadArcs(config: WatchFaceConfig): WatchFaceConfig {
  const elements = config.elements.map(annotateLegacyTrainingLoadArc);
  const aodElements = Array.isArray(config.aodElements)
    ? config.aodElements.map(annotateLegacyTrainingLoadArc)
    : config.aodElements;
  const mainChanged = elements.some((element, index) => element !== config.elements[index]);
  const aodChanged = Array.isArray(config.aodElements)
    && aodElements?.some((element, index) => element !== config.aodElements?.[index]);
  return mainChanged || aodChanged ? { ...config, elements, aodElements } : config;
}

function migrateLegacyWeatherElement(element: WatchFaceElement): WatchFaceElement {
  if (element.type !== 'IMG_LEVEL' || element.dataType !== 'WEATHER_CURRENT') return element;
  return { ...element, dataType: 'WEATHER_STATUS' };
}

/**
 * Retires the old condition-icon alias without touching numeric temperature.
 * The shallow element copy changes only dataType; IDs and every asset field remain byte-for-byte values.
 */
export function migrateLegacyWeatherCurrentSwitchers(config: WatchFaceConfig): WatchFaceConfig {
  const elements = config.elements.map(migrateLegacyWeatherElement);
  const aodElements = Array.isArray(config.aodElements)
    ? config.aodElements.map(migrateLegacyWeatherElement)
    : config.aodElements;
  const mainChanged = elements.some((element, index) => element !== config.elements[index]);
  const aodChanged = Array.isArray(config.aodElements)
    && aodElements?.some((element, index) => element !== config.aodElements?.[index]);
  return mainChanged || aodChanged ? { ...config, elements, aodElements } : config;
}

function migrateLegacyTemperatureElement(element: WatchFaceElement): WatchFaceElement {
  const isLegacyTemperatureText =
    (element.type === 'TEXT' || element.type === 'TEXT_IMG')
    && (element.dataType === 'WEATHER_CURRENT' || element.dataType === 'WEATHER_STATUS');
  if (!isLegacyTemperatureText) return element;
  if (element.type === 'TEXT_IMG' && element.dataType === 'WEATHER_CURRENT') return element;
  return { ...element, type: 'TEXT_IMG', dataType: 'WEATHER_CURRENT' };
}

/** Canonicalizes legacy temperature text bindings to Numeric Values (TEXT_IMG). */
export function migrateLegacyTemperatureElements(config: WatchFaceConfig): WatchFaceConfig {
  const elements = config.elements.map(migrateLegacyTemperatureElement);
  const aodElements = Array.isArray(config.aodElements)
    ? config.aodElements.map(migrateLegacyTemperatureElement)
    : config.aodElements;
  const mainChanged = elements.some((element, index) => element !== config.elements[index]);
  const aodChanged = Array.isArray(config.aodElements)
    && aodElements?.some((element, index) => element !== config.aodElements?.[index]);
  return mainChanged || aodChanged ? { ...config, elements, aodElements } : config;
}
