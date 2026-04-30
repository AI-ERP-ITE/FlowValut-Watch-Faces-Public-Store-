// Deterministic merger for the ID-Locked 4-Stage Compiler Pipeline.
// Combines Registry + Geometry + Appearance + Behavior into a flat MergedSpec.
// Never invents ids. Never silently drops registry ids — drops go to rejected[].

import type {
  RegistryDoc, GeometryDoc, AppearanceDoc, BehaviorDoc,
  MergedSpec, MergedElement, ValidationFailedId,
  GeometryItem, AppearanceItem, BehaviorItem, GeometryItemFull, AppearanceItemFull, BehaviorItemFull,
  Fill, Stroke, BehaviorBinding, Shape,
} from '@/types/fourStage';
import { getSemanticDefault } from './defaults/semanticDefaults';

interface MergerInput {
  registry: RegistryDoc;
  geometry: GeometryDoc;
  appearance: AppearanceDoc;
  behavior?: BehaviorDoc | null;
}

const isFull = <T extends { id: string; inherit?: true }>(item: T): item is T & { inherit?: undefined } => item.inherit !== true;

function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const it of items) m.set(it.id, it);
  return m;
}

export function mergeFourStages(input: MergerInput): MergedSpec {
  const { registry, geometry, appearance, behavior } = input;
  const warnings: string[] = [];
  const rejected: ValidationFailedId[] = [];

  if (geometry.registryHash !== '' && appearance.registryHash !== geometry.registryHash) {
    warnings.push('appearance.registryHash differs from geometry.registryHash');
  }
  if (behavior && behavior.registryHash !== geometry.registryHash) {
    warnings.push('behavior.registryHash differs from geometry.registryHash');
  }

  const geoById = indexById(geometry.items as GeometryItem[]);
  const appById = indexById(appearance.items as AppearanceItem[]);
  const behById = behavior ? indexById(behavior.items as BehaviorItem[]) : new Map<string, BehaviorItem>();

  const elements: MergedElement[] = [];

  for (const reg of registry.elements) {
    const def = getSemanticDefault(reg.semanticType);
    const geoItem = geoById.get(reg.id);
    const appItem = appById.get(reg.id);
    const behItem = behById.get(reg.id);

    if (!geoItem) {
      rejected.push({ id: reg.id, stage: 'geometry', reason: 'no geometry entry for registry id' });
      continue;
    }
    if (!appItem) {
      rejected.push({ id: reg.id, stage: 'appearance', reason: 'no appearance entry for registry id' });
      continue;
    }

    const shape: Shape = isFull(geoItem)
      ? (geoItem as GeometryItemFull).shape
      : def.shape(registry.canvas.w, registry.canvas.h);
    const clip = isFull(geoItem) ? (geoItem as GeometryItemFull).clip ?? null : null;
    const transform = isFull(geoItem) ? (geoItem as GeometryItemFull).transform ?? null : null;

    let fill: Fill = def.fill;
    let stroke: Stroke | null = def.stroke;
    let luminance: number | null = null;
    let texture: MergedElement['texture'] = def.texture;
    let asset: string | null = null;
    let opacity: number | null = def.opacity;

    if (isFull(appItem)) {
      const a = appItem as AppearanceItemFull;
      if (a.fill !== undefined) fill = a.fill;
      if (a.stroke !== undefined) stroke = a.stroke;
      if (a.luminance !== undefined) luminance = a.luminance;
      if (a.texture !== undefined) texture = a.texture;
      if (a.asset !== undefined) asset = a.asset;
      if (a.opacity !== undefined) opacity = a.opacity;
    }

    let binding: BehaviorBinding = def.binding;
    let rotation: MergedElement['rotation'] = null;
    let visibility: MergedElement['visibility'] = def.visibility;

    if (behItem && isFull(behItem)) {
      const b = behItem as BehaviorItemFull;
      if (b.binding !== undefined) binding = b.binding;
      if (b.rotation !== undefined) rotation = b.rotation;
      if (b.visibility !== undefined) visibility = b.visibility;
    }

    elements.push({
      id: reg.id,
      layerRole: reg.layerRole,
      semanticType: reg.semanticType,
      geometryClass: reg.geometryClass,
      zHint: reg.zHint,
      parentId: reg.parentId ?? null,
      shape,
      clip,
      transform,
      fill,
      stroke,
      luminance,
      texture,
      asset,
      opacity,
      binding,
      rotation,
      visibility,
    });
  }

  // Stable layer ordering: zHint asc, then registry order.
  elements.sort((a, b) => {
    if (a.zHint !== b.zHint) return a.zHint - b.zHint;
    return registry.elements.findIndex((e) => e.id === a.id) - registry.elements.findIndex((e) => e.id === b.id);
  });

  return {
    canvas: registry.canvas,
    elements,
    warnings,
    rejected,
  };
}
