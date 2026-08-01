// Pipeline Orchestrator — Deterministic pipeline. AI vision done upstream (AppContext).
// Validate → Geometry Clamp → Normalize (code) → Layout → Geometry → Assets → Code Gen → Bridge

import type { AIElement, NormalizedElement, ResolvedElement } from '@/types/pipeline';
import type { WatchFaceConfig, WatchFaceElement, GeneratedCode } from '@/types';

import { validateAIOutput, validateNormalized, validateLayout, validateGeometry } from './validators';
import { extractGeometry, validateGeometryExtraction } from './geometryExtractor';
import { normalize } from './normalizer';
import { applyLayout } from './layoutEngine';
import { solveGeometry } from './geometrySolver';
import { resolveAssets } from './assetResolver';
import { generateWatchFaceCode } from '@/lib/jsCodeGenerator';
import type { PipelineAIConfig } from './pipelineAIService';

// ─── Pipeline Orchestrator ──────────────────────────────────────────────────────

export interface PipelineOptions {
  watchfaceName?: string;
  watchModel?: string;
  backgroundSrc?: string;
  /** AI config for Stage B normalization + Call 3 ambiguity resolution */
  aiConfig?: PipelineAIConfig;
  /** Progress callback for UI status messages */
  onProgress?: (message: string) => void;
}

export interface PipelineResult {
  config: WatchFaceConfig;
  code: GeneratedCode;
  resolved: ResolvedElement[];
}

export async function runPipeline(
  aiOutput: AIElement[],
  options: PipelineOptions = {},
): Promise<PipelineResult> {
  const log = options.onProgress ?? (() => {});

  // ─── Validate AI output ────────────────────────────────────────────────────
  validateAIOutput(aiOutput);
  console.log('[Pipeline] Validated:', aiOutput.length, 'elements');

  // ─── Geometry Extraction: Validate + normalize AI geometry ────────────────
  log('Geometry extraction: validating spatial data...');
  let geometryEnriched = extractGeometry(aiOutput);
  try {
    validateGeometryExtraction(geometryEnriched);
    console.log('[Pipeline] Geometry extraction validated:', geometryEnriched.length, 'elements');
  } catch (err) {
    console.warn('[Pipeline] Geometry extraction validation failed, continuing with partial geometry:', err);
    // Don't block pipeline — elements without bounds will fall through to layout/geometry stages
    geometryEnriched = aiOutput;
  }

  // ─── Normalize: representation → Zepp widgets (deterministic code mapping) ─
  log('Normalizing elements...');
  let normalized: NormalizedElement[] = normalize(geometryEnriched);
  console.log('[Pipeline] Normalized:', normalized.length, 'elements');

  validateNormalized(normalized);

  // ─── Assign fallback dataTypes to any ARC_PROGRESS missing them ───────────
  normalized = assignFallbackDataTypes(normalized);

  // ─── Layout (group zones + layout mode positioning) ───────────────────────
  log('Computing layout...');
  const layouted = applyLayout(normalized);
  validateLayout(layouted);
  console.log('[Pipeline] Layout:', layouted.length, 'elements');

  // ─── Geometry (per-layout-mode: arc stacking / row bbox / standalone) ──────
  log('Solving geometry...');
  const geometry = solveGeometry(layouted);
  validateGeometry(geometry);
  console.log('[Pipeline] Geometry:', geometry.length, 'elements');

  // ─── Asset resolution ─────────────────────────────────────────────────────
  log('Resolving assets...');
  const resolved = resolveAssets(geometry);
  console.log('[Pipeline] Assets resolved');

  // ─── Bridge to code generator ─────────────────────────────────────────────
  log('Generating code...');
  const config = bridgeToWatchFaceConfig(resolved, options);
  const code = generateWatchFaceCode(config);
  console.log('[Pipeline] Stage F code generated');

  return { config, code, resolved };
}

// ─── Fallback: Assign dataTypes to unresolved ARC_PROGRESS elements ────────────

const ARC_FALLBACK_PRIORITY = ['BATTERY', 'STEP', 'HEART', 'SPO2', 'CAL'];

function assignFallbackDataTypes(elements: NormalizedElement[]): NormalizedElement[] {
  const used = new Set(elements.map(e => e.dataType).filter(Boolean));

  return elements.map(el => {
    if (el.widget === 'ARC_PROGRESS' && !el.dataType) {
      const fallback = ARC_FALLBACK_PRIORITY.find(dt => !used.has(dt));
      if (fallback) {
        used.add(fallback);
        return { ...el, dataType: fallback };
      }
    }
    return el;
  });
}

// ─── Bridge: ResolvedElement[] → WatchFaceConfig ────────────────────────────────
// Converts pipeline output into the WatchFaceConfig shape that jsCodeGeneratorV2 expects.

function bridgeToWatchFaceConfig(
  elements: ResolvedElement[],
  options: PipelineOptions,
): WatchFaceConfig {
  const watchElements: WatchFaceElement[] = elements.map((el, idx) =>
    resolvedToWatchFaceElement(el, idx),
  );

  return {
    name: options.watchfaceName || 'AI Watchface',
    resolution: { width: 480, height: 480 },
    background: {
      src: options.backgroundSrc || 'background.png',
      format: 'TGA-RLP',
    },
    elements: watchElements,
    watchModel: options.watchModel || 'Balance 2',
  };
}

function resolvedToWatchFaceElement(el: ResolvedElement, idx: number): WatchFaceElement {
  const base: WatchFaceElement = {
    id: el.id,
    type: mapWidgetToElementType(el.widget),
    name: mapWidgetToName(el.widget, el.sourceType, idx),
    bounds: { x: 0, y: 0, width: 480, height: 480 }, // overridden per widget below
    visible: true,
    zIndex: idx + 1,
  };

  // ── Widget-specific coordinate assignment ─────────────────────────────────

  // TIME_POINTER: center-based, bounds = full screen container
  if (el.widget === 'TIME_POINTER') {
    base.center = { x: el.centerX, y: el.centerY };
    base.bounds = { x: 0, y: 0, width: 480, height: 480 };
    base.hourHandSrc = el.assets.hourHandSrc;
    base.minuteHandSrc = el.assets.minuteHandSrc;
    base.secondHandSrc = el.assets.secondHandSrc;
    base.coverSrc = el.assets.coverSrc;
    base.hourPos = { x: el.hourPosX!, y: el.hourPosY! };
    base.minutePos = { x: el.minutePosX!, y: el.minutePosY! };
    base.secondPos = { x: el.secondPosX!, y: el.secondPosY! };
    base.pointerCenter = { x: el.centerX, y: el.centerY };
    return base;
  }

  // ARC_PROGRESS: center-based, bounds = full screen container
  if (el.widget === 'ARC_PROGRESS') {
    base.center = { x: el.centerX, y: el.centerY };
    base.bounds = { x: 0, y: 0, width: 480, height: 480 };
    base.radius = el.radius;
    base.startAngle = el.startAngle;
    base.endAngle = el.endAngle;
    base.lineWidth = el.lineWidth;
    base.dataType = el.dataType;
    base.color = el.color ? toZeppHex(el.color) : (ARC_COLORS[el.dataType || ''] || '0x00FF00');
    return base;
  }

  // IMG_TIME: bounds from computed geometry (no center)
  if (el.widget === 'IMG_TIME') {
    base.bounds = { x: el.x!, y: el.y!, width: el.w!, height: el.h! };
    base.images = el.assets.fontArray;
    base.font = el.fontFamily;
    return base;
  }

  // IMG_DATE: bounds from computed geometry
  if (el.widget === 'IMG_DATE') {
    base.bounds = { x: el.x!, y: el.y!, width: el.w!, height: el.h! };
    if (el.sourceType === 'month') {
      base.images = el.assets.monthArray;
    } else {
      base.images = el.assets.fontArray;
    }
    base.font = el.fontFamily;
    return base;
  }

  // IMG_WEEK: bounds from computed geometry
  if (el.widget === 'IMG_WEEK') {
    base.bounds = { x: el.x!, y: el.y!, width: el.w!, height: el.h! };
    base.images = el.assets.weekArray;
    base.font = el.fontFamily;
    return base;
  }

  // TEXT_IMG: bounds from computed geometry
  if (el.widget === 'TEXT_IMG') {
    base.bounds = { x: el.x!, y: el.y!, width: el.w!, height: el.h! };
    base.fontArray = el.assets.fontArray;
    base.dataType = el.dataType;
    base.font = el.fontFamily;
    return base;
  }

  // IMG_LEVEL: bounds from computed geometry
  if (el.widget === 'IMG_LEVEL') {
    base.bounds = { x: el.x!, y: el.y!, width: el.w!, height: el.h! };
    base.images = el.assets.imageArray;
    base.dataType = el.dataType;
    return base;
  }

  // IMG_STATUS: bounds from computed geometry
  if (el.widget === 'IMG_STATUS') {
    base.bounds = { x: el.x!, y: el.y!, width: el.w!, height: el.h! };
    base.src = el.assets.src;
    base.assetFilename = el.assets.src;
    base.statusType = 'DISCONNECT';
    return base;
  }

  // IMG: bounds from computed geometry
  if (el.widget === 'IMG') {
    base.bounds = { x: el.x!, y: el.y!, width: el.w!, height: el.h! };
    base.src = el.assets.src;
    base.assetFilename = el.assets.src;
    return base;
  }

  // TEXT: bounds from computed geometry
  if (el.widget === 'TEXT') {
    base.bounds = { x: el.x!, y: el.y!, width: el.w!, height: el.h! };
    base.text = '';
    base.fontSize = el.fontSize ?? 20;
    base.font = el.fontFamily;
    base.color = el.color ? toZeppHex(el.color) : '0xFFFFFFFF';
    return base;
  }

  // Fallback: use geometry x/y if available, else centerX/centerY
  base.bounds = {
    x: el.x ?? el.centerX,
    y: el.y ?? el.centerY,
    width: el.w ?? 100,
    height: el.h ?? 100,
  };
  return base;
}

// ─── Per-data-type arc colors (hex for Zepp OS) ────────────────────────────────

const ARC_COLORS: Record<string, string> = {
  BATTERY:  '0x00CC88',
  STEP:     '0xFFD93D',
  HEART:    '0xFF6B6B',
  SPO2:     '0xEE5A24',
  CAL:      '0xFF9F43',
  DISTANCE: '0x54A0FF',
  STRESS:   '0x9B59B6',
  PAI_DAILY: '0xE74C3C',
  SLEEP:    '0x3498DB',
  STAND:    '0x1ABC9C',
  FAT_BURNING: '0xF39C12',
  UVI:      '0xF1C40F',
  AQI:      '0x27AE60',
  HUMIDITY: '0x2980B9',
  SUN_RISE: '0xF5AB35',
  SUN_SET:  '0xE55039',
  WIND:     '0x7F8C8D',
  ALARM:    '0xD35400',
  NOTIFICATION: '0x8E44AD',
  MOON:     '0xBDC3C7',
};

/** Convert CSS hex (#RRGGBB or #RGB) to Zepp hex (0xRRGGBB) */
function toZeppHex(cssHex: string): string {
  let h = cssHex.replace('#', '');
  // Expand shorthand #RGB → RRGGBB
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return '0x' + h.toUpperCase();
}

// Map pipeline widget names back to WatchFaceElement.type
// V2 generator uses element.type in the switch/case in generateWidgetCodeV2
function mapWidgetToElementType(
  widget: string,
): WatchFaceElement['type'] {
  const map: Record<string, WatchFaceElement['type']> = {
    TIME_POINTER: 'TIME_POINTER',
    ARC_PROGRESS: 'ARC_PROGRESS',
    TEXT:         'TEXT',
    TEXT_IMG:     'TEXT_IMG',
    IMG:          'IMG',
    IMG_STATUS:   'IMG_STATUS',
    IMG_LEVEL:    'IMG_LEVEL',
    // IMG_TIME, IMG_DATE, IMG_WEEK are routed by NAME in V2 generator,
    // so their type doesn't matter for the switch/case. Set to IMG as fallback.
    IMG_TIME:     'IMG',
    IMG_DATE:     'IMG',
    IMG_WEEK:     'IMG',
  };
  return map[widget] || 'IMG';
}

// Map widget to a name the V2 generator's name-based routing expects.
// V2 generator checks: name.includes('time'), name.includes('date'),
// name.includes('week'), name.includes('month')
// TEXT_IMG names use descriptive format: "Steps Value 0", "Battery Value 1"
// IMPORTANT: TEXT_IMG/IMG names must NOT contain 'time','date','week','month'
// to avoid accidentally triggering V2 generator's name-based routing.

/** Capitalize first letter of source type for readable names. */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Map data source types to safe display names (avoid V2 routing keywords). */
const SOURCE_DISPLAY_NAME: Record<string, string> = {
  steps:      'Steps',
  battery:    'Battery',
  heart_rate: 'Heart Rate',
  spo2:       'SpO2',
  calories:   'Calories',
  distance:   'Distance',
  weather:    'Weather',
  arc:        'Arc',
  text:       'Text',
};

function mapWidgetToName(
  widget: string,
  sourceType: string,
  idx: number,
): string {
  const displayName = SOURCE_DISPLAY_NAME[sourceType] || capitalize(sourceType);

  switch (widget) {
    case 'TIME_POINTER': return `Clock Hands ${idx}`;
    case 'IMG_TIME':     return `Digital Time ${idx}`;
    case 'IMG_DATE':     return sourceType === 'month' ? `Month ${idx}` : `Date ${idx}`;
    case 'IMG_WEEK':     return `Weekday ${idx}`;
    case 'ARC_PROGRESS': return `Arc ${displayName} ${idx}`;
    case 'TEXT_IMG':     return `${displayName} Value ${idx}`;
    case 'TEXT':         return `${displayName} Label ${idx}`;
    case 'IMG':          return `${displayName} Icon ${idx}`;
    case 'IMG_STATUS':   return `Status ${idx}`;
    case 'IMG_LEVEL':    return `Level ${displayName} ${idx}`;
    case 'FILL_RECT':    return `Rectangle ${idx}`;
    case 'STROKE_RECT':  return `Outline Rect ${idx}`;
    case 'IMG_ANIM':     return `Animation ${idx}`;
    case 'IMG_PROGRESS': return `Progress ${displayName} ${idx}`;
    case 'DATE_POINTER': return `Date Pointer ${idx}`;
    case 'IMG_CLICK':    return `${displayName} Tap ${idx}`;
    case 'CIRCLE':       return `Circle ${idx}`;
    case 'BUTTON':       return `Button ${idx}`;
    default:             return `Element ${idx}`;
  }
}

// ─── Re-exports for convenience ─────────────────────────────────────────────────

export { validateAIOutput } from './validators';
export { extractGeometry, validateGeometryExtraction } from './geometryExtractor';
export { normalize } from './normalizer';
export { sortArcsByPriority } from './semanticPriority';
export { applyLayout } from './layoutEngine';
export { solveGeometry } from './geometrySolver';
export { resolveAssets } from './assetResolver';
export type { AIElement, AIExtractionResult, AIBounds, AICenter, ResolvedElement } from '@/types/pipeline';
export type { PipelineAIConfig } from './pipelineAIService';
