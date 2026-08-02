import { describe, expect, it } from 'vitest';
import type { WatchFaceConfig } from '@/types';
import {
  createProjectFileArtifact,
  parseProjectFileArtifact,
  serializeProjectFileArtifact,
  migrateLegacyWeatherCurrentSwitchers,
  migrateLegacyTemperatureElements,
  annotateLegacyTrainingLoadArcs,
  TRAINING_LOAD_ARC_WARNING,
  migrateTimeReadingElements,
  T016_TIME_READING_WARNING,
} from './projectFileArtifact';

const config = {
  name: 'Workshop test',
  watchModel: 'Amazfit Balance 2',
  resolution: { width: 480, height: 480 },
  elements: [],
} as unknown as WatchFaceConfig;

describe('projectFileArtifact', () => {
  it('round-trips the exact wrapped FVWF editor payload', () => {
    const artifact = createProjectFileArtifact(config, 'data:image/png;base64,abc');
    expect(parseProjectFileArtifact(serializeProjectFileArtifact(artifact))).toEqual(artifact);
  });

  it('retains compatibility with bare WatchFaceConfig project files', () => {
    expect(parseProjectFileArtifact(JSON.stringify(config))).toEqual({
      version: 1,
      backgroundImage: null,
      aodBackgroundImage: null,
      watchFaceConfig: config,
    });
  });

  it('round-trips an uploaded AOD background while old files default it to null', () => {
    const artifact = createProjectFileArtifact(
      config,
      'data:image/png;base64,main',
      'data:image/png;base64,aod',
    );
    const restored = parseProjectFileArtifact(serializeProjectFileArtifact(artifact));
    expect(restored.backgroundImage).toBe('data:image/png;base64,main');
    expect(restored.aodBackgroundImage).toBe('data:image/png;base64,aod');

    const legacy = parseProjectFileArtifact(JSON.stringify({
      version: 1,
      backgroundImage: 'data:image/png;base64,main',
      watchFaceConfig: config,
    }));
    expect(legacy.aodBackgroundImage).toBeNull();
  });

  it('round-trips the export-only watch-safe label toggle', () => {
    const watchSafeConfig = structuredClone(config);
    watchSafeConfig.elements = [{
      id: 'month',
      type: 'IMG_DATE',
      subtype: 'month',
      name: 'Month',
      bounds: { x: 10, y: 20, width: 60, height: 21 },
      visible: true,
      zIndex: 1,
      watchSafeTextEdges: true,
    }];
    const restored = parseProjectFileArtifact(
      serializeProjectFileArtifact(createProjectFileArtifact(watchSafeConfig, null)),
    );
    expect(restored.watchFaceConfig.elements[0].watchSafeTextEdges).toBe(true);
  });

  it('migrates only legacy weather-condition switchers and preserves every asset field', () => {
    const legacy = structuredClone(config);
    const legacyWeather = {
      id: 'legacy-weather', type: 'IMG_LEVEL', name: 'My custom weather',
      dataType: 'WEATHER_CURRENT', bounds: { x: 11, y: 22, width: 60, height: 60 },
      visible: true, zIndex: 4, images: Array.from({ length: 29 }, (_, code) => `custom_${code}.png`),
      imageSwitcherDefinitionId: 'custom-weather-definition', imageSwitcherFrameCount: 29,
      weatherStyle: 'neon', src: 'custom_0.png',
    } as const;
    const numericTemperature = {
      id: 'temperature', type: 'TEXT_IMG', name: 'Temperature', dataType: 'WEATHER_CURRENT',
      bounds: { x: 90, y: 100, width: 80, height: 30 }, visible: true, zIndex: 5,
      fontArray: Array.from({ length: 10 }, (_, digit) => `temp_${digit}.png`),
    } as const;
    legacy.elements = [legacyWeather, numericTemperature] as unknown as WatchFaceConfig['elements'];
    legacy.aodElements = [structuredClone(legacyWeather)] as unknown as WatchFaceConfig['aodElements'];

    const restored = parseProjectFileArtifact(serializeProjectFileArtifact(
      createProjectFileArtifact(legacy, 'data:image/png;base64,background'),
    ));
    const migrated = restored.watchFaceConfig.elements[0];

    expect(migrated).toEqual({ ...legacyWeather, dataType: 'WEATHER_STATUS' });
    expect(restored.watchFaceConfig.elements[1]).toEqual(numericTemperature);
    expect(restored.watchFaceConfig.aodElements?.[0]).toEqual({
      ...legacyWeather,
      dataType: 'WEATHER_STATUS',
    });
    expect(restored.backgroundImage).toBe('data:image/png;base64,background');
  });

  it('is idempotent after the legacy switcher migration', () => {
    const legacy = structuredClone(config);
    legacy.elements = [{
      id: 'legacy', type: 'IMG_LEVEL', name: 'Legacy', dataType: 'WEATHER_CURRENT',
      bounds: { x: 0, y: 0, width: 60, height: 60 }, visible: true, zIndex: 1,
      images: Array.from({ length: 29 }, (_, code) => `weather_${code}.png`),
    }];
    const once = migrateLegacyWeatherCurrentSwitchers(legacy);
    const twice = migrateLegacyWeatherCurrentSwitchers(once);
    expect(twice).toBe(once);
    expect(twice.elements[0].dataType).toBe('WEATHER_STATUS');
  });

  it('canonicalizes legacy temperature text without changing visual or asset fields', () => {
    const legacy = structuredClone(config);
    const plainText = {
      id: 'plain-temperature', type: 'TEXT', name: 'Outdoor temperature',
      dataType: 'WEATHER_CURRENT', bounds: { x: 12, y: 18, width: 120, height: 42 },
      visible: true, zIndex: 3, text: '24°', fontSize: 31, color: '#AABBCC',
      alignH: 'RIGHT', hSpace: 2, src: 'temperature-source.png',
    } as const;
    const statusDigits = {
      id: 'status-temperature', type: 'TEXT_IMG', name: 'Legacy status digits',
      dataType: 'WEATHER_STATUS', bounds: { x: 40, y: 80, width: 90, height: 34 },
      visible: true, zIndex: 4,
      fontArray: Array.from({ length: 10 }, (_, digit) => `custom_temp_${digit}.png`),
    } as const;
    const canonicalDigits = {
      ...statusDigits,
      id: 'canonical-temperature',
      dataType: 'WEATHER_CURRENT',
    } as const;
    legacy.elements = [plainText, statusDigits, canonicalDigits] as unknown as WatchFaceConfig['elements'];
    legacy.aodElements = [structuredClone(plainText)] as unknown as WatchFaceConfig['aodElements'];

    const restored = parseProjectFileArtifact(serializeProjectFileArtifact(
      createProjectFileArtifact(legacy, null),
    )).watchFaceConfig;

    expect(restored.elements[0]).toEqual({
      ...plainText,
      type: 'TEXT_IMG',
      dataType: 'WEATHER_CURRENT',
    });
    expect(restored.elements[1]).toEqual({
      ...statusDigits,
      dataType: 'WEATHER_CURRENT',
    });
    expect(restored.elements[2]).toEqual(canonicalDigits);
    expect(restored.aodElements?.[0]).toEqual({
      ...plainText,
      type: 'TEXT_IMG',
      dataType: 'WEATHER_CURRENT',
    });
  });

  it('is idempotent after temperature consolidation', () => {
    const legacy = structuredClone(config);
    legacy.elements = [{
      id: 'temperature', type: 'TEXT', name: 'Temperature', dataType: 'WEATHER_CURRENT',
      bounds: { x: 0, y: 0, width: 100, height: 40 }, visible: true, zIndex: 1,
      text: '18°',
    }];
    const once = migrateLegacyTemperatureElements(legacy);
    const twice = migrateLegacyTemperatureElements(once);
    expect(twice).toBe(once);
    expect(twice.elements[0]).toMatchObject({ type: 'TEXT_IMG', dataType: 'WEATHER_CURRENT' });
  });

  it('preserves legacy Training Load arcs and attaches a warning in main and AOD', () => {
    const legacy = structuredClone(config);
    const arc = {
      id: 'training-arc', type: 'ARC_PROGRESS', name: 'Training Load Arc',
      dataType: 'TRAINING_LOAD', bounds: { x: 10, y: 20, width: 100, height: 100 },
      visible: true, zIndex: 1, startAngle: 10, endAngle: 250,
    } as const;
    legacy.elements = [arc] as unknown as WatchFaceConfig['elements'];
    legacy.aodElements = [structuredClone(arc)] as unknown as WatchFaceConfig['aodElements'];

    const restored = parseProjectFileArtifact(serializeProjectFileArtifact(
      createProjectFileArtifact(legacy, null),
    )).watchFaceConfig;

    expect(restored.elements[0]).toEqual({ ...arc, compatibilityWarning: TRAINING_LOAD_ARC_WARNING });
    expect(restored.aodElements?.[0]).toEqual({ ...arc, compatibilityWarning: TRAINING_LOAD_ARC_WARNING });
    expect(annotateLegacyTrainingLoadArcs(restored)).toBe(restored);
  });

  it('round-trips complete Sunrise and Sunset Time Reading state and assets', () => {
    const project = structuredClone(config);
    const sunrise = {
      id: 'sunrise-reading', type: 'TIME_READING', name: 'Sunrise Time', dataType: 'SUN_RISE',
      timeReadingDisplay: 'DIGITAL', bounds: { x: 11, y: 22, width: 190, height: 52 },
      visible: true, zIndex: 3, fontSize: 44, color: '#FEDCBA', fontStyle: 'modern',
      hSpace: 2, alignH: 'RIGHT', watchSafeTextEdges: true,
      fontArray: Array.from({ length: 10 }, (_, digit) => `sunrise_custom_${digit}.png`),
      colonImage: 'sunrise_custom_colon.png',
    } as const;
    const sunset = {
      ...sunrise, id: 'sunset-reading', name: 'Sunset Time', dataType: 'SUN_SET',
      fontArray: Array.from({ length: 10 }, (_, digit) => `sunset_custom_${digit}.png`),
      colonImage: 'sunset_custom_colon.png',
    } as const;
    project.elements = [sunrise] as unknown as WatchFaceConfig['elements'];
    project.aodElements = [sunset] as unknown as WatchFaceConfig['aodElements'];

    const restored = parseProjectFileArtifact(serializeProjectFileArtifact(
      createProjectFileArtifact(project, 'data:image/png;base64,time-reading'),
    ));

    expect(restored.watchFaceConfig.elements[0]).toEqual(sunrise);
    expect(restored.watchFaceConfig.aodElements?.[0]).toEqual(sunset);
    expect(restored.backgroundImage).toBe('data:image/png;base64,time-reading');
  });

  it('migrates legacy Sunrise/Sunset displays and removes only the obsolete T016 warning', () => {
    const project = structuredClone(config);
    const sunrise = {
      id: 'legacy-sunrise', type: 'TEXT_IMG', name: 'Old Sunrise', dataType: 'SUN_RISE',
      bounds: { x: 10, y: 20, width: 160, height: 42 }, visible: true, zIndex: 1,
      fontArray: Array.from({ length: 10 }, (_, digit) => `kept_${digit}.png`),
      colonImage: 'kept_colon.png', compatibilityWarning: T016_TIME_READING_WARNING,
    } as const;
    const sunset = {
      id: 'legacy-sunset', type: 'TEXT', name: 'Old Sunset', dataType: 'SUN_SET',
      bounds: { x: 30, y: 40, width: 180, height: 50 }, visible: true, zIndex: 2,
      color: '#ABCDEF', fontSize: 38,
    } as const;
    project.elements = [sunrise] as unknown as WatchFaceConfig['elements'];
    project.aodElements = [sunset] as unknown as WatchFaceConfig['aodElements'];

    const once = migrateTimeReadingElements(project);
    const twice = migrateTimeReadingElements(once);

    expect(once.elements[0]).toEqual({
      ...sunrise, type: 'TIME_READING', timeReadingDisplay: 'DIGITAL', compatibilityWarning: undefined,
    });
    expect(once.aodElements?.[0]).toEqual({
      ...sunset, type: 'TIME_READING', timeReadingDisplay: 'DIGITAL',
    });
    expect(twice).toBe(once);
  });

  it('forces invalid legacy Analog Time Reading state back to supported Digital mode', () => {
    const project = structuredClone(config);
    project.elements = [{
      id: 'invalid-analog', type: 'TIME_READING', name: 'Sunrise', dataType: 'SUN_RISE',
      timeReadingDisplay: 'ANALOG', bounds: { x: 0, y: 0, width: 180, height: 48 },
      visible: true, zIndex: 1,
    } as unknown as WatchFaceConfig['elements'][number]];

    const restored = parseProjectFileArtifact(JSON.stringify(project)).watchFaceConfig.elements[0];
    expect(restored.timeReadingDisplay).toBe('DIGITAL');
  });
});
