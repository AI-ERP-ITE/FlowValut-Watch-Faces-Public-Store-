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

export function compileAnalysisToInlineSvg(analysis: WatchfaceAnalysisContract): string {
  const width = analysis.geometryModel.canvas.width;
  const height = analysis.geometryModel.canvas.height;
  const palette = analysis.colorModel.palette;

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
      const fill = layerColor(index, palette);
      const opacity = layer.role === 'background' ? '1.0' : '0.18';
      const rect = `<rect x="0" y="0" width="${width}" height="${height}" fill="${fill}" opacity="${opacity}"/>`;
      const labels = layer.elements
        .map((element, elementIndex) => {
          const y = 24 + elementIndex * 18;
          return `<text x="12" y="${y}" fill="#e5e7eb" font-size="12">${escapeXml(element.type)}:${escapeXml(element.id)}</text>`;
        })
        .join('');

      const groupOpen = layer.clipRefs.length > 0
        ? `<g id="${escapeXml(layer.id)}" clip-path="url(#${escapeXml(layer.clipRefs[0])})">`
        : `<g id="${escapeXml(layer.id)}">`;

      return `${groupOpen}${rect}${labels}</g>`;
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
