/**
 * gaugeModel.ts
 * Spec 093 — Gauge Pipeline Data Contracts
 *
 * Single source of truth for all types flowing through the three-phase gauge pipeline:
 *   Phase 1 (gaugeDetector.ts)  →  ParsedGauge
 *   Phase 2 (gaugeRenderer.ts)  →  GaugeRenderResult
 *   Phase 3 (PropertyPanel.tsx) →  React state updates
 *
 * NO implementation logic in this file.
 */

// ── SVG structural metadata ──────────────────────────────────────────────────

/** Enough information to reconstruct a minimal SVG wrapper without the original DOM. */
export interface SvgTemplate {
  /** Raw viewBox attribute string, e.g. "0 0 400 400". */
  viewBox: string;
  /** Parsed viewBox width (SVG user units). */
  width: number;
  /** Parsed viewBox height (SVG user units). */
  height: number;
  /** Serialized <defs> block (empty string if no <defs> in source SVG). */
  defsHtml: string;
  /** The transform on the main centering <g>, e.g. "translate(200,200)". */
  mainTransform: string;
}

// ── Gauge geometry ───────────────────────────────────────────────────────────

/** Visual style of one detected tick mark, parsed from the source SVG. */
export interface ParsedTickStyle {
  /** Rotation angle of this tick (degrees, 0=12PM). */
  angle: number;
  /** Tick stroke color (e.g. "#d32f2f"). */
  stroke: string;
  /** Tick stroke-width in SVG user units. */
  strokeWidth: number;
  /** y1 attribute (inner radius offset, usually negative). */
  y1: number;
  /** y2 attribute (outer radius offset). */
  y2: number;
  /** stroke-linecap value, e.g. "round" or "butt". */
  linecap: string;
  /** Optional filter id reference (e.g. "url(#tickShadow)"). */
  filter: string;
}

/** Pure geometry extracted from the SVG during detection. */
export interface GaugeGeometry {
  /** SVG viewBox width (SVG user units). */
  naturalWidth: number;
  /** SVG viewBox height (SVG user units). */
  naturalHeight: number;
  /**
   * Preview angle for the needle: midpoint of the detected arc range.
   * Deliberately NOT the SVG rotate() value — that is a designer snapshot, not a parameter.
   */
  naturalAngle: number;
  /** Arc start angle detected from tick <line> rotations (degrees). */
  arcStart: number;
  /** Arc end angle detected from tick <line> rotations (degrees). */
  arcEnd: number;
  /** All unique tick rotation angles (sorted ascending). */
  tickAngles: number[];
  /** Visual style per tick, sorted by angle. Used by renderer to re-inject at calculated positions. */
  tickStyles: ParsedTickStyle[];
  /** Normalised pivot X position (0–1) derived from the main translate center. */
  pivotX: number;
  /** Normalised pivot Y position (0–1) derived from the main translate center. */
  pivotY: number;
  /** Arc stroke radius in SVG user units (0 if not detected). Used for dasharray computation. */
  arcRadius: number;
}

// ── Phase 1 output ───────────────────────────────────────────────────────────

/**
 * Immutable data bundle produced by Phase 1 (detectGauge).
 *
 * All Node fields are DEEP CLONES captured immediately after detection.
 * The original parsed SVG DOM is discarded. These nodes are never mutated —
 * all rendering sub-functions clone them again before any manipulation.
 */
export interface ParsedGauge {
  /** Deep clone of the detected needle <g> element. */
  needleNode: Node;
  /** Deep clone of the detected arc fill <g> or <path>. Null if not found. */
  arcNode: Node | null;
  /**
   * Deep clones of all sibling children in the main translate group,
   * excluding the needle node and the arc fill node.
   * These form the static background layer.
   */
  backgroundNodes: Node[];
  /** SVG structural metadata for rebuilding wrapper SVGs in Phase 2. */
  template: SvgTemplate;
  /** Geometric parameters extracted during detection. */
  geometry: GaugeGeometry;
  /** Which detectors found something (informational, used for status messages). */
  detected: {
    needle: boolean;
    arc: boolean;
    arcRange: boolean;
  };
}

// ── Layer layout (Phase 2 → Phase 3) ─────────────────────────────────────────

/**
 * Sizing and placement data for one rendered gauge layer.
 * Computed from the layer's tight bounding box scaled to ANCHOR_SIZE.
 */
export interface LayerLayout {
  /** PNG canvas width in pixels. */
  canvasW: number;
  /** PNG canvas height in pixels. */
  canvasH: number;
  /**
   * Gauge rotation center as fraction of canvas width (0–1).
   * Used as pivotX for GAUGE_POINTER (IMG_POINTER) widget.
   */
  pivotFracX: number;
  /**
   * Gauge rotation center as fraction of canvas height (0–1).
   * Used as pivotY for GAUGE_POINTER (IMG_POINTER) widget.
   */
  pivotFracY: number;
  /**
   * Horizontal placement offset from gauge screen center.
   * element.bounds.x = gaugeCenterScreenX + offsetX
   */
  offsetX: number;
  /**
   * Vertical placement offset from gauge screen center.
   * element.bounds.y = gaugeCenterScreenY + offsetY
   */
  offsetY: number;
}

/** Per-layer layouts for all three gauge layers. */
export interface LayerLayouts {
  /** Needle layer. Always present (needle is required). */
  needle: LayerLayout;
  /** Background layer. Null if no background nodes detected or measurement failed. */
  background: LayerLayout | null;
  /** Arc fill layer. Null if no arc fill detected or measurement failed. */
  arc: LayerLayout | null;
  /** Scale factor applied: ANCHOR_SIZE / bg_natural_size. */
  scale: number;
}

// ── Phase 2 output ───────────────────────────────────────────────────────────

/**
 * All rendered PNG data URLs plus geometry pass-through.
 * Produced by Phase 2 (renderGaugeAssets). Consumed by Phase 3 (PropertyPanel).
 */
export interface GaugeRenderResult {
  /** Needle-only PNG. */
  needlePng: string;
  /** Background PNG — gauge body with needle and arc fill removed. Empty string if not present. */
  backgroundPng: string;
  /** 11 arc fill frame PNGs (0%→100% fill). Empty array if no arc detected. */
  arcFrames: string[];
  /** Geometry pass-through from ParsedGauge for Phase 3 element updates. */
  geometry: GaugeGeometry;
  /**
   * Per-layer sizing and placement data.
   * Each layer has its own tight-cropped canvas size and screen offset,
   * all derived from the same scale factor anchored on the background layer.
   */
  layerLayouts: LayerLayouts;
  /** Human-readable status message for the PropertyPanel status area. */
  statusMessage: string;
}
