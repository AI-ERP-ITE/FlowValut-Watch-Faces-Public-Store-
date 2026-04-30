// JSON Schema constants (draft-07 style) for the 4-stage pipeline.
// These are exported for documentation, downstream tools, and runtime
// `withRegistryIds()` enum injection. Runtime validation in this app
// uses plain TS validators in ../validators (no AJV dependency).

const LAYER_ROLES = [
  'background', 'ring', 'tickmarks', 'subdial', 'indices',
  'text', 'icon', 'pointer', 'overlay', 'mask',
];

const SEMANTIC_TYPES = [
  'bg', 'decor_ring', 'tick_set', 'subdial_ring',
  'hour_index', 'minute_index', 'label_text', 'data_text',
  'icon_static', 'icon_weather',
  'hand_hour', 'hand_minute', 'hand_second',
  'logo', 'frame', 'other',
];

const GEOMETRY_CLASSES = [
  'circle', 'arc', 'line', 'rect', 'path', 'text', 'image', 'group',
];

export const REGISTRY_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  required: ['canvas', 'elements'],
  properties: {
    canvas: {
      type: 'object',
      additionalProperties: false,
      required: ['w', 'h', 'shape'],
      properties: {
        w: { type: 'integer', minimum: 1 },
        h: { type: 'integer', minimum: 1 },
        shape: { enum: ['circle', 'rect'] },
      },
    },
    elements: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'layerRole', 'semanticType', 'geometryClass', 'zHint'],
        properties: {
          id: { type: 'string', pattern: '^[a-z][a-z0-9_]{1,40}$' },
          parentId: { type: ['string', 'null'] },
          layerRole: { enum: LAYER_ROLES },
          semanticType: { enum: SEMANTIC_TYPES },
          geometryClass: { enum: GEOMETRY_CLASSES },
          zHint: { type: 'integer', minimum: 0, maximum: 999 },
        },
      },
    },
  },
} as const;

const REGISTRY_IDS_PLACEHOLDER = '__REGISTRY_IDS__';

const idEnum = (ids: string[] | null) => (ids ? { enum: ids } : { type: 'string' as const, pattern: '^[a-z][a-z0-9_]{1,40}$' });

export function geometrySchema(registryIds: string[] | null = null) {
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    additionalProperties: false,
    required: ['registryHash', 'items'],
    properties: {
      registryHash: { type: 'string', minLength: 1 },
      items: {
        type: 'array',
        items: { type: 'object' /* validated structurally in validators */ },
      },
    },
    'x-registryIdsPlaceholder': registryIds ? undefined : REGISTRY_IDS_PLACEHOLDER,
    'x-idEnum': idEnum(registryIds),
  };
}

export function appearanceSchema(registryIds: string[] | null = null) {
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    additionalProperties: false,
    required: ['registryHash', 'items'],
    properties: {
      registryHash: { type: 'string', minLength: 1 },
      items: { type: 'array', items: { type: 'object' } },
    },
    'x-registryIdsPlaceholder': registryIds ? undefined : REGISTRY_IDS_PLACEHOLDER,
    'x-idEnum': idEnum(registryIds),
  };
}

export function behaviorSchema(registryIds: string[] | null = null) {
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    additionalProperties: false,
    required: ['registryHash', 'items'],
    properties: {
      registryHash: { type: 'string', minLength: 1 },
      items: { type: 'array', items: { type: 'object' } },
    },
    'x-registryIdsPlaceholder': registryIds ? undefined : REGISTRY_IDS_PLACEHOLDER,
    'x-idEnum': idEnum(registryIds),
  };
}

export function withRegistryIds<T extends { 'x-idEnum'?: unknown }>(schema: T, ids: string[]): T {
  // Returns a shallow copy with the id enum injected. Used for downstream tools
  // that wish to feed a real JSON Schema validator at runtime (Codex sandbox etc.).
  return { ...schema, 'x-idEnum': { enum: ids } } as T;
}

export const SCHEMAS = {
  registry: REGISTRY_SCHEMA,
  geometry: geometrySchema(),
  appearance: appearanceSchema(),
  behavior: behaviorSchema(),
};
