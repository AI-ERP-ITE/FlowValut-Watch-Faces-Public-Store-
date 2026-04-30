// Visual Spec Validator — gates the VisualEnvelope produced by the speckit
// compile pipeline. Pure-visual scope (no watchface semantics).
// Reference: app/docs/AI_ANALYSIS_COMPILER_PROMPT.md

import type {
  AppearanceEntry,
  AppearanceItem,
  Fill,
  GeometryEntry,
  InventoryElement,
  Stroke,
  ValidationGate,
  ValidationReport,
  VisualEnvelope,
} from '@/types/visualSpec';
import { isAppearanceInherit, isGeometryInherit } from '@/types/visualSpec';
import type { VisualFidelityResult } from '@/pipeline/visualFidelity';
import { evaluateVisualFidelity } from '@/pipeline/visualFidelity';

// ─── Forbidden semantic vocabulary ────────────────────────────────────────────
// Any of these words appearing in an id, text content, or string value
// means the AI leaked downstream-widget meaning into the visual stage.

const FORBIDDEN_WORDS: string[] = [
  'bezel',
  'dial',
  'crown',
  'pusher',
  'subdial',
  'complication',
  'hour_hand',
  'minute_hand',
  'second_hand',
  'pointer',
  'tick',
  'marker',
  'numeral',
  'screw',
  'lume_pip',
  'time_pointer',
  'arc_progress',
  'battery',
  'steps',
  'heart_rate',
  'time_hour',
  'time_minute',
  'time_second',
];

const ID_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const HEX_COLOR = /^#([0-9a-f]{6}|[0-9a-f]{8})$/;

const ALLOWED_GEOMETRY_SHAPES = new Set([
  'circle',
  'arc',
  'line',
  'rect',
  'polygon',
  'path',
  'text',
  'image',
  'group',
]);

const ALLOWED_FILL_KINDS = new Set(['solid', 'linear', 'radial', 'none']);
const ALLOWED_TEXTURES = new Set([
  'matte',
  'brushed',
  'polished',
  'anodized',
  'lume',
  'printed',
]);
const ALLOWED_BLEND_MODES = new Set(['normal', 'multiply', 'screen', 'overlay']);
const ALLOWED_FILTERS = new Set(['shadow', 'glow', 'blur']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findForbiddenWord(value: string): string | null {
  const lower = value.toLowerCase();
  for (const word of FORBIDDEN_WORDS) {
    if (lower.includes(word)) return word;
  }
  return null;
}

function gate(
  gateId: string,
  title: string,
  details: string[],
  failedIds?: string[],
): ValidationGate {
  const status = details.length === 0 ? 'PASS' : 'FAIL';
  return { gateId, title, status, details, failedIds };
}

// ─── Gate G1 — JSON shape ─────────────────────────────────────────────────────

function gateShape(env: VisualEnvelope): ValidationGate {
  const issues: string[] = [];
  if (!env || typeof env !== 'object') {
    issues.push('Envelope is not an object.');
    return gate('G1', 'Envelope shape', issues);
  }
  if (!env.inventory || typeof env.inventory !== 'object') {
    issues.push('Missing or invalid `inventory` object.');
  } else {
    if (!env.inventory.canvas) issues.push('Missing `inventory.canvas`.');
    if (!Array.isArray(env.inventory.elements))
      issues.push('`inventory.elements` is not an array.');
  }
  if (!Array.isArray(env.geometry)) issues.push('`geometry` is not an array.');
  if (!Array.isArray(env.appearance)) issues.push('`appearance` is not an array.');
  return gate('G1', 'Envelope shape', issues);
}

// ─── Gate G2 — Inventory integrity ────────────────────────────────────────────

function gateInventory(
  env: VisualEnvelope,
  failedIdSink: ValidationReport['failedIds'],
): ValidationGate {
  const issues: string[] = [];
  const failed = new Set<string>();
  const inv = env.inventory;
  if (!inv || !Array.isArray(inv.elements)) {
    return gate('G2', 'Inventory integrity', ['Inventory missing or malformed.']);
  }

  // Canvas
  const canvas = inv.canvas;
  if (
    !canvas ||
    typeof canvas.width !== 'number' ||
    typeof canvas.height !== 'number' ||
    canvas.width <= 0 ||
    canvas.height <= 0
  ) {
    issues.push('Canvas width/height invalid.');
  }
  if (canvas && canvas.shape !== 'rect' && canvas.shape !== 'circle') {
    issues.push(`Canvas shape must be "rect" or "circle" (got "${canvas?.shape}").`);
  }

  const seenIds = new Set<string>();
  const seenZ = new Set<number>();
  const groupIds = new Set<string>();

  // First pass — basic per-element checks
  for (const el of inv.elements) {
    if (!el || typeof el !== 'object') {
      issues.push('Inventory contains a non-object entry.');
      continue;
    }
    const idIssues: string[] = [];
    if (typeof el.id !== 'string' || !ID_PATTERN.test(el.id)) {
      idIssues.push(`Invalid id "${el.id}" (must be snake_case, 1–64 chars, [a-z0-9_]).`);
    }
    if (seenIds.has(el.id)) idIssues.push(`Duplicate id "${el.id}".`);
    seenIds.add(el.id);

    if (!['shape', 'text', 'image', 'group'].includes(el.kind)) {
      idIssues.push(`Invalid kind "${el.kind}" for ${el.id}.`);
    }
    if (
      !el.bbox ||
      typeof el.bbox.x !== 'number' ||
      typeof el.bbox.y !== 'number' ||
      typeof el.bbox.w !== 'number' ||
      typeof el.bbox.h !== 'number'
    ) {
      idIssues.push(`Invalid bbox for ${el.id}.`);
    }
    if (typeof el.zOrder !== 'number' || !Number.isInteger(el.zOrder) || el.zOrder < 0) {
      idIssues.push(`Invalid zOrder for ${el.id} (must be integer ≥ 0).`);
    } else {
      if (seenZ.has(el.zOrder)) {
        idIssues.push(`zOrder collision at ${el.zOrder} (id ${el.id}).`);
      }
      seenZ.add(el.zOrder);
    }
    if (el.groupId !== null && typeof el.groupId !== 'string') {
      idIssues.push(`groupId must be string or null for ${el.id}.`);
    }
    if (el.kind === 'group') groupIds.add(el.id);
    if (idIssues.length) {
      issues.push(...idIssues);
      failed.add(el.id);
    }
  }

  // Second pass — group reference + nesting rules
  for (const el of inv.elements) {
    if (!el || typeof el !== 'object') continue;
    if (el.groupId !== null && typeof el.groupId === 'string') {
      if (!groupIds.has(el.groupId)) {
        issues.push(`Element ${el.id} groupId "${el.groupId}" does not exist or is not a group.`);
        failed.add(el.id);
      }
      if (el.id === el.groupId) {
        issues.push(`Group ${el.id} references itself.`);
        failed.add(el.id);
      }
      if (el.kind === 'group') {
        issues.push(`Nested groups not allowed (${el.id} is a group with groupId set).`);
        failed.add(el.id);
      }
    }
  }

  // Group must have at least one child
  for (const groupId of groupIds) {
    const hasChild = inv.elements.some((e) => e && e.groupId === groupId);
    if (!hasChild) {
      issues.push(`Group ${groupId} has no children.`);
      failed.add(groupId);
    }
  }

  for (const id of failed) {
    failedIdSink.push({ id, stage: 'inventory', reason: 'inventory integrity failure' });
  }
  return gate('G2', 'Inventory integrity', issues, [...failed]);
}

// ─── Gate G3 — Geometry coverage ──────────────────────────────────────────────

function gateGeometry(
  env: VisualEnvelope,
  inventoryIds: Set<string>,
  failedIdSink: ValidationReport['failedIds'],
): ValidationGate {
  const issues: string[] = [];
  const failed = new Set<string>();
  if (!Array.isArray(env.geometry)) {
    return gate('G3', 'Geometry coverage', ['Geometry is not an array.']);
  }

  const seen = new Set<string>();
  for (const entry of env.geometry) {
    if (!entry || typeof entry !== 'object') {
      issues.push('Geometry contains a non-object entry.');
      continue;
    }
    if (typeof entry.id !== 'string') {
      issues.push('Geometry entry missing id.');
      continue;
    }
    if (!inventoryIds.has(entry.id)) {
      issues.push(`Geometry id "${entry.id}" not in inventory.`);
      failed.add(entry.id);
      continue;
    }
    if (seen.has(entry.id)) {
      issues.push(`Duplicate geometry id "${entry.id}".`);
      failed.add(entry.id);
    }
    seen.add(entry.id);

    if (isGeometryInherit(entry)) continue;

    const shape = (entry as GeometryEntry & { shape?: string }).shape;
    if (!shape || !ALLOWED_GEOMETRY_SHAPES.has(shape)) {
      issues.push(`Geometry "${entry.id}" has invalid shape "${shape}".`);
      failed.add(entry.id);
      continue;
    }
    const ok = validateGeometryShape(entry);
    if (!ok.valid) {
      issues.push(`Geometry "${entry.id}": ${ok.reason}`);
      failed.add(entry.id);
    }
  }

  // Coverage: every inventory id must have a geometry entry
  for (const id of inventoryIds) {
    if (!seen.has(id)) {
      issues.push(`Inventory id "${id}" missing in geometry.`);
      failed.add(id);
    }
  }

  for (const id of failed) {
    failedIdSink.push({ id, stage: 'geometry', reason: 'geometry coverage/shape failure' });
  }
  return gate('G3', 'Geometry coverage', issues, [...failed]);
}

function validateGeometryShape(entry: GeometryEntry): { valid: boolean; reason: string } {
  const e = entry as unknown as Record<string, unknown>;
  switch ((e.shape as string) ?? '') {
    case 'circle':
      return numericFields(e, ['cx', 'cy', 'r']);
    case 'arc':
      return numericFields(e, ['cx', 'cy', 'rOuter', 'rInner', 'startDeg', 'sweepDeg']);
    case 'line':
      return numericFields(e, ['x1', 'y1', 'x2', 'y2']);
    case 'rect':
      return numericFields(e, ['x', 'y', 'w', 'h']);
    case 'polygon': {
      const pts = e.points;
      if (!Array.isArray(pts) || pts.length < 3) {
        return { valid: false, reason: 'polygon needs ≥ 3 points' };
      }
      for (const p of pts) {
        if (!Array.isArray(p) || p.length !== 2 || typeof p[0] !== 'number' || typeof p[1] !== 'number') {
          return { valid: false, reason: 'polygon points must be [number, number]' };
        }
      }
      return { valid: true, reason: '' };
    }
    case 'path':
      return typeof e.d === 'string' && e.d.length > 0
        ? { valid: true, reason: '' }
        : { valid: false, reason: 'path requires non-empty `d` string' };
    case 'text':
      if (typeof e.content !== 'string') return { valid: false, reason: 'text needs content string' };
      return numericFields(e, ['x', 'y', 'fontSize']);
    case 'image':
      {
        const base = numericFields(e, ['x', 'y', 'w', 'h']);
        if (!base.valid) return base;
        if (e.src !== undefined && typeof e.src !== 'string') {
          return { valid: false, reason: 'image `src` must be string when provided' };
        }
        if (e.href !== undefined && typeof e.href !== 'string') {
          return { valid: false, reason: 'image `href` must be string when provided' };
        }
        return { valid: true, reason: '' };
      }
    case 'group':
      return { valid: true, reason: '' };
    default:
      return { valid: false, reason: `unknown shape "${e.shape}"` };
  }
}

function numericFields(obj: Record<string, unknown>, keys: string[]): { valid: boolean; reason: string } {
  for (const k of keys) {
    if (typeof obj[k] !== 'number' || !Number.isFinite(obj[k] as number)) {
      return { valid: false, reason: `field "${k}" must be a finite number` };
    }
  }
  return { valid: true, reason: '' };
}

// ─── Gate G4 — Appearance coverage ────────────────────────────────────────────

function gateAppearance(
  env: VisualEnvelope,
  inventoryIds: Set<string>,
  failedIdSink: ValidationReport['failedIds'],
): ValidationGate {
  const issues: string[] = [];
  const failed = new Set<string>();
  if (!Array.isArray(env.appearance)) {
    return gate('G4', 'Appearance coverage', ['Appearance is not an array.']);
  }

  const seen = new Set<string>();
  for (const entry of env.appearance) {
    if (!entry || typeof entry !== 'object') {
      issues.push('Appearance contains a non-object entry.');
      continue;
    }
    if (typeof entry.id !== 'string') {
      issues.push('Appearance entry missing id.');
      continue;
    }
    if (!inventoryIds.has(entry.id)) {
      issues.push(`Appearance id "${entry.id}" not in inventory.`);
      failed.add(entry.id);
      continue;
    }
    if (seen.has(entry.id)) {
      issues.push(`Duplicate appearance id "${entry.id}".`);
      failed.add(entry.id);
    }
    seen.add(entry.id);

    if (isAppearanceInherit(entry)) continue;

    const item = entry as AppearanceItem;
    const fillIssue = validateFill(item.fill);
    if (fillIssue) {
      issues.push(`Appearance "${entry.id}" fill: ${fillIssue}`);
      failed.add(entry.id);
    }
    const strokeIssue = validateStroke(item.stroke);
    if (strokeIssue) {
      issues.push(`Appearance "${entry.id}" stroke: ${strokeIssue}`);
      failed.add(entry.id);
    }
    if (item.opacity !== undefined && (item.opacity < 0 || item.opacity > 1)) {
      issues.push(`Appearance "${entry.id}" opacity must be 0..1.`);
      failed.add(entry.id);
    }
    if (item.texture !== undefined && item.texture !== null && !ALLOWED_TEXTURES.has(item.texture)) {
      issues.push(`Appearance "${entry.id}" texture "${item.texture}" not allowed.`);
      failed.add(entry.id);
    }
    if (item.blendMode !== undefined && item.blendMode !== null && !ALLOWED_BLEND_MODES.has(item.blendMode)) {
      issues.push(`Appearance "${entry.id}" blendMode "${item.blendMode}" not allowed.`);
      failed.add(entry.id);
    }
    if (item.filter !== undefined && item.filter !== null && !ALLOWED_FILTERS.has(item.filter)) {
      issues.push(`Appearance "${entry.id}" filter "${item.filter}" not allowed.`);
      failed.add(entry.id);
    }
    if (item.clipPath !== undefined && item.clipPath !== null) {
      if (typeof item.clipPath !== 'string' || !inventoryIds.has(item.clipPath)) {
        issues.push(`Appearance "${entry.id}" clipPath "${item.clipPath}" not in inventory.`);
        failed.add(entry.id);
      }
    }
  }

  for (const id of inventoryIds) {
    if (!seen.has(id)) {
      issues.push(`Inventory id "${id}" missing in appearance.`);
      failed.add(id);
    }
  }

  for (const id of failed) {
    failedIdSink.push({ id, stage: 'appearance', reason: 'appearance coverage/value failure' });
  }
  return gate('G4', 'Appearance coverage', issues, [...failed]);
}

function validateFill(fill: Fill | undefined): string | null {
  if (!fill || typeof fill !== 'object') return 'fill missing or not an object';
  if (!ALLOWED_FILL_KINDS.has(fill.kind)) return `kind "${fill.kind}" not allowed`;
  if (fill.kind === 'solid') {
    if (!HEX_COLOR.test(fill.color)) return `color "${fill.color}" must be lowercase #rrggbb[aa]`;
    if (fill.opacity !== undefined && (fill.opacity < 0 || fill.opacity > 1))
      return 'opacity must be 0..1';
    return null;
  }
  if (fill.kind === 'linear' || fill.kind === 'radial') {
    if (!Array.isArray(fill.stops) || fill.stops.length < 2) return 'gradient needs ≥ 2 stops';
    for (const stop of fill.stops) {
      if (typeof stop.offset !== 'number' || stop.offset < 0 || stop.offset > 1)
        return 'stop offset must be 0..1';
      if (!HEX_COLOR.test(stop.color)) return `stop color "${stop.color}" invalid`;
    }
    return null;
  }
  return null; // none
}

function validateStroke(stroke: Stroke | undefined): string | null {
  if (stroke === 'none') return null;
  if (!stroke || typeof stroke !== 'object') return 'stroke missing or not an object';
  if (!HEX_COLOR.test(stroke.color)) return `color "${stroke.color}" invalid`;
  if (typeof stroke.width !== 'number' || stroke.width < 0) return 'width must be non-negative number';
  if (stroke.opacity !== undefined && (stroke.opacity < 0 || stroke.opacity > 1))
    return 'opacity must be 0..1';
  if (stroke.dash !== undefined && !Array.isArray(stroke.dash)) return 'dash must be array of numbers';
  return null;
}

// ─── Gate G5 — Cross-stage id alignment ───────────────────────────────────────

function gateCrossStage(env: VisualEnvelope, inventoryIds: Set<string>): ValidationGate {
  const issues: string[] = [];
  const geomIds = new Set(env.geometry.filter((g) => g && typeof g.id === 'string').map((g) => g.id));
  const appIds = new Set(env.appearance.filter((a) => a && typeof a.id === 'string').map((a) => a.id));

  for (const id of inventoryIds) {
    if (!geomIds.has(id)) issues.push(`id "${id}" present in inventory but missing in geometry.`);
    if (!appIds.has(id)) issues.push(`id "${id}" present in inventory but missing in appearance.`);
  }
  for (const id of geomIds) {
    if (!inventoryIds.has(id)) issues.push(`id "${id}" in geometry but not in inventory.`);
  }
  for (const id of appIds) {
    if (!inventoryIds.has(id)) issues.push(`id "${id}" in appearance but not in inventory.`);
  }
  return gate('G5', 'Cross-stage id alignment', issues);
}

// ─── Gate G6 — Vocabulary anti-leak ───────────────────────────────────────────

function gateVocabulary(env: VisualEnvelope): ValidationGate {
  const issues: string[] = [];
  const visit = (label: string, value: string) => {
    const word = findForbiddenWord(value);
    if (word) issues.push(`Forbidden semantic word "${word}" in ${label} ("${value}").`);
  };

  for (const el of env.inventory.elements ?? []) {
    if (typeof el.id === 'string') visit(`inventory.${el.id}`, el.id);
  }
  for (const g of env.geometry ?? []) {
    if (g && typeof g.id === 'string') visit(`geometry.${g.id}`, g.id);
    const content = (g as { content?: unknown }).content;
    if (typeof content === 'string') visit(`geometry.${(g as { id?: string }).id}.content`, content);
  }
  for (const a of env.appearance ?? []) {
    if (a && typeof a.id === 'string') visit(`appearance.${a.id}`, a.id);
  }

  return gate('G6', 'Vocabulary anti-leak', issues);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function validateVisualEnvelope(env: VisualEnvelope): ValidationReport {
  const failedIds: ValidationReport['failedIds'] = [];
  const gates: ValidationGate[] = [];

  const g1 = gateShape(env);
  gates.push(g1);
  if (g1.status === 'FAIL') {
    return { isValid: false, gates, failedIds };
  }

  const inventoryIds = new Set<string>(
    (env.inventory.elements ?? [])
      .filter((e: InventoryElement) => e && typeof e.id === 'string')
      .map((e: InventoryElement) => e.id),
  );

  gates.push(gateInventory(env, failedIds));
  gates.push(gateGeometry(env, inventoryIds, failedIds));
  gates.push(gateAppearance(env, inventoryIds, failedIds));
  gates.push(gateCrossStage(env, inventoryIds));
  gates.push(gateVocabulary(env));

  const isValid = gates.every((g) => g.status === 'PASS');
  return { isValid, gates, failedIds };
}

export async function validateVisualFidelity(input: {
  sourceDataUrl: string;
  renderedSvg: string;
  width: number;
  height: number;
  threshold?: number;
}): Promise<VisualFidelityResult> {
  return evaluateVisualFidelity(input);
}

// Re-export VisualEnvelope and types for convenience
export type { VisualEnvelope, ValidationReport, ValidationGate, AppearanceEntry, GeometryEntry };
