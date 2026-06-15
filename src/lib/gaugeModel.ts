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

// ── Phase 2 output ───────────────────────────────────────────────────────────

/**
 * All rendered PNG data URLs plus geometry pass-through.
 * Produced by Phase 2 (renderGaugeAssets). Consumed by Phase 3 (PropertyPanel).
 */
export interface GaugeRenderResult {
  /** Needle-only PNG — rotate() stripped so needle is at 0° natural orientation. */
  needlePng: string;
  /** Background PNG — gauge body with needle and arc fill removed. Empty string if detection failed. */
  backgroundPng: string;
  /** 11 arc fill frame PNGs (0%→100% fill). Empty array if no arc detected. */
  arcFrames: string[];
  /** Geometry pass-through from ParsedGauge for Phase 3 element updates. */
  geometry: GaugeGeometry;
  /** Human-readable status message for the PropertyPanel status area. */
  statusMessage: string;
}
