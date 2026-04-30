// Visual Spec Envelope — produced by the speckit compile pipeline
// (.github/prompts/speckit.compile.master.prompt.md).
// Pure visual decomposition: shapes, fills, strokes, textures, layer order.
// NO semantic naming (no widget types, no bindings, no watchface parts).
// Authoritative reference: app/docs/AI_ANALYSIS_COMPILER_PROMPT.md

// ─── Shared primitives ────────────────────────────────────────────────────────

export type Kind = 'shape' | 'text' | 'image' | 'group';

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type CanvasShape = 'rect' | 'circle';

export interface Canvas {
  width: number;
  height: number;
  shape: CanvasShape;
}

// ─── Inventory (T1) ───────────────────────────────────────────────────────────

export interface InventoryElement {
  id: string;
  kind: Kind;
  bbox: BBox;
  zOrder: number;
  groupId: string | null;
}

export interface InventoryDoc {
  canvas: Canvas;
  elements: InventoryElement[];
}

// ─── Geometry (T2) ────────────────────────────────────────────────────────────

export type Anchor = 'start' | 'middle' | 'end';

export interface GeometryTransform {
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  pivotX?: number;
  pivotY?: number;
}

export interface GeometryCircle extends GeometryTransform {
  id: string;
  shape: 'circle';
  cx: number;
  cy: number;
  r: number;
}

export interface GeometryArc extends GeometryTransform {
  id: string;
  shape: 'arc';
  cx: number;
  cy: number;
  rOuter: number;
  rInner: number;
  startDeg: number;
  sweepDeg: number;
}

export interface GeometryLine extends GeometryTransform {
  id: string;
  shape: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface GeometryRect extends GeometryTransform {
  id: string;
  shape: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  rx?: number;
  ry?: number;
}

export interface GeometryPolygon extends GeometryTransform {
  id: string;
  shape: 'polygon';
  points: Array<[number, number]>;
}

export interface GeometryPath extends GeometryTransform {
  id: string;
  shape: 'path';
  d: string;
}

export interface GeometryText extends GeometryTransform {
  id: string;
  shape: 'text';
  x: number;
  y: number;
  content: string;
  fontSize: number;
  anchor: Anchor;
}

export interface GeometryImage extends GeometryTransform {
  id: string;
  shape: 'image';
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GeometryGroup {
  id: string;
  shape: 'group';
}

export interface GeometryInherit {
  id: string;
  inherit: true;
}

export type GeometryEntry =
  | GeometryCircle
  | GeometryArc
  | GeometryLine
  | GeometryRect
  | GeometryPolygon
  | GeometryPath
  | GeometryText
  | GeometryImage
  | GeometryGroup
  | GeometryInherit;

export type GeometryShapeKind =
  | 'circle'
  | 'arc'
  | 'line'
  | 'rect'
  | 'polygon'
  | 'path'
  | 'text'
  | 'image'
  | 'group';

// ─── Appearance (T3) ──────────────────────────────────────────────────────────

export interface ColorStop {
  offset: number; // 0..1
  color: string; // #rrggbb or #rrggbbaa
  opacity?: number; // 0..1
}

export interface FillSolid {
  kind: 'solid';
  color: string;
  opacity?: number;
}

export interface FillLinear {
  kind: 'linear';
  angleDeg: number;
  stops: ColorStop[];
}

export interface FillRadial {
  kind: 'radial';
  cx: number;
  cy: number;
  r: number;
  stops: ColorStop[];
}

export interface FillNone {
  kind: 'none';
}

export type Fill = FillSolid | FillLinear | FillRadial | FillNone;

export type StrokeCap = 'butt' | 'round' | 'square';
export type StrokeJoin = 'miter' | 'round' | 'bevel';

export interface StrokeSpec {
  color: string;
  width: number;
  opacity?: number;
  dash?: number[];
  cap?: StrokeCap;
  join?: StrokeJoin;
}

export type Stroke = StrokeSpec | 'none';

export type Texture =
  | 'matte'
  | 'brushed'
  | 'polished'
  | 'anodized'
  | 'lume'
  | 'printed'
  | null;

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | null;

export type FilterKind = 'shadow' | 'glow' | 'blur' | null;

export interface AppearanceItem {
  id: string;
  fill: Fill;
  stroke: Stroke;
  opacity?: number;
  texture?: Texture;
  blendMode?: BlendMode;
  clipPath?: string | null;
  filter?: FilterKind;
}

export interface AppearanceInherit {
  id: string;
  inherit: true;
}

export type AppearanceEntry = AppearanceItem | AppearanceInherit;

// ─── Envelope ─────────────────────────────────────────────────────────────────

export interface VisualEnvelope {
  inventory: InventoryDoc;
  geometry: GeometryEntry[];
  appearance: AppearanceEntry[];
}

// ─── Validation ───────────────────────────────────────────────────────────────

export type GateStatus = 'PASS' | 'WARN' | 'FAIL';

export interface ValidationGate {
  gateId: string;
  title: string;
  status: GateStatus;
  details: string[];
  failedIds?: string[];
}

export interface ValidationReport {
  isValid: boolean;
  gates: ValidationGate[];
  failedIds: Array<{ id: string; stage: 'inventory' | 'geometry' | 'appearance'; reason: string }>;
}

// ─── Merged spec (renderer input) ─────────────────────────────────────────────

export interface MergedElement {
  inventory: InventoryElement;
  geometry: GeometryEntry;
  appearance: AppearanceEntry;
}

export interface MergedSpec {
  canvas: Canvas;
  elements: MergedElement[]; // sorted by zOrder ascending
}

// ─── Type guards ──────────────────────────────────────────────────────────────

export function isGeometryInherit(g: GeometryEntry): g is GeometryInherit {
  return (g as GeometryInherit).inherit === true;
}

export function isAppearanceInherit(a: AppearanceEntry): a is AppearanceInherit {
  return (a as AppearanceInherit).inherit === true;
}
