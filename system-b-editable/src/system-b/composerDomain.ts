import type { ProjectFileArtifact } from '@/lib/projectFileArtifact';
import type { CustomHandRecord } from '@/lib/customHandStore';
import type { WatchFaceElement } from '@/types';

export const FVWC_FORMAT = 'flowvault-editable-watchface-composer' as const;
export const FVWC_SCHEMA_VERSION = 1 as const;

export type ComposerCanvasMode = 'SOURCE' | 'OVERLAY' | 'BASE' | 'VARIANT' | 'COMBINATION';
export type EditableMode = 'DATA_ONLY' | 'STYLE_ONLY' | 'STYLE_AND_DATA';
export type AodPolicy = 'HIDDEN_IN_AOD' | 'FIXED_AOD';
export type SlotFamily =
  | 'NUMERIC_READOUT'
  | 'IMAGE_LEVEL'
  | 'ARC_PROGRESS'
  | 'POINTER_GAUGE'
  | 'MIXED_WIDGET';

export interface ComposerSourceBuild {
  id: string;
  fileName: string;
  sha256: string;
  importedAt: string;
  canonicalModelId: string;
  canonicalModelName: string;
  specGroup: string;
  artifact: ProjectFileArtifact;
}

export interface ComposerComponentGroup {
  id: string;
  name: string;
  sourceBuildId: string;
  layerIds: string[];
  createdAt: string;
}

export interface ComposerVariant {
  id: string;
  name: string;
  sourceBuildId: string;
  componentGroupId: string;
  mode: EditableMode;
  aodPolicy: AodPolicy;
}

export interface ComposerSlot {
  id: string;
  name: string;
  family: SlotFamily;
  bounds: { x: number; y: number; width: number; height: number };
  variants: ComposerVariant[];
  defaultVariantId: string;
}

export interface FvwcProjectV1 {
  format: typeof FVWC_FORMAT;
  fvwcSchemaVersion: typeof FVWC_SCHEMA_VERSION;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  baseBuildId: string | null;
  sourceBuilds: ComposerSourceBuild[];
  componentGroups: ComposerComponentGroup[];
  slots: ComposerSlot[];
  customHandStyles?: CustomHandRecord[];
}

export interface ComposerValidationIssue {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  code: string;
  message: string;
  sourceBuildId?: string;
  componentGroupId?: string;
  slotId?: string;
  variantId?: string;
}

export interface ComposerCanvasPresentation {
  source: ComposerSourceBuild | null;
  elements: WatchFaceElement[];
}

function elementsForGroup(project: FvwcProjectV1, groupId: string): WatchFaceElement[] {
  const group = project.componentGroups.find((item) => item.id === groupId);
  const source = project.sourceBuilds.find((item) => item.id === group?.sourceBuildId);
  if (!group || !source) return [];
  return source.artifact.watchFaceConfig.elements
    .filter((element) => group.layerIds.includes(element.id));
}

export function resolveCanvasPresentation(
  project: FvwcProjectV1,
  mode: ComposerCanvasMode,
  selectedSourceId: string | null,
  selectedSlotId: string | null,
): ComposerCanvasPresentation {
  const selectedSource = project.sourceBuilds.find((source) => source.id === selectedSourceId)
    ?? project.sourceBuilds[0]
    ?? null;
  if (mode === 'BASE') {
    const source = project.sourceBuilds.find((item) => item.id === project.baseBuildId)
      ?? selectedSource;
    return {
      source,
      elements: source?.artifact.watchFaceConfig.elements ?? [],
    };
  }
  if (mode === 'VARIANT') {
    const slot = project.slots.find((item) => item.id === selectedSlotId);
    const variant = slot?.variants.find((item) => item.id === slot.defaultVariantId)
      ?? slot?.variants[0];
    const source = project.sourceBuilds.find((item) => item.id === variant?.sourceBuildId)
      ?? selectedSource;
    return {
      source,
      // A variant is previewed as its complete immutable source face. Groups
      // remain ownership references for compilation; they must never hide the
      // source's fixed widgets in the authoring canvas or exported preview.
      elements: source?.artifact.watchFaceConfig.elements ?? [],
    };
  }
  if (mode === 'COMBINATION') {
    const source = project.sourceBuilds.find((item) => item.id === project.baseBuildId)
      ?? selectedSource;
    return {
      source,
      elements: project.slots.flatMap((slot) => {
        const variant = slot.variants.find((item) => item.id === slot.defaultVariantId)
          ?? slot.variants[0];
        return variant ? elementsForGroup(project, variant.componentGroupId) : [];
      }),
    };
  }
  return {
    source: selectedSource,
    elements: selectedSource?.artifact.watchFaceConfig.elements ?? [],
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createStableId(prefix: string, seed?: string): string {
  if (seed) return `${prefix}_${seed.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24)}`;
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

export function createFvwcProject(name = 'Editable Watchface Project'): FvwcProjectV1 {
  const now = nowIso();
  return {
    format: FVWC_FORMAT,
    fvwcSchemaVersion: FVWC_SCHEMA_VERSION,
    id: createStableId('fvwc'),
    name,
    createdAt: now,
    updatedAt: now,
    baseBuildId: null,
    sourceBuilds: [],
    componentGroups: [],
    slots: [],
    customHandStyles: [],
  };
}

export function touchProject(project: FvwcProjectV1): FvwcProjectV1 {
  return { ...project, updatedAt: nowIso() };
}

export function selectSlotForFirstSliceExport(
  project: FvwcProjectV1,
  selectedSlotId: string | null,
): FvwcProjectV1 {
  if (project.slots.length === 1) return project;
  const selectedSlot = project.slots.find((slot) => slot.id === selectedSlotId);
  if (!selectedSlot) throw new Error('Select one editable slot to export.');
  return { ...project, slots: [selectedSlot] };
}

export function deleteComposerVariant(
  project: FvwcProjectV1,
  slotId: string,
  variantId: string,
): FvwcProjectV1 {
  const slot = project.slots.find((item) => item.id === slotId);
  if (!slot) throw new Error('Editable slot not found.');
  if (slot.variants.length <= 1) {
    throw new Error('Delete the slot instead; a slot cannot remain without a variant.');
  }
  const variants = slot.variants.filter((variant) => variant.id !== variantId);
  if (variants.length === slot.variants.length) throw new Error('Variant not found.');
  return touchProject({
    ...project,
    slots: project.slots.map((item) => item.id === slotId
      ? {
        ...item,
        variants,
        defaultVariantId: item.defaultVariantId === variantId
          ? variants[0].id
          : item.defaultVariantId,
      }
      : item),
  });
}

export function deleteComposerSlot(project: FvwcProjectV1, slotId: string): FvwcProjectV1 {
  if (!project.slots.some((slot) => slot.id === slotId)) throw new Error('Editable slot not found.');
  return touchProject({ ...project, slots: project.slots.filter((slot) => slot.id !== slotId) });
}

export function deleteComponentGroup(project: FvwcProjectV1, groupId: string): FvwcProjectV1 {
  const dependent = project.slots.find((slot) => (
    slot.variants.some((variant) => variant.componentGroupId === groupId)
  ));
  if (dependent) {
    throw new Error(`Delete the referencing variant or slot "${dependent.name}" before deleting this group.`);
  }
  if (!project.componentGroups.some((group) => group.id === groupId)) {
    throw new Error('Component group not found.');
  }
  return touchProject({
    ...project,
    componentGroups: project.componentGroups.filter((group) => group.id !== groupId),
  });
}

export function addSourceBuild(
  project: FvwcProjectV1,
  source: ComposerSourceBuild,
): FvwcProjectV1 {
  if (project.sourceBuilds.some((item) => item.sha256 === source.sha256)) {
    throw new Error(`Source "${source.fileName}" is already registered.`);
  }
  return touchProject({
    ...project,
    sourceBuilds: [...project.sourceBuilds, source],
    baseBuildId: project.baseBuildId ?? source.id,
  });
}

export function setBaseBuild(project: FvwcProjectV1, sourceBuildId: string): FvwcProjectV1 {
  if (!project.sourceBuilds.some((source) => source.id === sourceBuildId)) {
    throw new Error('Base build must reference a registered source.');
  }
  return touchProject({ ...project, baseBuildId: sourceBuildId });
}

export function createComponentGroup(
  project: FvwcProjectV1,
  input: Omit<ComposerComponentGroup, 'id' | 'createdAt'>,
): FvwcProjectV1 {
  const source = project.sourceBuilds.find((item) => item.id === input.sourceBuildId);
  if (!source) throw new Error('Component group source is not registered.');
  const uniqueLayerIds = [...new Set(input.layerIds)];
  if (uniqueLayerIds.length === 0) throw new Error('A component group requires at least one layer.');
  const sourceLayerIds = new Set(source.artifact.watchFaceConfig.elements.map((element) => element.id));
  const missing = uniqueLayerIds.filter((id) => !sourceLayerIds.has(id));
  if (missing.length > 0) throw new Error(`Component group references missing layers: ${missing.join(', ')}`);
  const alreadyOwned = new Set(
    project.componentGroups
      .filter((group) => group.sourceBuildId === input.sourceBuildId)
      .flatMap((group) => group.layerIds),
  );
  const conflicts = uniqueLayerIds.filter((id) => alreadyOwned.has(id));
  if (conflicts.length > 0) throw new Error(`Layers already belong to another group: ${conflicts.join(', ')}`);
  const group: ComposerComponentGroup = {
    ...input,
    id: createStableId('group'),
    layerIds: uniqueLayerIds,
    createdAt: nowIso(),
  };
  return touchProject({ ...project, componentGroups: [...project.componentGroups, group] });
}

function boundsForElements(elements: WatchFaceElement[]): ComposerSlot['bounds'] {
  const minX = Math.min(...elements.map((element) => element.bounds.x));
  const minY = Math.min(...elements.map((element) => element.bounds.y));
  const maxX = Math.max(...elements.map((element) => element.bounds.x + element.bounds.width));
  const maxY = Math.max(...elements.map((element) => element.bounds.y + element.bounds.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function inferSlotFamily(elements: WatchFaceElement[]): SlotFamily {
  const types = new Set(elements.map((element) => element.type));
  if (types.has('GAUGE_POINTER')) return 'POINTER_GAUGE';
  if (types.has('IMG_LEVEL') || types.has('IMG_PROGRESS')) return 'IMAGE_LEVEL';
  if (types.has('ARC_PROGRESS')) return 'ARC_PROGRESS';
  if ([...types].every((type) => ['TEXT_IMG', 'TEXT', 'IMG', 'IMG_STATUS', 'IMG_DATE', 'IMG_TIME', 'IMG_WEEK'].includes(type))) {
    return 'NUMERIC_READOUT';
  }
  return 'MIXED_WIDGET';
}

export function createSlotFromGroup(
  project: FvwcProjectV1,
  groupId: string,
  slotName: string,
  mode: EditableMode = 'STYLE_AND_DATA',
): FvwcProjectV1 {
  const group = project.componentGroups.find((item) => item.id === groupId);
  if (!group) throw new Error('Default component group does not exist.');
  const source = project.sourceBuilds.find((item) => item.id === group.sourceBuildId)!;
  const elements = source.artifact.watchFaceConfig.elements
    .filter((element) => group.layerIds.includes(element.id));
  const variant: ComposerVariant = {
    id: createStableId('variant'),
    name: group.name,
    sourceBuildId: group.sourceBuildId,
    componentGroupId: group.id,
    mode,
    aodPolicy: 'HIDDEN_IN_AOD',
  };
  const slot: ComposerSlot = {
    id: createStableId('slot'),
    name: slotName,
    family: inferSlotFamily(elements),
    bounds: boundsForElements(elements),
    variants: [variant],
    defaultVariantId: variant.id,
  };
  return touchProject({ ...project, slots: [...project.slots, slot] });
}

export function addVariantToSlot(
  project: FvwcProjectV1,
  slotId: string,
  groupId: string,
  mode: EditableMode,
): FvwcProjectV1 {
  const slot = project.slots.find((item) => item.id === slotId);
  const group = project.componentGroups.find((item) => item.id === groupId);
  if (!slot || !group) throw new Error('Slot and component group are required.');
  if (slot.variants.some((variant) => variant.componentGroupId === groupId)) {
    throw new Error('This component group is already a slot variant.');
  }
  const source = project.sourceBuilds.find((item) => item.id === group.sourceBuildId)!;
  const elements = source.artifact.watchFaceConfig.elements
    .filter((element) => group.layerIds.includes(element.id));
  const family = inferSlotFamily(elements);
  if (slot.family !== family && slot.family !== 'MIXED_WIDGET' && family !== 'MIXED_WIDGET') {
    throw new Error(`${family} is incompatible with ${slot.family}.`);
  }
  const variant: ComposerVariant = {
    id: createStableId('variant'),
    name: group.name,
    sourceBuildId: group.sourceBuildId,
    componentGroupId: group.id,
    mode,
    aodPolicy: 'HIDDEN_IN_AOD',
  };
  return touchProject({
    ...project,
    slots: project.slots.map((item) => item.id === slotId
      ? { ...item, variants: [...item.variants, variant] }
      : item),
  });
}

export function setDefaultVariant(
  project: FvwcProjectV1,
  slotId: string,
  variantId: string,
): FvwcProjectV1 {
  const slot = project.slots.find((item) => item.id === slotId);
  if (!slot?.variants.some((variant) => variant.id === variantId)) {
    throw new Error('Default variant must belong to the slot.');
  }
  return touchProject({
    ...project,
    slots: project.slots.map((item) => item.id === slotId
      ? { ...item, defaultVariantId: variantId }
      : item),
  });
}

export function validateComposerProject(project: FvwcProjectV1): ComposerValidationIssue[] {
  const issues: ComposerValidationIssue[] = [];
  const sourceIds = new Set(project.sourceBuilds.map((source) => source.id));
  const groupIds = new Set(project.componentGroups.map((group) => group.id));
  if (project.sourceBuilds.length === 0) {
    issues.push({ severity: 'ERROR', code: 'NO_SOURCES', message: 'Import at least one FVWF source.' });
  }
  if (!project.baseBuildId || !sourceIds.has(project.baseBuildId)) {
    issues.push({ severity: 'ERROR', code: 'NO_BASE', message: 'Select a registered base build.' });
  }
  const base = project.sourceBuilds.find((source) => source.id === project.baseBuildId);
  for (const source of project.sourceBuilds) {
    if (base && (
      source.artifact.watchFaceConfig.resolution.width !== base.artifact.watchFaceConfig.resolution.width
      || source.artifact.watchFaceConfig.resolution.height !== base.artifact.watchFaceConfig.resolution.height
    )) {
      issues.push({
        severity: 'ERROR',
        code: 'RESOLUTION_MISMATCH',
        message: `${source.fileName} does not match the base resolution.`,
        sourceBuildId: source.id,
      });
    }
    if (base && source.specGroup !== base.specGroup) {
      issues.push({
        severity: 'ERROR',
        code: 'SPEC_GROUP_MISMATCH',
        message: `${source.fileName} does not match the base specification group.`,
        sourceBuildId: source.id,
      });
    }
  }
  for (const slot of project.slots) {
    if (slot.variants.length === 0) {
      issues.push({ severity: 'ERROR', code: 'EMPTY_SLOT', message: `${slot.name} has no variants.`, slotId: slot.id });
    }
    if (!slot.variants.some((variant) => variant.id === slot.defaultVariantId)) {
      issues.push({ severity: 'ERROR', code: 'NO_DEFAULT', message: `${slot.name} has no valid default.`, slotId: slot.id });
    }
    for (const variant of slot.variants) {
      if (!sourceIds.has(variant.sourceBuildId) || !groupIds.has(variant.componentGroupId)) {
        issues.push({
          severity: 'ERROR',
          code: 'BROKEN_VARIANT',
          message: `${variant.name} references a missing source or component group.`,
          slotId: slot.id,
          variantId: variant.id,
        });
      }
    }
  }
  if (project.slots.length === 0 && project.sourceBuilds.length > 0) {
    issues.push({ severity: 'INFO', code: 'NO_SLOTS', message: 'Create a component group and editable slot.' });
  }
  return issues;
}

export function serializeFvwc(project: FvwcProjectV1): string {
  return JSON.stringify(touchProject(project), null, 2);
}

export function parseFvwc(text: string): FvwcProjectV1 {
  const value = JSON.parse(text) as Partial<FvwcProjectV1>;
  if (value.format !== FVWC_FORMAT || value.fvwcSchemaVersion !== FVWC_SCHEMA_VERSION) {
    throw new Error('Unsupported or invalid FVWC project.');
  }
  if (!Array.isArray(value.sourceBuilds) || !Array.isArray(value.componentGroups) || !Array.isArray(value.slots)) {
    throw new Error('FVWC project collections are invalid.');
  }
  return { ...value, customHandStyles: value.customHandStyles ?? [] } as FvwcProjectV1;
}

export async function sha256Text(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
