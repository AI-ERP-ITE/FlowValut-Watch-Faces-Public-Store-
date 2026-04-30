// Types for the ID-Locked 4-Stage Compiler Pipeline (spec 054).
// Kept intentionally minimal and explicit. No external deps.

export type LayerRole =
  | 'background'
  | 'ring'
  | 'tickmarks'
  | 'subdial'
  | 'indices'
  | 'text'
  | 'icon'
  | 'pointer'
  | 'overlay'
  | 'mask';

export type SemanticType =
  | 'bg'
  | 'decor_ring'
  | 'tick_set'
  | 'subdial_ring'
  | 'hour_index'
  | 'minute_index'
  | 'label_text'
  | 'data_text'
  | 'icon_static'
  | 'icon_weather'
  | 'hand_hour'
  | 'hand_minute'
  | 'hand_second'
  | 'logo'
  | 'frame'
  | 'other';

export type GeometryClass =
  | 'circle'
  | 'arc'
  | 'line'
  | 'rect'
  | 'path'
  | 'text'
  | 'image'
  | 'group';

export interface RegistryCanvas {
  w: number;
  h: number;
  shape: 'circle' | 'rect';
}

export interface RegistryElement {
  id: string;
  parentId?: string | null;
  layerRole: LayerRole;
  semanticType: SemanticType;
  geometryClass: GeometryClass;
  zHint: number;
}

export interface RegistryDoc {
  canvas: RegistryCanvas;
  elements: RegistryElement[];
}

// --- Geometry ---

export interface ShapeCircle { type: 'circle'; cx: number; cy: number; r: number; strokeWidth?: number }
export interface ShapeArc { type: 'arc'; cx: number; cy: number; rOuter: number; rInner: number; startDeg: number; endDeg: number }
export interface ShapeLine { type: 'line'; x1: number; y1: number; x2: number; y2: number; strokeWidth?: number }
export interface ShapeRect { type: 'rect'; x: number; y: number; w: number; h: number; rx?: number }
export interface ShapePath { type: 'path'; d: string }
export interface ShapeText { type: 'text'; x: number; y: number; text: string; size?: number; anchor?: 'start' | 'middle' | 'end' }
export interface ShapeImage { type: 'image'; x: number; y: number; w: number; h: number; ref: string }
export interface ShapeGroup { type: 'group'; children: Shape[] }

export type Shape =
  | ShapeCircle | ShapeArc | ShapeLine | ShapeRect | ShapePath | ShapeText | ShapeImage | ShapeGroup;

export interface GeometryItemFull {
  id: string;
  shape: Shape;
  clip?: { type: 'circle' | 'rect'; cx?: number; cy?: number; r?: number; x?: number; y?: number; w?: number; h?: number } | null;
  transform?: { rotateDeg?: number; pivotX?: number; pivotY?: number } | null;
}
export interface GeometryItemInherit { id: string; inherit: true }
export type GeometryItem = GeometryItemFull | GeometryItemInherit;

export interface GeometryDoc {
  registryHash: string;
  items: GeometryItem[];
}

// --- Appearance ---

export interface FillSolid { type: 'solid'; color: string }
export interface FillStop { offset: number; color: string }
export interface FillLinear { type: 'linear'; stops: FillStop[]; angleDeg?: number }
export interface FillRadial { type: 'radial'; stops: FillStop[]; focal?: { x: number; y: number } }
export interface FillNone { type: 'none' }
export type Fill = FillSolid | FillLinear | FillRadial | FillNone;

export interface Stroke { color: string; width: number; opacity?: number }

export interface AppearanceItemFull {
  id: string;
  fill?: Fill;
  stroke?: Stroke | null;
  luminance?: number | null;
  texture?: 'none' | 'brushed' | 'grain' | 'glow' | null;
  asset?: string | null;
  opacity?: number | null;
}
export interface AppearanceItemInherit { id: string; inherit: true }
export type AppearanceItem = AppearanceItemFull | AppearanceItemInherit;

export interface AppearanceDoc {
  registryHash: string;
  items: AppearanceItem[];
}

// --- Behavior ---

export type BehaviorBinding =
  | 'time_hour' | 'time_minute' | 'time_second'
  | 'date' | 'battery' | 'steps' | 'weather' | 'none';

export interface BehaviorItemFull {
  id: string;
  binding?: BehaviorBinding;
  rotation?: { pivot: { x: number; y: number }; fromDeg: number; toDeg: number; metric: string } | null;
  visibility?: 'always' | 'aod' | 'active';
}
export interface BehaviorItemInherit { id: string; inherit: true }
export type BehaviorItem = BehaviorItemFull | BehaviorItemInherit;

export interface BehaviorDoc {
  registryHash: string;
  items: BehaviorItem[];
}

// --- Patch ---

export interface PatchDoc {
  registryHash: string;
  stage: 'geometry' | 'appearance' | 'behavior';
  items: GeometryItem[] | AppearanceItem[] | BehaviorItem[];
}

// --- Validation ---

export interface ValidationFailedId {
  id: string;
  stage: 'registry' | 'geometry' | 'appearance' | 'behavior' | 'merge';
  reason: string;
}

export interface ValidationReport {
  ok: boolean;
  failedIds: ValidationFailedId[];
  warnings: string[];
}

// --- Merged Spec (renderer input) ---

export interface MergedElement {
  id: string;
  layerRole: LayerRole;
  semanticType: SemanticType;
  geometryClass: GeometryClass;
  zHint: number;
  parentId: string | null;
  shape: Shape;
  clip: GeometryItemFull['clip'];
  transform: GeometryItemFull['transform'];
  fill: Fill;
  stroke: Stroke | null;
  luminance: number | null;
  texture: 'none' | 'brushed' | 'grain' | 'glow' | null;
  asset: string | null;
  opacity: number | null;
  binding: BehaviorBinding;
  rotation: BehaviorItemFull['rotation'];
  visibility: 'always' | 'aod' | 'active';
}

export interface MergedSpec {
  canvas: RegistryCanvas;
  elements: MergedElement[];
  warnings: string[];
  rejected: ValidationFailedId[];
}
