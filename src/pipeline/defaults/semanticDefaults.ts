// Defaults table used by the merger to resolve `inherit: true` per registry id.
// Keyed by SemanticType. Conservative, predictable values.
import type {
  Fill, Shape, Stroke, BehaviorBinding, SemanticType, MergedElement,
} from '@/types/fourStage';

export interface SemanticDefault {
  shape: (canvasW: number, canvasH: number) => Shape;
  fill: Fill;
  stroke: Stroke | null;
  texture: MergedElement['texture'];
  binding: BehaviorBinding;
  visibility: MergedElement['visibility'];
  opacity: number | null;
}

const fullCanvasRect = (w: number, h: number): Shape => ({ type: 'rect', x: 0, y: 0, w, h });
const center = (w: number, h: number): { cx: number; cy: number } => ({ cx: w / 2, cy: h / 2 });
const ringShape = (w: number, h: number, rFactor: number): Shape => {
  const c = center(w, h);
  const r = Math.min(w, h) * rFactor;
  return { type: 'circle', cx: c.cx, cy: c.cy, r, strokeWidth: 2 };
};
const handLine = (w: number, h: number, lengthFactor: number): Shape => {
  const c = center(w, h);
  const len = Math.min(w, h) * lengthFactor;
  return { type: 'line', x1: c.cx, y1: c.cy, x2: c.cx, y2: c.cy - len, strokeWidth: 3 };
};
const labelText = (w: number, h: number): Shape => ({
  type: 'text', x: w / 2, y: h / 2, text: '', size: 14, anchor: 'middle',
});

const SOLID_BLACK: Fill = { type: 'solid', color: '#000000' };
const SOLID_WHITE: Fill = { type: 'solid', color: '#ffffff' };
const SOLID_GRAY: Fill = { type: 'solid', color: '#888888' };
const NO_FILL: Fill = { type: 'none' };

const baseDefault = (overrides: Partial<SemanticDefault>): SemanticDefault => ({
  shape: (w, h) => fullCanvasRect(w, h),
  fill: NO_FILL,
  stroke: null,
  texture: null,
  binding: 'none',
  visibility: 'always',
  opacity: null,
  ...overrides,
});

const TABLE: Record<SemanticType, SemanticDefault> = {
  bg: baseDefault({ shape: (w, h) => fullCanvasRect(w, h), fill: SOLID_BLACK }),
  decor_ring: baseDefault({ shape: (w, h) => ringShape(w, h, 0.45), stroke: { color: '#888888', width: 2 } }),
  tick_set: baseDefault({ shape: (w, h) => ({ type: 'group', children: [ringShape(w, h, 0.46)] }) }),
  subdial_ring: baseDefault({ shape: (w, h) => ringShape(w, h, 0.18), stroke: { color: '#666666', width: 1.5 } }),
  hour_index: baseDefault({ shape: (w, h) => labelText(w, h), fill: SOLID_WHITE }),
  minute_index: baseDefault({ shape: (w, h) => labelText(w, h), fill: SOLID_GRAY }),
  label_text: baseDefault({ shape: (w, h) => labelText(w, h), fill: SOLID_WHITE }),
  data_text: baseDefault({ shape: (w, h) => labelText(w, h), fill: SOLID_WHITE }),
  icon_static: baseDefault({ shape: (w, h) => ({ type: 'rect', x: w / 2 - 12, y: h / 2 - 12, w: 24, h: 24 }), fill: SOLID_GRAY }),
  icon_weather: baseDefault({ shape: (w, h) => ({ type: 'rect', x: w / 2 - 12, y: h / 2 - 12, w: 24, h: 24 }), fill: SOLID_GRAY }),
  hand_hour: baseDefault({ shape: (w, h) => handLine(w, h, 0.22), stroke: { color: '#ffffff', width: 4 }, binding: 'time_hour' }),
  hand_minute: baseDefault({ shape: (w, h) => handLine(w, h, 0.32), stroke: { color: '#ffffff', width: 3 }, binding: 'time_minute' }),
  hand_second: baseDefault({ shape: (w, h) => handLine(w, h, 0.40), stroke: { color: '#ff3344', width: 1.5 }, binding: 'time_second' }),
  logo: baseDefault({ shape: (w, h) => labelText(w, h), fill: SOLID_WHITE }),
  frame: baseDefault({ shape: (w, h) => ringShape(w, h, 0.49), stroke: { color: '#444444', width: 4 } }),
  other: baseDefault({}),
};

export function getSemanticDefault(t: SemanticType): SemanticDefault {
  return TABLE[t] ?? TABLE.other;
}
