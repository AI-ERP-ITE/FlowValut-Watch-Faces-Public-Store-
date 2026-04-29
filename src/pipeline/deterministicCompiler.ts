import type { ComplianceValidationReport, WatchfaceAnalysisContract } from '@/types/analysisCompiler';
import { validateAnalysisCompliance } from './complianceValidator';

export interface DeterministicCompileResult {
  svg: string;
  html: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colorOrFallback(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const isHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
  return isHex ? value.trim() : fallback;
}

function layerColor(index: number, palette: string[]): string {
  const paletteColor = palette[index % Math.max(1, palette.length)];
  return colorOrFallback(paletteColor, '#1f2937');
}

interface GeometryEl {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX?: number;
  centerY?: number;
  [key: string]: unknown;
}

interface CircleSpec {
  x: number;
  y: number;
  r: number;
}

interface RectSpec {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius?: number;
}

interface PaintSpec {
  stroke: string;
  fill: string;
  opacity?: number;
}

function geometryIndex(analysis: WatchfaceAnalysisContract): Map<string, GeometryEl> {
  return new Map(
    analysis.geometryModel.elements.map((el) => [el.id, el as GeometryEl]),
  );
}

function drawTimePointer(el: GeometryEl, color: string): string {
  const cx = el.centerX ?? el.x + el.width / 2;
  const cy = el.centerY ?? el.y + el.height / 2;
  const hourLen = Math.max(24, Math.min(el.width, el.height) * 0.18);
  const minLen = Math.max(34, Math.min(el.width, el.height) * 0.27);
  const secLen = Math.max(42, Math.min(el.width, el.height) * 0.34);
  const handStroke = 'url(#grad-metal-warm)';
  const secStroke = 'url(#grad-accent)';

  return [
    `<circle cx="${cx}" cy="${cy}" r="3" fill="${color}" opacity="0.8"/>`,
    `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - hourLen}" stroke="${handStroke}" stroke-width="4" stroke-linecap="round"/>`,
    `<line x1="${cx}" y1="${cy}" x2="${cx + minLen * 0.4}" y2="${cy - minLen}" stroke="${handStroke}" stroke-width="3" stroke-linecap="round"/>`,
    `<line x1="${cx}" y1="${cy}" x2="${cx - secLen * 0.35}" y2="${cy - secLen}" stroke="${secStroke}" stroke-width="1.5" stroke-linecap="round"/>`,
  ].join('');
}

function drawGenericElement(el: GeometryEl, color: string): string {
  const rx = Math.max(4, Math.min(el.width, el.height) * 0.08);
  return [
    `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${rx}" fill="none" stroke="${color}" stroke-width="2" opacity="0.5"/>`,
  ].join('');
}

function drawRing(el: GeometryEl, color: string, paint?: PaintSpec): string {
  const cx = el.centerX ?? el.x + el.width / 2;
  const cy = el.centerY ?? el.y + el.height / 2;
  const radius = asNumber(el.radius) ?? Math.max(6, Math.min(el.width, el.height) / 2 - 2);
  const thickness = asNumber(el.thickness) ?? Math.max(1.5, radius * 0.08);
  const stroke = paint?.stroke ?? color;
  const fill = paint?.fill ?? 'none';
  const opacity = paint?.opacity ?? 0.9;
  return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${thickness}" opacity="${opacity}"/>`;
}

function drawRadialTicks(el: GeometryEl, color: string, paint?: PaintSpec): string {
  const cx = el.centerX ?? el.x + el.width / 2;
  const cy = el.centerY ?? el.y + el.height / 2;
  const count = Math.max(1, Math.floor(asNumber(el.count) ?? 12));
  const radius = asNumber(el.radius) ?? Math.max(12, Math.min(el.width, el.height) / 2 - 2);
  const majorEvery = Math.max(1, Math.floor(asNumber(el.majorEvery) ?? 5));
  const majorLength = asNumber(el.majorLength) ?? Math.max(8, radius * 0.1);
  const minorLength = asNumber(el.minorLength) ?? Math.max(4, radius * 0.05);
  const majorWidth = asNumber(el.majorWidth) ?? 2;
  const minorWidth = asNumber(el.minorWidth) ?? 1;

  const stroke = paint?.stroke ?? color;
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const deg = -90 + i * (360 / count);
    const isMajor = i % majorEvery === 0;
    const len = isMajor ? majorLength : minorLength;
    const p1 = polar(cx, cy, radius, deg);
    const p2 = polar(cx, cy, Math.max(1, radius - len), deg);
    parts.push(
      `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${stroke}" stroke-width="${isMajor ? majorWidth : minorWidth}" opacity="${isMajor ? 0.95 : 0.7}"/>`,
    );
  }
  return parts.join('');
}

function drawRadialRectangles(el: GeometryEl, color: string, paint?: PaintSpec): string {
  const cx = el.centerX ?? el.x + el.width / 2;
  const cy = el.centerY ?? el.y + el.height / 2;
  const count = Math.max(1, Math.floor(asNumber(el.count) ?? 12));
  const radius = asNumber(el.radius) ?? Math.max(12, Math.min(el.width, el.height) / 2 - 6);
  const rectW = asNumber(el.rectWidth) ?? 6;
  const rectH = asNumber(el.rectHeight) ?? 14;

  const fill = paint?.fill ?? paint?.stroke ?? color;
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const deg = -90 + i * (360 / count);
    const p = polar(cx, cy, radius, deg);
    parts.push(
      `<rect x="${p.x - rectW / 2}" y="${p.y - rectH / 2}" width="${rectW}" height="${rectH}" fill="${fill}" opacity="0.82" transform="rotate(${deg + 90} ${p.x} ${p.y})"/>`,
    );
  }
  return parts.join('');
}

function drawRadialText(el: GeometryEl, color: string, paint?: PaintSpec): string {
  const cx = el.centerX ?? el.x + el.width / 2;
  const cy = el.centerY ?? el.y + el.height / 2;
  const count = Math.max(1, Math.floor(asNumber(el.count) ?? 12));
  const radius = asNumber(el.radius) ?? Math.max(16, Math.min(el.width, el.height) / 2 - 10);
  const labels = Array.isArray(el.labels) ? (el.labels as unknown[]) : [];
  const fontSize = asNumber(el.fontSize) ?? 12;

  const fill = paint?.fill ?? paint?.stroke ?? color;
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const deg = -90 + i * (360 / count);
    const p = polar(cx, cy, radius, deg);
    const label = labels[i] ?? `${i + 1}`;
    parts.push(
      `<text x="${p.x}" y="${p.y}" fill="${fill}" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle" opacity="0.94">${escapeXml(String(label))}</text>`,
    );
  }
  return parts.join('');
}

function drawPointerSet(el: GeometryEl, color: string): string {
  return drawTimePointer(el, color);
}

function buildStyleDefs(palette: string[]): string {
  const dark0 = colorOrFallback(palette[0], '#0b0b0d');
  const dark1 = colorOrFallback(palette[1], '#15171b');
  const dark2 = colorOrFallback(palette[2], '#23262c');
  const accent0 = colorOrFallback(palette[3], '#a56e3d');
  const accent1 = colorOrFallback(palette[4], '#c48a58');
  const light = colorOrFallback(palette[5], '#e3d2bd');

  return [
    '<radialGradient id="grad-dial-bg" cx="50%" cy="42%" r="64%">',
    `  <stop offset="0%" stop-color="${dark1}"/>`,
    `  <stop offset="72%" stop-color="${dark0}"/>`,
    `  <stop offset="100%" stop-color="${dark2}"/>`,
    '</radialGradient>',
    '<linearGradient id="grad-metal-warm" x1="0%" y1="0%" x2="100%" y2="100%">',
    `  <stop offset="0%" stop-color="${light}"/>`,
    `  <stop offset="45%" stop-color="${accent1}"/>`,
    `  <stop offset="100%" stop-color="${accent0}"/>`,
    '</linearGradient>',
    '<linearGradient id="grad-accent" x1="0%" y1="0%" x2="0%" y2="100%">',
    `  <stop offset="0%" stop-color="${light}"/>`,
    `  <stop offset="100%" stop-color="${accent0}"/>`,
    '</linearGradient>',
    '<filter id="fx-soft-noise" x="-20%" y="-20%" width="140%" height="140%">',
    '  <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" stitchTiles="stitch" result="noise"/>',
    '  <feColorMatrix in="noise" type="saturate" values="0" result="mono"/>',
    '  <feComponentTransfer in="mono" result="faint">',
    '    <feFuncA type="table" tableValues="0 0.045"/>',
    '  </feComponentTransfer>',
    '  <feBlend in="SourceGraphic" in2="faint" mode="overlay"/>',
    '</filter>',
  ].join('');
}

function resolvePaint(effectiveType: string, materialType: string | undefined, fallback: string): PaintSpec {
  const material = (materialType ?? '').toLowerCase();
  const isWarm = material.includes('copper') || material.includes('bronze') || material.includes('gold');
  const isMetal = material.includes('metal') || material.includes('steel') || material.includes('anodized');

  if (effectiveType === 'background') {
    return { stroke: 'none', fill: 'url(#grad-dial-bg)', opacity: 1 };
  }

  if (effectiveType === 'ring' || effectiveType === 'radial_ticks' || effectiveType === 'radial_rectangles') {
    if (isWarm) return { stroke: 'url(#grad-metal-warm)', fill: 'url(#grad-metal-warm)', opacity: 0.95 };
    if (isMetal) return { stroke: 'url(#grad-metal-warm)', fill: 'none', opacity: 0.88 };
  }

  if (effectiveType === 'radial_text') {
    return { stroke: 'none', fill: isWarm ? 'url(#grad-metal-warm)' : fallback, opacity: 0.96 };
  }

  return { stroke: fallback, fill: 'none', opacity: 0.9 };
}

function findMaterialForElement(
  analysis: WatchfaceAnalysisContract,
): Map<string, string> {
  const materialById = new Map<string, string>();
  for (const material of analysis.textureModel.materials) {
    materialById.set(material.elementId, material.materialType);
  }
  return materialById;
}

function adjustRadialTextLane(el: GeometryEl, allGeometry: Map<string, GeometryEl>): GeometryEl {
  const textRadius = asNumber(el.radius);
  if (textRadius === null) return el;

  const cx = el.centerX ?? el.x + el.width / 2;
  const cy = el.centerY ?? el.y + el.height / 2;
  const fontSize = asNumber(el.fontSize) ?? 12;

  let adjustedRadius = textRadius;
  for (const candidate of allGeometry.values()) {
    if (String(candidate.type).toLowerCase() !== 'radial_ticks') continue;
    const tcx = candidate.centerX ?? candidate.x + candidate.width / 2;
    const tcy = candidate.centerY ?? candidate.y + candidate.height / 2;
    if (Math.abs(tcx - cx) > 1 || Math.abs(tcy - cy) > 1) continue;

    const tickRadius = asNumber(candidate.radius) ?? Math.min(candidate.width, candidate.height) / 2;
    const majorLen = asNumber(candidate.majorLength) ?? 10;
    const minorLen = asNumber(candidate.minorLength) ?? 5;
    const tickLen = Math.max(majorLen, minorLen);
    const minGap = fontSize * 0.85 + 6;

    if (Math.abs(adjustedRadius - tickRadius) < tickLen + minGap) {
      const placeOutside = adjustedRadius >= tickRadius;
      adjustedRadius = placeOutside
        ? tickRadius + tickLen + minGap
        : Math.max(14, tickRadius - tickLen - minGap);
    }
  }

  if (adjustedRadius === textRadius) return el;
  return { ...el, radius: adjustedRadius };
}

function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseCircle(raw: unknown): CircleSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const x = asNumber(obj.x);
  const y = asNumber(obj.y);
  const r = asNumber(obj.r);
  if (x === null || y === null || r === null) return null;
  return { x, y, r };
}

function parseRect(raw: unknown): RectSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const x = asNumber(obj.x);
  const y = asNumber(obj.y);
  const width = asNumber(obj.width);
  const height = asNumber(obj.height);
  if (x === null || y === null || width === null || height === null) return null;
  const cornerRadius = asNumber(obj.cornerRadius) ?? undefined;
  return { x, y, width, height, cornerRadius };
}

function buildDialScaffold(analysis: WatchfaceAnalysisContract, palette: string[]): string {
  const gm = analysis.geometryModel as unknown as Record<string, unknown>;
  const hasScaffoldHints = [
    gm.center,
    gm.radii,
    gm.minuteTicks,
    gm.indices,
    gm.subdials,
    gm.bridge,
    gm.slot,
    gm.screws,
  ].some((value) => value !== undefined);

  if (!hasScaffoldHints) {
    return '';
  }

  const centerRaw = gm.center as Record<string, unknown> | undefined;
  const cx = asNumber(centerRaw?.x) ?? analysis.geometryModel.canvas.width / 2;
  const cy = asNumber(centerRaw?.y) ?? analysis.geometryModel.canvas.height / 2;
  const radii = (gm.radii as Record<string, unknown> | undefined) ?? {};
  const outerR = asNumber(radii.outer) ?? Math.min(cx, cy) - 6;
  const dialR = asNumber(radii.dial) ?? Math.max(40, outerR - 30);
  const bezelInnerR = asNumber(radii.bezelInner) ?? Math.max(30, outerR - 18);

  const base = [
    `<circle cx="${cx}" cy="${cy}" r="${outerR}" fill="url(#grad-dial-bg)" filter="url(#fx-soft-noise)"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${bezelInnerR}" fill="none" stroke="url(#grad-metal-warm)" stroke-width="5" opacity="0.88"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${dialR}" fill="none" stroke="${layerColor(2, palette)}" stroke-width="2" opacity="0.8"/>`,
  ];

  const minuteTicksRaw = gm.minuteTicks as Record<string, unknown> | undefined;
  const minuteCount = asNumber(minuteTicksRaw?.count) ?? 60;
  const minuteRadius = asNumber(minuteTicksRaw?.radius) ?? Math.max(20, outerR - 18);
  const majorLen = asNumber(minuteTicksRaw?.lengthMajor) ?? 12;
  const minorLen = asNumber(minuteTicksRaw?.lengthMinor) ?? 6;
  const tickColor = 'url(#grad-metal-warm)';
  for (let i = 0; i < minuteCount; i += 1) {
    const deg = -90 + i * (360 / minuteCount);
    const isMajor = i % 5 === 0;
    const len = isMajor ? majorLen : minorLen;
    const p1 = polar(cx, cy, minuteRadius, deg);
    const p2 = polar(cx, cy, minuteRadius - len, deg);
    base.push(
      `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${tickColor}" stroke-width="${isMajor ? 2 : 1}" opacity="${isMajor ? 0.95 : 0.6}"/>`,
    );
  }

  const idxRaw = gm.indices as Record<string, unknown> | undefined;
  const idxCount = asNumber(idxRaw?.count) ?? 12;
  const idxRadius = asNumber(idxRaw?.radius) ?? Math.max(20, dialR - 16);
  const idxLen = asNumber(idxRaw?.length) ?? 20;
  const idxColor = 'url(#grad-metal-warm)';
  for (let i = 0; i < idxCount; i += 1) {
    const deg = -90 + i * (360 / idxCount);
    const p1 = polar(cx, cy, idxRadius, deg);
    const p2 = polar(cx, cy, idxRadius - idxLen, deg);
    base.push(`<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${idxColor}" stroke-width="3" stroke-linecap="round"/>`);
  }

  const subdials = Array.isArray(gm.subdials) ? gm.subdials : [];
  for (const raw of subdials) {
    const c = parseCircle(raw);
    if (!c) continue;
    base.push(`<circle cx="${c.x}" cy="${c.y}" r="${c.r}" fill="none" stroke="${layerColor(2, palette)}" stroke-width="2" opacity="0.8"/>`);
  }

  const bridge = parseRect(gm.bridge);
  if (bridge) {
    const rx = bridge.cornerRadius ?? 10;
    base.push(
      `<rect x="${bridge.x}" y="${bridge.y}" width="${bridge.width}" height="${bridge.height}" rx="${rx}" fill="${layerColor(2, palette)}" opacity="0.35" stroke="${layerColor(5, palette)}" stroke-width="1.5"/>`,
    );
  }

  const slot = parseRect(gm.slot);
  if (slot) {
    const rx = slot.cornerRadius ?? 8;
    base.push(
      `<rect x="${slot.x}" y="${slot.y}" width="${slot.width}" height="${slot.height}" rx="${rx}" fill="none" stroke="${layerColor(6, palette)}" stroke-width="2" opacity="0.85"/>`,
    );
  }

  const screws = Array.isArray(gm.screws) ? gm.screws : [];
  for (const raw of screws) {
    const c = parseCircle(raw);
    if (!c) continue;
    base.push(`<circle cx="${c.x}" cy="${c.y}" r="${c.r}" fill="${layerColor(6, palette)}" opacity="0.85"/>`);
    base.push(`<line x1="${c.x - c.r * 0.6}" y1="${c.y}" x2="${c.x + c.r * 0.6}" y2="${c.y}" stroke="#111" stroke-width="1" opacity="0.8"/>`);
  }

  return base.join('');
}

export function compileAnalysisToInlineSvg(analysis: WatchfaceAnalysisContract): string {
  const width = analysis.geometryModel.canvas.width;
  const height = analysis.geometryModel.canvas.height;
  const palette = analysis.colorModel.palette;
  const geoById = geometryIndex(analysis);
  const materialByElementId = findMaterialForElement(analysis);
  const scaffold = buildDialScaffold(analysis, palette);
  const styleDefs = buildStyleDefs(palette);

  const clipDefs = analysis.layerModel.layerStack
    .flatMap((layer) => layer.clipRefs)
    .filter((clipId, index, arr) => clipId && arr.indexOf(clipId) === index)
    .map((clipId) => {
      return `<clipPath id="${escapeXml(clipId)}"><rect x="0" y="0" width="${width}" height="${height}" /></clipPath>`;
    })
    .join('');

  const layers = analysis.layerModel.layerStack
    .slice()
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((layer, index) => {
      const stroke = layerColor(index, palette);
      const bgOverlay = layer.role === 'background'
        ? `<rect x="0" y="0" width="${width}" height="${height}" fill="url(#grad-dial-bg)"/>`
        : '';

      const renderedElements = layer.elements
        .map((element) => {
          const found = geoById.get(element.id);
          if (!found) {
            return `<g><title>missing-geometry:${escapeXml(element.id)}</title></g>`;
          }

          const effectiveType = String(found.type || element.type || '').toLowerCase();
          const materialType = materialByElementId.get(element.id);
          const paint = resolvePaint(effectiveType, materialType, stroke);
          const geometryForDraw = effectiveType === 'radial_text'
            ? adjustRadialTextLane(found, geoById)
            : found;

          if (
            effectiveType === 'time_pointer'
            || effectiveType === 'pointer_set'
            || /^(time[_-]?pointer|hands?)$/i.test(String(found.type || ''))
            || /^(time[_-]?pointer|hands?)$/i.test(String(element.type || ''))
          ) {
            return effectiveType === 'pointer_set'
              ? drawPointerSet(geometryForDraw, stroke)
              : drawTimePointer(geometryForDraw, stroke);
          }

          if (effectiveType === 'background') {
            return '';
          }

          if (effectiveType === 'ring') {
            return drawRing(geometryForDraw, stroke, paint);
          }

          if (effectiveType === 'radial_ticks') {
            return drawRadialTicks(geometryForDraw, stroke, paint);
          }

          if (effectiveType === 'radial_rectangles') {
            return drawRadialRectangles(geometryForDraw, stroke, paint);
          }

          if (effectiveType === 'radial_text') {
            return drawRadialText(geometryForDraw, stroke, paint);
          }

          return drawGenericElement(geometryForDraw, stroke);
        })
        .join('');

      const layerGuide = layer.role === 'background'
        ? ''
        : '';

      const groupOpen = layer.clipRefs.length > 0
        ? `<g id="${escapeXml(layer.id)}" clip-path="url(#${escapeXml(layer.clipRefs[0])})">`
        : `<g id="${escapeXml(layer.id)}">`;

      return `${groupOpen}${bgOverlay}${renderedElements}${layerGuide}</g>`;
    })
    .join('');

  const defsBody = [styleDefs, clipDefs].filter(Boolean).join('');
  const defs = defsBody ? `<defs>${defsBody}</defs>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${defs}<g id="dial-scaffold">${scaffold}</g>${layers}</svg>`;
}

export function compileValidatedAnalysis(
  analysis: WatchfaceAnalysisContract,
  report?: ComplianceValidationReport,
): DeterministicCompileResult {
  const compliance = report ?? validateAnalysisCompliance(analysis);
  if (!compliance.isCompliant) {
    const reasons = compliance.gates
      .filter((gate) => gate.status === 'FAIL')
      .map((gate) => `${gate.gateId}: ${gate.details.join('; ')}`)
      .join(' | ');
    throw new Error(`Validation failed. ${reasons}`);
  }

  const svg = compileAnalysisToInlineSvg(analysis);
  return {
    svg,
    html: svg,
  };
}
