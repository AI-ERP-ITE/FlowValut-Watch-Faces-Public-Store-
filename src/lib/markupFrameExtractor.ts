export interface MarkupFrameExtractionResult {
  frames: string[];
  strategy: string;
  warnings: string[];
}

function extractFirstSvg(markup: string): string | null {
  const match = markup.match(/<svg[\s\S]*?<\/svg>/i);
  return match ? match[0] : null;
}

function extractAllSvgs(markup: string): string[] {
  const matches = markup.match(/<svg[\s\S]*?<\/svg>/gi);
  return matches ? matches.map((m) => m.trim()).filter(Boolean) : [];
}

function serializeAttrs(el: Element): string {
  return Array.from(el.attributes)
    .map((attr) => `${attr.name}="${attr.value.replace(/"/g, '&quot;')}"`)
    .join(' ');
}

function parseFrameIndex(node: Element, fallback: number): number {
  const attrCandidates = [
    node.getAttribute('data-frame-index'),
    node.getAttribute('data-index'),
    node.getAttribute('data-frame'),
    node.getAttribute('id'),
    node.getAttribute('class'),
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  for (const candidate of attrCandidates) {
    const direct = Number(candidate);
    if (Number.isFinite(direct)) return Math.max(0, Math.floor(direct));

    const numbered = candidate.match(/(?:frame|imglvl|level|state)[_\- ]?(\d+)/i);
    if (numbered) {
      const parsed = Number(numbered[1]);
      if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed));
    }
  }

  return fallback;
}

function splitSingleSvgByFrameMarkers(svgMarkup: string): MarkupFrameExtractionResult | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
  const root = doc.querySelector('svg');
  if (!root) return null;

  const markerSelector = [
    '[data-frame-index]',
    '[data-frame]',
    '[data-index]',
    '[id^="frame-"]',
    '[id^="frame_"]',
    '[id^="imglvl-"]',
    '[id^="imglvl_"]',
    '[class*="frame"]',
    '[class*="imglvl"]',
  ].join(',');

  const markedNodes = Array.from(root.querySelectorAll(markerSelector));
  if (markedNodes.length < 2) return null;

  const grouped = new Map<number, Element>();
  markedNodes.forEach((node, idx) => {
    const frameIndex = parseFrameIndex(node, idx);
    if (!grouped.has(frameIndex)) grouped.set(frameIndex, node);
  });

  if (grouped.size < 2) return null;

  const baseAttrs = serializeAttrs(root);
  const defs = Array.from(root.querySelectorAll('defs')).map((d) => d.outerHTML).join('');
  const frames = Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, node]) => {
      const inner = `${defs}${node.outerHTML}`;
      return `<svg ${baseAttrs}>${inner}</svg>`;
    });

  return {
    frames,
    strategy: 'single-svg-frame-markers',
    warnings: [],
  };
}

export function extractFramesFromMarkup(markup: string): MarkupFrameExtractionResult {
  const trimmed = markup.trim();
  if (!trimmed) {
    return { frames: [], strategy: 'empty', warnings: ['Input is empty.'] };
  }

  const directSvgs = extractAllSvgs(trimmed);
  if (directSvgs.length > 1) {
    return {
      frames: directSvgs,
      strategy: 'multi-svg-tags',
      warnings: [],
    };
  }

  const singleSvg = directSvgs[0] ?? extractFirstSvg(trimmed);
  if (singleSvg) {
    const splitByMarkers = splitSingleSvgByFrameMarkers(singleSvg);
    if (splitByMarkers) return splitByMarkers;

    return {
      frames: [singleSvg],
      strategy: 'single-svg-no-markers',
      warnings: ['Only one SVG frame detected; add frame markers to split automatically.'],
    };
  }

  const parser = new DOMParser();
  const htmlDoc = parser.parseFromString(trimmed, 'text/html');
  const htmlSvgs = Array.from(htmlDoc.querySelectorAll('svg')).map((svg) => svg.outerHTML.trim()).filter(Boolean);
  if (htmlSvgs.length > 0) {
    return {
      frames: htmlSvgs,
      strategy: 'html-svg-extraction',
      warnings: htmlSvgs.length === 1 ? ['Only one SVG extracted from HTML input.'] : [],
    };
  }

  return {
    frames: [trimmed],
    strategy: 'raw-html-fallback',
    warnings: ['No SVG tags found; using full HTML input as a single frame.'],
  };
}
