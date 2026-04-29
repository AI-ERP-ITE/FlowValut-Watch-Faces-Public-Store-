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

  return [
    `<circle cx="${cx}" cy="${cy}" r="3" fill="${color}"/>`,
    `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - hourLen}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>`,
    `<line x1="${cx}" y1="${cy}" x2="${cx + minLen * 0.4}" y2="${cy - minLen}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`,
    `<line x1="${cx}" y1="${cy}" x2="${cx - secLen * 0.35}" y2="${cy - secLen}" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>`,
  ].join('');
}

function drawGenericElement(el: GeometryEl, color: string): string {
  const rx = Math.max(4, Math.min(el.width, el.height) * 0.08);
  return [
    `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${rx}" fill="none" stroke="${color}" stroke-width="2" opacity="0.5"/>`,
  ].join('');
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
  const centerRaw = gm.center as Record<string, unknown> | undefined;
  const cx = asNumber(centerRaw?.x) ?? analysis.geometryModel.canvas.width / 2;
  const cy = asNumber(centerRaw?.y) ?? analysis.geometryModel.canvas.height / 2;
  const radii = (gm.radii as Record<string, unknown> | undefined) ?? {};
  const outerR = asNumber(radii.outer) ?? Math.min(cx, cy) - 6;
  const dialR = asNumber(radii.dial) ?? Math.max(40, outerR - 30);
  const bezelInnerR = asNumber(radii.bezelInner) ?? Math.max(30, outerR - 18);

  const base = [
    `<circle cx="${cx}" cy="${cy}" r="${outerR}" fill="${colorOrFallback(analysis.colorModel.dominantColor, layerColor(0, palette))}"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${bezelInnerR}" fill="none" stroke="${layerColor(1, palette)}" stroke-width="5" opacity="0.9"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${dialR}" fill="none" stroke="${layerColor(2, palette)}" stroke-width="2" opacity="0.8"/>`,
  ];

  const minuteTicksRaw = gm.minuteTicks as Record<string, unknown> | undefined;
  const minuteCount = asNumber(minuteTicksRaw?.count) ?? 60;
  const minuteRadius = asNumber(minuteTicksRaw?.radius) ?? Math.max(20, outerR - 18);
  const majorLen = asNumber(minuteTicksRaw?.lengthMajor) ?? 12;
  const minorLen = asNumber(minuteTicksRaw?.lengthMinor) ?? 6;
  const tickColor = layerColor(3, palette);
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
  const idxColor = layerColor(4, palette);
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
  const dominant = colorOrFallback(analysis.colorModel.dominantColor, layerColor(0, palette));
  const geoById = geometryIndex(analysis);
  const scaffold = buildDialScaffold(analysis, palette);

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
        ? `<rect x="0" y="0" width="${width}" height="${height}" fill="${dominant}"/>`
        : '';

      const renderedElements = layer.elements
        .map((element) => {
          const found = geoById.get(element.id);
          const scaffoldDriven = /^(dial_base|bezel_ring|minute_ticks|minute_numerals|hour_indices|triangle_marker|central_bridge|subdial_|slot_window|screw)/i.test(element.id);
          if (!found) {
            return '';
          }

          if (
            found.type === 'time_pointer'
            || element.type === 'time_pointer'
            || /time[_-]?pointer|hands?/i.test(`${found.type}:${element.type}:${element.id}`)
          ) {
            return drawTimePointer(found, stroke);
          }

          if (found.type === 'background' || element.type === 'background') {
            return '';
          }

          if (scaffoldDriven) {
            return '';
          }

          // Avoid giant full-canvas fallback boxes that hide all detail.
          if (found.width >= width * 0.9 && found.height >= height * 0.9) {
            return '';
          }

          return drawGenericElement(found, stroke);
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

  const defs = clipDefs ? `<defs>${clipDefs}</defs>` : '';
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
