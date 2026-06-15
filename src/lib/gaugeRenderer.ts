/**
 * gaugeRenderer.ts
 * Spec 093 — Gauge Pipeline Phase 2: Render
 *
 * Pure rendering functions. Takes an immutable ParsedGauge, returns PNGs.
 *
 * CONTRACT: parsed.needleNode / parsed.arcNode / parsed.backgroundNodes are
 * NEVER mutated. Every sub-function clones before touching anything.
 * Calling renderGaugeAssets twice on the same ParsedGauge is safe and idempotent.
 *
 * NO DOM markers. NO React. NO side effects.
 */

import { renderSvgToDataUrl } from '@/lib/customIconStore';
import type { ParsedGauge, GaugeRenderResult } from '@/lib/gaugeModel';

// ── SVG builder ───────────────────────────────────────────────────────────────

/**
 * Build a minimal SVG string from a set of nodes.
 *
 * Each node is cloned again here so callers never have to think about
 * whether buildSvgFromNodes mutates its inputs — it does not.
 *
 * @param template   SVG structural metadata from ParsedGauge
 * @param nodes      Nodes to place inside the main translate <g>
 */
function buildSvgFromNodes(
  template: ParsedGauge['template'],
  nodes: Node[],
): string {
  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', template.viewBox);
  svg.setAttribute('width', String(template.width));
  svg.setAttribute('height', String(template.height));
  svg.setAttribute('xmlns', svgNs);

  // Re-attach <defs> if present
  if (template.defsHtml) {
    const tmpDiv = document.createElement('div');
    tmpDiv.innerHTML = template.defsHtml;
    const defsEl = tmpDiv.querySelector('defs');
    if (defsEl) svg.appendChild(defsEl.cloneNode(true));
  }

  // Main centering group
  const g = document.createElementNS(svgNs, 'g');
  g.setAttribute('transform', template.mainTransform);
  for (const node of nodes) {
    g.appendChild(node.cloneNode(true));
  }
  svg.appendChild(g);

  return new XMLSerializer().serializeToString(svg);
}

// ── Needle renderer ───────────────────────────────────────────────────────────

/** Remove rotate(…) from a transform string, keeping any other transforms. */
function stripRotateFromTransform(transform: string): string {
  return transform.replace(/rotate\([^)]*\)\s*/g, '').trim();
}

/**
 * Render the needle-only PNG.
 * Strips rotate() from the needle's transform so the needle sits at its
 * natural 0° orientation (the widget handles rotation at runtime).
 */
async function renderNeedlePng(parsed: ParsedGauge, renderSize: number): Promise<string> {
  // Clone the needle node locally — NEVER mutate parsed.needleNode
  const clone = parsed.needleNode.cloneNode(true) as Element;

  const t = clone.getAttribute('transform') || '';
  const stripped = stripRotateFromTransform(t);
  if (stripped) {
    clone.setAttribute('transform', stripped);
  } else {
    clone.removeAttribute('transform');
  }

  const svgStr = buildSvgFromNodes(parsed.template, [clone]);
  return renderSvgToDataUrl(svgStr, renderSize).catch(() => '');
}

// ── Background renderer ───────────────────────────────────────────────────────

/**
 * Render the background PNG.
 * Contains all sibling nodes EXCEPT the needle and arc fill (already excluded
 * in Phase 1 — backgroundNodes contains only non-needle, non-arc children).
 */
async function renderBackgroundPng(parsed: ParsedGauge, renderSize: number): Promise<string> {
  if (parsed.backgroundNodes.length === 0) return '';
  const svgStr = buildSvgFromNodes(parsed.template, parsed.backgroundNodes);
  return renderSvgToDataUrl(svgStr, renderSize).catch(() => '');
}

// ── Arc frame renderer ────────────────────────────────────────────────────────

function pathHasArcCommand(d: string): boolean {
  return /[Aa]/.test(d);
}

/**
 * Compute the full arc perimeter for dasharray math.
 * Uses the stored radius and angular span from geometry.
 */
function computeArcLength(radius: number, spanDeg: number): number {
  return 2 * Math.PI * radius * (Math.abs(spanDeg) / 360);
}

/**
 * Render 11 arc fill frame PNGs (0%→100% fill).
 * Each frame: clones arcNode, applies stroke-dasharray to show fillRatio of the arc,
 * renders to PNG. No mutations to parsed.arcNode.
 */
async function renderArcFrames(parsed: ParsedGauge, renderSize: number): Promise<string[]> {
  if (!parsed.arcNode) return [];

  const { arcStart, arcEnd, arcRadius } = parsed.geometry;
  const spanDeg = Math.abs(arcEnd - arcStart);
  let arcLength = arcRadius > 0 ? computeArcLength(arcRadius, spanDeg) : 0;

  // Fallback: if we couldn't compute from stored radius, scan arc paths in the node
  if (arcLength <= 0) {
    const tmpEl = parsed.arcNode.cloneNode(true) as Element;
    const arcPaths = tmpEl.tagName?.toLowerCase() === 'path'
      ? [tmpEl]
      : Array.from(tmpEl.querySelectorAll?.('path') ?? []).filter(p => pathHasArcCommand(p.getAttribute('d') || ''));
    for (const path of arcPaths) {
      const d = path.getAttribute('d') || '';
      if (pathHasArcCommand(d)) {
        const m = d.match(/[Aa]\s*([\d.]+)/);
        if (m) {
          const r = parseFloat(m[1]);
          if (isFinite(r) && r > 0) { arcLength = computeArcLength(r, spanDeg); break; }
        }
      }
    }
  }
  if (arcLength <= 0) arcLength = 1000; // generous fallback

  const FRAME_COUNT = 11;
  const ratios = Array.from({ length: FRAME_COUNT }, (_, i) => i / (FRAME_COUNT - 1));

  const frames = await Promise.all(
    ratios.map(async (fillRatio) => {
      // Clone arc node locally — NEVER mutate parsed.arcNode
      const arcClone = parsed.arcNode!.cloneNode(true) as Element;

      const paths = arcClone.tagName?.toLowerCase() === 'path'
        ? [arcClone]
        : Array.from(arcClone.querySelectorAll?.('path') ?? []).filter(p =>
            pathHasArcCommand(p.getAttribute('d') || ''),
          );

      for (const path of paths) {
        if (!pathHasArcCommand(path.getAttribute('d') || '')) continue;
        const fillLen = (fillRatio * arcLength).toFixed(2);
        path.setAttribute('stroke-dasharray', `${fillLen} 9999`);
        path.removeAttribute('stroke-dashoffset');
        break;
      }

      const svgStr = buildSvgFromNodes(parsed.template, [arcClone]);
      return renderSvgToDataUrl(svgStr, renderSize).catch(() => '');
    }),
  );

  return frames.filter(f => f.length > 0);
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Phase 2: Render all gauge asset PNGs from an immutable ParsedGauge.
 *
 * Returns a GaugeRenderResult with needle PNG, background PNG, arc frames,
 * geometry pass-through, and a status message for the UI.
 *
 * This function is IDEMPOTENT: calling it multiple times with the same
 * ParsedGauge produces identical results.
 */
export async function renderGaugeAssets(
  parsed: ParsedGauge,
  renderSize = 400,
): Promise<GaugeRenderResult> {
  const [needlePng, backgroundPng, arcFrames] = await Promise.all([
    renderNeedlePng(parsed, renderSize),
    renderBackgroundPng(parsed, renderSize),
    renderArcFrames(parsed, renderSize),
  ]);

  // Build status message
  const parts: string[] = ['Needle auto-detected.'];
  if (parsed.detected.arcRange) {
    const { arcStart, arcEnd, tickAngles } = parsed.geometry;
    parts.push(`Arc: ${arcStart}°→${arcEnd}° (${tickAngles.length} ticks).`);
  } else {
    parts.push('Arc range not detected — set manually.');
  }
  if (parsed.detected.arc && arcFrames.length > 0) {
    parts.push(`Arc fill detected → ${arcFrames.length} IMG_LEVEL frames.`);
  }
  const { pivotX, pivotY } = parsed.geometry;
  parts.push(`Pivot: (${pivotX.toFixed(2)}, ${pivotY.toFixed(2)}).`);
  if (backgroundPng) parts.push('Background IMG created below.');

  return {
    needlePng,
    backgroundPng,
    arcFrames,
    geometry: parsed.geometry,
    statusMessage: parts.join(' '),
  };
}
