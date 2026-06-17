/**
 * gaugeRenderer.ts
 * Spec 093 — Gauge Pipeline Phase 2: Render
 *
 * Ratio-based sizing (revised):
 *   1. Each layer's tight bounding box is measured via getBBox() in the live DOM.
 *   2. The background is the anchor: scaled to ANCHOR_SIZE (145 px).
 *   3. Needle and arc are scaled by the SAME ratio → correct relative sizes.
 *   4. Each layer gets its own cropped SVG viewBox and non-square PNG canvas.
 *   5. LayerLayouts in the result carries per-layer placement data for Phase 3.
 *
 * CONTRACT: parsed.needleNode / parsed.arcNode / parsed.backgroundNodes are
 * NEVER mutated. Every function clones before touching anything.
 * Calling renderGaugeAssets twice on the same ParsedGauge is safe and idempotent.
 *
 * NO DOM attribute markers. NO React. No global state.
 */

// (renderSvgToDataUrl from customIconStore no longer used — replaced by renderSvgToDataUrlRect)
import type { ParsedGauge, GaugeRenderResult, LayerLayout, LayerLayouts } from '@/lib/gaugeModel';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Target background size on the watch face in pixels (anchor for all layer ratios). */
const ANCHOR_SIZE = 145;

// ── Geometry helpers ──────────────────────────────────────────────────────────

/** Extract translate(x,y) from a transform string. Returns {x:0,y:0} if not found. */
function extractTranslateXY(transform: string): { x: number; y: number } {
  const m = transform.match(/translate\(\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/);
  if (!m) return { x: 0, y: 0 };
  return { x: parseFloat(m[1]) || 0, y: parseFloat(m[2]) || 0 };
}

/**
 * Measure tight bounding box of a set of SVG nodes by inserting them into the
 * live DOM under a hidden SVG, then calling getBBox().
 *
 * Returns bbox in the mainGroup LOCAL coordinate space (before the translate),
 * i.e. the same space in which gauge geometry is expressed (origin = gauge center).
 * Returns null if getBBox fails or returns zero area.
 *
 * Side effect: temporarily appends and removes a hidden <svg> from document.body.
 */
function measureNodesBBox(
  template: ParsedGauge['template'],
  nodes: Node[],
  cx: number,
  cy: number,
): { x: number; y: number; w: number; h: number } | null {
  if (nodes.length === 0) return null;
  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg') as SVGSVGElement;
  svg.setAttribute('viewBox', template.viewBox);
  svg.setAttribute('width', String(template.width));
  svg.setAttribute('height', String(template.height));
  svg.style.cssText =
    'position:absolute;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none;';
  const g = document.createElementNS(svgNs, 'g') as SVGGElement;
  g.setAttribute('transform', `translate(${cx},${cy})`);
  for (const node of nodes) {
    g.appendChild(document.adoptNode(node.cloneNode(true)));
  }
  svg.appendChild(g);
  document.body.appendChild(svg);
  try {
    const bbox = g.getBBox();
    if (!bbox || bbox.width <= 0 || bbox.height <= 0) return null;
    // getBBox() on a <g transform="translate(cx,cy)"> returns coords in the group's
    // OWN local coordinate space — the translate on the group itself is NOT included.
    // Content inside the group is already expressed in gauge-local space
    // (origin = gauge center), so these values are already correct as-is.
    return { x: bbox.x, y: bbox.y, w: bbox.width, h: bbox.height };
  } catch {
    return null;
  } finally {
    document.body.removeChild(svg);
  }
}

/**
 * Build a LayerLayout from a local-space bbox and a scale factor.
 *
 * pivotFracX/Y: gauge center (local 0,0) as fraction of canvas size.
 * offsetX/Y: element.bounds.x = gaugeCenterScreenX + offsetX.
 */
function makeLayerLayout(
  localBBox: { x: number; y: number; w: number; h: number },
  scale: number,
): LayerLayout {
  const canvasW = Math.max(1, Math.round(localBBox.w * scale));
  const canvasH = Math.max(1, Math.round(localBBox.h * scale));
  return {
    canvasW,
    canvasH,
    pivotFracX: (-localBBox.x) / localBBox.w,
    pivotFracY: (-localBBox.y) / localBBox.h,
    offsetX: Math.round(localBBox.x * scale),
    offsetY: Math.round(localBBox.y * scale),
  };
}

// ── Rendering helpers ─────────────────────────────────────────────────────────

/** Render an SVG string to a PNG data URL at explicit (possibly non-square) dimensions. */
function renderSvgToDataUrlRect(svgString: string, w: number, h: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('SVG render failed'));
    };
    img.src = url;
  });
}

/**
 * Build a minimal SVG string from a set of nodes.
 * viewportOverride: when provided, overrides viewBox/width/height for tight cropping.
 *
 * Uses DOMParser to create a proper SVG document context so nodes cloned from a
 * DOMParser SVG document keep their namespace intact. Mixing namespaces produces
 * broken declarations that browsers reject as images.
 */
function buildSvgFromNodes(
  template: ParsedGauge['template'],
  nodes: Node[],
  viewportOverride?: { viewBox: string; width: number; height: number },
): string {
  const svgNs = 'http://www.w3.org/2000/svg';
  const parser = new DOMParser();
  const vb = viewportOverride?.viewBox ?? template.viewBox;
  const vw = viewportOverride?.width ?? template.width;
  const vh = viewportOverride?.height ?? template.height;

  const svgDoc = parser.parseFromString(
    `<svg xmlns="${svgNs}" viewBox="${vb}" width="${vw}" height="${vh}"></svg>`,
    'image/svg+xml',
  );
  const svgEl = svgDoc.querySelector('svg');
  if (!svgEl) return '';

  if (template.defsHtml) {
    const defsDoc = parser.parseFromString(
      `<svg xmlns="${svgNs}">${template.defsHtml}</svg>`,
      'image/svg+xml',
    );
    const defsEl = defsDoc.querySelector('defs');
    if (defsEl) svgEl.appendChild(svgDoc.adoptNode(defsEl.cloneNode(true)));
  }

  const g = svgDoc.createElementNS(svgNs, 'g');
  g.setAttribute('transform', template.mainTransform);
  for (const node of nodes) {
    g.appendChild(svgDoc.adoptNode(node.cloneNode(true)));
  }
  svgEl.appendChild(g);

  return new XMLSerializer().serializeToString(svgEl);
}

// ── Padding helpers (stroke + filter) ───────────────────────────────────────

/** Parse percentage string "-20%" → -0.20, "140%" → 1.40. Returns null if unparseable. */
function parsePct(s: string | null): number | null {
  if (!s) return null;
  const m = s.trim().match(/^(-?[\d.]+)%$/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return isFinite(v) ? v / 100 : null;
}

/**
 * Compute half the maximum stroke-width found among all elements in nodes.
 * getBBox() excludes stroke, so this amount overflows the geometric bbox on each side.
 */
function computeStrokePadding(nodes: Node[]): number {
  let maxStroke = 0;
  const scanEl = (el: Element) => {
    const sw = el.getAttribute('stroke-width');
    if (sw) {
      const v = parseFloat(sw);
      if (isFinite(v) && v > 0) maxStroke = Math.max(maxStroke, v);
    }
    for (const child of Array.from(el.children)) scanEl(child);
  };
  for (const node of nodes) {
    if (node.nodeType === 1) scanEl(node as Element);
  }
  return maxStroke / 2;
}

/**
 * Compute exact filter-region padding from filter x/y/width/height attributes in defs.
 *
 * SVG filter region percentages are relative to the STROKED element bbox.
 * Example: metalShadow x="-20%" y="-20%" width="140%" height="140%"
 *   → padLeft = 20% × strokedW, padRight = 20% × strokedW, etc.
 *
 * Formula:
 *   padLeft   = -xPct × strokedW  (xPct negative e.g. -0.20 → 0.20 × w)
 *   padTop    = -yPct × strokedH
 *   padRight  = (widthPct - 1 + xPct) × strokedW
 *   padBottom = (heightPct - 1 + yPct) × strokedH
 */
function computeFilterPadding(
  nodes: Node[],
  defsHtml: string,
  strokedW: number,
  strokedH: number,
): { padLeft: number; padTop: number; padRight: number; padBottom: number } {
  const zero = { padLeft: 0, padTop: 0, padRight: 0, padBottom: 0 };
  if (!defsHtml) return zero;

  const filterIds = new Set<string>();
  const scanEl = (el: Element) => {
    const f = el.getAttribute('filter') || '';
    const m = f.match(/url\(#([^)]+)\)/);
    if (m) filterIds.add(m[1].trim());
    for (const child of Array.from(el.children)) scanEl(child);
  };
  for (const node of nodes) {
    if (node.nodeType === 1) scanEl(node as Element);
  }
  if (filterIds.size === 0) return zero;

  const parser = new DOMParser();
  const defsDoc = parser.parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${defsHtml}</svg>`,
    'image/svg+xml',
  );

  let maxL = 0, maxT = 0, maxR = 0, maxB = 0;
  for (const id of filterIds) {
    const filterEl = defsDoc.getElementById(id);
    if (!filterEl || filterEl.tagName.toLowerCase() !== 'filter') continue;
    const xPct = parsePct(filterEl.getAttribute('x')) ?? -0.10;
    const yPct = parsePct(filterEl.getAttribute('y')) ?? -0.10;
    const wPct = parsePct(filterEl.getAttribute('width')) ?? 1.20;
    const hPct = parsePct(filterEl.getAttribute('height')) ?? 1.20;
    maxL = Math.max(maxL, Math.max(0, -xPct * strokedW));
    maxT = Math.max(maxT, Math.max(0, -yPct * strokedH));
    maxR = Math.max(maxR, Math.max(0, (wPct - 1 + xPct) * strokedW));
    maxB = Math.max(maxB, Math.max(0, (hPct - 1 + yPct) * strokedH));
  }
  return { padLeft: maxL, padTop: maxT, padRight: maxR, padBottom: maxB };
}

/**
 * Expand a geometric bbox (excludes stroke and filter) to the full visual bbox:
 *   1. Expand by strokePad (uniform on all sides)
 *   2. Expand by filterPad (exact per-side values, relative to stroked bbox)
 */
function expandBBox(
  bbox: { x: number; y: number; w: number; h: number },
  strokePad: number,
  filterPad: { padLeft: number; padTop: number; padRight: number; padBottom: number },
): { x: number; y: number; w: number; h: number } {
  const sx = bbox.x - strokePad;
  const sy = bbox.y - strokePad;
  const sw = bbox.w + strokePad * 2;
  const sh = bbox.h + strokePad * 2;
  return {
    x: sx - filterPad.padLeft,
    y: sy - filterPad.padTop,
    w: sw + filterPad.padLeft + filterPad.padRight,
    h: sh + filterPad.padTop + filterPad.padBottom,
  };
}

// ── Arc utilities ─────────────────────────────────────────────────────────────

function pathHasArcCommand(d: string): boolean {
  return /[Aa]/.test(d);
}

function computeArcLength(radius: number, spanDeg: number): number {
  return 2 * Math.PI * radius * (Math.abs(spanDeg) / 360);
}

/** Remove non-visual / text elements from a clone in-place. */
function stripNonVisual(el: Element): void {
  for (const tag of ['text', 'tspan', 'title', 'desc', 'metadata', 'script', 'style']) {
    for (const node of Array.from(el.querySelectorAll(tag))) {
      node.parentElement?.removeChild(node);
    }
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Phase 2: Render all gauge asset PNGs from an immutable ParsedGauge.
 *
 * Algorithm:
 *   1. Measure tight bbox per layer via getBBox() (hidden DOM node, always cleaned up).
 *   2. Scale = ANCHOR_SIZE / bg_natural_size.
 *   3. Build LayerLayouts: canvas size + pivot fractions + screen offsets per layer.
 *   4. Render each layer with a cropped viewBox at its own canvas size.
 *
 * All three layers share the same scale so they are physically proportional on
 * the watch face, with the gauge center as the common anchor point.
 */
export async function renderGaugeAssets(
  parsed: ParsedGauge,
  _renderSize = 400, // kept for API compatibility only
): Promise<GaugeRenderResult> {
  const { mainTransform } = parsed.template;
  const { x: cx, y: cy } = extractTranslateXY(mainTransform);

  // ── 1. Measure tight bboxes (local space, origin = gauge center) ──────────

  const bgBBox = measureNodesBBox(parsed.template, parsed.backgroundNodes, cx, cy);
  const needleBBox = measureNodesBBox(parsed.template, [parsed.needleNode], cx, cy);

  // Strip text labels from arc before measuring (same as render path)
  let arcBBox: { x: number; y: number; w: number; h: number } | null = null;
  if (parsed.arcNode) {
    const arcForMeasure = parsed.arcNode.cloneNode(true) as Element;
    stripNonVisual(arcForMeasure);
    arcBBox = measureNodesBBox(parsed.template, [arcForMeasure], cx, cy);
  }

  // ── 2. Scale anchored on background ───────────────────────────────────────

  const bgNatural = bgBBox
    ? Math.max(bgBBox.w, bgBBox.h)
    : Math.max(parsed.template.width, parsed.template.height);
  const scale = ANCHOR_SIZE / bgNatural;

  // Fallback bbox when measurement fails: full viewBox centered on gauge pivot
  const fallbackBBox = {
    x: -(parsed.template.width / 2),
    y: -(parsed.template.height / 2),
    w: parsed.template.width,
    h: parsed.template.height,
  };

  // ── 3. Expand bboxes by stroke + filter padding ────────────────────────────
  // getBBox() excludes stroke-width and filter effects.
  // We expand each layer's bbox by exact stroke and filter-region amounts so
  // the rendered PNG canvas captures the full visible content without clipping.

  const expandLayer = (
    geoBBox: { x: number; y: number; w: number; h: number } | null,
    nodes: Node[],
  ) => {
    if (!geoBBox) return null;
    const sp = computeStrokePadding(nodes);
    const fp = computeFilterPadding(
      nodes, parsed.template.defsHtml,
      geoBBox.w + sp * 2, geoBBox.h + sp * 2,
    );
    return expandBBox(geoBBox, sp, fp);
  };

  const needleBBoxExp = expandLayer(needleBBox, [parsed.needleNode]);
  const bgBBoxExp     = expandLayer(bgBBox, parsed.backgroundNodes);
  const arcBBoxExp    = arcBBox
    ? expandLayer(arcBBox, parsed.arcNode ? [parsed.arcNode] : [])
    : null;

  // ── 4. Build LayerLayouts ─────────────────────────────────────────────────

  const needleLayout = makeLayerLayout(needleBBoxExp ?? fallbackBBox, scale);
  const bgLayout = bgBBoxExp ? makeLayerLayout(bgBBoxExp, scale) : null;
  const arcLayout = arcBBoxExp ? makeLayerLayout(arcBBoxExp, scale) : null;

  const layerLayouts: LayerLayouts = {
    needle: needleLayout,
    background: bgLayout,
    arc: arcLayout,
    scale,
  };

  /** Convert expanded local bbox → viewBox override for tight crop. */
  const makeVP = (
    expBBox: { x: number; y: number; w: number; h: number },
    layout: LayerLayout,
  ) => ({
    // Add cx/cy back to convert local coords → SVG viewport coords
    viewBox: `${(expBBox.x + cx).toFixed(4)} ${(expBBox.y + cy).toFixed(4)} ${expBBox.w.toFixed(4)} ${expBBox.h.toFixed(4)}`,
    width: layout.canvasW,
    height: layout.canvasH,
  });

  // ── 5. Render needle PNG ──────────────────────────────────────────────────
  // Strip rotate() ONLY from the top-level needle element so the PNG shows the needle
  // pointing straight up (12PM). Children keep their own transforms intact.
  const needleNodeStripped = parsed.needleNode.cloneNode(true) as Element;
  const topTransform = needleNodeStripped.getAttribute?.('transform') || '';
  if (topTransform) {
    const stripped = topTransform.replace(/rotate\([^)]*\)\s*/g, '').trim();
    if (stripped) needleNodeStripped.setAttribute('transform', stripped);
    else needleNodeStripped.removeAttribute('transform');
  }

  const needleVP = needleBBoxExp ? makeVP(needleBBoxExp, needleLayout) : undefined;
  const needleSvg = buildSvgFromNodes(
    parsed.template,
    [needleNodeStripped],
    needleVP,
  );
  const needlePng = await renderSvgToDataUrlRect(
    needleSvg,
    needleLayout.canvasW,
    needleLayout.canvasH,
  ).catch(() => '');

  // ── 6. Render background PNG ──────────────────────────────────────────────

  let backgroundPng = '';
  if (parsed.backgroundNodes.length > 0) {
    const cleaned = parsed.backgroundNodes.map(n => {
      const clone = n.cloneNode(true) as Element;
      if (clone.querySelectorAll) {
        for (const tag of ['title', 'desc', 'metadata', 'script']) {
          for (const node of Array.from(clone.querySelectorAll(tag))) {
            node.parentElement?.removeChild(node);
          }
        }
      }
      return clone;
    });
    const layout = bgLayout ?? needleLayout;
    const bgVP = bgBBoxExp ? makeVP(bgBBoxExp, layout) : undefined;
    const bgSvg = buildSvgFromNodes(parsed.template, cleaned, bgVP);
    backgroundPng = await renderSvgToDataUrlRect(bgSvg, layout.canvasW, layout.canvasH).catch(
      () => '',
    );
  }

  // ── 7. Render arc fill frames ─────────────────────────────────────────────

  let arcFrames: string[] = [];
  if (parsed.arcNode && arcLayout) {
    const { arcStart, arcEnd, arcRadius } = parsed.geometry;
    const spanDeg = Math.abs(arcEnd - arcStart);
    let arcLength = arcRadius > 0 ? computeArcLength(arcRadius, spanDeg) : 0;

    if (arcLength <= 0) {
      const tmpEl = parsed.arcNode.cloneNode(true) as Element;
      const arcPaths =
        tmpEl.tagName?.toLowerCase() === 'path'
          ? [tmpEl]
          : Array.from(tmpEl.querySelectorAll?.('path') ?? []).filter(p =>
              pathHasArcCommand(p.getAttribute('d') || ''),
            );
      for (const path of arcPaths) {
        const d = path.getAttribute('d') || '';
        if (pathHasArcCommand(d)) {
          const m = d.match(/[Aa]\s*([\d.]+)/);
          if (m) {
            const r = parseFloat(m[1]);
            if (isFinite(r) && r > 0) {
              arcLength = computeArcLength(r, spanDeg);
              break;
            }
          }
        }
      }
    }
    if (arcLength <= 0) arcLength = 1000;

    const arcVP = arcBBoxExp ? makeVP(arcBBoxExp, arcLayout) : undefined;
    const FRAME_COUNT = 11;
    const ratios = Array.from({ length: FRAME_COUNT }, (_, i) => i / (FRAME_COUNT - 1));

    arcFrames = (
      await Promise.all(
        ratios.map(async fillRatio => {
          const arcClone = parsed.arcNode!.cloneNode(true) as Element;
          stripNonVisual(arcClone);
          const paths =
            arcClone.tagName?.toLowerCase() === 'path'
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
          const svgStr = buildSvgFromNodes(parsed.template, [arcClone], arcVP);
          return renderSvgToDataUrlRect(svgStr, arcLayout.canvasW, arcLayout.canvasH).catch(
            () => '',
          );
        }),
      )
    ).filter(f => f.length > 0);
  }

  // ── 7. Status message ─────────────────────────────────────────────────────

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
  const bgSz = bgLayout ? `${bgLayout.canvasW}×${bgLayout.canvasH}` : '?';
  const nSz = `${needleLayout.canvasW}×${needleLayout.canvasH}`;
  const arcSz = arcLayout ? `${arcLayout.canvasW}×${arcLayout.canvasH}` : 'n/a';
  parts.push(
    `Layers (px): bg ${bgSz}, needle ${nSz}, arc ${arcSz}. Scale ${scale.toFixed(3)}.`,
  );

  return {
    needlePng,
    backgroundPng,
    arcFrames,
    geometry: parsed.geometry,
    layerLayouts,
    statusMessage: parts.join(' '),
  };
}


