export type EngineTemplateModel = {
  layout?: Record<string, unknown>;
  scale?: Record<string, unknown>;
  effects3d?: Record<string, unknown>;
  elements: Array<Record<string, unknown>>;
};

export type EngineRunArgs = {
  activeStyle?: string;
  paramOverrides?: Record<string, Record<string, number>>;
  templateInput?: EngineTemplateModel;
  colorControl?: Record<string, unknown>;
};

export function runEngine(args?: EngineRunArgs): string;
