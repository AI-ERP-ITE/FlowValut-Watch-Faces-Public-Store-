import type { WatchFaceElement } from '@/types';

type EngraveFrame = NonNullable<WatchFaceElement['engraveFrame']>;
type EngraveFrameVisualStyle = Pick<EngraveFrame,
  'mode' | 'depth' | 'lightAngle' | 'highlightColor' | 'highlightOpacity' |
  'shadowColor' | 'shadowOpacity' | 'fillMode' | 'fillColor'
>;
export type ElementStyleClipboard = Partial<Pick<WatchFaceElement,
  'color' | 'fontSize' | 'fontStyle' | 'charSpace' | 'lineSpace' |
  'radius' | 'lineWidth' | 'startAngle' | 'endAngle' |
  'tickWidth' | 'tickLength' | 'tickColor' | 'tickCount' | 'hideStartEndTicks' |
  'alpha' | 'watchSafeTextEdges' |
  'iconHue' | 'iconSaturation' | 'iconColorize' | 'iconColorizeOpacity' | 'iconPhotoEdit' |
  'handShadow' | 'handGlow' | 'handTrail' | 'handTint' |
  'pointerBrightness' | 'pointerContrast' | 'pointerSaturation' | 'pointerHue' | 'pointerOpacity' |
  'dropShadow'
>> & { engraveFrameStyle?: EngraveFrameVisualStyle };

const STYLE_KEYS: (keyof Omit<ElementStyleClipboard, 'engraveFrameStyle'>)[] = [
  'color', 'fontSize', 'fontStyle', 'charSpace', 'lineSpace', 'radius', 'lineWidth', 'startAngle', 'endAngle',
  'tickWidth', 'tickLength', 'tickColor', 'tickCount', 'hideStartEndTicks', 'alpha', 'watchSafeTextEdges',
  'iconHue', 'iconSaturation', 'iconColorize', 'iconColorizeOpacity', 'iconPhotoEdit',
  'handShadow', 'handGlow', 'handTrail', 'handTint', 'pointerBrightness', 'pointerContrast',
  'pointerSaturation', 'pointerHue', 'pointerOpacity', 'dropShadow',
];
const ARC_STYLE_KEYS = new Set<keyof ElementStyleClipboard>([
  'radius', 'lineWidth', 'startAngle', 'endAngle', 'tickWidth', 'tickLength', 'tickColor', 'tickCount', 'hideStartEndTicks',
]);

function cloneValue<T>(value: T): T {
  return value && typeof value === 'object' ? structuredClone(value) : value;
}

export function captureElementStyle(element: WatchFaceElement): ElementStyleClipboard {
  const style: ElementStyleClipboard = {};
  for (const key of STYLE_KEYS) {
    const value = element[key];
    if (value !== undefined) (style as Record<string, unknown>)[key] = cloneValue(value);
  }
  if (element.engraveFrame) {
    const frame = element.engraveFrame;
    style.engraveFrameStyle = cloneValue({
      mode: frame.mode,
      depth: frame.depth,
      lightAngle: frame.lightAngle,
      highlightColor: frame.highlightColor,
      highlightOpacity: frame.highlightOpacity,
      shadowColor: frame.shadowColor,
      shadowOpacity: frame.shadowOpacity,
      fillMode: frame.fillMode,
      fillColor: frame.fillColor,
    });
  }
  return style;
}

export function applyElementStyle(target: WatchFaceElement, style: ElementStyleClipboard): Partial<WatchFaceElement> {
  const changes: Partial<WatchFaceElement> = {};
  for (const key of STYLE_KEYS) {
    if (ARC_STYLE_KEYS.has(key) && target.type !== 'ARC_PROGRESS') continue;
    const value = style[key];
    if (value !== undefined) (changes as Record<string, unknown>)[key] = cloneValue(value);
  }
  if (style.engraveFrameStyle && target.engraveFrame) {
    changes.engraveFrame = { ...target.engraveFrame, ...cloneValue(style.engraveFrameStyle), frameOf: target.engraveFrame.frameOf };
  }
  return changes;
}
