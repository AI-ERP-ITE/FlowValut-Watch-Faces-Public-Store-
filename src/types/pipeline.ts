// Pipeline Types — Strict contracts between every stage of the deterministic pipeline.
// AI outputs semantic + representation data. Spatial/geometry data is computed in code.

// ─── Stage 0: AI Extraction Output ─────────────────────────────────────────────

/** @deprecated Use Group instead. Kept temporarily for backward compatibility during migration. */
export type Region = 'center' | 'top' | 'bottom' | 'left' | 'right';

/** How the element visually appears in the design. */
export type Representation = 'text' | 'arc' | 'icon' | 'text+icon' | 'text+arc' | 'number';

/** Spatial arrangement pattern for the element. */
export type LayoutMode = 'row' | 'arc' | 'standalone' | 'grid';

/** Which zone of the watch face the element belongs to (replaces Region). */
export type Group =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left_panel'
  | 'right_panel'
  | 'top_left'
  | 'top_right'
  | 'bottom_left'
  | 'bottom_right';

export type AIElementType =
  | 'time'
  | 'date'
  | 'steps'
  | 'battery'
  | 'heart_rate'
  | 'arc'
  | 'text'
  | 'weather'
  | 'spo2'
  | 'calories'
  | 'distance'
  | 'weekday'
  | 'month'
  | 'stress'
  | 'pai'
  | 'pai_weekly'
  | 'sleep'
  | 'stand'
  | 'fat_burn'
  | 'uvi'
  | 'aqi'
  | 'humidity'
  | 'sunrise'
  | 'sunset'
  | 'wind'
  | 'alarm'
  | 'notification'
  | 'moon'
  | 'rect'
  | 'animation'
  | 'date_pointer'
  | 'vo2max'
  | 'altimeter'
  | 'training_load'
  | 'button';

export type AIStyle = 'analog' | 'digital' | 'minimal' | 'bold';

/** Bounding box in 480×480 normalized space (origin = top-left). */
export interface AIBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Center point in 480×480 normalized space. */
export interface AICenter {
  x: number;
  y: number;
}

/** Output from AI vision model — semantic + representation + geometry. */
export interface AIElement {
  id: string;
  type: AIElementType;
  /** How this element visually appears (text, arc, icon, compound). */
  representation: Representation;
  /** Spatial arrangement pattern. */
  layout: LayoutMode;
  /** Which zone of the watch face. */
  group: Group;
  /** Visual weight hint. */
  importance?: 'primary' | 'secondary';
  style?: AIStyle;
  confidence?: number;
  /** @deprecated Use group instead. Kept for backward compat during migration. */
  region?: Region;

  // ── Geometry fields (from visual extraction) ──────────────────────────────
  /** Bounding box in 480×480 space. Required for all elements after extraction. */
  bounds?: AIBounds;
  /** Center point for circular elements. */
  center?: AICenter;
  /** Radius for circular/arc elements. */
  radius?: number;
  /** Start angle in degrees (0° = right, 90° = down). */
  startAngle?: number;
  /** End angle in degrees (0° = right, 90° = down). */
  endAngle?: number;
  /** Arc stroke thickness in pixels. */
  lineWidth?: number;
  /** Dominant color of this element as hex string (e.g. "#FF6B6B"). */
  color?: string;
  /** Font size in pixels for text elements. */
  fontSize?: number;
  /** Visual font style category. */
  fontFamily?: string;
  /** Zepp OS data binding type (e.g. BATTERY, STEP, HEART). */
  dataType?: string;
}

/** Wrapper for the full AI response payload. */
export interface AIExtractionResult {
  elements: AIElement[];
}

// ─── Stage 1: Normalized Elements ───────────────────────────────────────────────

export type ZeppWidget =
  | 'TIME_POINTER'
  | 'GAUGE_POINTER'
  | 'IMG_TIME'
  | 'IMG_DATE'
  | 'IMG_WEEK'
  | 'ARC_PROGRESS'
  | 'TEXT'
  | 'TEXT_IMG'
  | 'IMG'
  | 'IMG_STATUS'
  | 'IMG_LEVEL'
  | 'FILL_RECT'
  | 'STROKE_RECT'
  | 'IMG_ANIM'
  | 'IMG_PROGRESS'
  | 'DATE_POINTER'
  | 'IMG_CLICK'
  | 'CIRCLE'
  | 'BUTTON';

export interface NormalizedElement {
  id: string;
  widget: ZeppWidget;
  /** Which zone of the watch face. */
  group: Group;
  /** Spatial arrangement pattern. */
  layout: LayoutMode;
  /** Original AI type preserved for downstream logic */
  sourceType: AIElementType;
  /** Data binding type for the widget (e.g. BATTERY, STEP, HEART) */
  dataType?: string;
  /** For compound-expanded elements, points to the parent AIElement id. */
  parentId?: string;
  /** @deprecated Use group instead. Kept for backward compat during migration. */
  region?: Region;

  // ── Geometry carried forward from AI extraction ───────────────────────────
  /** Bounding box from visual extraction (480×480 space). */
  bounds?: AIBounds;
  /** Center point for circular elements. */
  center?: AICenter;
  /** Radius for circular/arc elements. */
  radius?: number;
  /** Start angle in degrees. */
  startAngle?: number;
  /** End angle in degrees. */
  endAngle?: number;
  /** Arc stroke thickness in pixels. */
  lineWidth?: number;
  /** Dominant color of this element as hex string. */
  color?: string;
  /** Font size in pixels for text elements. */
  fontSize?: number;
  /** Visual font style category. */
  fontFamily?: string;
}

// ─── Stage 2: Layout ────────────────────────────────────────────────────────────

export interface LayoutElement extends NormalizedElement {
  centerX: number;
  centerY: number;
}

// ─── Stage 3: Geometry ──────────────────────────────────────────────────────────

export interface GeometryElement extends LayoutElement {
  // TIME_POINTER
  posX?: number;
  posY?: number;
  hourPosX?: number;
  hourPosY?: number;
  minutePosX?: number;
  minutePosY?: number;
  secondPosX?: number;
  secondPosY?: number;

  // ARC_PROGRESS
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  lineWidth?: number;

  // TEXT / TEXT_IMG / IMG
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

// ─── Stage 4: Asset-Resolved (Final before code gen) ────────────────────────────

export interface ResolvedElement extends GeometryElement {
  assets: ResolvedAssets;
}

export interface ResolvedAssets {
  /** Primary image source (for IMG, IMG_STATUS, etc.) */
  src?: string;
  /** Digit image arrays (for IMG_TIME, IMG_DATE, TEXT_IMG) */
  fontArray?: string[];
  /** Clock hand sources (for TIME_POINTER) */
  hourHandSrc?: string;
  minuteHandSrc?: string;
  secondHandSrc?: string;
  coverSrc?: string;
  /** Week/month image arrays */
  weekArray?: string[];
  monthArray?: string[];
  /** IMG_LEVEL image array */
  imageArray?: string[];
}

// ─── Validation Error ───────────────────────────────────────────────────────────

export class PipelineValidationError extends Error {
  stage: string;
  violations: string[];

  constructor(stage: string, violations: string[]) {
    super(`[Pipeline:${stage}] Validation failed:\n${violations.map(v => `  - ${v}`).join('\n')}`);
    this.name = 'PipelineValidationError';
    this.stage = stage;
    this.violations = violations;
  }
}
