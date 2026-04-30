// Renderer adapter for MergedSpec (4-stage pipeline output).
// Produces deterministic inline SVG. No reliance on legacy scaffold/material engine.

import type { MergedSpec, MergedElement, Shape, Fill, Stroke } from '@/types/fourStage';

const escapeXml = (v: string): string =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

interface DefAccumulator {
  defs: string[];
  count: number;
}

function gradientId(idx: number): string {
  return `g4s_grad_${idx}`;
}

function fillToAttr(fill: Fill, defs: DefAccumulator): { attr: string } {
  switch (fill.type) {
    case 'none':
      return { attr: 'none' };
    case 'solid':
      return { attr: escapeXml(fill.color) };
    case 'linear': {
      const id = gradientId(defs.count++);
      const angle = fill.angleDeg ?? 0;
      const rad = (angle * Math.PI) / 180;
      const x1 = 50 - Math.cos(rad) * 50;
      const y1 = 50 - Math.sin(rad) * 50;
      const x2 = 50 + Math.cos(rad) * 50;
      const y2 = 50 + Math.sin(rad) * 50;
      const stops = fill.stops.map(
        (s) => `<stop offset="${(s.offset * 100).toFixed(2)}%" stop-color="${escapeXml(s.color)}"/>`,
      ).join('');
      defs.defs.push(`<linearGradient id="${id}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">${stops}</linearGradient>`);
      return { attr: `url(#${id})` };
    }
    case 'radial': {
      const id = gradientId(defs.count++);
      const fx = fill.focal ? `fx="${fill.focal.x}" fy="${fill.focal.y}"` : '';
      const stops = fill.stops.map(
        (s) => `<stop offset="${(s.offset * 100).toFixed(2)}%" stop-color="${escapeXml(s.color)}"/>`,
      ).join('');
      defs.defs.push(`<radialGradient id="${id}" cx="50%" cy="50%" r="50%" ${fx}>${stops}</radialGradient>`);
      return { attr: `url(#${id})` };
    }
  }
}

function strokeAttrs(stroke: Stroke | null): string {
  if (!stroke) return '';
  const op = stroke.opacity != null ? ` stroke-opacity="${stroke.opacity}"` : '';
  return ` stroke="${escapeXml(stroke.color)}" stroke-width="${stroke.width}"${op}`;
}

function transformAttr(el: MergedElement): string {
  const t = el.transform;
  if (!t || !t.rotateDeg) return '';
  const px = t.pivotX ?? 0;
  const py = t.pivotY ?? 0;
  return ` transform="rotate(${t.rotateDeg} ${px} ${py})"`;
}

function clipAttr(el: MergedElement, defs: DefAccumulator): string {
  if (!el.clip) return '';
  const id = `g4s_clip_${defs.count++}`;
  if (el.clip.type === 'circle') {
    defs.defs.push(`<clipPath id="${id}"><circle cx="${el.clip.cx}" cy="${el.clip.cy}" r="${el.clip.r}"/></clipPath>`);
  } else {
    defs.defs.push(`<clipPath id="${id}"><rect x="${el.clip.x}" y="${el.clip.y}" width="${el.clip.w}" height="${el.clip.h}"/></clipPath>`);
  }
  return ` clip-path="url(#${id})"`;
}

function drawShape(shape: Shape, fillAttr: string, strokeBit: string, opacity: number | null): string {
  const op = opacity != null ? ` opacity="${opacity}"` : '';
  switch (shape.type) {
    case 'circle': {
      const sw = shape.strokeWidth != null ? ` stroke-width="${shape.strokeWidth}"` : '';
      return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" fill="${fillAttr}"${strokeBit || sw}${op}/>`;
    }
    case 'arc': {
      // Build annular sector path (outer arc + inner arc).
      const toRad = (d: number) => (d * Math.PI) / 180;
      const a0 = toRad(shape.startDeg - 90);
      const a1 = toRad(shape.endDeg - 90);
      const large = Math.abs(shape.endDeg - shape.startDeg) > 180 ? 1 : 0;
      const xo0 = shape.cx + Math.cos(a0) * shape.rOuter;
      const yo0 = shape.cy + Math.sin(a0) * shape.rOuter;
      const xo1 = shape.cx + Math.cos(a1) * shape.rOuter;
      const yo1 = shape.cy + Math.sin(a1) * shape.rOuter;
      const xi1 = shape.cx + Math.cos(a1) * shape.rInner;
      const yi1 = shape.cy + Math.sin(a1) * shape.rInner;
      const xi0 = shape.cx + Math.cos(a0) * shape.rInner;
      const yi0 = shape.cy + Math.sin(a0) * shape.rInner;
      const d = `M ${xo0} ${yo0} A ${shape.rOuter} ${shape.rOuter} 0 ${large} 1 ${xo1} ${yo1} L ${xi1} ${yi1} A ${shape.rInner} ${shape.rInner} 0 ${large} 0 ${xi0} ${yi0} Z`;
      return `<path d="${d}" fill="${fillAttr}"${strokeBit}${op}/>`;
    }
    case 'line': {
      const sw = shape.strokeWidth != null ? ` stroke-width="${shape.strokeWidth}"` : '';
      // For lines stroke is required; if no explicit stroke, use fill as stroke fallback.
      const s = strokeBit || ` stroke="${fillAttr}"${sw}`;
      return `<line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}"${s} stroke-linecap="round"${op}/>`;
    }
    case 'rect': {
      const rx = shape.rx != null ? ` rx="${shape.rx}"` : '';
      return `<rect x="${shape.x}" y="${shape.y}" width="${shape.w}" height="${shape.h}"${rx} fill="${fillAttr}"${strokeBit}${op}/>`;
    }
    case 'path':
      return `<path d="${shape.d}" fill="${fillAttr}"${strokeBit}${op}/>`;
    case 'text': {
      const size = shape.size ?? 14;
      const anchor = shape.anchor ?? 'middle';
      return `<text x="${shape.x}" y="${shape.y}" font-size="${size}" text-anchor="${anchor}" dominant-baseline="middle" fill="${fillAttr}"${strokeBit}${op}>${escapeXml(shape.text)}</text>`;
    }
    case 'image':
      return `<image x="${shape.x}" y="${shape.y}" width="${shape.w}" height="${shape.h}" href="${escapeXml(shape.ref)}"${op}/>`;
    case 'group':
      return shape.children.map((c) => drawShape(c, fillAttr, strokeBit, opacity)).join('');
  }
}

export function renderMergedSpec(spec: MergedSpec): { svg: string; html: string } {
  const { canvas, elements } = spec;
  const defs: DefAccumulator = { defs: [], count: 0 };

  const body = elements.map((el) => {
    const { attr: fillAttr } = fillToAttr(el.fill, defs);
    const strokeBit = strokeAttrs(el.stroke);
    const transform = transformAttr(el);
    const clip = clipAttr(el, defs);
    const shapeSvg = drawShape(el.shape, fillAttr, strokeBit, el.opacity);
    const open = `<g id="${escapeXml(el.id)}" data-role="${escapeXml(el.layerRole)}" data-semantic="${escapeXml(el.semanticType)}"${transform}${clip}>`;
    return `${open}${shapeSvg}</g>`;
  }).join('');

  const defsBlock = defs.defs.length ? `<defs>${defs.defs.join('')}</defs>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.w}" height="${canvas.h}" viewBox="0 0 ${canvas.w} ${canvas.h}">${defsBlock}${body}</svg>`;
  return { svg, html: svg };
}
