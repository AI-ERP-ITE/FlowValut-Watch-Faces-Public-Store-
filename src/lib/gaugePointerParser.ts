/**
 * gaugePointerParser.ts
 * Spec 092 — Composite Parser
 *
 * Parses a gauge SVG string and:
 * - Detects the needle group (any-depth scan) → needle PNG, naturalAngle
 * - Detects arc fill group (progress arc) → N frame PNGs for IMG_LEVEL
 * - Detects arc range from tick <line> transforms
 * - Detects pivot center from main translate(<cx>,<cy>) group
 * - Renders needle-only PNG (rotate stripped → 0° natural orientation)
 * - Renders background PNG (needle + arc fill removed → static remainder)
 *
 * All DOM operations run in the browser (DOMParser / XMLSerializer available).
 */
import { renderSvgToDataUrl } from '@/lib/customIconStore';

// Attribute used to mark the needle <g> so it can be found across clones.
const NEEDLE_MARKER = 'data-gauge-needle-091';
// Attribute used to mark the arc fill group so it can be found across clones.
const ARC_FILL_MARKER = 'data-gauge-arc-092';

// ── Result type ──────────────────────────────────────────────────────────────

export interface GaugeParseResult {
  /** True if a rotating needle group was auto-detected. */
  needleFound: boolean;
  /** Needle-only PNG data URL (at 0° natural orientation). */
  needleDataUrl: string;
  /** Background PNG data URL (gauge minus needle and arc fill). Empty string if needle not found. */
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
  /** Natural width of the gauge SVG (from viewBox or width attr), in SVG user units. */
  naturalWidth: number;
  /** Natural height of the gauge SVG (from viewBox or height attr), in SVG user units. */
  naturalHeight: number;
  // ── Spec 092 additions ────────────────────────────────────────────────────
  /** The original rotate(N) value stripped from the needle group. Used as previewAngle. 0 if no needle or no rotate. */
  naturalAngle: number;
  /** Arc fill frame PNGs (for IMG_LEVEL). Empty array if no arc fill group detected. */
  arcFrames: string[];
  /** Number of unique tick angles detected (informational). */
  tickCount: number;
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
 * Detect the rotating needle group anywhere inside searchRoot (any depth).
 *
 * Strategy: flat scan of ALL descendant <g> elements via querySelectorAll.
 * Scoring — must have:
 *   - a transform containing rotate(N)         (it rotates)
 *   - at least one <path> descendant           (rules out bare tick lines)
 * Score = pathCount × 2 + circleCount          (hub circles boost score)
 * The highest-scoring candidate wins, so deeply-nested gauges and extra
 * wrapper groups never prevent detection.
 */
function detectNeedleGroup(searchRoot: Element): Element | null {
  let bestCandidate: Element | null = null;
  let bestScore = 0;

  for (const g of Array.from(searchRoot.querySelectorAll('g'))) {
    const t = g.getAttribute('transform') || '';
    if (!t.includes('rotate(')) continue;
    if (extractRotateAngle(t) === null) continue;

    const pathCount = g.querySelectorAll('path').length;
    if (pathCount === 0) continue;

    const circleCount = g.querySelectorAll('circle').length;
    const score = pathCount * 2 + circleCount;

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = g;
    }
  }

  return bestScore > 0 ? bestCandidate : null;
}

/**
 * Detect arc range from <line> elements that have a rotate(N) transform.
 * Returns { startAngle, endAngle, tickAngles } or null if fewer than 2 ticks found.
 * Elements inside excludeEl are ignored (prevents needle from biasing the result).
 */
function detectArcRange(
  svgEl: Element,
  excludeEl: Element | null,
): { startAngle: number; endAngle: number; tickAngles: number[] } | null {
  const angles: number[] = [];
  for (const line of Array.from(svgEl.querySelectorAll('line'))) {
    if (excludeEl && excludeEl.contains(line)) continue;
    const t = line.getAttribute('transform') || '';
    const angle = extractRotateAngle(t);
    if (angle !== null) angles.push(angle);
  }
  // Deduplicate and sort
  const unique = [...new Set(angles)].sort((a, b) => a - b);
  if (unique.length < 2) return null;
  return {
    startAngle: unique[0],
    endAngle: unique[unique.length - 1],
    tickAngles: unique,
  };
}

/** Remove rotate(…) from a transform string, keeping any other transforms intact. */
function stripRotateFromTransform(transform: string): string {
  return transform.replace(/rotate\([^)]*\)\s*/g, '').trim();
}

// ── Arc fill detector (Spec 092) ─────────────────────────────────────────────

const ARC_FILL_ID_KEYWORDS = ['arc', 'active', 'fill', 'progress', 'indicator', 'pointer-arc', 'gauge-fill'];

/** Returns true if an element's id or class mentions known arc-fill keywords. */
function hasArcFillKeyword(el: Element): boolean {
  const id = (el.getAttribute('id') || '').toLowerCase();
  const cls = (el.getAttribute('class') || '').toLowerCase();
  return ARC_FILL_ID_KEYWORDS.some(k => id.includes(k) || cls.includes(k));
}

/** Returns true if the path's d attribute contains SVG arc commands (A or a). */
function pathHasArcCommand(d: string): boolean {
  return /[Aa]/.test(d);
}

/**
 * Detect the arc fill group (Spec 092 Detector B).
 *
 * Priority:
 *  1. <g> or <path> with ID/class matching arc fill keywords AND no rotate(N) on itself.
 *  2. <g> containing a <path> with an arc command AND no rotate(N) on itself.
 *
 * excludeEl (needle group) is always skipped.
 * Returns the detected Element or null.
 */
function detectArcFillGroup(searchRoot: Element, excludeEl: Element | null): Element | null {
  // Priority 1: keyword match
  for (const el of Array.from(searchRoot.querySelectorAll('g, path'))) {
    if (excludeEl && (excludeEl === el || excludeEl.contains(el))) continue;
    const t = el.getAttribute('transform') || '';
    if (t.includes('rotate(')) continue; // needle candidate, skip
    if (hasArcFillKeyword(el)) return el;
  }
  // Priority 2: <g> containing a path with arc commands
  for (const g of Array.from(searchRoot.querySelectorAll('g'))) {
    if (excludeEl && (excludeEl === g || excludeEl.contains(g))) continue;
    const t = g.getAttribute('transform') || '';
    if (t.includes('rotate(')) continue;
    for (const path of Array.from(g.querySelectorAll('path'))) {
      const d = path.getAttribute('d') || '';
      if (pathHasArcCommand(d)) return g;
    }
  }
  return null;
}

// ── Arc frame rendering (Spec 092) ───────────────────────────────────────────

const MAX_ARC_FRAMES = 20;

interface ArcPathComponents {
  startX: number;
  startY: number;
  r: number;
  startAngleRad: number;
}

/**
 * Parse the starting point and radius from an SVG arc path's first M and A commands.
 * Returns null if parsing fails.
 */
function parseArcPathComponents(d: string, cx: number, cy: number): ArcPathComponents | null {
  // Match: M x1 y1 ...
  const mMatch = d.match(/[Mm]\s*([-\d.]+)[,\s]+([-\d.]+)/);
  if (!mMatch) return null;
  const startX = parseFloat(mMatch[1]);
  const startY = parseFloat(mMatch[2]);
  if (!isFinite(startX) || !isFinite(startY)) return null;

  // Match first A command: A rx ry x-rot large-arc sweep x2 y2
  const aMatch = d.match(/[Aa]\s*([-\d.]+)[,\s]+([-\d.]+)/);
  if (!aMatch) return null;
  const rx = parseFloat(aMatch[1]);
  if (!isFinite(rx) || rx <= 0) return null;

  // Compute the start angle from the start point relative to center
  const startAngleRad = Math.atan2(startY - cy, startX - cx);
  return { startX, startY, r: rx, startAngleRad };
}

/**
 * Rewrite an arc path's endpoint to the given SVG angle (radians, 0=right, CW).
 * Preserves the start point and radius. Returns the new d string or null on failure.
 */
function rewriteArcPath(d: string, cx: number, cy: number, endAngleRad: number): string | null {
  const comps = parseArcPathComponents(d, cx, cy);
  if (!comps) return null;

  const { startX, startY, r, startAngleRad } = comps;
  const endX = cx + r * Math.cos(endAngleRad);
  const endY = cy + r * Math.sin(endAngleRad);

  // Compute the sweep magnitude
  let sweep = endAngleRad - startAngleRad;
  // Normalise to [-π, π]
  while (sweep > Math.PI) sweep -= 2 * Math.PI;
  while (sweep < -Math.PI) sweep += 2 * Math.PI;

  const largeArcFlag = Math.abs(sweep) > Math.PI ? 1 : 0;
  const sweepFlag = sweep >= 0 ? 1 : 0;

  return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${endX.toFixed(3)} ${endY.toFixed(3)}`;
}

/**
 * Render one arc frame: clone the SVG, keep only the arc fill group (+ defs),
 * rewrite the arc endpoint to the given SVG angle, and render to PNG.
 */
async function renderArcFrame(
  doc: Document,
  arcFillMarker: string,
  needleMarker: string,
  cx: number,
  cy: number,
  svgAngleRad: number,
  renderSize: number,
): Promise<string> {
  const frameDoc = doc.cloneNode(true) as Document;
  const svgEl = frameDoc.querySelector('svg');
  if (!svgEl) return '';

  const arcEl = frameDoc.querySelector(`[${arcFillMarker}="1"]`);
  const needleEl = frameDoc.querySelector(`[${needleMarker}="1"]`);

  // Remove everything from the translate group except the arc fill element (and defs)
  const mainGroup = svgEl.querySelector('g[transform*="translate("]');
  if (mainGroup && arcEl) {
    for (const child of Array.from(mainGroup.children)) {
      if (child !== arcEl) child.remove();
    }
  } else if (needleEl) {
    needleEl.remove();
  }

  // Rewrite the arc path in the arc element
  if (arcEl) {
    // Prefer direct path; fall back to first descendant path with arc command
    const paths = arcEl.tagName.toLowerCase() === 'path'
      ? [arcEl]
      : Array.from(arcEl.querySelectorAll('path')).filter(p => pathHasArcCommand(p.getAttribute('d') || ''));
    for (const path of paths) {
      const d = path.getAttribute('d') || '';
      if (!pathHasArcCommand(d)) continue;
      const newD = rewriteArcPath(d, cx, cy, svgAngleRad);
      if (newD) {
        path.setAttribute('d', newD);
        break; // rewrite only the primary arc path
      }
    }
  }

  const ser = new XMLSerializer();
  const frameSvgStr = ser.serializeToString(svgEl);
  return renderSvgToDataUrl(frameSvgStr, renderSize).catch(() => '');
}

/**
 * Generate arc frame PNGs from the SVG.
 * tickAngles in SVG-convention degrees (0=right, CW). Cap at MAX_ARC_FRAMES.
 */
async function generateArcFrames(
  doc: Document,
  arcFillGroup: Element,
  needleGroup: Element | null,
  cx: number,
  cy: number,
  tickAngles: number[],
  startAngle: number,
  endAngle: number,
  renderSize: number,
): Promise<string[]> {
  // Mark arc fill element
  arcFillGroup.setAttribute(ARC_FILL_MARKER, '1');
  if (needleGroup) needleGroup.setAttribute(NEEDLE_MARKER, '1');

  // Determine frame endpoints
  let frameAngles: number[];
  if (tickAngles.length >= 2) {
    frameAngles = tickAngles.slice(0, MAX_ARC_FRAMES);
  } else {
    // Fallback: 10 evenly spaced frames
    const count = 10;
    frameAngles = Array.from({ length: count }, (_, i) => startAngle + (endAngle - startAngle) * (i / (count - 1)));
  }

  const frames = await Promise.all(
    frameAngles.map(deg =>
      renderArcFrame(doc, ARC_FILL_MARKER, NEEDLE_MARKER, cx, cy, (deg * Math.PI) / 180, renderSize),
    ),
  );

  // Clean up markers on original doc
  arcFillGroup.removeAttribute(ARC_FILL_MARKER);
  if (needleGroup) needleGroup.removeAttribute(NEEDLE_MARKER);

  return frames.filter(f => f.length > 0);
}



/**
 * Parse a gauge SVG string, split into needle/arc-fill/background, render all as PNGs.
 * Spec 092 composite parser — all three detectors run independently.
 *
 * @param svgString   Raw SVG string (direct output of extractFramesFromMarkup).
 * @param renderSize  Canvas size for rendering (width = height, in CSS pixels).
 */
export async function parseAndRenderGaugeSvg(
  svgString: string,
  renderSize = 400,
): Promise<GaugeParseResult> {
  const FALLBACK: Omit<GaugeParseResult, 'needleDataUrl' | 'statusMessage' | 'naturalWidth' | 'naturalHeight'> = {
    needleFound: false,
    backgroundDataUrl: '',
    pivotX: 0.5,
    pivotY: 0.9,
    startAngle: null,
    endAngle: null,
    naturalAngle: 0,
    arcFrames: [],
    tickCount: 0,
  };

  // ── 1. Parse the SVG DOM ───────────────────────────────────────────────────
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');

  const svgEl = doc.querySelector('svg');
  if (!svgEl) {
    return {
      ...FALLBACK,
      needleDataUrl: await renderSvgToDataUrl(svgString, renderSize).catch(() => ''),
      statusMessage: 'No <svg> element found in markup. Using full image as pointer.',
      naturalWidth: renderSize,
      naturalHeight: renderSize,
    };
  }

  // ── 2. ViewBox / dimensions ────────────────────────────────────────────────
  const vbSize = getViewBoxSize(svgEl);
  const vbW = vbSize?.width ?? renderSize;
  const vbH = vbSize?.height ?? renderSize;

  // ── 3. Coordinate-center group ────────────────────────────────────────────
  const mainGroup = findMainTranslateGroup(svgEl);
  const cx = mainGroup?.cx ?? vbW / 2;
  const cy = mainGroup?.cy ?? vbH / 2;

  // ── 4. Needle detection (Detector A) ──────────────────────────────────────
  const needleGroup = mainGroup ? detectNeedleGroup(mainGroup.el) : null;

  // Extract naturalAngle from needle BEFORE cloning anything
  let naturalAngle = 0;
  if (needleGroup) {
    const t = needleGroup.getAttribute('transform') || '';
    naturalAngle = extractRotateAngle(t) ?? 0;
  }

  // ── 5. Arc fill detection (Detector B) ────────────────────────────────────
  const searchRoot = mainGroup?.el ?? svgEl;
  const arcFillGroup = detectArcFillGroup(searchRoot, needleGroup);

  // ── 6. Arc range detection (Detector C) ────────────────────────────────────
  const arcRange = detectArcRange(svgEl, needleGroup);

  // ── 7. Pivot (normalised) ──────────────────────────────────────────────────
  const rawPivotX = mainGroup ? mainGroup.cx / vbW : 0.5;
  const rawPivotY = mainGroup ? mainGroup.cy / vbH : 0.5;
  const pivotX = Math.max(0, Math.min(1, rawPivotX));
  const pivotY = Math.max(0, Math.min(1, rawPivotY));

  // ── 8. Fallback if no needle found ─────────────────────────────────────────
  if (!needleGroup) {
    const fullDataUrl = await renderSvgToDataUrl(svgString, renderSize).catch(() => '');
    const arcMsg = arcRange
      ? `Arc range: ${arcRange.startAngle}°→${arcRange.endAngle}°.`
      : 'Arc range not detected.';
    return {
      ...FALLBACK,
      needleDataUrl: fullDataUrl,
      pivotX,
      pivotY,
      startAngle: arcRange?.startAngle ?? null,
      endAngle: arcRange?.endAngle ?? null,
      tickCount: arcRange?.tickAngles.length ?? 0,
      statusMessage: `Needle group not detected — full image used. ${arcMsg} Set pivot + angles manually.`,
      naturalWidth: vbW,
      naturalHeight: vbH,
    };
  }

  // ── 9. Mark needle + arc fill for clone identification ─────────────────────
  needleGroup.setAttribute(NEEDLE_MARKER, '1');
  if (arcFillGroup) arcFillGroup.setAttribute(ARC_FILL_MARKER, '1');

  // ── 10. Generate arc frames BEFORE cloning for needle/background ───────────
  // (uses the live doc with markers still present)
  let arcFrames: string[] = [];
  if (arcFillGroup && arcRange) {
    arcFrames = await generateArcFrames(
      doc,
      arcFillGroup,
      needleGroup,
      cx,
      cy,
      arcRange.tickAngles,
      arcRange.startAngle,
      arcRange.endAngle,
      renderSize,
    );
    // generateArcFrames cleans up ARC_FILL_MARKER; re-mark for background clone
    arcFillGroup.setAttribute(ARC_FILL_MARKER, '1');
  }

  // ── 11. Clone DOM for needle-only and background ──────────────────────────
  const needleDoc = doc.cloneNode(true) as Document;
  const bgDoc = doc.cloneNode(true) as Document;

  // Remove markers from original
  needleGroup.removeAttribute(NEEDLE_MARKER);
  if (arcFillGroup) arcFillGroup.removeAttribute(ARC_FILL_MARKER);

  // ── 12. Needle-only clone: REMOVE siblings, strip rotate from needle ───────
  const needleInClone = needleDoc.querySelector(`[${NEEDLE_MARKER}="1"]`);
  if (needleInClone) {
    const parent = needleInClone.parentElement;
    if (parent) {
      for (const sibling of Array.from(parent.children)) {
        if (sibling !== needleInClone) sibling.remove();
      }
    }
    const t = needleInClone.getAttribute('transform') || '';
    const stripped = stripRotateFromTransform(t);
    if (stripped) {
      needleInClone.setAttribute('transform', stripped);
    } else {
      needleInClone.removeAttribute('transform');
    }
    needleInClone.removeAttribute(NEEDLE_MARKER);
  }

  // ── 13. Background clone: REMOVE needle AND arc fill group ─────────────────
  const needleInBgClone = bgDoc.querySelector(`[${NEEDLE_MARKER}="1"]`);
  if (needleInBgClone) needleInBgClone.remove();
  const arcInBgClone = bgDoc.querySelector(`[${ARC_FILL_MARKER}="1"]`);
  if (arcInBgClone) arcInBgClone.remove();

  // ── 14. Serialize and render needle + background ───────────────────────────
  const ser = new XMLSerializer();
  const needleSvgStr = ser.serializeToString(needleDoc.querySelector('svg')!);
  const bgSvgStr = ser.serializeToString(bgDoc.querySelector('svg')!);

  const [needleDataUrl, bgDataUrl] = await Promise.all([
    renderSvgToDataUrl(needleSvgStr, renderSize).catch(() => ''),
    renderSvgToDataUrl(bgSvgStr, renderSize).catch(() => ''),
  ]);

  // ── 15. Status message ────────────────────────────────────────────────────
  const parts: string[] = ['Needle auto-detected.'];
  if (arcRange) {
    const tickCount = arcRange.tickAngles.length;
    parts.push(`Arc: ${arcRange.startAngle}°→${arcRange.endAngle}° (${tickCount} ticks).`);
  } else {
    parts.push('Arc range not detected — set manually.');
  }
  if (arcFillGroup) parts.push(`Arc fill detected → ${arcFrames.length} IMG_LEVEL frames.`);
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
    naturalAngle,
    arcFrames,
    tickCount: arcRange?.tickAngles.length ?? 0,
    naturalWidth: vbW,
    naturalHeight: vbH,
  };
}
