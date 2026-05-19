/**
 * gaugePointerParser.ts
 * Spec 091 — Phase 1
 *
 * Parses a gauge SVG string and:
 * - Detects the needle group (rotated <g> containing <path> elements)
 * - Detects arc range from tick <line> transforms
 * - Detects pivot center from main translate(<cx>,<cy>) group
 * - Renders needle-only PNG (rotate stripped → 0° natural orientation)
 * - Renders background PNG (needle hidden)
 *
 * All DOM operations run in the browser (DOMParser / XMLSerializer available).
 */
import { renderSvgToDataUrl } from '@/lib/customIconStore';

// Attribute used to mark the needle <g> so it can be found across clones.
const NEEDLE_MARKER = 'data-gauge-needle-091';

// ── Result type ──────────────────────────────────────────────────────────────

export interface GaugeParseResult {
  /** True if a rotating needle group was auto-detected. */
  needleFound: boolean;
  /** Needle-only PNG data URL (at 0° natural orientation). */
  needleDataUrl: string;
  /** Background PNG data URL (gauge minus needle). Empty string if needle not found. */
  backgroundDataUrl: string;
  /** Normalised pivot X in element bounds (0–1). Defaults to 0.5. */
  pivotX: number;
  /** Normalised pivot Y in element bounds (0–1). Defaults to 0.5. */
  pivotY: number;
  /** Auto-detected arc start angle in degrees, or null if not detected. */
  startAngle: number | null;
  /** Auto-detected arc end angle in degrees, or null if not detected. */
  endAngle: number | null;
  /** Human-readable status message for the PropertyPanel status area. */
  statusMessage: string;
}

// ── SVG geometry helpers ─────────────────────────────────────────────────────

/** Extract the angle N from rotate(N) or rotate(N,cx,cy) in a transform string. */
function extractRotateAngle(transform: string): number | null {
  const m = transform.match(/rotate\(\s*(-?[\d.]+)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return isFinite(n) ? n : null;
}

/** Extract {x, y} from translate(x, y) or translate(x y) in a transform string. */
function extractTranslate(transform: string): { x: number; y: number } | null {
  const m = transform.match(/translate\(\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/);
  if (!m) return null;
  const x = parseFloat(m[1]);
  const y = parseFloat(m[2]);
  return isFinite(x) && isFinite(y) ? { x, y } : null;
}

/** Read the effective viewport size from an SVG element. */
function getViewBoxSize(svgEl: Element): { width: number; height: number } | null {
  const vb = svgEl.getAttribute('viewBox');
  if (vb) {
    const parts = vb.trim().split(/[\s,]+/);
    if (parts.length >= 4) {
      const w = parseFloat(parts[2]);
      const h = parseFloat(parts[3]);
      if (isFinite(w) && isFinite(h) && w > 0 && h > 0) return { width: w, height: h };
    }
  }
  const w = parseFloat(svgEl.getAttribute('width') || '0');
  const h = parseFloat(svgEl.getAttribute('height') || '0');
  return w > 0 && h > 0 ? { width: w, height: h } : null;
}

/**
 * Find the primary coordinate-centering group.
 * Returns the first direct-child <g> of <svg> whose transform contains translate(x,y).
 */
function findMainTranslateGroup(
  svgEl: Element,
): { el: Element; cx: number; cy: number } | null {
  for (const child of Array.from(svgEl.children)) {
    if (child.tagName.toLowerCase() !== 'g') continue;
    const t = child.getAttribute('transform') || '';
    const tr = extractTranslate(t);
    if (tr) return { el: child, cx: tr.x, cy: tr.y };
  }
  return null;
}

/**
 * Detect the rotating needle group among the direct children of searchRoot.
 *
 * Heuristic:
 * - Must be a <g> with a transform containing rotate(N)
 * - Must contain at least one <path> (rules out tick groups)
 * - Score is higher when it also contains <circle> elements (hub indicator)
 */
function detectNeedleGroup(searchRoot: Element): Element | null {
  let bestCandidate: Element | null = null;
  let bestScore = 0;

  for (const child of Array.from(searchRoot.children)) {
    if (child.tagName.toLowerCase() !== 'g') continue;
    const t = child.getAttribute('transform') || '';
    if (!t.includes('rotate(')) continue;
    if (extractRotateAngle(t) === null) continue;

    const pathCount = child.querySelectorAll('path').length;
    if (pathCount === 0) continue; // must have path elements

    const circleCount = child.querySelectorAll('circle').length;
    const score = pathCount * 2 + circleCount;

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = child;
    }
  }

  return bestScore > 0 ? bestCandidate : null;
}

/**
 * Detect arc range from <line> elements that have a rotate(N) transform.
 * Returns { startAngle: min(N), endAngle: max(N) }, or null if fewer than 2 ticks found.
 * Elements inside excludeEl are ignored (prevents needle from biasing the result).
 */
function detectArcRange(
  svgEl: Element,
  excludeEl: Element | null,
): { startAngle: number; endAngle: number } | null {
  const angles: number[] = [];
  for (const line of Array.from(svgEl.querySelectorAll('line'))) {
    if (excludeEl && excludeEl.contains(line)) continue;
    const t = line.getAttribute('transform') || '';
    const angle = extractRotateAngle(t);
    if (angle !== null) angles.push(angle);
  }
  if (angles.length < 2) return null;
  return {
    startAngle: Math.min(...angles),
    endAngle: Math.max(...angles),
  };
}

/** Remove rotate(…) from a transform string, keeping any other transforms intact. */
function stripRotateFromTransform(transform: string): string {
  return transform.replace(/rotate\([^)]*\)\s*/g, '').trim();
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Parse a gauge SVG string, split needle from background, render both as PNGs.
 *
 * @param svgString   Raw SVG string (direct output of extractFramesFromMarkup).
 * @param renderSize  Canvas size for rendering (width = height, in CSS pixels).
 */
export async function parseAndRenderGaugeSvg(
  svgString: string,
  renderSize = 400,
): Promise<GaugeParseResult> {
  // ── 1. Parse the SVG DOM ───────────────────────────────────────────────────
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');

  const svgEl = doc.querySelector('svg');
  if (!svgEl) {
    return {
      needleFound: false,
      needleDataUrl: await renderSvgToDataUrl(svgString, renderSize).catch(() => ''),
      backgroundDataUrl: '',
      pivotX: 0.5,
      pivotY: 0.9,
      startAngle: null,
      endAngle: null,
      statusMessage: 'No <svg> element found in markup. Using full image as pointer.',
    };
  }

  // ── 2. ViewBox / dimensions ────────────────────────────────────────────────
  const vbSize = getViewBoxSize(svgEl);
  const vbW = vbSize?.width ?? renderSize;
  const vbH = vbSize?.height ?? renderSize;

  // ── 3. Coordinate-center group ────────────────────────────────────────────
  const mainGroup = findMainTranslateGroup(svgEl);

  // ── 4. Needle detection ────────────────────────────────────────────────────
  const needleGroup = mainGroup ? detectNeedleGroup(mainGroup.el) : null;

  // ── 5. Arc range detection ────────────────────────────────────────────────
  const arcRange = detectArcRange(svgEl, needleGroup);

  // ── 6. Pivot (normalised) ──────────────────────────────────────────────────
  const rawPivotX = mainGroup ? mainGroup.cx / vbW : 0.5;
  const rawPivotY = mainGroup ? mainGroup.cy / vbH : 0.5;
  const pivotX = Math.max(0, Math.min(1, rawPivotX));
  const pivotY = Math.max(0, Math.min(1, rawPivotY));

  // ── 7. Fallback if no needle found ─────────────────────────────────────────
  if (!needleGroup) {
    const fullDataUrl = await renderSvgToDataUrl(svgString, renderSize).catch(() => '');
    const arcMsg = arcRange
      ? `Arc range: ${arcRange.startAngle}°→${arcRange.endAngle}°.`
      : 'Arc range not detected.';
    return {
      needleFound: false,
      needleDataUrl: fullDataUrl,
      backgroundDataUrl: '',
      pivotX: 0.5,
      pivotY: 0.9,
      startAngle: arcRange?.startAngle ?? null,
      endAngle: arcRange?.endAngle ?? null,
      statusMessage: `Needle group not detected — full image used. ${arcMsg} Set pivot + angles manually.`,
    };
  }

  // ── 8. Mark needle for clone identification ────────────────────────────────
  needleGroup.setAttribute(NEEDLE_MARKER, '1');

  // ── 9. Clone DOM twice (needle-only doc, background doc) ──────────────────
  const needleDoc = doc.cloneNode(true) as Document;
  const bgDoc = doc.cloneNode(true) as Document;

  // Remove marker from original immediately
  needleGroup.removeAttribute(NEEDLE_MARKER);

  // ── 10. Needle-only clone: hide siblings, strip rotate from needle ─────────
  const needleInClone = needleDoc.querySelector(`[${NEEDLE_MARKER}="1"]`);
  if (needleInClone) {
    const parent = needleInClone.parentElement;
    if (parent) {
      for (const sibling of Array.from(parent.children)) {
        if (sibling !== needleInClone) {
          // SVG presentation attribute approach — more reliable than inline style for SVG
          const existingStyle = sibling.getAttribute('style') || '';
          sibling.setAttribute(
            'style',
            existingStyle ? `${existingStyle};display:none` : 'display:none',
          );
        }
      }
    }
    // Strip the rotate() while keeping other transforms (filter refs, etc.)
    const t = needleInClone.getAttribute('transform') || '';
    const stripped = stripRotateFromTransform(t);
    if (stripped) {
      needleInClone.setAttribute('transform', stripped);
    } else {
      needleInClone.removeAttribute('transform');
    }
    needleInClone.removeAttribute(NEEDLE_MARKER);
  }

  // ── 11. Background clone: hide the needle ────────────────────────────────
  const needleInBgClone = bgDoc.querySelector(`[${NEEDLE_MARKER}="1"]`);
  if (needleInBgClone) {
    const existingStyle = needleInBgClone.getAttribute('style') || '';
    needleInBgClone.setAttribute(
      'style',
      existingStyle ? `${existingStyle};display:none` : 'display:none',
    );
    needleInBgClone.removeAttribute(NEEDLE_MARKER);
  }

  // ── 12. Serialize and render both ─────────────────────────────────────────
  const ser = new XMLSerializer();
  const needleSvgStr = ser.serializeToString(needleDoc.querySelector('svg')!);
  const bgSvgStr = ser.serializeToString(bgDoc.querySelector('svg')!);

  const [needleDataUrl, bgDataUrl] = await Promise.all([
    renderSvgToDataUrl(needleSvgStr, renderSize).catch(() => ''),
    renderSvgToDataUrl(bgSvgStr, renderSize).catch(() => ''),
  ]);

  // ── 13. Status message ────────────────────────────────────────────────────
  const parts: string[] = ['Needle auto-detected.'];
  if (arcRange) {
    parts.push(`Arc: ${arcRange.startAngle}°→${arcRange.endAngle}°.`);
  } else {
    parts.push('Arc range not detected — set manually.');
  }
  parts.push(`Pivot: (${pivotX.toFixed(2)}, ${pivotY.toFixed(2)}).`);
  if (bgDataUrl) parts.push('Background IMG created below.');

  return {
    needleFound: true,
    needleDataUrl,
    backgroundDataUrl: bgDataUrl,
    pivotX,
    pivotY,
    startAngle: arcRange?.startAngle ?? null,
    endAngle: arcRange?.endAngle ?? null,
    statusMessage: parts.join(' '),
  };
}
