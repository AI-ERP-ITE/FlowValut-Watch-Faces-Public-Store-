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

function drawGenericElement(el: GeometryEl, color: string, label: string): string {
  const rx = Math.max(4, Math.min(el.width, el.height) * 0.08);
  const labelY = Math.max(12, el.y + Math.min(16, el.height * 0.35));
  return [
    `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${rx}" fill="none" stroke="${color}" stroke-width="2"/>`,
    `<text x="${el.x + 6}" y="${labelY}" fill="${color}" font-size="10">${escapeXml(label)}</text>`,
  ].join('');
}

export function compileAnalysisToInlineSvg(analysis: WatchfaceAnalysisContract): string {
  const width = analysis.geometryModel.canvas.width;
  const height = analysis.geometryModel.canvas.height;
  const palette = analysis.colorModel.palette;
  const dominant = colorOrFallback(analysis.colorModel.dominantColor, layerColor(0, palette));
  const geoById = geometryIndex(analysis);

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
        .map((element, elementIndex) => {
          const found = geoById.get(element.id);
          if (!found) {
            const y = 18 + (index * 14) + elementIndex * 12;
            return `<text x="8" y="${y}" fill="${stroke}" font-size="9">${escapeXml(element.type)}:${escapeXml(element.id)}</text>`;
          }

          if (found.type === 'time_pointer' || element.type === 'time_pointer') {
            return drawTimePointer(found, stroke);
          }

          const shortLabel = `${element.type}:${element.id}`;
          return drawGenericElement(found, stroke, shortLabel);
        })
        .join('');

      const layerGuide = layer.role === 'background'
        ? ''
        : `<text x="8" y="${height - 8 - index * 11}" fill="${stroke}" opacity="0.65" font-size="9">${escapeXml(layer.role)}</text>`;

      const groupOpen = layer.clipRefs.length > 0
        ? `<g id="${escapeXml(layer.id)}" clip-path="url(#${escapeXml(layer.clipRefs[0])})">`
        : `<g id="${escapeXml(layer.id)}">`;

      return `${groupOpen}${bgOverlay}${renderedElements}${layerGuide}</g>`;
    })
    .join('');

  const defs = clipDefs ? `<defs>${clipDefs}</defs>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${defs}${layers}</svg>`;
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
