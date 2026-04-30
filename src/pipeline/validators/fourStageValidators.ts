// Plain-TS validators for the 4-stage pipeline. No external dep.
// Each validator returns ValidationFailedId[] + warnings; aggregator
// produces a single ValidationReport.

import type {
  RegistryDoc, GeometryDoc, AppearanceDoc, BehaviorDoc,
  ValidationFailedId, ValidationReport, RegistryElement,
  Shape, GeometryItem, AppearanceItem, BehaviorItem,
  LayerRole, SemanticType, GeometryClass,
} from '@/types/fourStage';

const ID_PATTERN = /^[a-z][a-z0-9_]{1,40}$/;
const LAYER_ROLES: LayerRole[] = ['background', 'ring', 'tickmarks', 'subdial', 'indices', 'text', 'icon', 'pointer', 'overlay', 'mask'];
const SEMANTIC_TYPES: SemanticType[] = ['bg', 'decor_ring', 'tick_set', 'subdial_ring', 'hour_index', 'minute_index', 'label_text', 'data_text', 'icon_static', 'icon_weather', 'hand_hour', 'hand_minute', 'hand_second', 'logo', 'frame', 'other'];
const GEOMETRY_CLASSES: GeometryClass[] = ['circle', 'arc', 'line', 'rect', 'path', 'text', 'image', 'group'];

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

// ------------------------- REGISTRY -------------------------

export function validateRegistry(input: unknown): { failed: ValidationFailedId[]; warnings: string[]; doc: RegistryDoc | null } {
  const failed: ValidationFailedId[] = [];
  const warnings: string[] = [];
  if (!isObj(input)) {
    failed.push({ id: '*', stage: 'registry', reason: 'registry root must be an object' });
    return { failed, warnings, doc: null };
  }
  const canvas = input.canvas;
  const elements = input.elements;
  if (!isObj(canvas) || !isFiniteNum(canvas.w) || !isFiniteNum(canvas.h) || (canvas.shape !== 'circle' && canvas.shape !== 'rect')) {
    failed.push({ id: '*', stage: 'registry', reason: 'invalid canvas (need {w,h,shape})' });
  }
  if (!Array.isArray(elements) || elements.length === 0) {
    failed.push({ id: '*', stage: 'registry', reason: 'elements[] must be a non-empty array' });
    return { failed, warnings, doc: null };
  }
  const seen = new Set<string>();
  const cleanElements: RegistryElement[] = [];
  for (const raw of elements) {
    if (!isObj(raw)) {
      failed.push({ id: '?', stage: 'registry', reason: 'element entry not an object' });
      continue;
    }
    const id = String(raw.id ?? '');
    if (!ID_PATTERN.test(id)) {
      failed.push({ id: id || '?', stage: 'registry', reason: 'invalid id (must match /^[a-z][a-z0-9_]{1,40}$/)' });
      continue;
    }
    if (seen.has(id)) {
      failed.push({ id, stage: 'registry', reason: 'duplicate id' });
      continue;
    }
    seen.add(id);
    if (!LAYER_ROLES.includes(raw.layerRole as LayerRole)) {
      failed.push({ id, stage: 'registry', reason: `invalid layerRole "${raw.layerRole}"` });
      continue;
    }
    if (!SEMANTIC_TYPES.includes(raw.semanticType as SemanticType)) {
      failed.push({ id, stage: 'registry', reason: `invalid semanticType "${raw.semanticType}"` });
      continue;
    }
    if (!GEOMETRY_CLASSES.includes(raw.geometryClass as GeometryClass)) {
      failed.push({ id, stage: 'registry', reason: `invalid geometryClass "${raw.geometryClass}"` });
      continue;
    }
    if (!isFiniteNum(raw.zHint) || raw.zHint < 0 || raw.zHint > 999) {
      failed.push({ id, stage: 'registry', reason: 'zHint must be 0..999' });
      continue;
    }
    cleanElements.push({
      id,
      parentId: typeof raw.parentId === 'string' ? raw.parentId : null,
      layerRole: raw.layerRole as LayerRole,
      semanticType: raw.semanticType as SemanticType,
      geometryClass: raw.geometryClass as GeometryClass,
      zHint: raw.zHint,
    });
  }
  if (failed.length > 0) return { failed, warnings, doc: null };
  return {
    failed,
    warnings,
    doc: {
      canvas: canvas as RegistryDoc['canvas'],
      elements: cleanElements,
    },
  };
}

// ------------------------- SHAPE STRUCTURAL CHECK -------------------------

function validateShape(shape: unknown, depth = 0): string | null {
  if (depth > 4) return 'shape nesting too deep';
  if (!isObj(shape)) return 'shape must be object';
  const t = shape.type;
  switch (t) {
    case 'circle':
      return [shape.cx, shape.cy, shape.r].every(isFiniteNum) ? null : 'circle requires cx,cy,r';
    case 'arc':
      return [shape.cx, shape.cy, shape.rOuter, shape.rInner, shape.startDeg, shape.endDeg].every(isFiniteNum)
        ? null : 'arc requires cx,cy,rOuter,rInner,startDeg,endDeg';
    case 'line':
      return [shape.x1, shape.y1, shape.x2, shape.y2].every(isFiniteNum) ? null : 'line requires x1,y1,x2,y2';
    case 'rect':
      return [shape.x, shape.y, shape.w, shape.h].every(isFiniteNum) ? null : 'rect requires x,y,w,h';
    case 'path':
      return typeof shape.d === 'string' && shape.d.length > 0 ? null : 'path requires non-empty d';
    case 'text':
      return [shape.x, shape.y].every(isFiniteNum) && typeof shape.text === 'string' ? null : 'text requires x,y,text';
    case 'image':
      return [shape.x, shape.y, shape.w, shape.h].every(isFiniteNum) && typeof shape.ref === 'string'
        ? null : 'image requires x,y,w,h,ref';
    case 'group': {
      if (!Array.isArray(shape.children)) return 'group requires children[]';
      for (const c of shape.children) {
        const err = validateShape(c, depth + 1);
        if (err) return `group child invalid: ${err}`;
      }
      return null;
    }
    default:
      return `unknown shape.type "${String(t)}"`;
  }
}

// ------------------------- GEOMETRY -------------------------

export function validateGeometry(
  input: unknown,
  registry: RegistryDoc,
  expectedHash: string,
): { failed: ValidationFailedId[]; warnings: string[]; doc: GeometryDoc | null } {
  const failed: ValidationFailedId[] = [];
  const warnings: string[] = [];
  if (!isObj(input)) {
    failed.push({ id: '*', stage: 'geometry', reason: 'geometry root must be object' });
    return { failed, warnings, doc: null };
  }
  if (input.registryHash !== expectedHash) {
    failed.push({ id: '*', stage: 'geometry', reason: `registryHash mismatch (expected ${expectedHash})` });
  }
  if (!Array.isArray(input.items)) {
    failed.push({ id: '*', stage: 'geometry', reason: 'items[] missing' });
    return { failed, warnings, doc: null };
  }
  const registryIds = new Set(registry.elements.map((e) => e.id));
  const seen = new Set<string>();
  const items: GeometryItem[] = [];
  for (const raw of input.items) {
    if (!isObj(raw)) {
      failed.push({ id: '?', stage: 'geometry', reason: 'item not an object' });
      continue;
    }
    const id = String(raw.id ?? '');
    if (!registryIds.has(id)) {
      failed.push({ id: id || '?', stage: 'geometry', reason: 'id not in registry' });
      continue;
    }
    if (seen.has(id)) {
      failed.push({ id, stage: 'geometry', reason: 'duplicate item for id' });
      continue;
    }
    seen.add(id);
    if (raw.inherit === true) {
      items.push({ id, inherit: true });
      continue;
    }
    const shapeErr = validateShape(raw.shape);
    if (shapeErr) {
      failed.push({ id, stage: 'geometry', reason: `shape invalid: ${shapeErr}` });
      continue;
    }
    items.push({
      id,
      shape: raw.shape as Shape,
      clip: (raw.clip ?? null) as GeometryItem['id'] extends never ? never : any,
      transform: (raw.transform ?? null) as any,
    } as GeometryItem);
  }
  // Coverage: every registry id must be present.
  for (const e of registry.elements) {
    if (!seen.has(e.id)) {
      failed.push({ id: e.id, stage: 'geometry', reason: 'missing from geometry items' });
    }
  }
  if (failed.length > 0) return { failed, warnings, doc: null };
  return { failed, warnings, doc: { registryHash: expectedHash, items } };
}

// ------------------------- APPEARANCE -------------------------

function validateFill(fill: unknown): string | null {
  if (!isObj(fill)) return 'fill not object';
  switch (fill.type) {
    case 'solid':
      return typeof fill.color === 'string' ? null : 'solid requires color';
    case 'linear':
    case 'radial':
      if (!Array.isArray(fill.stops) || fill.stops.length < 2) return `${fill.type} requires stops[>=2]`;
      for (const s of fill.stops) {
        if (!isObj(s) || !isFiniteNum(s.offset) || typeof s.color !== 'string') return 'invalid stop';
      }
      return null;
    case 'none':
      return null;
    default:
      return `unknown fill.type "${String(fill.type)}"`;
  }
}

export function validateAppearance(
  input: unknown,
  registry: RegistryDoc,
  expectedHash: string,
): { failed: ValidationFailedId[]; warnings: string[]; doc: AppearanceDoc | null } {
  const failed: ValidationFailedId[] = [];
  const warnings: string[] = [];
  if (!isObj(input)) {
    failed.push({ id: '*', stage: 'appearance', reason: 'appearance root must be object' });
    return { failed, warnings, doc: null };
  }
  if (input.registryHash !== expectedHash) {
    failed.push({ id: '*', stage: 'appearance', reason: `registryHash mismatch (expected ${expectedHash})` });
  }
  if (!Array.isArray(input.items)) {
    failed.push({ id: '*', stage: 'appearance', reason: 'items[] missing' });
    return { failed, warnings, doc: null };
  }
  const registryIds = new Set(registry.elements.map((e) => e.id));
  const seen = new Set<string>();
  const items: AppearanceItem[] = [];
  for (const raw of input.items) {
    if (!isObj(raw)) {
      failed.push({ id: '?', stage: 'appearance', reason: 'item not an object' });
      continue;
    }
    const id = String(raw.id ?? '');
    if (!registryIds.has(id)) {
      failed.push({ id: id || '?', stage: 'appearance', reason: 'id not in registry' });
      continue;
    }
    if (seen.has(id)) {
      failed.push({ id, stage: 'appearance', reason: 'duplicate item for id' });
      continue;
    }
    seen.add(id);
    if (raw.inherit === true) {
      items.push({ id, inherit: true });
      continue;
    }
    if (raw.fill !== undefined) {
      const err = validateFill(raw.fill);
      if (err) {
        failed.push({ id, stage: 'appearance', reason: err });
        continue;
      }
    }
    items.push(raw as unknown as AppearanceItem);
  }
  for (const e of registry.elements) {
    if (!seen.has(e.id)) {
      failed.push({ id: e.id, stage: 'appearance', reason: 'missing from appearance items' });
    }
  }
  if (failed.length > 0) return { failed, warnings, doc: null };
  return { failed, warnings, doc: { registryHash: expectedHash, items } };
}

// ------------------------- BEHAVIOR -------------------------

export function validateBehavior(
  input: unknown,
  registry: RegistryDoc,
  expectedHash: string,
): { failed: ValidationFailedId[]; warnings: string[]; doc: BehaviorDoc | null } {
  const failed: ValidationFailedId[] = [];
  const warnings: string[] = [];
  if (!isObj(input)) {
    return {
      failed: [{ id: '*', stage: 'behavior', reason: 'behavior root must be object' }],
      warnings,
      doc: null,
    };
  }
  if (input.registryHash !== expectedHash) {
    failed.push({ id: '*', stage: 'behavior', reason: `registryHash mismatch (expected ${expectedHash})` });
  }
  if (!Array.isArray(input.items)) {
    failed.push({ id: '*', stage: 'behavior', reason: 'items[] missing' });
    return { failed, warnings, doc: null };
  }
  const registryIds = new Set(registry.elements.map((e) => e.id));
  const seen = new Set<string>();
  const items: BehaviorItem[] = [];
  for (const raw of input.items) {
    if (!isObj(raw)) {
      failed.push({ id: '?', stage: 'behavior', reason: 'item not an object' });
      continue;
    }
    const id = String(raw.id ?? '');
    if (!registryIds.has(id)) {
      failed.push({ id: id || '?', stage: 'behavior', reason: 'id not in registry' });
      continue;
    }
    if (seen.has(id)) {
      failed.push({ id, stage: 'behavior', reason: 'duplicate item for id' });
      continue;
    }
    seen.add(id);
    items.push(raw as unknown as BehaviorItem);
  }
  if (failed.length > 0) return { failed, warnings, doc: null };
  return { failed, warnings, doc: { registryHash: expectedHash, items } };
}

// ------------------------- AGGREGATOR -------------------------

export function aggregateReport(parts: Array<{ failed: ValidationFailedId[]; warnings: string[] }>): ValidationReport {
  const failedIds = parts.flatMap((p) => p.failed);
  const warnings = parts.flatMap((p) => p.warnings);
  return { ok: failedIds.length === 0, failedIds, warnings };
}
