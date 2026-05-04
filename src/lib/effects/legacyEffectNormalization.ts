type LooseRecord = Record<string, unknown>;

function cloneRecord<T extends LooseRecord>(value: T): T {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneLayerArray(input: unknown): Array<LooseRecord> {
  if (!Array.isArray(input)) return [];
  return input
    .filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry) => cloneRecord(entry as LooseRecord));
}

function readLegacyLayer(element: LooseRecord, key: string): Array<LooseRecord> {
  const legacy = element[key];
  if (legacy && typeof legacy === 'object' && !Array.isArray(legacy)) {
    return [cloneRecord(legacy as LooseRecord)];
  }
  return [];
}

function writeLayerSet(element: LooseRecord, arrayKey: string, legacyKey: string, layers: Array<LooseRecord>): LooseRecord {
  const clonedElement = cloneRecord(element);
  const sanitizedLayers = cloneLayerArray(layers);
  clonedElement[arrayKey] = sanitizedLayers;

  if (sanitizedLayers.length > 0) {
    clonedElement[legacyKey] = cloneRecord(sanitizedLayers[0]);
  } else {
    delete clonedElement[legacyKey];
  }

  return clonedElement;
}

export function normalizeLegacyTextureLayers(element: LooseRecord): Array<LooseRecord> {
  const fromArray = cloneLayerArray(element.textureLayers);
  if (fromArray.length > 0) return fromArray;
  return readLegacyLayer(element, 'texture');
}

export function normalizeLegacyGradientLayers(element: LooseRecord): Array<LooseRecord> {
  const fromArray = cloneLayerArray(element.gradientLayers);
  if (fromArray.length > 0) return fromArray;
  return readLegacyLayer(element, 'gradient');
}

export function normalizeLegacyMaterialLayers(element: LooseRecord): Array<LooseRecord> {
  const fromArray = cloneLayerArray(element.materialLayers);
  if (fromArray.length > 0) return fromArray;
  return readLegacyLayer(element, 'material');
}

export function writeNormalizedTextureLayers(element: LooseRecord, layers: Array<LooseRecord>): LooseRecord {
  return writeLayerSet(element, 'textureLayers', 'texture', layers);
}

export function writeNormalizedGradientLayers(element: LooseRecord, layers: Array<LooseRecord>): LooseRecord {
  return writeLayerSet(element, 'gradientLayers', 'gradient', layers);
}

export function writeNormalizedMaterialLayers(element: LooseRecord, layers: Array<LooseRecord>): LooseRecord {
  return writeLayerSet(element, 'materialLayers', 'material', layers);
}
