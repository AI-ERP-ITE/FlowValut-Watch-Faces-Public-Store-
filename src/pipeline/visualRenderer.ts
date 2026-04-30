// Visual Spec Renderer — converts a validated VisualEnvelope into deterministic SVG.
// Pure visual: shapes/fills/strokes/textures/clipping/layer order.
// No watchface semantics. Reference: app/docs/AI_ANALYSIS_COMPILER_PROMPT.md

import type {
  AppearanceEntry,
  AppearanceItem,
  Canvas,
  ColorStop,
  Fill,
  GeometryArc,
  GeometryCircle,
  GeometryEntry,
  GeometryImage,
  GeometryLine,
  GeometryPath,
  GeometryPolygon,
  GeometryRect,
  GeometryText,
  GeometryTransform,
  InventoryElement,
  MergedElement,
  MergedSpec,
  Stroke,
  VisualEnvelope,
} from '@/types/visualSpec';
import { isAppearanceInherit, isGeometryInherit } from '@/types/visualSpec';

// ─── Defaults for inherit ─────────────────────────────────────────────────────

const DEFAULT_FILL: Fill = { kind: 'solid', color: '#888888', opacity: 1 };
const DEFAULT_STROKE: Stroke = 'none';

const DEFAULT_GEOMETRY = (el: InventoryElement): GeometryEntry => {
  const { x, y, w, h } = el.bbox;
  switch (el.kind) {
    case 'group':
      return { id: el.id, shape: 'group' };
    case 'text':
      return {
        id: el.id,
        shape: 'text',
        x: x + w / 2,
        y: y + h / 2,
        content: '',
        fontSize: Math.max(8, Math.round(h * 0.6)),
        anchor: 'middle',
      };
    case 'image':
      return { id: el.id, shape: 'image', x, y, w, h };
    default:
      return { id: el.id, shape: 'rect', x, y, w, h };
  }
};

// ─── Merge ────────────────────────────────────────────────────────────────────

export function mergeVisualEnvelope(env: VisualEnvelope): MergedSpec {
  const geomMap = new Map<string, GeometryEntry>(env.geometry.map((g) => [g.id, g]));
  const appMap = new Map<string, AppearanceEntry>(env.appearance.map((a) => [a.id, a]));
  const elements: MergedElement[] = env.inventory.elements.map((inv) => {
    const geomRaw = geomMap.get(inv.id);
    const geometry: GeometryEntry =
      !geomRaw || isGeometryInherit(geomRaw) ? DEFAULT_GEOMETRY(inv) : geomRaw;
    const appearance: AppearanceEntry = appMap.get(inv.id) ?? { id: inv.id, inherit: true };
    return { inventory: inv, geometry, appearance };
  });
  elements.sort((a, b) => a.inventory.zOrder - b.inventory.zOrder);
  return { canvas: env.inventory.canvas, elements };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function attr(name: string, value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return '';
  return ` ${name}="${typeof value === 'string' ? escapeXml(value) : value}"`;
}

function transformAttr(t: GeometryTransform): string {
  const parts: string[] = [];
  if (t.rotation !== undefined && t.rotation !== 0) {
    const px = t.pivotX ?? 0;
    const py = t.pivotY ?? 0;
    parts.push(`rotate(${t.rotation} ${px} ${py})`);
  }
  if ((t.scaleX !== undefined && t.scaleX !== 1) || (t.scaleY !== undefined && t.scaleY !== 1)) {
    parts.push(`scale(${t.scaleX ?? 1} ${t.scaleY ?? 1})`);
  }
  if (parts.length === 0) return '';
  return ` transform="${parts.join(' ')}"`;
}

// ─── Defs (gradients + clipPaths) ─────────────────────────────────────────────

interface DefsContext {
  defs: string[];
  gradientCounter: number;
  fillRefs: Map<string, string>; // appearance id → fill attribute value
  clipRefs: Map<string, string>; // inventory id → clip-path attribute value
}

function defsId(prefix: string, n: number): string {
  return `vs_${prefix}_${n.toString(36)}`;
}

function buildFillForElement(
  ctx: DefsContext,
  appId: string,
  fill: Fill,
): string {
  if (fill.kind === 'none') return 'none';
  if (fill.kind === 'solid') return fill.color;
  const id = defsId('grad', ctx.gradientCounter++);
  if (fill.kind === 'linear') {
    const angle = ((fill.angleDeg % 360) + 360) % 360;
    // Convert angle (0 = +x, clockwise) to x1/y1/x2/y2 along unit square
    const rad = (angle * Math.PI) / 180;
    const x1 = (50 - Math.cos(rad) * 50).toFixed(2);
    const y1 = (50 - Math.sin(rad) * 50).toFixed(2);
    const x2 = (50 + Math.cos(rad) * 50).toFixed(2);
    const y2 = (50 + Math.sin(rad) * 50).toFixed(2);
    ctx.defs.push(
      `<linearGradient id="${id}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">${stopsXml(fill.stops)}</linearGradient>`,
    );
  } else {
    ctx.defs.push(
      `<radialGradient id="${id}" cx="${fill.cx}" cy="${fill.cy}" r="${fill.r}" gradientUnits="userSpaceOnUse">${stopsXml(fill.stops)}</radialGradient>`,
    );
  }
  ctx.fillRefs.set(appId, `url(#${id})`);
  return `url(#${id})`;
}

function stopsXml(stops: ColorStop[]): string {
  return stops
    .map((s) => {
      const op = s.opacity !== undefined ? ` stop-opacity="${s.opacity}"` : '';
      return `<stop offset="${s.offset}" stop-color="${s.color}"${op}/>`;
    })
    .join('');
}

function buildClipPathDef(ctx: DefsContext, clipSourceId: string, merged: MergedSpec): string | null {
  if (ctx.clipRefs.has(clipSourceId)) return ctx.clipRefs.get(clipSourceId)!;
  const target = merged.elements.find((e) => e.inventory.id === clipSourceId);
  if (!target) return null;
  const id = defsId('clip', ctx.gradientCounter++);
  const inner = renderShapeOnly(target.geometry);
  if (!inner) return null;
  ctx.defs.push(`<clipPath id="${id}">${inner}</clipPath>`);
  const ref = `url(#${id})`;
  ctx.clipRefs.set(clipSourceId, ref);
  return ref;
}

// ─── Shape rendering ──────────────────────────────────────────────────────────

function renderShapeOnly(g: GeometryEntry): string {
  if (isGeometryInherit(g)) return '';
  const t = g as GeometryTransform;
  const tr = transformAttr(t);
  switch ((g as { shape: string }).shape) {
    case 'circle': {
      const c = g as GeometryCircle;
      return `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}"${tr}/>`;
    }
    case 'arc': {
      const a = g as GeometryArc;
      return `<path d="${arcPath(a)}"${tr}/>`;
    }
    case 'line': {
      const l = g as GeometryLine;
      return `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}"${tr}/>`;
    }
    case 'rect': {
      const r = g as GeometryRect;
      return `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"${attr('rx', r.rx)}${attr('ry', r.ry)}${tr}/>`;
    }
    case 'polygon': {
      const p = g as GeometryPolygon;
      return `<polygon points="${p.points.map(([x, y]) => `${x},${y}`).join(' ')}"${tr}/>`;
    }
    case 'path': {
      const p = g as GeometryPath;
      return `<path d="${p.d}"${tr}/>`;
    }
    case 'text': {
      const x = g as GeometryText;
      return `<text x="${x.x}" y="${x.y}" font-size="${x.fontSize}" text-anchor="${x.anchor}"${tr}>${escapeXml(x.content)}</text>`;
    }
    case 'image': {
      const i = g as GeometryImage;
      return `<rect x="${i.x}" y="${i.y}" width="${i.w}" height="${i.h}"${tr}/>`;
    }
    case 'group':
      return '';
    default:
      return '';
  }
}

function arcPath(a: GeometryArc): string {
  const start = a.startDeg;
  const end = a.startDeg + a.sweepDeg;
  const toXY = (deg: number, r: number): [number, number] => {
    const rad = (deg * Math.PI) / 180;
    return [a.cx + Math.cos(rad) * r, a.cy + Math.sin(rad) * r];
  };
  const [x0, y0] = toXY(start, a.rOuter);
  const [x1, y1] = toXY(end, a.rOuter);
  const [x2, y2] = toXY(end, a.rInner);
  const [x3, y3] = toXY(start, a.rInner);
  const largeOuter = Math.abs(a.sweepDeg) > 180 ? 1 : 0;
  const sweepFlag = a.sweepDeg >= 0 ? 1 : 0;
  const sweepInverse = a.sweepDeg >= 0 ? 0 : 1;
  return [
    `M ${x0.toFixed(3)} ${y0.toFixed(3)}`,
    `A ${a.rOuter} ${a.rOuter} 0 ${largeOuter} ${sweepFlag} ${x1.toFixed(3)} ${y1.toFixed(3)}`,
    `L ${x2.toFixed(3)} ${y2.toFixed(3)}`,
    `A ${a.rInner} ${a.rInner} 0 ${largeOuter} ${sweepInverse} ${x3.toFixed(3)} ${y3.toFixed(3)}`,
    'Z',
  ].join(' ');
}

// ─── Per-element render ───────────────────────────────────────────────────────

function strokeAttrs(stroke: Stroke): string {
  if (stroke === 'none' || !stroke) return ' stroke="none"';
  const parts: string[] = [];
  parts.push(`stroke="${stroke.color}"`);
  parts.push(`stroke-width="${stroke.width}"`);
  if (stroke.opacity !== undefined) parts.push(`stroke-opacity="${stroke.opacity}"`);
  if (stroke.dash && stroke.dash.length > 0) parts.push(`stroke-dasharray="${stroke.dash.join(' ')}"`);
  if (stroke.cap) parts.push(`stroke-linecap="${stroke.cap}"`);
  if (stroke.join) parts.push(`stroke-linejoin="${stroke.join}"`);
  return ` ${parts.join(' ')}`;
}

function fillOpacityAttr(fill: Fill, override?: number): string {
  if (fill.kind === 'solid' && fill.opacity !== undefined) return ` fill-opacity="${fill.opacity}"`;
  if (override !== undefined) return ` fill-opacity="${override}"`;
  return '';
}

function elementOpacityAttr(item: AppearanceItem | undefined): string {
  if (!item || item.opacity === undefined) return '';
  return ` opacity="${item.opacity}"`;
}

function clipPathAttr(clip: string | null | undefined): string {
  return clip ? ` clip-path="${clip}"` : '';
}

function blendAttr(item: AppearanceItem | undefined): string {
  if (!item || !item.blendMode || item.blendMode === 'normal' || item.blendMode === null) return '';
  return ` style="mix-blend-mode:${item.blendMode}"`;
}

function renderElement(
  ctx: DefsContext,
  merged: MergedSpec,
  el: MergedElement,
): string {
  const inv = el.inventory;
  const geom = el.geometry;
  const appRaw = el.appearance;
  const isInherit = isAppearanceInherit(appRaw);
  const item = isInherit ? undefined : (appRaw as AppearanceItem);
  const fill: Fill = item?.fill ?? DEFAULT_FILL;
  const stroke: Stroke = item?.stroke ?? DEFAULT_STROKE;
  const fillValue = buildFillForElement(ctx, inv.id, fill);

  let clipRef: string | null = null;
  if (item?.clipPath) clipRef = buildClipPathDef(ctx, item.clipPath, merged);

  const attrs = [
    `data-id="${escapeXml(inv.id)}"`,
    `data-kind="${inv.kind}"`,
    `data-z="${inv.zOrder}"`,
  ].join(' ');

  if (!isGeometryInherit(geom) && geom.shape === 'group') {
    const childIds = merged.elements.filter((e) => e.inventory.groupId === inv.id);
    const inner = childIds.map((c) => renderElement(ctx, merged, c)).join('');
    return `<g ${attrs}${elementOpacityAttr(item)}${clipPathAttr(clipRef)}${blendAttr(item)}>${inner}</g>`;
  }

  // Skip elements that are inside a group; they were rendered by parent
  if (inv.groupId) return '';

  const shapeXml = renderShapeOnly(geom);
  if (!shapeXml) return '';

  // Inject fill + stroke into the shape tag
  const enriched = shapeXml.replace(
    /^<(\w+)/,
    `<$1 fill="${fillValue}"${fillOpacityAttr(fill, item?.opacity)}${strokeAttrs(stroke)}`,
  );
  return `<g ${attrs}${elementOpacityAttr(item)}${clipPathAttr(clipRef)}${blendAttr(item)}>${enriched}</g>`;
}

// Children rendered by their group should not be skipped when reached via group recursion
// (the skip rule above only applies to top-level iteration).
// We use a separate path inside groups: re-render child without skip.
function renderGroupChild(
  ctx: DefsContext,
  merged: MergedSpec,
  el: MergedElement,
): string {
  const geom = el.geometry;
  if (!isGeometryInherit(geom) && geom.shape === 'group') return renderElement(ctx, merged, el);
  const shapeXml = renderShapeOnly(geom);
  if (!shapeXml) return '';
  const inv = el.inventory;
  const appRaw = el.appearance;
  const item = isAppearanceInherit(appRaw) ? undefined : (appRaw as AppearanceItem);
  const fill: Fill = item?.fill ?? DEFAULT_FILL;
  const stroke: Stroke = item?.stroke ?? DEFAULT_STROKE;
  const fillValue = buildFillForElement(ctx, inv.id, fill);
  let clipRef: string | null = null;
  if (item?.clipPath) clipRef = buildClipPathDef(ctx, item.clipPath, merged);
  const enriched = shapeXml.replace(
    /^<(\w+)/,
    `<$1 fill="${fillValue}"${fillOpacityAttr(fill, item?.opacity)}${strokeAttrs(stroke)}`,
  );
  const attrs = `data-id="${escapeXml(inv.id)}" data-kind="${inv.kind}" data-z="${inv.zOrder}"`;
  return `<g ${attrs}${elementOpacityAttr(item)}${clipPathAttr(clipRef)}${blendAttr(item)}>${enriched}</g>`;
}

// Override renderElement's group branch to use renderGroupChild for children
// (replaces the previous approach without re-skipping).
function renderTopLevel(
  ctx: DefsContext,
  merged: MergedSpec,
  el: MergedElement,
): string {
  const inv = el.inventory;
  if (inv.groupId) return ''; // child of a group, skip at top level

  const geom = el.geometry;
  const appRaw = el.appearance;
  const item = isAppearanceInherit(appRaw) ? undefined : (appRaw as AppearanceItem);

  if (!isGeometryInherit(geom) && geom.shape === 'group') {
    const children = merged.elements.filter((e) => e.inventory.groupId === inv.id);
    const inner = children.map((c) => renderGroupChild(ctx, merged, c)).join('');
    let clipRef: string | null = null;
    if (item?.clipPath) clipRef = buildClipPathDef(ctx, item.clipPath, merged);
    const attrs = `data-id="${escapeXml(inv.id)}" data-kind="group" data-z="${inv.zOrder}"`;
    return `<g ${attrs}${elementOpacityAttr(item)}${clipPathAttr(clipRef)}${blendAttr(item)}>${inner}</g>`;
  }

  return renderGroupChild(ctx, merged, el);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RenderResult {
  svg: string;
  html: string;
  merged: MergedSpec;
}

export function renderVisualSpec(env: VisualEnvelope): RenderResult {
  const merged = mergeVisualEnvelope(env);
  const ctx: DefsContext = {
    defs: [],
    gradientCounter: 0,
    fillRefs: new Map(),
    clipRefs: new Map(),
  };

  const body = merged.elements.map((el) => renderTopLevel(ctx, merged, el)).join('');
  const canvas = canvasAttrs(merged.canvas);
  const defsXml = ctx.defs.length > 0 ? `<defs>${ctx.defs.join('')}</defs>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${merged.canvas.width} ${merged.canvas.height}" width="${merged.canvas.width}" height="${merged.canvas.height}"${canvas.clip}>${defsXml}${body}</svg>`;
  const html = `<!doctype html><html><body style="margin:0;background:#000">${svg}</body></html>`;
  return { svg, html, merged };
}

function canvasAttrs(canvas: Canvas): { clip: string } {
  if (canvas.shape === 'circle') {
    // Add a circular clip via inline preserveAspectRatio + style? We instead emit
    // a clipPath def at body level handled by the data attr; simplest: no clipping.
    // Renderer keeps rect viewport even for circle canvas; consumer can mask externally.
    return { clip: '' };
  }
  return { clip: '' };
}
