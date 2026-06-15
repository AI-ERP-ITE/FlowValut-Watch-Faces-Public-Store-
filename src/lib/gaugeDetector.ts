/**
 * gaugeDetector.ts
 * Spec 093 — Gauge Pipeline Phase 1: Detect
 *
 * Parses a gauge SVG string and produces a ParsedGauge:
 *   - Detects needle group, arc fill group, arc range, pivot center
 *   - Deep-clones all detected nodes IMMEDIATELY after detection
 *   - Discards the original parsed DOM (no live references retained)
 *   - Returns purely immutable data artifacts
 *
 * NO DOM attribute markers. NO DOM mutations. Cloning is the only DOM write.
 * NO rendering. NO React. NO side effects.
 */

import type { ParsedGauge, SvgTemplate, GaugeGeometry } from '@/lib/gaugeModel';

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
function getViewBoxSize(svgEl: Element): { width: number; height: number; viewBox: string } | null {
  const vb = svgEl.getAttribute('viewBox');
  if (vb) {
    const parts = vb.trim().split(/[\s,]+/);
    if (parts.length >= 4) {
      const w = parseFloat(parts[2]);
      const h = parseFloat(parts[3]);
      if (isFinite(w) && isFinite(h) && w > 0 && h > 0) return { width: w, height: h, viewBox: vb };
    }
  }
  const w = parseFloat(svgEl.getAttribute('width') || '0');
  const h = parseFloat(svgEl.getAttribute('height') || '0');
  if (w > 0 && h > 0) return { width: w, height: h, viewBox: `0 0 ${w} ${h}` };
  return null;
}

/** Find the primary coordinate-centering group (first direct-child <g> with translate). */
function findMainTranslateGroup(
  svgEl: Element,
): { el: Element; cx: number; cy: number; transform: string } | null {
  for (const child of Array.from(svgEl.children)) {
    if (child.tagName.toLowerCase() !== 'g') continue;
    const t = child.getAttribute('transform') || '';
    const tr = extractTranslate(t);
    if (tr) return { el: child, cx: tr.x, cy: tr.y, transform: t };
  }
  return null;
}

/**
 * Detect the rotating needle group anywhere inside searchRoot.
 * Scoring: pathCount × 2 + circleCount. Must have rotate(N) and ≥1 path.
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

/** Arc fill detector keywords. */
const ARC_FILL_ID_KEYWORDS = ['arc', 'active', 'fill', 'progress', 'indicator', 'pointer-arc', 'gauge-fill'];

function hasArcFillKeyword(el: Element): boolean {
  const id = (el.getAttribute('id') || '').toLowerCase();
  const cls = (el.getAttribute('class') || '').toLowerCase();
  return ARC_FILL_ID_KEYWORDS.some(k => id.includes(k) || cls.includes(k));
}

function pathHasArcCommand(d: string): boolean {
  return /[Aa]/.test(d);
}

/**
 * Detect arc fill group.
 * Priority 1: keyword match on <g> or <path> without rotate(N).
 * Priority 2: <g> containing a path with arc commands, without rotate(N).
 */
function detectArcFillGroup(searchRoot: Element, excludeEl: Element | null): Element | null {
  for (const el of Array.from(searchRoot.querySelectorAll('g, path'))) {
    if (excludeEl && (excludeEl === el || excludeEl.contains(el))) continue;
    const t = el.getAttribute('transform') || '';
    if (t.includes('rotate(')) continue;
    if (hasArcFillKeyword(el)) return el;
  }
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

/**
 * Detect arc range from <line> elements with rotate(N) transforms.
 * Elements inside excludeEl are skipped.
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
  const unique = [...new Set(angles)].sort((a, b) => a - b);
  if (unique.length < 2) return null;
  return {
    startAngle: unique[0],
    endAngle: unique[unique.length - 1],
    tickAngles: unique,
  };
}

/** Extract the arc stroke radius from a path d attribute (first A command rx value). */
function extractArcRadius(d: string): number | null {
  const m = d.match(/[Aa]\s*([\d.]+)/);
  if (!m) return null;
  const r = parseFloat(m[1]);
  return isFinite(r) && r > 0 ? r : null;
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Phase 1: Parse a gauge SVG string and produce an immutable ParsedGauge.
 *
 * Returns null if no <svg> element is found or if the needle is not detected.
 * Callers should handle null by falling back to rendering the full SVG as a pointer.
 *
 * The returned ParsedGauge contains ONLY deep-cloned nodes — the original
 * parsed DOM is not referenced and will be garbage collected.
 */
export function detectGauge(svgString: string): ParsedGauge | null {
  // ── 1. Parse ─────────────────────────────────────────────────────────────
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) return null;

  // ── 2. ViewBox / dimensions ───────────────────────────────────────────────
  const vbSize = getViewBoxSize(svgEl);
  const vbW = vbSize?.width ?? 400;
  const vbH = vbSize?.height ?? 400;
  const viewBox = vbSize?.viewBox ?? `0 0 ${vbW} ${vbH}`;

  // ── 3. Coordinate-center group ────────────────────────────────────────────
  const mainGroup = findMainTranslateGroup(svgEl);
  const cx = mainGroup?.cx ?? vbW / 2;
  const cy = mainGroup?.cy ?? vbH / 2;
  const mainTransform = mainGroup?.transform ?? `translate(${cx},${cy})`;

  // ── 4. Defs ───────────────────────────────────────────────────────────────
  const defsEl = svgEl.querySelector('defs');
  const defsHtml = defsEl ? new XMLSerializer().serializeToString(defsEl) : '';

  // ── 5. Detect needle ──────────────────────────────────────────────────────
  const searchRoot = mainGroup?.el ?? svgEl;
  const needleEl = detectNeedleGroup(searchRoot);
  if (!needleEl) return null;

  // ── 6. Detect arc fill ────────────────────────────────────────────────────
  const arcFillEl = detectArcFillGroup(searchRoot, needleEl);

  // ── 7. Detect arc range ───────────────────────────────────────────────────
  const arcRange = detectArcRange(svgEl, needleEl);

  // ── 8. Geometry ───────────────────────────────────────────────────────────
  const pivotX = Math.max(0, Math.min(1, cx / vbW));
  const pivotY = Math.max(0, Math.min(1, cy / vbH));
  const naturalAngle = arcRange ? (arcRange.startAngle + arcRange.endAngle) / 2 : 0;

  // Arc radius from the arc fill group's path
  let arcRadius = 0;
  if (arcFillEl) {
    const arcPaths = arcFillEl.tagName.toLowerCase() === 'path'
      ? [arcFillEl]
      : Array.from(arcFillEl.querySelectorAll('path')).filter(p => pathHasArcCommand(p.getAttribute('d') || ''));
    for (const p of arcPaths) {
      const r = extractArcRadius(p.getAttribute('d') || '');
      if (r !== null) { arcRadius = r; break; }
    }
  }

  // ── 9. Deep-clone nodes IMMEDIATELY ──────────────────────────────────────
  // After this point the original doc is no longer referenced.
  const needleNode = needleEl.cloneNode(true) as Node;
  const arcNode = arcFillEl ? (arcFillEl.cloneNode(true) as Node) : null;

  // Background = mainGroup clone with needle and arc surgically removed.
  //
  // We use DOM paths (index sequences from mainGroup root to each target)
  // instead of re-running detection on the clone. This is deterministic:
  // the same node is removed regardless of any scoring ambiguity in the detector.
  //
  // This handles any nesting depth — e.g. mainGroup → wrapper → needle
  // would be missed by a simple top-level children filter.
  const backgroundNodes: Node[] = [];
  if (mainGroup) {
    // Compute index path from searchRoot to a target element
    const getDomPath = (root: Element, target: Element): number[] | null => {
      const path: number[] = [];
      let cur: Element | null = target;
      while (cur && cur !== root) {
        const parentEl: Element | null = cur.parentElement;
        if (!parentEl) return null;
        const idx = Array.from(parentEl.children).indexOf(cur);
        if (idx === -1) return null;
        path.unshift(idx);
        cur = parentEl;
      }
      return cur === root ? path : null;
    };

    // Resolve a stored index path from root to node
    const resolveDomPath = (root: Element, path: number[]): Element | null => {
      let cur: Element = root;
      for (const idx of path) {
        const child = cur.children[idx];
        if (!child) return null;
        cur = child;
      }
      return cur;
    };

    const needlePath = getDomPath(searchRoot, needleEl);
    const arcPath = arcFillEl ? getDomPath(searchRoot, arcFillEl) : null;

    // Clone mainGroup children into a temporary container
    const bgGroupClone = mainGroup.el.cloneNode(true) as Element;

    // Remove needle from clone using stored path
    if (needlePath) {
      const clonedNeedle = resolveDomPath(bgGroupClone, needlePath);
      clonedNeedle?.parentElement?.removeChild(clonedNeedle);
    }
    // Remove arc fill from clone using stored path
    if (arcPath) {
      const clonedArc = resolveDomPath(bgGroupClone, arcPath);
      clonedArc?.parentElement?.removeChild(clonedArc);
    }

    // Remaining children of the clone = clean background at any depth
    for (const child of Array.from(bgGroupClone.children)) {
      backgroundNodes.push(child.cloneNode(true) as Node);
    }
  }

  // ── 10. Assemble result (doc goes out of scope here → GC) ─────────────────
  const template: SvgTemplate = {
    viewBox,
    width: vbW,
    height: vbH,
    defsHtml,
    mainTransform,
  };

  const geometry: GaugeGeometry = {
    naturalWidth: vbW,
    naturalHeight: vbH,
    naturalAngle,
    arcStart: arcRange?.startAngle ?? -90,
    arcEnd: arcRange?.endAngle ?? 90,
    tickAngles: arcRange?.tickAngles ?? [],
    pivotX,
    pivotY,
    arcRadius,
  };

  return {
    needleNode,
    arcNode,
    backgroundNodes,
    template,
    geometry,
    detected: {
      needle: true,
      arc: arcFillEl !== null,
      arcRange: arcRange !== null,
    },
  };
}
