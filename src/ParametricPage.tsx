import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type FileSystemDirectoryHandle,
  isFileSystemAccessSupported,
  pickLocalDataFolder,
  getHandleFromIDB,
  clearHandleFromIDB,
  requestFolderPermission,
  saveThemeFile,
  deleteThemeFile,
  loadAllThemeFiles,
  saveLibraryFile,
  deleteLibraryFile,
  loadAllLibraryFiles,
} from '@/lib/fileSystemStorage';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentAuthUser, isFirebaseAuthConfigured, subscribeAuthState } from '@/lib/firebaseAuthClient';
import { fetchParametricLibraryFromFirebase, saveParametricLibraryToFirebase, fetchParametricThemesFromFirebase, saveParametricThemesToFirebase, fetchParametricProgressFromFirebase, saveParametricProgressToFirebase } from '@/lib/studioFirebasePublishApi';
import { FONT_STYLES } from '@/lib/fontLibrary';
import {
  normalizeLegacyGradientLayers,
  normalizeLegacyMaterialLayers,
  normalizeLegacyTextureLayers,
  writeNormalizedGradientLayers,
  writeNormalizedMaterialLayers,
  writeNormalizedTextureLayers,
} from '@/lib/effects/legacyEffectNormalization';
import { normalizeDepthEffectRecord, normalizeDropShadowForBake } from '@/lib/effectNormalization';
import { mapCanvasPointToLocal as mapCanvasPointToLocalShared, mapLocalPointToCanvas as mapLocalPointToCanvasShared } from '@/lib/maskFrame';
import { applyMaskValueU8, maskStrength } from '@/lib/maskFieldKernel';
import type { ParametricElementRenderState, ParametricSnapshotStatus, SnapshotRenderMode } from '@/types';
import { createElementSnapshot } from '../engine/snapshot/snapshotRenderer';
import { generateElementRenderHash } from '../engine/snapshot/snapshotHash';
import { deleteElementSnapshot, refreshElementSnapshotStatus, resolveElementSnapshotStatus, setElementRenderSourceMode, setElementSnapshot } from '../engine/snapshot/snapshotStorage';
import { generateElementRenderHash as generateCachedElementRenderHash } from '../engine/rendering/renderHash';
import { getCachedRender, getCachedRenderElementIds, removeCachedRender, setCachedRender } from '../engine/rendering/renderCache';
import { consumeDirtyElementIds, getElementDirtyReason, getDirtyElementIds, markElementDirty, type DirtyReason } from '../engine/rendering/renderInvalidation';
import { beginRenderInteraction, endRenderInteraction, getRenderQualityMode } from '../engine/rendering/renderInteractionState';
import { resolveLayerRenderOutputWithInvalidation } from '@/lib/renderCacheScheduler';
import { resolveAdaptiveRenderStep } from '../engine/ui/adaptiveSteps';
import { getParameterProfile } from '../engine/ui/shadowProfiles';
import type { ParameterCurve } from '../engine/ui/shadowProfiles';
import { normalizeMappedParameterValue } from '../engine/ui/parameterPrecision';
import { mapRenderValueToUiValue, mapUiValueToRenderValue } from '../engine/ui/parameterMapping';
import { mapEffectUiToRender, mapEffectRenderToUi, getEffectParameterProfile } from '../engine/ui/effectMapping';
import { normalizeSliderDebounceMs, shouldApplySliderUpdate } from '../engine/ui/sliderThrottle';
import {
  pushHistoryCommand,
  redoHistory,
  undoHistory,
  type HistoryCommand,
} from '@/lib/history/commandHistory.ts';

type StyleKey = 'gold_dark' | 'steel_night';
type ColorMode = 'off' | 'warning' | 'enforce';
type MaskBrushAction = 'hide' | 'reveal';
type MaskSelectionShape = 'rect' | 'square' | 'circle' | 'oval' | 'free';

type TemplateElement = Record<string, unknown> & {
  id?: string;
  name?: string;
  role?: string;
  type?: string;
  visible?: boolean;
  mask?: Record<string, unknown>;
  gradient?: Record<string, unknown>;
  params?: Record<string, unknown>;
  renderState?: ParametricElementRenderState;
  placement?: { mode?: string; config?: Record<string, unknown> };
  symmetry?: { mode?: string; config?: Record<string, unknown> };
};

type TemplateModel = {
  activeStyle?: StyleKey;
  layout?: Record<string, unknown>;
  scale?: Record<string, unknown>;
  relationships?: Record<string, unknown>;
  effects3d?: Record<string, unknown>;
  styleAdjust?: Record<string, unknown>;
  texture?: Record<string, unknown>;
  elements: Array<TemplateElement>;
};

type LibraryEntry = {
  id: string;
  name: string;
  category: string;
  element: TemplateElement;
};

type ThemeEntry = {
  id: string;
  name: string;
  template: TemplateModel;
  updatedAt?: number;
};

type ProgressSnapshotEntry = {
  updatedAt: number;
  template: TemplateModel;
};

type GroupedLibrarySection = {
  category: string;
  entries: Array<LibraryEntry>;
  fallbackElement?: TemplateElement;
};

type TemplateCommand = HistoryCommand<TemplateModel>;

const PARAMETRIC_TEMPLATE_STORAGE_KEY = 'parametric-template-elements-v1';
const PARAMETRIC_LIBRARY_STORAGE_KEY = 'parametric-element-library-v1';
const PARAMETRIC_THEME_STORAGE_KEY = 'parametric-theme-library-v1';
const PARAMETRIC_PROGRESS_SNAPSHOT_STORAGE_KEY = 'parametric-progress-snapshot-v1';
const PARAMETRIC_HISTORY_STORAGE_KEY = 'parametric-template-history-v1';
const PARAMETRIC_PROGRESS_SNAPSHOT_THEME_ID = '__parametric-progress-snapshot__';
const PARAMETRIC_PROGRESS_SNAPSHOT_THEME_NAME = '__progress_snapshot__';
const PARAMETRIC_AUTO_SAVE_STORAGE_KEY = 'parametric-auto-save-v1';
const PARAMETRIC_AUTO_SAVE_SETTINGS_KEY = 'parametric-auto-save-settings-v1';
const AUTO_SAVE_INTERVAL_OPTIONS = [1, 2, 5, 10, 15, 30] as const;

const DEFAULT_COLOR_CONTROL = {
  colorControl: {
    mode: 'off' as ColorMode,
    quantization: 'rgb565',
    palette: [],
    luminanceClamp: {
      enabled: false,
      min: 0.2,
      max: 0.8,
    },
    tolerance: 2,
  },
};

const SAMPLE_LIBRARY: Array<LibraryEntry> = [
  {
    id: 'sample-base-layer',
    name: 'Base Layer',
    category: 'Base',
    element: {
      type: 'base',
      role: 'base',
      name: 'Base Layer',
      params: { shape: 'circle', radius: 0.5, fill: '#0b0b0b' },
      placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
    },
  },
  {
    id: 'sample-base-bezel',
    name: 'Base Bezel',
    category: 'Bezel',
    element: {
      type: 'bezel',
      role: 'bezel',
      name: 'Base Bezel',
      params: { radius: 0.48, thickness: 0.02, stroke: '#d2b879' },
      placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
    },
  },
  {
    id: 'sample-main-ticks',
    name: 'Main Ticks',
    category: 'Ticks',
    element: {
      type: 'ticks_radial',
      role: 'ticks',
      name: 'Main Ticks',
      params: {
        count: 60,
        radius: 0.42,
        length: 0.02,
        width: 0.003,
        majorEvery: 5,
        majorLength: 0.035,
        tickShape: 'rect',
        rectAlign: 'radial',
        token: {
          mode: 'line',
          every: 5,
          locale: 'en',
          numberingSystem: '',
          offset: 0.012,
          number: { start: 12, step: 1, pad: 0 },
          text: { value: '', values: '' },
          icon: { key: 'dot', glyph: '' },
          font: { styleKey: 'arial', family: 'Segoe UI Symbol, Arial', weight: 'bold', size: 0.06, fill: '#ffffff' },
        },
      },
      placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
    },
  },
  {
    id: 'sample-outline-ring',
    name: 'Outline Ring',
    category: 'Outline',
    element: {
      type: 'outline_ring',
      role: 'outline_ring',
      name: 'Outline Ring',
      params: { radius: 0.44, thickness: 0.016, stroke: '#d6bb6a' },
      placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
    },
  },
  {
    id: 'sample-outline-rect',
    name: 'Outline Frame',
    category: 'Outline',
    element: {
      type: 'outline_rect',
      role: 'outline_rect',
      name: 'Outline Frame',
      params: { width: 0.75, height: 0.9, cornerRadius: 0.06, thickness: 0.01, stroke: '#8ca0bf' },
      placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
    },
  },
  {
    id: 'sample-free-circle',
    name: 'Free Circle Marker',
    category: 'Free Objects',
    element: {
      type: 'free_circle',
      role: 'free_circle',
      name: 'Free Circle Marker',
      placement: { mode: 'anchor', config: { anchor: 'top', offset: [0, 16], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
      params: { radius: 0.06, thickness: 0.008, fill: '#4b5a78', stroke: '#d9e4ff' },
    },
  },
  {
    id: 'sample-free-ring',
    name: 'Free Ring Marker',
    category: 'Free Objects',
    element: {
      type: 'free_ring',
      role: 'free_ring',
      name: 'Free Ring Marker',
      placement: { mode: 'anchor', config: { anchor: 'right', offset: [-22, 0], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
      params: { radius: 0.08, thickness: 0.01, stroke: '#d9e4ff', fill: 'none' },
    },
  },
  {
    id: 'sample-free-triangle',
    name: 'Free Triangle',
    category: 'Free Objects',
    element: {
      type: 'free_triangle',
      role: 'free_triangle',
      name: 'Free Triangle',
      placement: { mode: 'anchor', config: { anchor: 'left', offset: [24, 0], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
      params: { side1: 0.11, side2: 0.09, side3: 0.1, fill: '#58657b', stroke: '#e5ecff', thickness: 0.008 },
    },
  },
  {
    id: 'sample-free-hexagon',
    name: 'Free Hexagon',
    category: 'Free Objects',
    element: {
      type: 'free_hexagon',
      role: 'free_hexagon',
      name: 'Free Hexagon',
      placement: { mode: 'anchor', config: { anchor: 'left', offset: [24, -24], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
      params: { side1: 0.09, side2: 0.1, side3: 0.11, side4: 0.09, side5: 0.1, side6: 0.11, fill: '#58657b', stroke: '#e5ecff', thickness: 0.008 },
    },
  },
  {
    id: 'sample-free-octagon',
    name: 'Free Octagon',
    category: 'Free Objects',
    element: {
      type: 'free_octagon',
      role: 'free_octagon',
      name: 'Free Octagon',
      placement: { mode: 'anchor', config: { anchor: 'left', offset: [24, 24], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
      params: { side1: 0.08, side2: 0.09, side3: 0.1, side4: 0.11, side5: 0.1, side6: 0.09, side7: 0.08, side8: 0.09, fill: '#58657b', stroke: '#e5ecff', thickness: 0.008 },
    },
  },
  {
    id: 'sample-free-polygon',
    name: 'Free Polygon',
    category: 'Free Objects',
    element: {
      type: 'free_polygon',
      role: 'free_polygon',
      name: 'Free Polygon',
      placement: { mode: 'anchor', config: { anchor: 'top', offset: [0, 28], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
      params: {
        sidesCount: 7,
        sides: [0.08, 0.1, 0.12, 0.09, 0.11, 0.08, 0.1],
        fill: '#58657b',
        stroke: '#e5ecff',
        thickness: 0.008,
      },
    },
  },
  {
    id: 'sample-free-rect',
    name: 'Free Bottom Card',
    category: 'Free Objects',
    element: {
      type: 'free_rect',
      role: 'free_rect',
      name: 'Free Bottom Card',
      placement: { mode: 'anchor', config: { anchor: 'bottom', offset: [0, -20], rotation: 18 } },
      symmetry: { mode: 'none', config: {} },
      params: { width: 0.28, height: 0.11, cornerRadius: 0.03, thickness: 0.008, fill: '#5f536e', stroke: '#e5dcf1' },
    },
  },
  {
    id: 'sample-texture-layer',
    name: 'Texture Grain Layer',
    category: 'Texture',
    element: {
      type: 'texture_layer',
      role: 'texture_layer',
      name: 'Texture Grain Layer',
      placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
      params: {
        shape: 'ring',
        radius: 0.44,
        thickness: 0.03,
        opacity: 0.35,
        gradient: {
          from: [0, 0],
          to: [100, 100],
          stops: [
            { offset: 0, color: '#f5e6b0', opacity: 0.3 },
            { offset: 0.5, color: '#8b7a4e', opacity: 0.22 },
            { offset: 1, color: '#1b150b', opacity: 0.36 },
          ],
        },
        noise: { amount: 0.72, radius: 14 },
      },
    },
  },
];

const DEFAULT_EMPTY_TEMPLATE: TemplateModel = {
  layout: {
    shape: 'circle',
    width: 480,
    height: 480,
    baseRadius: 0.5,
    padding: 0.04,
  },
  scale: { global: 1 },
  elements: [],
};

const BASE_TEMPLATE_DRAFT = JSON.stringify(
  {
    layout: {
      shape: 'circle',
      width: 480,
      height: 480,
      baseRadius: 0.5,
      padding: 0.04,
    },
    scale: {
      global: 1.0,
    },
    elements: [],
  },
  null,
  2,
);

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function namespaceSvgIds(svgMarkup: string, namespaceSeed: string): string {
  if (!svgMarkup || typeof svgMarkup !== 'string') return svgMarkup;

  const safeNamespace = namespaceSeed.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeNamespace) return svgMarkup;

  const idPattern = /\bid\s*=\s*"([^"]+)"/g;
  const idMap = new Map<string, string>();
  let match: RegExpExecArray | null;
  while ((match = idPattern.exec(svgMarkup)) !== null) {
    const originalId = match[1];
    if (!idMap.has(originalId)) {
      idMap.set(originalId, `${safeNamespace}-${originalId}`);
    }
  }

  if (idMap.size === 0) return svgMarkup;

  let nextMarkup = svgMarkup;
  for (const [originalId, namespacedId] of idMap.entries()) {
    const escaped = originalId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    nextMarkup = nextMarkup
      .replace(new RegExp(`id\\s*=\\s*"${escaped}"`, 'g'), `id="${namespacedId}"`)
      .replace(new RegExp(`url\\(#${escaped}\\)`, 'g'), `url(#${namespacedId})`)
      .replace(new RegExp(`href\\s*=\\s*"#${escaped}"`, 'g'), `href="#${namespacedId}"`)
      .replace(new RegExp(`xlink:href\\s*=\\s*"#${escaped}"`, 'g'), `xlink:href="#${namespacedId}"`);
  }

  return nextMarkup;
}

const FORBIDDEN_RGB_MIN = 1;
const FORBIDDEN_RGB_MAX = 46;
const SAFE_RGB_FLOOR = 47;

function resolveTemplatePixelSize(template: TemplateModel | null | undefined): { width: number; height: number } {
  const fallback = { width: 480, height: 480 };
  const layout = template?.layout;
  if (!layout || typeof layout !== 'object') return fallback;
  const width = Number((layout as Record<string, unknown>).width);
  const height = Number((layout as Record<string, unknown>).height);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return fallback;
  return {
    width: Math.max(1, Math.min(2048, Math.round(width))),
    height: Math.max(1, Math.min(2048, Math.round(height))),
  };
}

function isPixelInForbiddenBand(r: number, g: number, b: number): boolean {
  return (
    (r >= FORBIDDEN_RGB_MIN && r <= FORBIDDEN_RGB_MAX) ||
    (g >= FORBIDDEN_RGB_MIN && g <= FORBIDDEN_RGB_MAX) ||
    (b >= FORBIDDEN_RGB_MIN && b <= FORBIDDEN_RGB_MAX)
  );
}

function remapChannelToNearestAllowed(value: number): number {
  if (value < FORBIDDEN_RGB_MIN || value > FORBIDDEN_RGB_MAX) return value;
  const distanceToBlack = value;
  const distanceToSafeFloor = Math.abs(SAFE_RGB_FLOOR - value);
  return distanceToBlack <= distanceToSafeFloor ? 0 : SAFE_RGB_FLOOR;
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode preview SVG for pixel processing.'));
    img.src = url;
  });
}

async function buildPixelColorPassAssets(
  svgMarkup: string,
  size: { width: number; height: number },
  mode: ColorMode,
): Promise<{ warningOverlayDataUrl: string | null; enforcedDataUrl: string | null; violationCount: number }> {
  if (!svgMarkup || (mode !== 'warning' && mode !== 'enforce')) {
    return { warningOverlayDataUrl: null, enforcedDataUrl: null, violationCount: 0 };
  }

  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await loadImageFromUrl(objectUrl);
    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = size.width;
    baseCanvas.height = size.height;
    const baseCtx = baseCanvas.getContext('2d', { willReadFrequently: true });
    if (!baseCtx) throw new Error('Could not acquire preview canvas context.');

    baseCtx.clearRect(0, 0, size.width, size.height);
    baseCtx.drawImage(image, 0, 0, size.width, size.height);
    const imageData = baseCtx.getImageData(0, 0, size.width, size.height);
    const src = imageData.data;

    let violationCount = 0;
    let warningOverlayDataUrl: string | null = null;
    let enforcedDataUrl: string | null = null;

    if (mode === 'warning') {
      const warningCanvas = document.createElement('canvas');
      warningCanvas.width = size.width;
      warningCanvas.height = size.height;
      const warningCtx = warningCanvas.getContext('2d');
      if (!warningCtx) throw new Error('Could not acquire warning overlay context.');
      const warningData = warningCtx.createImageData(size.width, size.height);
      const out = warningData.data;

      for (let i = 0; i < src.length; i += 4) {
        const alpha = src[i + 3];
        if (alpha === 0) continue;
        const r = src[i];
        const g = src[i + 1];
        const b = src[i + 2];
        const violates = isPixelInForbiddenBand(r, g, b);
        if (!violates) continue;
        violationCount += 1;
        out[i] = 255;
        out[i + 1] = 138;
        out[i + 2] = 0;
        out[i + 3] = 190;
      }

      warningCtx.putImageData(warningData, 0, 0);
      warningOverlayDataUrl = warningCanvas.toDataURL('image/png');
      return { warningOverlayDataUrl, enforcedDataUrl, violationCount };
    }

    const enforcedData = baseCtx.createImageData(size.width, size.height);
    const enforcedPixels = enforcedData.data;
    for (let i = 0; i < src.length; i += 4) {
      const alpha = src[i + 3];
      const r = src[i];
      const g = src[i + 1];
      const b = src[i + 2];
      enforcedPixels[i + 3] = alpha;

      const violates = alpha > 0 && isPixelInForbiddenBand(r, g, b);
      if (!violates) {
        enforcedPixels[i] = r;
        enforcedPixels[i + 1] = g;
        enforcedPixels[i + 2] = b;
        continue;
      }

      violationCount += 1;
      enforcedPixels[i] = remapChannelToNearestAllowed(r);
      enforcedPixels[i + 1] = remapChannelToNearestAllowed(g);
      enforcedPixels[i + 2] = remapChannelToNearestAllowed(b);
    }

    baseCtx.putImageData(enforcedData, 0, 0);
    enforcedDataUrl = baseCanvas.toDataURL('image/png');
    return { warningOverlayDataUrl, enforcedDataUrl, violationCount };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

const DEFAULT_DRAWER_CATEGORY_ORDER = ['Base', 'Bezel', 'Ticks', 'Outline', 'Free Objects', 'Texture', 'General'] as const;

const DEFAULT_DRAWER_TEMPLATES_BY_CATEGORY = (() => {
  const map = new Map<string, TemplateElement>();
  for (const entry of SAMPLE_LIBRARY) {
    if (!map.has(entry.category)) {
      map.set(entry.category, deepClone(entry.element));
    }
  }
  return map;
})();

const CATEGORY_HEADER_DEFAULTS: Record<string, { type: string; role: string }> = {
  Base: { type: 'base', role: 'base' },
  Bezel: { type: 'bezel', role: 'bezel' },
  Ticks: { type: 'ticks_radial', role: 'ticks' },
  Outline: { type: 'outline_ring', role: 'outline_ring' },
  'Free Objects': { type: 'free_rect', role: 'free_rect' },
  Texture: { type: 'texture_layer', role: 'texture_layer' },
  'Image Layer': { type: 'image_layer', role: 'image_layer' },
  General: { type: 'element', role: 'element' },
};

const FREE_OBJECT_SHAPE_OPTIONS = [
  { label: 'Circle', type: 'free_circle', role: 'free_circle' },
  { label: 'Ring', type: 'free_ring', role: 'free_ring' },
  { label: 'Triangle', type: 'free_triangle', role: 'free_triangle' },
  { label: 'Hexagon', type: 'free_hexagon', role: 'free_hexagon' },
  { label: 'Octagon', type: 'free_octagon', role: 'free_octagon' },
  { label: 'Polygon', type: 'free_polygon', role: 'free_polygon' },
  { label: 'Rectangle', type: 'free_rect', role: 'free_rect' },
] as const;

const FREE_OBJECT_SHAPE_BY_TYPE = new Map<string, { label: string; type: string; role: string }>(
  FREE_OBJECT_SHAPE_OPTIONS.map((item) => [item.type, item]),
);

const EFFECT_PANEL_KEYS = ['styleFx', 'depthFx', 'shadowFx', 'textureFx', 'gradientFx', 'materialFx'] as const;
const EDITOR_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Orbitron:wght@400;700&family=Oswald:wght@400;700&family=Bebas+Neue&family=Rajdhani:wght@400;700&family=Share+Tech+Mono&family=Goldman:wght@400;700&family=Russo+One&family=Audiowide&family=Rationale&family=Black+Ops+One&family=Michroma&family=Exo+2:wght@400;700&family=Syncopate:wght@400;700&family=Nova+Mono&family=VT323&family=Press+Start+2P&family=Chakra+Petch:wght@400;700&family=Quantico:wght@400;700&family=Oxanium:wght@400;700&family=Wallpoet&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Montserrat:wght@400;700&family=Poppins:wght@400;700&family=Nunito:wght@400;700&family=Raleway:wght@400;700&family=Josefin+Sans:wght@400;700&family=Righteous&family=Ubuntu:wght@400;700&family=Oxygen+Mono&display=swap';
type EffectPanelKey = (typeof EFFECT_PANEL_KEYS)[number];
const BLUR_MODE_OPTIONS = [
  { value: 'gaussian', label: 'Gaussian' },
  { value: 'directional', label: 'Directional' },
  { value: 'radial', label: 'Radial' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'soften', label: 'Soften' },
] as const;
const GRADIENT_KIND_OPTIONS = [
  { value: 'linear', label: 'Linear' },
  { value: 'radial', label: 'Radial' },
  { value: 'conic', label: 'Conic' },
] as const;
const TEXTURE_KIND_OPTIONS = [
  { value: 'grain', label: 'Grain' },
  { value: 'noise', label: 'Noise' },
  { value: 'brushed', label: 'Brushed' },
  { value: 'fabric', label: 'Fabric' },
  { value: 'paper', label: 'Paper' },
  { value: 'image', label: 'Image' },
  { value: 'proceduralMap', label: 'Procedural Map' },
] as const;
const BLEND_MODE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'dissolve', label: 'Dissolve' },
  { value: 'darken', label: 'Darken' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'linear-burn', label: 'Linear Burn' },
  { value: 'darker-color', label: 'Darker Color' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'screen', label: 'Screen' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'linear-dodge', label: 'Linear Dodge (Add)' },
  { value: 'lighter-color', label: 'Lighter Color' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'hard-light', label: 'Hard Light' },
  { value: 'vivid-light', label: 'Vivid Light' },
  { value: 'linear-light', label: 'Linear Light' },
  { value: 'pin-light', label: 'Pin Light' },
  { value: 'hard-mix', label: 'Hard Mix' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
  { value: 'subtract', label: 'Subtract' },
  { value: 'divide', label: 'Divide' },
  { value: 'hue', label: 'Hue' },
  { value: 'saturation', label: 'Saturation' },
  { value: 'color', label: 'Color' },
  { value: 'luminosity', label: 'Luminosity' },
] as const;
const TICK_TOKEN_MODE_OPTIONS = [
  { value: 'line', label: 'Line' },
  { value: 'number', label: 'Number' },
  { value: 'text', label: 'Text' },
  { value: 'icon', label: 'Icon' },
] as const;
const TICK_ICON_OPTIONS = [
  { value: 'dot', label: 'Dot (â€¢)' },
  { value: 'circle', label: 'Circle (â—‹)' },
  { value: 'bullet', label: 'Bullet (â—)' },
  { value: 'square', label: 'Square (â– )' },
  { value: 'diamond', label: 'Diamond (â—†)' },
  { value: 'triangle', label: 'Triangle (â–²)' },
  { value: 'star', label: 'Star (â˜…)' },
  { value: 'heart', label: 'Heart (â¤)' },
  { value: 'plus', label: 'Plus (+)' },
  { value: 'cross', label: 'Cross (âœ•)' },
  { value: 'bolt', label: 'Bolt (âš¡)' },
  { value: 'sun', label: 'Sun (â˜€)' },
  { value: 'moon', label: 'Moon (â˜¾)' },
] as const;
const RECT_LAYOUT_SHAPE_MODE_OPTIONS = [
  { value: 'rect', label: 'Rect (Follow Layout)' },
  { value: 'circle', label: 'Circle (Keep Circular)' },
] as const;
const FIXED_RENDER_STYLE: StyleKey = 'gold_dark';
const DEPTH_CONTROL_LIMITS = {
  intensity: { min: 0, max: 1, step: 0.02 },
  opacity: { min: 0, max: 1, step: 0.02 },
  angle: { min: -180, max: 180, step: 1 },
  lightAxis: { min: -1, max: 1, step: 0.01 },
  lightAxisZ: { min: -1, max: 1, step: 0.01 },
  distance: { min: 0, max: 6, step: 0.1 },
  falloff: { min: 0.2, max: 3, step: 0.02 },
  whiteBalance: { min: -1, max: 1, step: 0.02 },
  spread: { min: 0, max: 1, step: 0.02 },
} as const;
const DROP_SHADOW_CONTROL_LIMITS = {
  opacity: { min: 0, max: 100, step: 1 },
  blur: { min: 0, max: 100, step: 1 },
  spread: { min: 0, max: 100, step: 1 },
  offset: { min: -100, max: 100, step: 1 },
} as const;
const DEPTH_PRESET_OPTIONS = [
  {
    key: 'soft',
    label: 'Soft',
    depth: { enabled: true, mode: 'outer', intensity: 0.22, opacity: 0.44, distance: 1.2, falloff: 1.2, spread: 0, whiteBalance: 0.08, light: { x: -0.56, y: -0.56, z: 0.62 } },
  },
  {
    key: 'natural',
    label: 'Natural',
    depth: { enabled: true, mode: 'outer', intensity: 0.34, opacity: 0.58, distance: 1.5, falloff: 1.1, spread: 0.05, whiteBalance: 0.12, light: { x: -0.62, y: -0.44, z: 0.65 } },
  },
  {
    key: 'hard',
    label: 'Hard',
    depth: { enabled: true, mode: 'outer', intensity: 0.5, opacity: 0.74, distance: 2.1, falloff: 0.9, spread: 0.08, whiteBalance: 0, light: { x: -0.68, y: -0.32, z: 0.58 } },
  },
  {
    key: 'studio-rim',
    label: 'Studio Rim',
    depth: { enabled: true, mode: 'outer', intensity: 0.52, opacity: 0.7, distance: 2.2, falloff: 1, spread: 0.12, whiteBalance: 0.25, light: { x: -0.75, y: -0.18, z: 0.63 } },
  },
  {
    key: 'embossed',
    label: 'Embossed',
    depth: { enabled: true, mode: 'inner', intensity: 0.56, opacity: 0.82, distance: 1.7, falloff: 1.25, spread: 0.18, whiteBalance: 0.14, light: { x: -0.44, y: -0.72, z: 0.54 } },
  },
] as const;
const DEPTH_PRESET_CUSTOM_KEY = 'custom';
const DEFAULT_DEPTH_LIGHT_VECTOR = { x: 0, y: 0, z: 1 };

function formatPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

function formatSignedPercent(value: number, digits = 0): string {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(digits)}%`;
}

function formatUnit(value: number, unit: string, digits = 0): string {
  return `${value.toFixed(digits)}${unit}`;
}

function makeId(prefix = 'el'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ensureElement(element: TemplateElement, fallbackIndex = 0): TemplateElement {
  const type = typeof element.type === 'string' ? element.type : 'element';
  const role = typeof element.role === 'string' ? element.role : type;
  const name = typeof element.name === 'string' && element.name.trim().length > 0 ? element.name.trim() : `${type}-${fallbackIndex + 1}`;
  const rawRenderState = element.renderState && typeof element.renderState === 'object'
    ? element.renderState as ParametricElementRenderState
    : {};
  const sourceMode = rawRenderState.sourceMode === 'snapshot' ? 'snapshot' : 'live';
  const snapshotRenderMode: SnapshotRenderMode = rawRenderState.snapshotRenderMode === 'editable' ? 'editable' : 'frozen';
  const snapshotStatusRaw = rawRenderState.snapshotStatus;
  const snapshotStatus: ParametricSnapshotStatus =
    snapshotStatusRaw === 'fresh' || snapshotStatusRaw === 'outdated' || snapshotStatusRaw === 'missing'
      ? snapshotStatusRaw
      : 'missing';
  return {
    ...element,
    id: typeof element.id === 'string' ? element.id : makeId('el'),
    type,
    role,
    name,
    visible: element.visible !== false,
    renderState: {
      ...rawRenderState,
      sourceMode,
      snapshotRenderMode,
      snapshotStatus,
      snapshot: rawRenderState.snapshot && typeof rawRenderState.snapshot === 'object'
        ? { ...rawRenderState.snapshot }
        : null,
    },
    params: element.params && typeof element.params === 'object' ? { ...element.params } : {},
    placement:
      element.placement && typeof element.placement === 'object'
        ? {
            mode: typeof element.placement.mode === 'string' ? element.placement.mode : 'center',
            config:
              element.placement.config && typeof element.placement.config === 'object'
                ? { ...element.placement.config }
                : { offset: [0, 0], rotation: 0 },
          }
        : { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
    symmetry:
      element.symmetry && typeof element.symmetry === 'object'
        ? {
            mode: typeof element.symmetry.mode === 'string' ? element.symmetry.mode : 'none',
            config:
              element.symmetry.config && typeof element.symmetry.config === 'object'
                ? { ...element.symmetry.config }
                : {},
          }
        : { mode: 'none', config: {} },
  };
}

function inferCategory(element: TemplateElement): string {
  const type = typeof element.type === 'string' ? element.type : '';
  if (type === 'base') return 'Base';
  if (type.includes('texture')) return 'Texture';
  if (type.includes('tick')) return 'Ticks';
  if (type.includes('bezel')) return 'Bezel';
  if (type.includes('outline')) return 'Outline';
  if (type.includes('free')) return 'Free Objects';
  return 'General';
}

function buildUniqueElementName(existingElements: Array<TemplateElement>, candidate: string): string {
  const base = (candidate || 'element').trim() || 'element';
  const existing = new Set(
    existingElements
      .map((entry) => (typeof entry.name === 'string' ? entry.name.trim() : ''))
      .filter((name) => name.length > 0),
  );
  if (!existing.has(base)) return base;

  let suffix = 2;
  while (existing.has(`${base} ${suffix}`)) {
    suffix += 1;
  }
  return `${base} ${suffix}`;
}

function buildDuplicateElementName(existingElements: Array<TemplateElement>, sourceName: string): string {
  const rawBase = (sourceName || 'element').trim() || 'element';
  const base = rawBase.replace(/\s+copy\d+$/i, '').trim() || 'element';
  const pattern = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+copy(\\d+)$`, 'i');

  let nextSuffix = 1;
  for (const entry of existingElements) {
    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    const match = name.match(pattern);
    if (!match) continue;
    const suffix = Number(match[1]);
    if (Number.isFinite(suffix)) {
      nextSuffix = Math.max(nextSuffix, suffix + 1);
    }
  }

  return `${base} copy${nextSuffix}`;
}

function normalizeLibraryEntries(parsed: Array<unknown>): Array<LibraryEntry> {
  return parsed
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry, index) => {
      const safe = entry as Record<string, unknown>;
      const rawElement = safe.element && typeof safe.element === 'object' ? (safe.element as TemplateElement) : {};
      return {
        id: typeof safe.id === 'string' ? safe.id : makeId('lib'),
        name: typeof safe.name === 'string' && safe.name.trim().length > 0 ? safe.name : `Saved-${index + 1}`,
        category:
          typeof safe.category === 'string' && safe.category.trim().length > 0
            ? safe.category
            : inferCategory(rawElement),
        element: ensureElement(rawElement, index),
      };
    });
}

function stripElementSnapshotForLibrary(element: TemplateElement): TemplateElement {
  const normalized = ensureElement(deepClone(element));
  const renderState = normalized.renderState && typeof normalized.renderState === 'object'
    ? { ...(normalized.renderState as ParametricElementRenderState) }
    : null;

  let result: TemplateElement = normalized;

  if (renderState && renderState.snapshot) {
    // Drawer library keeps reusable live element params, not heavy baked bitmap snapshots.
    result = {
      ...result,
      renderState: {
        ...renderState,
        sourceMode: 'live',
        snapshotRenderMode: 'editable',
        snapshotStatus: 'missing',
        snapshot: null,
      },
    };
  }

  // Strip mask.field entirely — pixel buffer (values + imageDataUrl) is too large for
  // Firebase/localStorage entries. Mask config (enabled, invert, mode) is preserved.
  const mask = result.mask && typeof result.mask === 'object' ? result.mask as Record<string, unknown> : null;
  if (mask && mask.field) {
    const { field: _f, ...maskWithoutField } = mask;
    result = { ...result, mask: maskWithoutField };
  }

  return result;
}

/** Strips heavy runtime-only data before sending a progress snapshot to Firebase. */
function stripElementForProgressFirebase(element: TemplateElement): TemplateElement {
  const cloned = deepClone(element);

  // Strip renderState snapshot images (large base64 renders; re-rendered on load).
  if (cloned.renderState && typeof cloned.renderState === 'object') {
    const rs = cloned.renderState as ParametricElementRenderState;
    cloned.renderState = { ...rs, snapshot: null };
  }

  // Strip mask.field entirely (compiled pixel buffer — both values[] and imageDataUrl are
  // too large for Firestore's 1MB document limit). Mask config (enabled, invert, mode) is
  // kept so the user can re-paint after loading. The pixel buffer lives only in localStorage.
  const mask = cloned.mask && typeof cloned.mask === 'object' ? cloned.mask as Record<string, unknown> : null;
  if (mask && mask.field) {
    const { field: _f, ...maskWithoutField } = mask;
    cloned.mask = maskWithoutField;
  }

  return cloned;
}

function sanitizeLibraryEntryForPersistence(entry: LibraryEntry): LibraryEntry {
  return {
    ...entry,
    element: stripElementSnapshotForLibrary(entry.element),
  };
}

function makeLibraryEntrySignature(entry: LibraryEntry): string {
  const id = typeof entry.id === 'string' ? entry.id.trim() : '';
  if (id.length > 0) return `id:${id}`;
  const name = typeof entry.name === 'string' ? entry.name.trim().toLowerCase() : '';
  const type = typeof entry.element?.type === 'string' ? entry.element.type.trim().toLowerCase() : '';
  return `shape:${name}|${type}`;
}

function mergeLibraryEntries(local: Array<LibraryEntry>, remote: Array<LibraryEntry>): Array<LibraryEntry> {
  const next: Array<LibraryEntry> = [];
  const seen = new Set<string>();

  const appendUnique = (items: Array<LibraryEntry>) => {
    for (const entry of items) {
      const signature = makeLibraryEntrySignature(entry);
      if (!signature || seen.has(signature)) continue;
      seen.add(signature);
      next.push(entry);
    }
  };

  // Keep server order authoritative, then append any local-only unsynced items.
  appendUnique(remote);
  appendUnique(local);
  return next;
}

function normalizeThemeEntries(parsed: Array<unknown>): Array<ThemeEntry> {
  return parsed
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry, index) => {
      const safe = entry as Record<string, unknown>;
      const rawTemplate = safe.template && typeof safe.template === 'object' ? (safe.template as TemplateModel) : { elements: [] };
      const elements = Array.isArray(rawTemplate.elements)
        ? rawTemplate.elements.map((element, elementIndex) => ensureElement(element, elementIndex))
        : [];

      return {
        id: typeof safe.id === 'string' ? safe.id : makeId('theme'),
        name: typeof safe.name === 'string' && safe.name.trim().length > 0 ? safe.name : `Theme-${index + 1}`,
        updatedAt: Number.isFinite(Number(safe.updatedAt)) ? Number(safe.updatedAt) : undefined,
        template: {
          ...rawTemplate,
          elements,
        },
      };
    });
}

function makeThemeEntrySignature(entry: ThemeEntry): string {
  if (isProgressSnapshotTheme(entry)) {
    // Keep progress snapshot as a dedicated singleton channel.
    return `progress:${PARAMETRIC_PROGRESS_SNAPSHOT_THEME_ID}`;
  }
  const id = typeof entry.id === 'string' ? entry.id.trim() : '';
  if (id.length > 0) return `id:${id}`;
  const name = typeof entry.name === 'string' ? entry.name.trim().toLowerCase() : '';
  const payload = JSON.stringify(entry.template ?? {});
  return `shape:${name}|${payload}`;
}

function mergeThemeEntries(local: Array<ThemeEntry>, remote: Array<ThemeEntry>): Array<ThemeEntry> {
  const next: Array<ThemeEntry> = [];
  const seen = new Set<string>();
  const localProgressSnapshot = local.find((entry) => isProgressSnapshotTheme(entry)) ?? null;
  const remoteProgressSnapshot = remote.find((entry) => isProgressSnapshotTheme(entry)) ?? null;

  const appendUnique = (items: Array<ThemeEntry>) => {
    for (const entry of items) {
      const signature = makeThemeEntrySignature(entry);
      if (!signature || seen.has(signature)) continue;
      seen.add(signature);
      next.push(entry);
    }
  };

  // Keep server order authoritative, then append local-only unsynced themes.
  appendUnique(remote.filter((entry) => !isProgressSnapshotTheme(entry)));
  appendUnique(local.filter((entry) => !isProgressSnapshotTheme(entry)));

  // Progress snapshot must prefer latest local state to avoid stale cloud fallback.
  const progressSnapshot = localProgressSnapshot ?? remoteProgressSnapshot;
  if (progressSnapshot) {
    next.push(progressSnapshot);
  }
  return next;
}

function isProgressSnapshotTheme(theme: ThemeEntry): boolean {
  return theme.id === PARAMETRIC_PROGRESS_SNAPSHOT_THEME_ID || theme.name === PARAMETRIC_PROGRESS_SNAPSHOT_THEME_NAME;
}

function isLikelyRawLayoutObject(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  const layoutKeys = new Set(['shape', 'width', 'height', 'baseRadius', 'padding']);
  return keys.every((key) => layoutKeys.has(key));
}

export default function ParametricPage() {
  const navigate = useNavigate();
  const buildVersion = typeof import.meta.env.VITE_APP_BUILD_VERSION === 'string' && import.meta.env.VITE_APP_BUILD_VERSION.trim().length > 0
    ? import.meta.env.VITE_APP_BUILD_VERSION.trim()
    : 'dev-local';
  const [colorMode, setColorMode] = useState<ColorMode>('off');
  const [selectedPanelTarget, setSelectedPanelTarget] = useState<'layout' | 'element'>('layout');
  const [contextTab, setContextTab] = useState<'element' | 'fx' | 'texture' | 'gradient' | 'material' | 'json'>('element');
  const [layersPanelHeight, setLayersPanelHeight] = useState<number>(220);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isSoloMode, setIsSoloMode] = useState(false);
  const [isDimMode, setIsDimMode] = useState(false);
  const [showGlobalMaskGuides, setShowGlobalMaskGuides] = useState(false);
  const [gradientHandleTarget, setGradientHandleTarget] = useState<'texture' | 'gradient'>('gradient');
  const [activeTextureLayerIndex, setActiveTextureLayerIndex] = useState(0);
  const [activeGradientLayerIndex, setActiveGradientLayerIndex] = useState(0);
  const [activeMaterialLayerIndex, setActiveMaterialLayerIndex] = useState(0);
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const [draggingGradientHandle, setDraggingGradientHandle] = useState<null | 'from' | 'to' | 'center' | 'focal' | 'radius' | 'angle'>(null);
  const [draggingTextureHandle, setDraggingTextureHandle] = useState<null | 'direction' | 'imageOffset' | 'imageScale' | 'imageRotation'>(null);
  const [draggingOffsetHandle, setDraggingOffsetHandle] = useState(false);
  const [draggingRadiusHandle, setDraggingRadiusHandle] = useState(false);
  const [isMaskBrushEditEnabled, setIsMaskBrushEditEnabled] = useState(false);
  const [maskBrushAction, setMaskBrushAction] = useState<MaskBrushAction>('hide');
  const [isMaskPainting, setIsMaskPainting] = useState(false);
  const [activeMaskSelectionShape, setActiveMaskSelectionShape] = useState<null | {
    action: MaskBrushAction;
    shape: MaskSelectionShape;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    opacity: number;
    points?: Array<{ x: number; y: number }>;
  }>(null);
  const [activeMaskStroke, setActiveMaskStroke] = useState<null | {
    action: MaskBrushAction;
    size: number;
    hardness: number;
    opacity: number;
    points: Array<{ x: number; y: number }>;
  }>(null);
  const [maskCursorPoint, setMaskCursorPoint] = useState<null | { x: number; y: number }>(null);
  const [isGlobalPanelCollapsed, setIsGlobalPanelCollapsed] = useState(false);
  const [drawerCollapsedByCategory, setDrawerCollapsedByCategory] = useState<Record<string, boolean>>({});
  const [effectPanelCollapsed, setEffectPanelCollapsed] = useState<Record<string, boolean>>({});

  const [workingTemplate, setWorkingTemplate] = useState<TemplateModel | null>(null);
  const [library, setLibrary] = useState<Array<LibraryEntry>>(SAMPLE_LIBRARY);
  const [themes, setThemes] = useState<Array<ThemeEntry>>([]);
  const [progressSnapshot, setProgressSnapshot] = useState<ProgressSnapshotEntry | null>(null);
  const [themeNameDraft, setThemeNameDraft] = useState('');
  const [themeNameDrafts, setThemeNameDrafts] = useState<Record<string, string>>({});

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [paramsDraft, setParamsDraft] = useState('{}');
  const [layoutDraft, setLayoutDraft] = useState(JSON.stringify(DEFAULT_EMPTY_TEMPLATE.layout, null, 2));
  const [layoutDraftError, setLayoutDraftError] = useState<string | null>(null);
  const [editorNotice, setEditorNotice] = useState<string | null>(null);
  const [drawerNotice, setDrawerNotice] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    try { return JSON.parse(window.localStorage.getItem(PARAMETRIC_AUTO_SAVE_SETTINGS_KEY) ?? '{}')?.enabled ?? true; } catch { return true; }
  });
  const [autoSaveIntervalMin, setAutoSaveIntervalMin] = useState<number>(() => {
    try { return JSON.parse(window.localStorage.getItem(PARAMETRIC_AUTO_SAVE_SETTINGS_KEY) ?? '{}')?.intervalMin ?? 5; } catch { return 5; }
  });
  const [lastAutoSaveAt, setLastAutoSaveAt] = useState<Date | null>(null);
  const [autoSaveRecovery, setAutoSaveRecovery] = useState<Record<string, unknown> | null>(null);
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, string>>({});
  const [categoryHeaderLocks, setCategoryHeaderLocks] = useState<Record<string, boolean>>({});
  const [freeObjectShapeType, setFreeObjectShapeType] = useState<string>('free_rect');
  const [quickNewCategory, setQuickNewCategory] = useState<string>('General');
  const [libraryNameDrafts, setLibraryNameDrafts] = useState<Record<string, string>>({});
  const [isSnapshotActionRunning, setIsSnapshotActionRunning] = useState(false);
  const [showParameterInspector, setShowParameterInspector] = useState(false);
  const [localFolderHandle, setLocalFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);

  const [draftJson, setDraftJson] = useState(
    JSON.stringify(
      {
        type: 'texture_layer',
        role: 'texture_layer',
        name: 'My Texture',
        params: {
          shape: 'ring',
          radius: 0.44,
          thickness: 0.03,
          opacity: 0.35,
          noise: { amount: 0.72, radius: 14 },
        },
      },
      null,
      2,
    ),
  );

  const [draftError, setDraftError] = useState<string | null>(null);
  const [svgMarkup, setSvgMarkup] = useState('');
  const [svgOverlayLayers, setSvgOverlayLayers] = useState<string[]>([]);
  const [svgOverlayMarkup, setSvgOverlayMarkup] = useState<string | null>(null);
  const [svgTopOverlayMarkup, setSvgTopOverlayMarkup] = useState<string | null>(null);
  const [pixelWarningOverlayDataUrl, setPixelWarningOverlayDataUrl] = useState<string | null>(null);
  const [pixelEnforcedDataUrl, setPixelEnforcedDataUrl] = useState<string | null>(null);
  const [debugExportText, setDebugExportText] = useState<string | null>(null);
  const [debugExportCopied, setDebugExportCopied] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyTick, setHistoryTick] = useState(0);
  const previewRenderSerialRef = useRef(0);
  const contextInspectorRef = useRef<HTMLElement | null>(null);
  const historyPastRef = useRef<Array<TemplateCommand>>([]);
  const historyFutureRef = useRef<Array<TemplateCommand>>([]);
  const isHistoryApplyingRef = useRef(false);
  const isDragHistoryBatchRef = useRef(false);
  const dragBatchBeforeRef = useRef<TemplateModel | null>(null);
  const dragBatchLabelRef = useRef('Canvas drag');
  const sliderThrottleFrameRef = useRef<number | null>(null);
  const sliderThrottleLastAppliedRef = useRef(0);
  const sliderThrottlePendingRef = useRef<null | { apply: () => void; debounceMs: number }>(null);
  const pendingLibraryFirebaseSyncRef = useRef<Array<LibraryEntry> | null>(null);
  const renderDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workingTemplateRef = useRef<TemplateModel | null>(null);
  const authConfigured = isFirebaseAuthConfigured();
  const markDirtyById = useCallback((elementId: string | null | undefined, reason: DirtyReason) => {
    if (typeof elementId !== 'string' || elementId.trim().length === 0) return;
    markElementDirty(elementId.trim(), reason);
  }, []);
  const markSelectedElementDirty = useCallback((reason: DirtyReason) => {
    if (typeof selectedElementId !== 'string' || selectedElementId.trim().length === 0) return;
    markElementDirty(selectedElementId.trim(), reason);
  }, [selectedElementId]);
  const beginCanvasInteraction = useCallback(() => {
    beginRenderInteraction('canvas-interaction');
  }, []);
  const endCanvasInteraction = useCallback(() => {
    endRenderInteraction('canvas-interaction');
  }, []);
  const beginSliderInteraction = useCallback(() => {
    beginRenderInteraction('slider-interaction');
  }, []);
  const endSliderInteraction = useCallback(() => {
    endRenderInteraction('slider-interaction');
  }, []);

  const queueThrottledSliderUpdate = useCallback((apply: () => void, debounceMs = 16) => {
    const schedule = () => {
      if (sliderThrottleFrameRef.current !== null) return;
      sliderThrottleFrameRef.current = window.requestAnimationFrame((timestamp) => {
        sliderThrottleFrameRef.current = null;
        const pending = sliderThrottlePendingRef.current;
        if (!pending) return;
        if (!shouldApplySliderUpdate(timestamp, sliderThrottleLastAppliedRef.current, pending.debounceMs)) {
          schedule();
          return;
        }
        sliderThrottlePendingRef.current = null;
        pending.apply();
        sliderThrottleLastAppliedRef.current = timestamp;
      });
    };

    sliderThrottlePendingRef.current = {
      apply,
      debounceMs: normalizeSliderDebounceMs(debounceMs),
    };
    schedule();
  }, []);

  const cancelPendingSliderUpdate = useCallback(() => {
    sliderThrottlePendingRef.current = null;
    if (sliderThrottleFrameRef.current !== null) {
      window.cancelAnimationFrame(sliderThrottleFrameRef.current);
      sliderThrottleFrameRef.current = null;
    }
  }, []);

  // Match Studio font availability so font-family changes are visually obvious in parametric preview.
  useEffect(() => {
    if (!document.querySelector(`link[href="${EDITOR_FONTS_URL}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = EDITOR_FONTS_URL;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.type !== 'range') return;
      beginSliderInteraction();
    };

    const onPointerUp = () => {
      endSliderInteraction();
      endCanvasInteraction();
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('mouseup', onPointerUp);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('mouseup', onPointerUp);
    };
  }, [beginSliderInteraction, endCanvasInteraction, endSliderInteraction]);

  useEffect(() => () => {
    if (sliderThrottleFrameRef.current !== null) {
      window.cancelAnimationFrame(sliderThrottleFrameRef.current);
      sliderThrottleFrameRef.current = null;
    }
    sliderThrottlePendingRef.current = null;
  }, []);

  // ── Auto-save: crash recovery check on mount ─────────────────────────────
  useEffect(() => {
    const raw = window.localStorage.getItem(PARAMETRIC_AUTO_SAVE_STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Record<string, unknown>;
      if (saved?._autoSavedAt) setAutoSaveRecovery(saved);
    } catch { /* ignore */ }
  }, []);

  // ── Auto-save: interval ───────────────────────────────────────────────────
  useEffect(() => {
    if (!autoSaveEnabled) return;
    const ms = autoSaveIntervalMin * 60 * 1000;
    const id = setInterval(() => {
      const storageKeys = [
        PARAMETRIC_TEMPLATE_STORAGE_KEY,
        PARAMETRIC_LIBRARY_STORAGE_KEY,
        PARAMETRIC_THEME_STORAGE_KEY,
        PARAMETRIC_PROGRESS_SNAPSHOT_STORAGE_KEY,
      ];
      const dump: Record<string, unknown> = { _autoSavedAt: new Date().toISOString(), _version: 1 };
      for (const key of storageKeys) {
        const r = window.localStorage.getItem(key);
        if (r) { try { dump[key] = JSON.parse(r); } catch { dump[key] = r; } }
      }
      window.localStorage.setItem(PARAMETRIC_AUTO_SAVE_STORAGE_KEY, JSON.stringify(dump));
      setLastAutoSaveAt(new Date());
    }, ms);
    return () => clearInterval(id);
  }, [autoSaveEnabled, autoSaveIntervalMin]);

  // ── Auto-save: persist settings ───────────────────────────────────────────
  useEffect(() => {
    window.localStorage.setItem(PARAMETRIC_AUTO_SAVE_SETTINGS_KEY, JSON.stringify({ enabled: autoSaveEnabled, intervalMin: autoSaveIntervalMin }));
  }, [autoSaveEnabled, autoSaveIntervalMin]);

  const getTemplateFingerprint = useCallback((template: TemplateModel | null): string => {
    if (!template) return 'null';
    return JSON.stringify(template);
  }, []);

  const clearCommandHistory = useCallback(() => {
    historyPastRef.current = [];
    historyFutureRef.current = [];
    isDragHistoryBatchRef.current = false;
    dragBatchBeforeRef.current = null;
    dragBatchLabelRef.current = 'Canvas drag';
    setHistoryTick((value) => value + 1);
  }, []);

  const restoreCommandHistoryForTemplate = useCallback((template: TemplateModel | null) => {
    try {
      const raw = window.sessionStorage.getItem(PARAMETRIC_HISTORY_STORAGE_KEY);
      if (!raw) {
        clearCommandHistory();
        return;
      }

      const parsed = JSON.parse(raw) as {
        fingerprint?: string;
        past?: Array<TemplateCommand>;
        future?: Array<TemplateCommand>;
      };

      if (!parsed || typeof parsed !== 'object') {
        clearCommandHistory();
        return;
      }

      if (typeof parsed.fingerprint !== 'string' || parsed.fingerprint !== getTemplateFingerprint(template)) {
        clearCommandHistory();
        return;
      }

      const past = Array.isArray(parsed.past) ? parsed.past.filter((item) => item && typeof item === 'object') : [];
      const future = Array.isArray(parsed.future) ? parsed.future.filter((item) => item && typeof item === 'object') : [];

      historyPastRef.current = past;
      historyFutureRef.current = future;
      isDragHistoryBatchRef.current = false;
      dragBatchBeforeRef.current = null;
      dragBatchLabelRef.current = 'Canvas drag';
      setHistoryTick((value) => value + 1);
    } catch {
      clearCommandHistory();
    }
  }, [clearCommandHistory, getTemplateFingerprint]);

  const canUndo = historyTick >= 0 && historyPastRef.current.length > 0;
  const canRedo = historyTick >= 0 && historyFutureRef.current.length > 0;

  const selectedIndex = useMemo(() => {
    if (!workingTemplate || !selectedElementId) return -1;
    return workingTemplate.elements.findIndex((item) => item.id === selectedElementId);
  }, [workingTemplate, selectedElementId]);

  const selectedElement = selectedIndex >= 0 && workingTemplate ? workingTemplate.elements[selectedIndex] : null;
  const selectedRenderSourceMode = selectedElement?.renderState?.sourceMode === 'snapshot' ? 'snapshot' : 'live';
  const selectedSnapshotStatus: ParametricSnapshotStatus = selectedElement
    ? resolveElementSnapshotStatus(selectedElement as Record<string, unknown>) as ParametricSnapshotStatus
    : 'missing';
  const selectedHasSnapshot = !!(
    selectedElement
    && selectedElement.renderState
    && typeof selectedElement.renderState === 'object'
    && selectedElement.renderState.snapshot
    && typeof selectedElement.renderState.snapshot === 'object'
    && typeof selectedElement.renderState.snapshot.imageDataUrl === 'string'
    && selectedElement.renderState.snapshot.imageDataUrl.trim().length > 0
  );
  const canCreateSnapshot = !isSnapshotActionRunning && !!selectedElement?.id;
  const canBakeSnapshotToLayer = !isSnapshotActionRunning && !!selectedElement?.id;
  const canUseSnapshot = !isSnapshotActionRunning && selectedHasSnapshot && selectedRenderSourceMode !== 'snapshot';
  const canUseLiveRender = !isSnapshotActionRunning && !!selectedElement?.id && selectedRenderSourceMode !== 'live';
  const canDeleteSnapshot = !isSnapshotActionRunning && selectedHasSnapshot;
  const snapshotActionHint = isSnapshotActionRunning
    ? 'Snapshot action running. Wait until it finishes.'
    : !selectedElement?.id
      ? 'Select a valid element to use snapshot actions.'
      : !selectedHasSnapshot
        ? 'Create Snapshot first, then Use Snapshot or Delete Snapshot. You can also bake directly to a new layer.'
        : selectedRenderSourceMode === 'snapshot'
          ? 'Snapshot mode active. Switch to live render if needed.'
          : 'Snapshot ready. You can switch source mode or delete snapshot.';

  const getPreviousElementName = () => {
    if (!workingTemplate || selectedIndex <= 0) return '';
    const prev = workingTemplate.elements[selectedIndex - 1];
    const name = typeof prev?.name === 'string' ? prev.name.trim() : '';
    return name;
  };

  const getDefaultClipTargetName = () => {
    const selfName = typeof selectedElement?.name === 'string' ? selectedElement.name.trim() : '';
    if (selfName.length > 0) return selfName;
    return getPreviousElementName();
  };

  const groupedLibrary = useMemo<Array<GroupedLibrarySection>>(() => {
    const byCategory = new Map<string, Array<LibraryEntry>>();
    for (const entry of library) {
      const key = entry.category || 'General';
      const current = byCategory.get(key) ?? [];
      current.push(entry);
      byCategory.set(key, current);
    }

    const categories = new Set<string>(DEFAULT_DRAWER_CATEGORY_ORDER);
    for (const key of DEFAULT_DRAWER_TEMPLATES_BY_CATEGORY.keys()) {
      categories.add(key);
    }
    for (const key of byCategory.keys()) {
      categories.add(key);
    }

    return Array.from(categories).map((category) => {
      const entries = byCategory.get(category) ?? [];
      return {
        category,
        entries,
        fallbackElement: entries[0]?.element ?? DEFAULT_DRAWER_TEMPLATES_BY_CATEGORY.get(category),
      };
    });
  }, [library]);

  const visibleThemes = useMemo<Array<ThemeEntry>>(
    () => themes.filter((theme) => !isProgressSnapshotTheme(theme)),
    [themes],
  );

  const setAllDrawerSectionsCollapsed = (collapsed: boolean) => {
    setDrawerCollapsedByCategory(
      Object.fromEntries(groupedLibrary.map(({ category }) => [category, collapsed])) as Record<string, boolean>,
    );
  };

  const setAllEffectPanelsCollapsed = (collapsed: boolean) => {
    setEffectPanelCollapsed(
      Object.fromEntries(EFFECT_PANEL_KEYS.map((key) => [key, collapsed])) as Record<string, boolean>,
    );
  };

  const isEffectPanelCollapsed = (key: EffectPanelKey) => effectPanelCollapsed[key] === true;

  const saveTemplate = (template: TemplateModel) => {
    try {
      window.localStorage.setItem(PARAMETRIC_TEMPLATE_STORAGE_KEY, JSON.stringify(template));
    } catch {
      // Ignore localStorage failures.
    }
  };

  const saveLibraryLocal = (items: Array<LibraryEntry>): boolean => {
    try {
      window.localStorage.setItem(PARAMETRIC_LIBRARY_STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch {
      // Ignore localStorage failures.
      return false;
    }
  };

  const saveThemesLocal = (items: Array<ThemeEntry>): boolean => {
    try {
      window.localStorage.setItem(PARAMETRIC_THEME_STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch {
      return false;
    }
  };

  // ── Local disk export / import (no Firebase, no size limit) ──────────────
  const exportAllDataToFile = () => {
    // Flush all in-memory state to localStorage first — covers cases where prior saves
    // failed silently (e.g. QuotaExceededError) so export always reflects RIGHT NOW.
    if (workingTemplate) saveTemplate(workingTemplate);
    saveThemesLocal(themes);
    saveLibraryLocal(library);
    // History lives in sessionStorage (not localStorage) — excluded intentionally.
    const storageKeys = [
      PARAMETRIC_TEMPLATE_STORAGE_KEY,
      PARAMETRIC_LIBRARY_STORAGE_KEY,
      PARAMETRIC_THEME_STORAGE_KEY,
      PARAMETRIC_PROGRESS_SNAPSHOT_STORAGE_KEY,
    ];
    const dump: Record<string, unknown> = { _exportedAt: new Date().toISOString(), _version: 1 };
    for (const key of storageKeys) {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        try { dump[key] = JSON.parse(raw); } catch { dump[key] = raw; }
      }
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parametric-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDrawerNotice('All data exported — this is a snapshot of RIGHT NOW. Re-export after more changes.');
  };

  const importAllDataFromFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const dump = JSON.parse(ev.target?.result as string) as Record<string, unknown>;
          const storageKeys = [
            PARAMETRIC_TEMPLATE_STORAGE_KEY,
            PARAMETRIC_LIBRARY_STORAGE_KEY,
            PARAMETRIC_THEME_STORAGE_KEY,
            PARAMETRIC_PROGRESS_SNAPSHOT_STORAGE_KEY,
          ];
          for (const key of storageKeys) {
            if (key in dump) {
              window.localStorage.setItem(key, JSON.stringify(dump[key]));
            }
          }
          // Also clear session history so undo stack matches the restored state
          window.sessionStorage.removeItem(PARAMETRIC_HISTORY_STORAGE_KEY);
          // Reload page so the app picks up all restored data fresh
          window.location.reload();
        } catch {
          setDrawerNotice('Import failed: invalid file format.');
        }
      };
      reader.readAsText(file);
    };
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };

  const restoreFromAutoSave = (dump: Record<string, unknown>) => {
    const storageKeys = [
      PARAMETRIC_TEMPLATE_STORAGE_KEY,
      PARAMETRIC_LIBRARY_STORAGE_KEY,
      PARAMETRIC_THEME_STORAGE_KEY,
      PARAMETRIC_PROGRESS_SNAPSHOT_STORAGE_KEY,
    ];
    for (const key of storageKeys) {
      if (key in dump) window.localStorage.setItem(key, JSON.stringify(dump[key]));
    }
    window.sessionStorage.removeItem(PARAMETRIC_HISTORY_STORAGE_KEY);
    window.location.reload();
  };

  const downloadAutoSaveAsFile = () => {
    // Always flush current state first so download reflects RIGHT NOW, not last interval tick.
    const storageKeys = [
      PARAMETRIC_TEMPLATE_STORAGE_KEY,
      PARAMETRIC_LIBRARY_STORAGE_KEY,
      PARAMETRIC_THEME_STORAGE_KEY,
      PARAMETRIC_PROGRESS_SNAPSHOT_STORAGE_KEY,
    ];
    if (workingTemplate) saveTemplate(workingTemplate);
    const dump: Record<string, unknown> = { _autoSavedAt: new Date().toISOString(), _version: 1 };
    for (const key of storageKeys) {
      const r = window.localStorage.getItem(key);
      if (r) { try { dump[key] = JSON.parse(r); } catch { dump[key] = r; } }
    }
    const serialized = JSON.stringify(dump, null, 2);
    window.localStorage.setItem(PARAMETRIC_AUTO_SAVE_STORAGE_KEY, serialized);
    setLastAutoSaveAt(new Date());
    const blob = new Blob([serialized], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parametric-autosave-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  // ─────────────────────────────────────────────────────────────────────────

  const saveProgressSnapshotLocal = (entry: ProgressSnapshotEntry | null): boolean => {
    try {
      if (!entry) {
        window.localStorage.removeItem(PARAMETRIC_PROGRESS_SNAPSHOT_STORAGE_KEY);
        return true;
      }
      window.localStorage.setItem(PARAMETRIC_PROGRESS_SNAPSHOT_STORAGE_KEY, JSON.stringify(entry));
      return true;
    } catch {
      // Ignore localStorage failures.
      return false;
    }
  };

  const saveLibraryToFirebaseOnAction = useCallback(async (items: Array<LibraryEntry>) => {
    if (!authConfigured || !getCurrentAuthUser()) return;
    const payload = items.map((entry) => JSON.parse(JSON.stringify(entry)) as Record<string, unknown>);
    await saveParametricLibraryToFirebase({ entries: payload });
  }, [authConfigured]);

  const saveThemesToFirebaseOnAction = useCallback(async (items: Array<ThemeEntry>) => {
    if (!authConfigured || !getCurrentAuthUser()) return;
    const payload = items.map((entry) => JSON.parse(JSON.stringify(entry)) as Record<string, unknown>);
    await saveParametricThemesToFirebase({ entries: payload });
  }, [authConfigured]);

  const loadStoredTemplate = (): TemplateModel | null => {
    try {
      const raw = window.localStorage.getItem(PARAMETRIC_TEMPLATE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as TemplateModel;
      if (!parsed || !Array.isArray(parsed.elements)) return null;
      return {
        ...parsed,
        elements: parsed.elements.map((element, index) => ensureElement(element, index)),
      };
    } catch {
      return null;
    }
  };

  const loadStoredLibrary = (): Array<LibraryEntry> | null => {
    try {
      const raw = window.localStorage.getItem(PARAMETRIC_LIBRARY_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Array<LibraryEntry>;
      if (!Array.isArray(parsed)) return null;
      return normalizeLibraryEntries(parsed as Array<unknown>);
    } catch {
      return null;
    }
  };

  const loadStoredThemes = (): Array<ThemeEntry> | null => {
    try {
      const raw = window.localStorage.getItem(PARAMETRIC_THEME_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Array<unknown>;
      if (!Array.isArray(parsed)) return null;
      return normalizeThemeEntries(parsed);
    } catch {
      return null;
    }
  };

  const loadProgressSnapshotLocal = (): ProgressSnapshotEntry | null => {
    try {
      const raw = window.localStorage.getItem(PARAMETRIC_PROGRESS_SNAPSHOT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { updatedAt?: unknown; template?: unknown };
      if (!parsed || typeof parsed !== 'object' || !parsed.template || typeof parsed.template !== 'object') {
        return null;
      }
      const template = parsed.template as TemplateModel;
      const elements = Array.isArray(template.elements)
        ? template.elements.map((element, index) => ensureElement(element, index))
        : [];
      const updatedAt = Number(parsed.updatedAt);
      return {
        updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
        template: {
          ...template,
          elements,
        },
      };
    } catch {
      return null;
    }
  };

  const syncLibraryFromFirebase = useCallback(async () => {
    if (!authConfigured || !getCurrentAuthUser()) return;

    try {
      const remoteRaw = await fetchParametricLibraryFromFirebase();
      const remote = normalizeLibraryEntries(remoteRaw as Array<unknown>);
      const local = loadStoredLibrary() ?? [];
      const merged = mergeLibraryEntries(local, remote);

      if (merged.length > 0) {
        setLibrary(merged);
        try {
          window.localStorage.setItem(PARAMETRIC_LIBRARY_STORAGE_KEY, JSON.stringify(merged));
        } catch {
          // Ignore localStorage failures.
        }

        // Self-heal cloud state if local had unsynced entries.
        if (merged.length > remote.length) {
          void saveLibraryToFirebaseOnAction(merged).catch(() => {
            // Non-fatal; merged local cache is already retained.
          });
        }

        setDrawerNotice('Library synced from Firebase.');
        return;
      }

    } catch {
      setDrawerNotice('Firebase sync unavailable. Using local drawer library.');
    }
  }, [authConfigured, saveLibraryToFirebaseOnAction]);

  const syncThemesFromFirebase = useCallback(async () => {
    if (!authConfigured || !getCurrentAuthUser()) return;

    try {
      const remoteRaw = await fetchParametricThemesFromFirebase();
      const remote = normalizeThemeEntries(remoteRaw as Array<unknown>);
      const local = loadStoredThemes() ?? [];
      const merged = mergeThemeEntries(local, remote);

      if (merged.length > 0) {
        setThemes(merged);
        try {
          window.localStorage.setItem(PARAMETRIC_THEME_STORAGE_KEY, JSON.stringify(merged));
        } catch {
          // Ignore localStorage failures.
        }

        // Self-heal cloud state if local had unsynced theme entries.
        if (merged.length > remote.length) {
          void saveThemesToFirebaseOnAction(merged).catch(() => {
            // Non-fatal; merged local cache is already retained.
          });
        }

        setDrawerNotice('Themes synced from Firebase.');
      }
    } catch {
      // Silent: keep local themes if Firebase unavailable.
    }
  }, [authConfigured, saveThemesToFirebaseOnAction]);

  const persistLibraryFromAction = (updater: (prev: Array<LibraryEntry>) => Array<LibraryEntry>, successNotice: string, deletedId?: string) => {
    const next = updater(library).map((entry) => sanitizeLibraryEntryForPersistence(entry));
    setLibrary(next);
    const localSaved = saveLibraryLocal(next);

    // ── Disk: write changed files / delete removed file ──
    if (localFolderHandle) {
      if (deletedId) {
        void deleteLibraryFile(localFolderHandle, deletedId).catch(() => {});
      } else {
        const prevIds = new Set(library.map(e => e.id));
        for (const entry of next) {
          const prevEntry = library.find(e => e.id === entry.id);
          if (!prevIds.has(entry.id) || JSON.stringify(prevEntry) !== JSON.stringify(entry)) {
            void saveLibraryFile(localFolderHandle, entry as { id: string; name: string; [key: string]: unknown }).catch(() => {});
          }
        }
      }
    }

    const pushToFirebase = (items: Array<LibraryEntry>) => {
      return saveLibraryToFirebaseOnAction(items)
        .then(() => {
          if (authConfigured && getCurrentAuthUser()) {
            setDrawerNotice(`${successNotice} Saved to Firebase.`);
          } else {
            setDrawerNotice(localSaved ? `${successNotice} Saved locally.` : `${successNotice} Local save failed (storage full).`);
          }
        })
        .catch((error) => {
          const reason = error instanceof Error && error.message ? error.message : 'Firebase unavailable';
          setDrawerNotice(localSaved
            ? `${successNotice} Saved locally. Firebase sync failed: ${reason}`
            : `${successNotice} Save failed: local storage full and Firebase sync failed: ${reason}`);
        });
    };

    if (authConfigured && getCurrentAuthUser()) {
      void pushToFirebase(next);
    } else {
      setDrawerNotice(localSaved
        ? `${successNotice} Saved locally. Will sync to Firebase when authenticated.`
        : `${successNotice} Local save failed. Will retry Firebase when authenticated.`);
      pendingLibraryFirebaseSyncRef.current = next;
      const unsub = subscribeAuthState((user) => {
        if (user && pendingLibraryFirebaseSyncRef.current) {
          const pending = pendingLibraryFirebaseSyncRef.current;
          pendingLibraryFirebaseSyncRef.current = null;
          unsub();
          void saveLibraryToFirebaseOnAction(pending)
            .then(() => setDrawerNotice('Library synced to Firebase.'))
            .catch((err) => {
              const reason = err instanceof Error && err.message ? err.message : 'Firebase unavailable';
              setDrawerNotice(`Library Firebase sync failed: ${reason}`);
            });
        }
      });
    }
  };

  const deleteLibraryEntry = (entryId: string) => {
    persistLibraryFromAction(
      (prev) => prev.filter((entry) => entry.id !== entryId),
      'Library entry deleted.',
      entryId,
    );
  };

  const renameLibraryEntry = (entryId: string) => {
    const draft = (libraryNameDrafts[entryId] ?? '').trim();
    if (!draft) {
      setDrawerNotice('Rename failed: name cannot be empty.');
      return;
    }

    persistLibraryFromAction(
      (prev) => prev.map((entry) => (entry.id === entryId ? { ...entry, name: draft } : entry)),
      'Library entry renamed.',
    );
  };

  const persistThemes = (updater: (prev: Array<ThemeEntry>) => Array<ThemeEntry>, successNotice: string, deletedId?: string) => {
    // Compute next state outside updater so side effects are deterministic.
    const next = updater(themes);
    setThemes(next);
    const localSaved = saveThemesLocal(next);
    if (!localSaved) {
      setDrawerNotice(`${successNotice} ⚠ Local save failed — storage may be full. Use Export All to back up.`);
    } else {
      setDrawerNotice(successNotice);
    }
    void saveThemesToFirebaseOnAction(next).catch(() => {
      // Firebase push errors are non-fatal; local cache already saved.
    });
    // ── Disk: write changed files / delete removed file ──
    if (localFolderHandle) {
      if (deletedId) {
        void deleteThemeFile(localFolderHandle, deletedId).catch(() => {});
      } else {
        // Find the new / changed entry by comparing next vs prev.
        const prevIds = new Set(themes.map(t => t.id));
        for (const t of next) {
          const prevEntry = themes.find(e => e.id === t.id);
          if (!prevIds.has(t.id) || prevEntry?.updatedAt !== t.updatedAt || JSON.stringify(prevEntry) !== JSON.stringify(t)) {
            void saveThemeFile(localFolderHandle, t as { id: string; name: string; [key: string]: unknown }).catch(() => {});
          }
        }
      }
    }
  };

  const saveCurrentAsTheme = () => {
    if (!workingTemplate || !Array.isArray(workingTemplate.elements) || workingTemplate.elements.length === 0) {
      setDrawerNotice('Save theme failed: no layers in current template.');
      return;
    }

    const name = themeNameDraft.trim().length > 0 ? themeNameDraft.trim() : `Theme-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;
    const nextTheme: ThemeEntry = {
      id: makeId('theme'),
      name,
      template: deepClone(workingTemplate),
    };

    persistThemes((prev) => [...prev, nextTheme], 'Theme saved locally.');
  };

  const saveCurrentProgressSnapshot = () => {
    if (!workingTemplate) {
      setDrawerNotice('Save progress failed: nothing on canvas yet.');
      return;
    }

    const now = new Date();
    const savedAt = `${now.toLocaleTimeString('en-US', { hour12: false })}.${String(now.getMilliseconds()).padStart(3, '0')}`;

    const snapshotEntry: ProgressSnapshotEntry = {
      updatedAt: Date.now(),
      template: deepClone(workingTemplate),
    };
    setProgressSnapshot(snapshotEntry);
    const localSaved = saveProgressSnapshotLocal(snapshotEntry);

    if (authConfigured && getCurrentAuthUser()) {
      setDrawerNotice('Saving progress...');
      const firebaseSnapshot: ProgressSnapshotEntry = {
        updatedAt: snapshotEntry.updatedAt,
        template: {
          ...snapshotEntry.template,
          elements: snapshotEntry.template.elements.map(stripElementForProgressFirebase),
        },
      };
      void saveParametricProgressToFirebase({ snapshot: firebaseSnapshot })
        .then(() => {
          setDrawerNotice(`Progress saved at ${savedAt}. Synced to Firebase.`);
        })
        .catch((err) => {
          const reason = err instanceof Error && err.message ? err.message : 'Firebase unavailable';
          setDrawerNotice(localSaved
            ? `Progress saved locally at ${savedAt}. Firebase sync failed: ${reason}`
            : `Progress save failed at ${savedAt}: local storage full and Firebase sync failed: ${reason}`);
        });
    } else {
      setDrawerNotice(localSaved
        ? `Progress saved locally at ${savedAt}.`
        : `Progress save failed at ${savedAt} (storage full).`);
    }
  };

  const loadProgressSnapshot = () => {
    setDrawerNotice('Loading progress...');

    const applySnapshot = (snap: ProgressSnapshotEntry) => {
      const template = {
        ...deepClone(snap.template),
        elements: (snap.template.elements ?? []).map((element, index) => ensureElement(element, index)),
      } as TemplateModel;
      setWorkingTemplate(template);
      clearCommandHistory();
      saveTemplate(template);
      setSelectedElementId(template.elements[0]?.id ?? null);
      setSelectedPanelTarget(template.elements.length > 0 ? 'element' : 'layout');
      void renderPreview(template);
    };

    const fallback = () => {
      if (!progressSnapshot) {
        setDrawerNotice('No saved progress found.');
        return;
      }
      applySnapshot(progressSnapshot);
      setDrawerNotice('Progress loaded from local cache.');
    };

    if (authConfigured && getCurrentAuthUser()) {
      void fetchParametricProgressFromFirebase()
        .then((remote) => {
          if (remote && Number.isFinite(remote.updatedAt)) {
            const remoteSnap: ProgressSnapshotEntry = {
              updatedAt: remote.updatedAt,
              template: remote.template as unknown as TemplateModel,
            };
            if (!progressSnapshot || remote.updatedAt >= progressSnapshot.updatedAt) {
              setProgressSnapshot(remoteSnap);
              saveProgressSnapshotLocal(remoteSnap);
              applySnapshot(remoteSnap);
              setDrawerNotice('Progress loaded from Firebase.');
            } else {
              applySnapshot(progressSnapshot);
              setDrawerNotice('Progress loaded (local is newer than cloud).');
              void saveParametricProgressToFirebase({ snapshot: progressSnapshot }).catch(() => { /* non-fatal */ });
            }
          } else {
            fallback();
          }
        })
        .catch(() => fallback());
    } else {
      fallback();
    }
  };

  const applyThemeById = (themeId: string) => {
    const theme = themes.find((entry) => entry.id === themeId);
    if (!theme) {
      setDrawerNotice('Theme not found.');
      return;
    }

    const template = {
      ...deepClone(theme.template),
      elements: (theme.template.elements ?? []).map((element, index) => ensureElement(element, index)),
    } as TemplateModel;

    setWorkingTemplate(template);
    clearCommandHistory();
    saveTemplate(template);
    setSelectedElementId(template.elements[0]?.id ?? null);
    setSelectedPanelTarget(template.elements.length > 0 ? 'element' : 'layout');
    setThemeNameDraft(theme.name);
    setDrawerNotice(`Theme loaded: ${theme.name}`);
    void renderPreview(template);
  };

  const deleteThemeById = (themeId: string) => {
    persistThemes((prev) => prev.filter((entry) => entry.id !== themeId), 'Theme deleted.', themeId);
  };

  const renameThemeById = (themeId: string) => {
    const draft = (themeNameDrafts[themeId] ?? '').trim();
    if (!draft) {
      setDrawerNotice('Theme rename failed: name cannot be empty.');
      return;
    }

    persistThemes(
      (prev) => prev.map((entry) => (entry.id === themeId ? { ...entry, name: draft } : entry)),
      'Theme renamed.',
    );
  };

  const importTemplateElementsToLibrary = (template: TemplateModel) => {
    const items = (template.elements ?? []).map((element, index) => {
      const normalized = ensureElement(deepClone(element), index);
      return {
        id: makeId('lib'),
        name: typeof normalized.name === 'string' && normalized.name.trim().length > 0 ? normalized.name : `Saved-${index + 1}`,
        category: inferCategory(normalized),
        element: normalized,
      } as LibraryEntry;
    });

    if (items.length === 0) return;

    persistLibraryFromAction(
      (prev) => [...prev, ...items],
      `Imported ${items.length} element(s) from template JSON to drawer library.`,
    );
  };

  const parseDraftElement = (): TemplateElement | null => {
    if (!draftJson.trim()) {
      setDraftError('JSON field is empty. Paste an element JSON first.');
      return null;
    }
    try {
      const parsed = JSON.parse(draftJson) as TemplateElement;
      if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') {
        throw new Error('Element JSON must be an object with string field: type');
      }
      setDraftError(null);
      return ensureElement(parsed);
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : 'Invalid JSON.');
      return null;
    }
  };

  const parseDraftTemplate = (): TemplateModel | null => {
    if (!draftJson.trim()) return null;
    try {
      const rawParsed = JSON.parse(draftJson) as Record<string, unknown>;
      if (!rawParsed || typeof rawParsed !== 'object') return null;

      const wrappedTemplateCandidate =
        rawParsed.template && typeof rawParsed.template === 'object'
          ? (rawParsed.template as Record<string, unknown>)
          : rawParsed.composition && typeof rawParsed.composition === 'object'
            ? (rawParsed.composition as Record<string, unknown>)
            : null;

      const parsed = wrappedTemplateCandidate ?? rawParsed;

      const hasTemplateWrapperField =
        Object.prototype.hasOwnProperty.call(parsed, 'activeStyle') ||
        Object.prototype.hasOwnProperty.call(parsed, 'layout') ||
        Object.prototype.hasOwnProperty.call(parsed, 'scale') ||
        Object.prototype.hasOwnProperty.call(parsed, 'elements');
      const rawLayoutOnly = isLikelyRawLayoutObject(parsed);
      if (!hasTemplateWrapperField && !rawLayoutOnly) return null;

      const baseTemplate = workingTemplate ?? deepClone(DEFAULT_EMPTY_TEMPLATE);

      const layout = rawLayoutOnly
        ? parsed
        : parsed.layout && typeof parsed.layout === 'object'
          ? (parsed.layout as Record<string, unknown>)
          : (baseTemplate.layout as Record<string, unknown>);

      const scale = parsed.scale && typeof parsed.scale === 'object'
        ? (parsed.scale as Record<string, unknown>)
        : (baseTemplate.scale as Record<string, unknown>);

      const nextElements = Array.isArray(parsed.elements)
        ? parsed.elements
            .filter((entry) => entry && typeof entry === 'object')
            .map((entry, index) => ensureElement(entry as TemplateElement, index))
        : baseTemplate.elements;

      const normalized: TemplateModel = {
        activeStyle: baseTemplate.activeStyle,
        layout,
        scale,
        elements: nextElements,
      };

      return normalized;
    } catch {
      return null;
    }
  };

  const renderPreview = useCallback(async (templateOverride?: TemplateModel) => {
    setIsRendering(true);
    setError(null);
    setPixelWarningOverlayDataUrl(null);
    setPixelEnforcedDataUrl(null);
    try {
      // @ts-expect-error runtime import has no TS metadata in this path.
      const engineModule = (await import('../engine/index.js')) as {
        getTemplateSnapshot: () => TemplateModel;
        clearColorCaches?: () => void;
        runEngine: (args?: {
          activeStyle?: StyleKey;
          paramOverrides?: Record<string, Record<string, number>>;
          templateInput?: TemplateModel;
          colorControl?: typeof DEFAULT_COLOR_CONTROL;
          renderQualityMode?: 'preview' | 'final';
        }) => string;
      };

      const colorWarnings: string[] = [];
      const warningHandler = (event: Event) => {
        const custom = event as CustomEvent<string[]>;
        const payload = Array.isArray(custom.detail) ? custom.detail : [];
        for (const line of payload) {
          if (typeof line === 'string' && line.trim().length > 0) {
            colorWarnings.push(line);
          }
        }
      };

      window.addEventListener('engine-color-warning', warningHandler as EventListener);
      engineModule.clearColorCaches?.();

      try {

      const template = templateOverride ?? workingTemplate ?? loadStoredTemplate() ?? deepClone(DEFAULT_EMPTY_TEMPLATE);
      const visibleElements = (template.elements ?? []).filter((element) => element.visible !== false);
      const selectedVisibleElement = selectedElementId
        ? visibleElements.find((element) => element.id === selectedElementId)
        : null;

      const sanitizeElements = (elements: TemplateElement[]) =>
        elements.map((element) => {
          const clone = deepClone(element);
          clone.effect3d = normalizeDepthEffectRecord(clone.effect3d as Record<string, unknown> | undefined);
          if (clone.dropShadow && typeof clone.dropShadow === 'object') {
            const source = clone.dropShadow as Record<string, unknown>;
            clone.dropShadow = normalizeDropShadowForBake({
              color: typeof source.color === 'string' ? source.color : '#000000',
              opacity: Number.isFinite(Number(source.opacity)) ? Number(source.opacity) : 0.12,
              blur: Number.isFinite(Number(source.blur)) ? Number(source.blur) : 1.2,
              spread: Number.isFinite(Number(source.spread)) ? Number(source.spread) : 0,
              offsetX: Number.isFinite(Number(source.offsetX)) ? Number(source.offsetX) : 1,
              offsetY: Number.isFinite(Number(source.offsetY)) ? Number(source.offsetY) : 1,
            }) as unknown as TemplateElement['dropShadow'];
          }
          delete clone.id;
          delete clone.visible;
          return clone;
        });

      const previewColorMode: ColorMode = colorMode === 'enforce' ? 'off' : colorMode;
      const renderQualityMode = getRenderQualityMode();

      const renderWithElements = (elements: TemplateElement[]) =>
        engineModule.runEngine({
          activeStyle: FIXED_RENDER_STYLE,
          templateInput: {
            ...template,
            effects3d: normalizeDepthEffectRecord(template.effects3d as Record<string, unknown> | undefined),
            elements: sanitizeElements(elements),
          },
          colorControl: {
            ...DEFAULT_COLOR_CONTROL,
            colorControl: {
              ...DEFAULT_COLOR_CONTROL.colorControl,
              mode: previewColorMode,
            },
          },
          renderQualityMode,
        });

      previewRenderSerialRef.current += 1;
      const renderSerial = previewRenderSerialRef.current;
      const namespaceForPass = (pass: string) => `pv-${renderSerial}-${pass}`;

      const liveElementIds = new Set(
        (template.elements ?? [])
          .map((entry) => (typeof entry?.id === 'string' ? entry.id.trim() : ''))
          .filter((id) => id.length > 0),
      );
      for (const cachedId of getCachedRenderElementIds()) {
        if (!liveElementIds.has(cachedId)) {
          removeCachedRender(cachedId);
        }
      }

      const pendingDirtyIds = getDirtyElementIds();
      const dirtyReasonById = new Map<string, string>();
      for (const dirtyId of pendingDirtyIds) {
        const reason = getElementDirtyReason(dirtyId);
        dirtyReasonById.set(dirtyId, typeof reason === 'string' ? reason : 'unknown');
      }
      const consumedDirtyIds = consumeDirtyElementIds();
      const dirtyIds = new Set(consumedDirtyIds);
      if (dirtyIds.size > 0) {
        console.debug('[RenderInvalidation]', `DIRTY_COUNT=${dirtyIds.size}`);
      }

      const renderSingleElementWithCache = (element: TemplateElement, index: number) => {
        const cacheKey = typeof element.id === 'string' && element.id.trim().length > 0
          ? element.id.trim()
          : `__visible_index_${index}`;
        const nextHash = generateCachedElementRenderHash(element as Record<string, unknown>);
        return resolveLayerRenderOutputWithInvalidation({
          cacheKey,
          nextHash,
          passSeed: namespaceForPass(`layer-${index}`),
          getCachedRender,
          setCachedRender,
          renderLayerSvg: () => renderWithElements([element]),
          namespaceSvgIds,
          dirtyElementIds: dirtyIds,
          dirtyReasonByElementId: dirtyReasonById,
        });
      };

      const pixelPassElements = isSoloMode && selectedVisibleElement
        ? [selectedVisibleElement]
        : visibleElements;
      const pixelPassSvg = namespaceSvgIds(renderWithElements(pixelPassElements), namespaceForPass('pixel-pass'));
      const pixelPassSize = resolveTemplatePixelSize(template);

      if (!isSoloMode) {
        const stackedLayers = visibleElements.map((element, index) => {
          return renderSingleElementWithCache(element, index);
        });

        setSvgMarkup(stackedLayers[0] ?? '');
        setSvgOverlayLayers(stackedLayers.slice(1));

        if (isDimMode && selectedVisibleElement) {
          const overlaySvg = namespaceSvgIds(renderWithElements([selectedVisibleElement]), namespaceForPass('dim'));
          setSvgOverlayMarkup(overlaySvg);
        } else {
          setSvgOverlayMarkup(null);
        }
        setSvgTopOverlayMarkup(null);
      } else {
        const baseElements = isSoloMode && selectedVisibleElement
          ? [selectedVisibleElement]
          : visibleElements;
        const baseSvg = namespaceSvgIds(renderWithElements(baseElements), namespaceForPass('base'));
        setSvgMarkup(baseSvg);
        setSvgOverlayLayers([]);

        if (!isSoloMode && selectedVisibleElement && isDimMode) {
          const overlaySvg = namespaceSvgIds(renderWithElements([selectedVisibleElement]), namespaceForPass('dim'));
          setSvgOverlayMarkup(overlaySvg);
        } else {
          setSvgOverlayMarkup(null);
        }
        setSvgTopOverlayMarkup(null);
      }

      if (colorMode === 'warning' || colorMode === 'enforce') {
        try {
          const pixelPass = await buildPixelColorPassAssets(pixelPassSvg, pixelPassSize, colorMode);
          setPixelWarningOverlayDataUrl(pixelPass.warningOverlayDataUrl);
          setPixelEnforcedDataUrl(pixelPass.enforcedDataUrl);

          if (colorMode === 'warning' && pixelPass.violationCount > 0) {
            setEditorNotice(`Color warning: ${pixelPass.violationCount} violating pixel(s) highlighted in orange.`);
          }
          if (colorMode === 'enforce' && pixelPass.violationCount > 0) {
            setEditorNotice(`Color enforce: ${pixelPass.violationCount} violating pixel(s) remapped to nearest allowed values.`);
          }
        } catch (pixelError) {
          const message = pixelError instanceof Error ? pixelError.message : 'Pixel color pass failed.';
          setEditorNotice(`Color pixel pass skipped: ${message}`);
        }
      }
      } finally {
        window.removeEventListener('engine-color-warning', warningHandler as EventListener);
      }

      if (colorMode === 'warning' && colorWarnings.length > 0) {
        const first = colorWarnings[0].replace(/^\[WARNING\]\s*/i, '');
        const more = colorWarnings.length > 1 ? ` (+${colorWarnings.length - 1} more)` : '';
        setEditorNotice(`Color warning: ${first}${more}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to render preview.');
      setSvgOverlayLayers([]);
      setSvgOverlayMarkup(null);
      setSvgTopOverlayMarkup(null);
      setPixelWarningOverlayDataUrl(null);
      setPixelEnforcedDataUrl(null);
    } finally {
      setIsRendering(false);
    }
  }, [colorMode, isDimMode, isSoloMode, selectedElementId, workingTemplate]);

  const applyTemplateCommand = useCallback((label: string, updater: (prev: TemplateModel) => TemplateModel) => {
    let nextTemplate: TemplateModel | null = null;
    let didChange = false;
    setWorkingTemplate((prev) => {
      if (!prev) return prev;
      const before = deepClone(prev);
      const next = updater(prev);
      const beforeSerialized = JSON.stringify(before);
      const afterSerialized = JSON.stringify(next);
      if (beforeSerialized === afterSerialized) {
        return prev;
      }
      didChange = true;
      nextTemplate = next;
      saveTemplate(next);

      if (!isHistoryApplyingRef.current && !isDragHistoryBatchRef.current) {
        const nextStacks = pushHistoryCommand(historyPastRef.current, {
          id: makeId('cmd'),
          label,
          before,
          after: deepClone(next),
          createdAt: Date.now(),
        });
        historyPastRef.current = nextStacks.past;
        historyFutureRef.current = nextStacks.future;
      }
      return next;
    });
    if (nextTemplate) {
      void renderPreview(nextTemplate);
    }
    if (didChange && !isDragHistoryBatchRef.current) {
      setHistoryTick((value) => value + 1);
    }
  }, [renderPreview]);

  const runUndoCommand = useCallback(() => {
    const result = undoHistory(historyPastRef.current, historyFutureRef.current);
    if (!result.template) return;
    historyPastRef.current = result.stacks.past;
    historyFutureRef.current = result.stacks.future;
    isHistoryApplyingRef.current = true;
    setWorkingTemplate(result.template);
    saveTemplate(result.template);
    void renderPreview(result.template);
    isHistoryApplyingRef.current = false;
    const label = typeof result.command?.label === 'string' && result.command.label.trim().length > 0
      ? result.command.label.trim()
      : 'last command';
    setEditorNotice(`Undid: ${label}`);
    setHistoryTick((value) => value + 1);
  }, [renderPreview]);

  const runRedoCommand = useCallback(() => {
    const result = redoHistory(historyPastRef.current, historyFutureRef.current);
    if (!result.template) return;
    historyPastRef.current = result.stacks.past;
    historyFutureRef.current = result.stacks.future;
    isHistoryApplyingRef.current = true;
    setWorkingTemplate(result.template);
    saveTemplate(result.template);
    void renderPreview(result.template);
    isHistoryApplyingRef.current = false;
    const label = typeof result.command?.label === 'string' && result.command.label.trim().length > 0
      ? result.command.label.trim()
      : 'last command';
    setEditorNotice(`Redid: ${label}`);
    setHistoryTick((value) => value + 1);
  }, [renderPreview]);

  useEffect(() => {
    const isAnyHandleDragActive = draggingGradientHandle !== null
      || draggingTextureHandle !== null
      || draggingOffsetHandle
      || draggingRadiusHandle;

    if (isAnyHandleDragActive) {
      if (!isDragHistoryBatchRef.current && workingTemplate) {
        isDragHistoryBatchRef.current = true;
        dragBatchBeforeRef.current = deepClone(workingTemplate);
        if (draggingGradientHandle) {
          dragBatchLabelRef.current = `Drag gradient ${draggingGradientHandle}`;
        } else if (draggingTextureHandle) {
          dragBatchLabelRef.current = `Drag texture ${draggingTextureHandle}`;
        } else if (draggingOffsetHandle) {
          dragBatchLabelRef.current = 'Drag element offset';
        } else if (draggingRadiusHandle) {
          dragBatchLabelRef.current = 'Drag element radius';
        } else {
          dragBatchLabelRef.current = 'Canvas drag';
        }
      }
      return;
    }

    if (!isDragHistoryBatchRef.current) return;

    const before = dragBatchBeforeRef.current;
    const after = workingTemplate;
    isDragHistoryBatchRef.current = false;
    dragBatchBeforeRef.current = null;

    if (!before || !after) return;
    if (JSON.stringify(before) === JSON.stringify(after)) return;

    const nextStacks = pushHistoryCommand(historyPastRef.current, {
      id: makeId('cmd'),
      label: dragBatchLabelRef.current,
      before,
      after: deepClone(after),
      createdAt: Date.now(),
    });
    historyPastRef.current = nextStacks.past;
    historyFutureRef.current = nextStacks.future;
    setHistoryTick((value) => value + 1);
  }, [draggingGradientHandle, draggingOffsetHandle, draggingRadiusHandle, draggingTextureHandle, workingTemplate]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      if (tag === 'textarea' || tag === 'select') return true;
      if (tag === 'input') {
        const input = target as HTMLInputElement;
        const type = (input.type || '').toLowerCase();
        // Keep native text-edit undo behavior for textual fields.
        return type === ''
          || type === 'text'
          || type === 'search'
          || type === 'url'
          || type === 'tel'
          || type === 'email'
          || type === 'password';
      }
      return target.isContentEditable;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if ((!event.ctrlKey && !event.metaKey) || event.altKey) return;
      if (isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          runRedoCommand();
          return;
        }
        runUndoCommand();
        return;
      }

      if (key === 'y') {
        event.preventDefault();
        runRedoCommand();
        return;
      }

      if (key === 'i') {
        const selectedMaskEnabled = !!(
          selectedElement
          && selectedElement.mask
          && typeof selectedElement.mask === 'object'
          && (selectedElement.mask as Record<string, unknown>).enabled === true
        );
        if (contextTab !== 'element' || !selectedMaskEnabled) return;
        event.preventDefault();
        setMaskBrushAction((prev) => (prev === 'hide' ? 'reveal' : 'hide'));
        return;
      }

      if (key === 's') {
        event.preventDefault();
        saveCurrentProgressSnapshot();
        return;
      }

      if (key === 'l') {
        event.preventDefault();
        loadProgressSnapshot();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [
    contextTab,
    loadProgressSnapshot,
    runRedoCommand,
    runUndoCommand,
    saveCurrentProgressSnapshot,
    selectedElement,
  ]);

  useEffect(() => {
    const root = contextInspectorRef.current;
    if (!root) return;

    const emitControlChange = (control: HTMLInputElement | HTMLSelectElement, nextValue: string) => {
      if (control instanceof HTMLSelectElement) {
        const selectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
        if (selectSetter) {
          selectSetter.call(control, nextValue);
        } else {
          control.value = nextValue;
        }
      } else {
        const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (inputSetter) {
          inputSetter.call(control, nextValue);
        } else {
          control.value = nextValue;
        }
      }
      control.dispatchEvent(new Event('input', { bubbles: true }));
      control.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const resolveNumericResetValue = (labelText: string): number => {
      const normalizedLabel = labelText.trim().toLowerCase();
      const isLightDirectionControl = normalizedLabel.includes('light angle')
        || normalizedLabel.includes('global light direction')
        || (normalizedLabel === 'angle' || normalizedLabel.startsWith('angle '));

      if (isLightDirectionControl) {
        return -90;
      }

      return 0;
    };

    const applyResetChips = () => {
      const labels = root.querySelectorAll('label');
      labels.forEach((label) => {
        const title = label.querySelector('span');
        if (!title) return;

        const control = label.querySelector('input[type="range"], select, input[type="number"]:not([data-manual-range="true"])') as HTMLInputElement | HTMLSelectElement | null;
        if (!control) return;

        if (
          control instanceof HTMLInputElement
          && control.type === 'range'
          && !title.querySelector('[data-manual-range="true"]')
        ) {
          const minRaw = control.getAttribute('min');
          const maxRaw = control.getAttribute('max');
          const min = Number(minRaw);
          const max = Number(maxRaw);
          const hasMin = Number.isFinite(min);
          const hasMax = Number.isFinite(max);

          // Allow exact manual values even when authored slider step is coarse.
          control.step = 'any';

          const manual = document.createElement('input');
          manual.type = 'number';
          manual.inputMode = 'decimal';
          manual.setAttribute('data-manual-range', 'true');
          manual.className = 'h-5 w-20 rounded border border-zinc-600 bg-zinc-900 px-1 text-[10px] leading-none text-zinc-200';
          manual.title = 'Type exact value';
          manual.step = 'any';
          if (hasMin && minRaw !== null) manual.min = minRaw;
          if (hasMax && maxRaw !== null) manual.max = maxRaw;
          manual.value = control.value;

          const syncFromRange = () => {
            manual.value = control.value;
          };

          const applyManualValue = (syncAfterApply = true) => {
            const raw = manual.value.trim();
            if (!raw) {
              syncFromRange();
              return;
            }
            const normalizedRaw = raw.replace(',', '.');
            const parsed = Number(normalizedRaw);
            if (!Number.isFinite(parsed)) {
              if (syncAfterApply) syncFromRange();
              return;
            }
            const clamped = Math.max(hasMin ? min : parsed, Math.min(hasMax ? max : parsed, parsed));
            emitControlChange(control, String(clamped));
            if (syncAfterApply) syncFromRange();
          };

          manual.addEventListener('input', () => applyManualValue(false));
          manual.addEventListener('change', () => applyManualValue(true));
          manual.addEventListener('blur', () => applyManualValue(true));
          manual.addEventListener('keydown', (event) => {
            event.stopPropagation();
            if (event.key === 'Enter') {
              event.preventDefault();
              applyManualValue();
            }
          });

          control.addEventListener('input', syncFromRange);
          control.addEventListener('change', syncFromRange);

          title.appendChild(manual);
        }

        if (title.querySelector('[data-reset-chip="true"]')) return;

        const chip = document.createElement('button');
        chip.type = 'button';
        chip.textContent = 'R';
        chip.setAttribute('data-reset-chip', 'true');
        chip.className = 'ml-1 inline-flex h-4 w-4 items-center justify-center rounded border border-zinc-600 bg-zinc-900 text-[10px] leading-none text-zinc-300 hover:bg-zinc-800';
        chip.title = 'Reset this control';
        chip.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          const labelText = title.textContent ?? '';

          if (control instanceof HTMLSelectElement) {
            if (control.options.length > 0) {
              emitControlChange(control, control.options[0].value);
            }
            return;
          }

          const nextValue = resolveNumericResetValue(labelText);
          const min = Number(control.min);
          const max = Number(control.max);
          const clamped = Number.isFinite(min) && Number.isFinite(max)
            ? Math.max(min, Math.min(max, nextValue))
            : nextValue;
          emitControlChange(control, String(clamped));
        });

        title.classList.add('inline-flex', 'items-center', 'gap-1');
        title.appendChild(chip);
      });
    };

    applyResetChips();
    const observer = new MutationObserver(() => applyResetChips());
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [contextTab, historyTick, isFocusMode, selectedElementId, selectedPanelTarget]);

  const updateTemplateElements = (updater: (elements: Array<TemplateElement>) => Array<TemplateElement>, label = 'Update elements') => {
    applyTemplateCommand(label, (prev) => ({
      ...prev,
      elements: updater(prev.elements).map((element) => (
        refreshElementSnapshotStatus(element as Record<string, unknown>) as TemplateElement
      )),
    }));
  };

  const updateTemplateLayout = (updater: (layout: Record<string, unknown>) => Record<string, unknown>, label = 'Update layout') => {
    applyTemplateCommand(label, (prev) => {
      const currentLayout = prev.layout && typeof prev.layout === 'object' ? prev.layout : {};
      return {
        ...prev,
        layout: updater({ ...currentLayout }),
      };
    });
  };

  const updateTemplateEffects3d = (updater: (effects: Record<string, unknown>) => Record<string, unknown>, label = 'Update global effects') => {
    applyTemplateCommand(label, (prev) => {
      const currentEffects = prev.effects3d && typeof prev.effects3d === 'object' ? prev.effects3d : {};
      const nextEffects = updater({ ...currentEffects });
      return {
        ...prev,
        effects3d: normalizeDepthEffectRecord(nextEffects),
      };
    });
  };

  const getTemplateEffectNumber = (key: string, fallback: number): number => {
    const effects = normalizeDepthEffectRecord(workingTemplate?.effects3d as Record<string, unknown> | undefined);
    const value = Number(effects[key]);
    return Number.isFinite(value) ? value : fallback;
  };

  const getTemplateEffectEnabled = (): boolean => {
    const effects = normalizeDepthEffectRecord(workingTemplate?.effects3d as Record<string, unknown> | undefined);
    return effects.enabled === true;
  };

  const getTemplateEffectPathNumber = (path: string, fallback: number): number => {
    const effects = normalizeDepthEffectRecord(workingTemplate?.effects3d as Record<string, unknown> | undefined);
    const segments = path.split('.');
    let cursor: unknown = effects;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    const value = Number(cursor);
    return Number.isFinite(value) ? value : fallback;
  };

  const getTemplateLightingMode = (): '2d' | '3d' => {
    const effects = normalizeDepthEffectRecord(workingTemplate?.effects3d as Record<string, unknown> | undefined);
    return effects.lightingMode === '3d' ? '3d' : '2d';
  };

  const syncBaseElementShapeToLayout = (shape: 'circle' | 'rectangle') => {
    applyTemplateCommand('Sync base shape to layout', (prev) => {
      const currentLayout = prev.layout && typeof prev.layout === 'object' ? prev.layout : {};
      const nextElements = (prev.elements ?? []).map((element) => {
        if (element.type !== 'base') return element;
        const nextParams = {
          ...(element.params && typeof element.params === 'object' ? (element.params as Record<string, unknown>) : {}),
          shape,
        };
        return { ...element, params: nextParams };
      });

      return {
        ...prev,
        layout: { ...currentLayout, shape },
        elements: nextElements,
      };
    });
  };

  const getLayoutShape = (): 'circle' | 'rectangle' => {
    const shape = workingTemplate?.layout && typeof workingTemplate.layout === 'object'
      ? (workingTemplate.layout as Record<string, unknown>).shape
      : 'circle';
    return shape === 'rectangle' ? 'rectangle' : 'circle';
  };

  const getLayoutNumber = (key: string, fallback: number): number => {
    const layout = workingTemplate?.layout;
    if (!layout || typeof layout !== 'object') return fallback;
    const value = Number((layout as Record<string, unknown>)[key]);
    return Number.isFinite(value) ? value : fallback;
  };

  const applyLayoutDraft = () => {
    if (!layoutDraft.trim()) {
      setLayoutDraftError('Layout JSON is empty.');
      return;
    }
    try {
      const parsed = JSON.parse(layoutDraft) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Layout JSON must be an object.');
      }
      setLayoutDraftError(null);

      const nextShapeRaw = parsed.shape;
      const nextShape = nextShapeRaw === 'rectangle' ? 'rectangle' : nextShapeRaw === 'circle' ? 'circle' : null;
      if (nextShape) {
        syncBaseElementShapeToLayout(nextShape);
        updateTemplateLayout((layout) => ({ ...layout, ...parsed, shape: nextShape }));
      } else {
        updateTemplateLayout(() => parsed);
      }
    } catch (e) {
      setLayoutDraftError(e instanceof Error ? e.message : 'Invalid layout JSON.');
    }
  };

  const addElementToCanvas = (source: TemplateElement) => {
    const copy = ensureElement(deepClone(source));
    copy.id = makeId('layer');
    copy.visible = true;
    copy.mask = source.mask && typeof source.mask === 'object'
      ? deepClone(source.mask)
      : undefined;

    updateTemplateElements((elements) => {
      const withUniqueName = {
        ...copy,
        name: buildUniqueElementName(elements, typeof copy.name === 'string' ? copy.name : copy.type ?? 'element'),
      };
      return [...elements, withUniqueName];
    }, 'Add element to canvas');

    setSelectedElementId(copy.id ?? null);
    setSelectedPanelTarget('element');
  };

  const resolveNewElementTemplate = (preferredCategory: string, fallbackElement?: TemplateElement): TemplateElement => {
    if (preferredCategory === 'Free Objects') {
      const fromShape = SAMPLE_LIBRARY.find(
        (entry) => entry.category === 'Free Objects' && entry.element.type === freeObjectShapeType,
      )?.element;
      if (fromShape) return fromShape;
    }

    return fallbackElement
      ?? DEFAULT_DRAWER_TEMPLATES_BY_CATEGORY.get(preferredCategory)
      ?? SAMPLE_LIBRARY[0]?.element
      ?? {
        type: 'base',
        role: 'base',
        name: 'Base Layer',
        params: { shape: 'circle', radius: 0.5, fill: '#0b0b0b' },
        placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
        symmetry: { mode: 'none', config: {} },
      };
  };

  const addNewElementFromDefaults = (preferredCategory = 'Base', fallbackElement?: TemplateElement) => {
    const fallback = resolveNewElementTemplate(preferredCategory, fallbackElement);
    const next = applyCategoryHeaderLock(preferredCategory, fallback, fallbackElement);
    addElementToCanvas(next);
    setDrawerNotice(`Added new ${preferredCategory} element. Edit controls are now active.`);
  };

  const toggleElementVisibility = (id: string) => {
    updateTemplateElements((elements) =>
      elements.map((element) => (element.id === id ? { ...element, visible: element.visible === false } : element)),
    );
  };

  const moveElement = (id: string, direction: 'up' | 'down') => {
    updateTemplateElements((elements) => {
      const index = elements.findIndex((element) => element.id === id);
      if (index < 0) return elements;
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= elements.length) return elements;
      const next = [...elements];
      const [picked] = next.splice(index, 1);
      next.splice(target, 0, picked);
      return next;
    });
  };

  const moveElementToIndex = (id: string, toIndex: number) => {
    updateTemplateElements((elements) => {
      const fromIndex = elements.findIndex((element) => element.id === id);
      if (fromIndex < 0) return elements;

      const safeTarget = Math.max(0, Math.min(toIndex, elements.length - 1));
      if (fromIndex === safeTarget) return elements;

      const next = [...elements];
      const [picked] = next.splice(fromIndex, 1);
      next.splice(safeTarget, 0, picked);
      return next;
    }, 'Reorder layer');
  };

  const removeElement = (id: string) => {
    updateTemplateElements((elements) => elements.filter((element) => element.id !== id));
    if (selectedElementId === id) {
      setSelectedElementId(null);
      setNameDraft('');
      setParamsDraft('{}');
    }
  };

  const duplicateElement = (id: string) => {
    let duplicatedId: string | null = null;
    let duplicatedName = '';

    updateTemplateElements((elements) => {
      const index = elements.findIndex((element) => element.id === id);
      if (index < 0) return elements;

      const source = ensureElement(deepClone(elements[index]));
      const copy = ensureElement(deepClone(source));
      copy.id = makeId('layer');
      copy.name = buildDuplicateElementName(
        elements,
        typeof source.name === 'string' ? source.name : source.type ?? 'element',
      );

      duplicatedId = copy.id ?? null;
      duplicatedName = typeof copy.name === 'string' ? copy.name : 'layer copy';

      const next = [...elements];
      next.splice(index + 1, 0, copy);
      return next;
    }, 'Duplicate layer');

    if (duplicatedId) {
      setSelectedElementId(duplicatedId);
      setSelectedPanelTarget('element');
      setEditorNotice(`Duplicated layer: ${duplicatedName}`);
    }
  };

  const mirrorPlacementConfig = (
    placement: { mode?: string; config?: Record<string, unknown> } | undefined,
    axis: 'x' | 'y',
  ): { mode: string; config: Record<string, unknown> } => {
    const mode = typeof placement?.mode === 'string' ? placement.mode : 'center';
    const config = placement?.config && typeof placement.config === 'object'
      ? deepClone(placement.config) as Record<string, unknown>
      : {};

    const mirrorRotation = (rotationRaw: unknown) => {
      const rotation = Number(rotationRaw);
      if (!Number.isFinite(rotation)) return 0;
      return axis === 'x' ? -rotation : 180 - rotation;
    };

    if (mode === 'center' || mode === 'anchor') {
      const offsetRaw = Array.isArray(config.offset) ? config.offset : [0, 0];
      const ox = Number(offsetRaw[0]);
      const oy = Number(offsetRaw[1]);
      const nextX = axis === 'x' ? -ox : ox;
      const nextY = axis === 'y' ? -oy : oy;
      config.offset = [
        Number.isFinite(nextX) ? nextX : 0,
        Number.isFinite(nextY) ? nextY : 0,
      ];
      config.rotation = mirrorRotation(config.rotation);
      return { mode, config };
    }

    if (mode === 'polar') {
      const angle = Number(config.angle);
      const safeAngle = Number.isFinite(angle) ? angle : 0;
      config.angle = axis === 'x' ? 180 - safeAngle : -safeAngle;
      config.rotation = mirrorRotation(config.rotation ?? config.angle);
      return { mode, config };
    }

    return { mode, config };
  };

  const createQuadrantDuplicates = () => {
    if (!selectedElement) return;

    const base = ensureElement(deepClone(selectedElement));
    const baseName = typeof base.name === 'string' && base.name.trim().length > 0 ? base.name.trim() : base.type;
    const basePlacement = base.placement && typeof base.placement === 'object'
      ? deepClone(base.placement) as { mode?: string; config?: Record<string, unknown> }
      : { mode: 'center', config: { offset: [0, 0], rotation: 0 } };

    const makeVariant = (suffix: string, axes: Array<'x' | 'y'>) => {
      const clone = ensureElement(deepClone(base));
      clone.id = makeId('layer');
      clone.name = `${baseName} ${suffix}`;
      let placement = deepClone(basePlacement);
      for (const axis of axes) {
        placement = mirrorPlacementConfig(placement, axis);
      }
      clone.placement = placement;
      clone.symmetry = { mode: 'none', config: {} };
      return clone;
    };

    const mirrorX = makeVariant('[MX]', ['x']);
    const mirrorY = makeVariant('[MY]', ['y']);
    const mirrorXY = makeVariant('[MXY]', ['x', 'y']);

    updateTemplateElements((elements) => [...elements, mirrorX, mirrorY, mirrorXY], 'Create quadrant mirror duplicates');
    setSelectedElementId(mirrorXY.id ?? null);
    setSelectedPanelTarget('element');
    setEditorNotice('Quadrant duplicates created: MX, MY, MXY.');
  };

  const createSnapshotForSelectedElement = async () => {
    if (!workingTemplate || !selectedElement || typeof selectedElement.id !== 'string') return;
    const elementId = selectedElement.id;
    markDirtyById(elementId, 'snapshot');
    setIsSnapshotActionRunning(true);
    try {
      const snapshot = await createElementSnapshot({
        template: deepClone(workingTemplate),
        elementId,
        preserveRenderSourceMode: selectedRenderSourceMode === 'snapshot',
        activeStyle: FIXED_RENDER_STYLE,
        colorControl: {
          ...DEFAULT_COLOR_CONTROL,
          colorControl: {
            ...DEFAULT_COLOR_CONTROL.colorControl,
            mode: 'off',
          },
        },
      });

      updateTemplateElements((elements) =>
        elements.map((element) => {
          if (element.id !== elementId) return element;
          const withSnapshot = setElementSnapshot(element as Record<string, unknown>, snapshot);
          const withFreshness = refreshElementSnapshotStatus(withSnapshot as Record<string, unknown>, snapshot.sourceHash);
          return withFreshness as TemplateElement;
        }),
      'Create element snapshot');
      setEditorNotice('Snapshot created for selected element.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Snapshot creation failed.';
      setEditorNotice(`Snapshot create failed: ${message}`);
    } finally {
      setIsSnapshotActionRunning(false);
    }
  };

  const createBakedLayerFromElement = async (elementId: string) => {
    if (!workingTemplate || typeof elementId !== 'string' || elementId.trim().length === 0) return;
    markDirtyById(elementId, 'snapshot');
    setIsSnapshotActionRunning(true);
    try {
      const snapshot = await createElementSnapshot({
        template: deepClone(workingTemplate),
        elementId,
        bakeMaskIntoSnapshot: true,
        preserveRenderSourceMode: true,
        activeStyle: FIXED_RENDER_STYLE,
        colorControl: {
          ...DEFAULT_COLOR_CONTROL,
          colorControl: {
            ...DEFAULT_COLOR_CONTROL.colorControl,
            mode: 'off',
          },
        },
      });

      let bakedLayerId: string | null = null;
      updateTemplateElements((elements) => {
        const sourceIndex = elements.findIndex((element) => element.id === elementId);
        if (sourceIndex < 0) return elements;

        const sourceElement = ensureElement(deepClone(elements[sourceIndex]), sourceIndex);
        const sourceName = typeof sourceElement.name === 'string' && sourceElement.name.trim().length > 0
          ? sourceElement.name.trim()
          : (typeof sourceElement.type === 'string' && sourceElement.type.trim().length > 0 ? sourceElement.type.trim() : 'Layer');

        const bakedLayer = ensureElement({
          ...sourceElement,
          id: makeId('layer'),
          name: buildUniqueElementName(elements, `${sourceName} baked`),
          visible: true,
          renderState: {
            sourceMode: 'live',
            snapshotRenderMode: 'editable',
            snapshotStatus: 'missing',
            snapshot: null,
          },
        }, elements.length);

        delete bakedLayer.mask;
        delete bakedLayer.texture;
        delete bakedLayer.textureLayers;
        delete bakedLayer.gradient;
        delete bakedLayer.gradientLayers;
        delete bakedLayer.material;
        delete bakedLayer.materialLayers;
        delete bakedLayer.styleAdjust;
        delete bakedLayer.effect3d;
        delete bakedLayer.dropShadow;

        const bakedSourceHash = generateElementRenderHash(bakedLayer as Record<string, unknown>);
        const bakedSnapshot = {
          ...snapshot,
          sourceHash: bakedSourceHash,
        };
        const withSnapshot = setElementSnapshot(bakedLayer as Record<string, unknown>, bakedSnapshot);
        const withFreshness = refreshElementSnapshotStatus(withSnapshot as Record<string, unknown>, bakedSourceHash) as TemplateElement;
        bakedLayerId = typeof withFreshness.id === 'string' ? withFreshness.id : null;

        const next = [...elements];
        next.splice(sourceIndex + 1, 0, withFreshness);
        return next;
      }, 'Create baked snapshot layer');

      if (bakedLayerId) {
        markDirtyById(bakedLayerId, 'snapshot');
        setSelectedElementId(bakedLayerId);
      }
      setSelectedPanelTarget('element');
      setEditorNotice('Baked layer created from selected snapshot. New layer starts with no mask metadata.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Baked layer creation failed.';
      setEditorNotice(`Bake to layer failed: ${message}`);
    } finally {
      setIsSnapshotActionRunning(false);
    }
  };

  const createBakedLayerFromSelectedSnapshot = async () => {
    if (!selectedElement || typeof selectedElement.id !== 'string') return;
    await createBakedLayerFromElement(selectedElement.id);
  };

  const useSnapshotForSelectedElement = () => {
    if (!selectedElement || typeof selectedElement.id !== 'string') return;
    if (!selectedHasSnapshot) {
      setEditorNotice('Use Snapshot failed: no snapshot exists for selected element.');
      return;
    }
    const elementId = selectedElement.id;
    markDirtyById(elementId, 'snapshot');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== elementId) return element;
        const withMode = setElementRenderSourceMode(element as Record<string, unknown>, 'snapshot');
        const withFreshness = refreshElementSnapshotStatus(withMode as Record<string, unknown>);
        return withFreshness as TemplateElement;
      }),
    'Use element snapshot render source');
    setEditorNotice('Selected element switched to snapshot render source.');
  };

  const useLiveRenderForSelectedElement = () => {
    if (!selectedElement || typeof selectedElement.id !== 'string') return;
    const elementId = selectedElement.id;
    markDirtyById(elementId, 'snapshot');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== elementId) return element;
        const withMode = setElementRenderSourceMode(element as Record<string, unknown>, 'live');
        const withFreshness = refreshElementSnapshotStatus(withMode as Record<string, unknown>);
        return withFreshness as TemplateElement;
      }),
    'Use element live render source');
    setEditorNotice('Selected element switched to live render source.');
  };

  const deleteSnapshotForSelectedElement = () => {
    if (!selectedElement || typeof selectedElement.id !== 'string') return;
    if (!selectedHasSnapshot) {
      setEditorNotice('Delete Snapshot skipped: selected element has no snapshot.');
      return;
    }
    const elementLabel = typeof selectedElement.name === 'string' && selectedElement.name.trim().length > 0
      ? selectedElement.name.trim()
      : selectedElement.id;
    const confirmed = window.confirm(
      `Delete snapshot for "${elementLabel}"? This removes baked image data and switches source mode to live.`,
    );
    if (!confirmed) {
      setEditorNotice('Delete Snapshot cancelled.');
      return;
    }
    const elementId = selectedElement.id;
    markDirtyById(elementId, 'snapshot');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== elementId) return element;
        const next = deleteElementSnapshot(element as Record<string, unknown>);
        return next as TemplateElement;
      }),
    'Delete element snapshot');
    setEditorNotice('Snapshot deleted for selected element.');
  };

  const saveDraftToLibrary = () => {
    const parsed = parseDraftElement();
    if (!parsed) return;

    const nextEntry: LibraryEntry = {
      id: makeId('lib'),
      name: typeof parsed.name === 'string' ? parsed.name : 'Saved Element',
      category: inferCategory(parsed),
      element: parsed,
    };

    persistLibraryFromAction((prev) => [...prev, nextEntry], 'Draft JSON saved to drawer library.');
  };

  const getCategoryDraftText = (category: string, fallbackElement?: TemplateElement): string => {
    const existing = categoryDrafts[category];
    if (typeof existing === 'string') return existing;
    if (fallbackElement) return JSON.stringify(fallbackElement, null, 2);
    return JSON.stringify({ type: 'element', role: 'element', params: {} }, null, 2);
  };

  const resolveFreeObjectHeader = (): { type: string; role: string } => {
    const picked = FREE_OBJECT_SHAPE_BY_TYPE.get(freeObjectShapeType);
    if (picked) return { type: picked.type, role: picked.role };
    return CATEGORY_HEADER_DEFAULTS['Free Objects'];
  };

  const resolveCategoryHeader = (category: string, fallbackElement?: TemplateElement): { type: string; role: string } => {
    if (category === 'Free Objects') {
      return resolveFreeObjectHeader();
    }
    if (fallbackElement && typeof fallbackElement.type === 'string' && typeof fallbackElement.role === 'string') {
      return { type: fallbackElement.type, role: fallbackElement.role };
    }
    if (fallbackElement && typeof fallbackElement.type === 'string') {
      return { type: fallbackElement.type, role: fallbackElement.type };
    }
    return CATEGORY_HEADER_DEFAULTS[category] ?? CATEGORY_HEADER_DEFAULTS.General;
  };

  const isCategoryHeaderLocked = (category: string): boolean => {
    const current = categoryHeaderLocks[category];
    if (typeof current === 'boolean') return current;
    return category === 'Free Objects';
  };

  const applyCategoryHeaderLock = (
    category: string,
    element: TemplateElement,
    fallbackElement?: TemplateElement,
  ): TemplateElement => {
    const normalized = ensureElement(element);
    if (!isCategoryHeaderLocked(category)) {
      return normalized;
    }

    const header = resolveCategoryHeader(category, fallbackElement);
    return {
      ...normalized,
      type: header.type,
      role: header.role,
    };
  };

  const parseCategoryDraftElement = (category: string, fallbackElement?: TemplateElement): TemplateElement | null => {
    const text = getCategoryDraftText(category, fallbackElement);
    if (!text.trim()) {
      setDrawerNotice(`${category}: JSON is empty.`);
      return null;
    }
    try {
      const parsed = JSON.parse(text) as TemplateElement;
      if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') {
        throw new Error('Element JSON must contain string field: type');
      }

      const finalElement = applyCategoryHeaderLock(category, parsed, fallbackElement);

      setDrawerNotice(null);
      return finalElement;
    } catch (e) {
      setDrawerNotice(`${category}: ${e instanceof Error ? e.message : 'Invalid JSON.'}`);
      return null;
    }
  };

  const addCategoryDraftToCanvas = (category: string, fallbackElement?: TemplateElement) => {
    const parsed = parseCategoryDraftElement(category, fallbackElement);
    if (!parsed) return;
    addElementToCanvas(parsed);
    setDrawerNotice(`${category}: draft element added to canvas.`);
  };

  const saveCategoryDraftToLibrary = (category: string, fallbackElement?: TemplateElement) => {
    const parsed = parseCategoryDraftElement(category, fallbackElement);
    if (!parsed) return;

    const nextEntry: LibraryEntry = {
      id: makeId('lib'),
      name: typeof parsed.name === 'string' ? parsed.name : `${category} Saved`,
      category,
      element: parsed,
    };

    persistLibraryFromAction((prev) => [...prev, nextEntry], `${category}: draft saved to this type library.`);
  };

  const saveSelectedToLibrary = () => {
    if (!selectedElement) {
      setEditorNotice('No selected element to save.');
      return;
    }

    const normalized = stripElementSnapshotForLibrary(ensureElement(deepClone(selectedElement)));
    const nextEntry: LibraryEntry = {
      id: makeId('lib'),
      name: typeof normalized.name === 'string' && normalized.name.trim().length > 0 ? normalized.name : 'Saved Element',
      category: inferCategory(normalized),
      element: normalized,
    };

    persistLibraryFromAction((prev) => [...prev, nextEntry], 'Selected element saved to drawer library.');
  };

  const addDraftToCanvas = () => {
    const template = parseDraftTemplate();
    if (template) {
      setWorkingTemplate(template);
      clearCommandHistory();
      saveTemplate(template);
      setSelectedElementId(template.elements[0]?.id ?? null);
      setSelectedPanelTarget(template.elements.length > 0 ? 'element' : 'layout');
      setDrawerNotice('Template applied to canvas only. Use Save Full JSON to persist elements/theme.');
      setDraftError(null);
      void renderPreview(template);
      return;
    }

    const parsed = parseDraftElement();
    if (!parsed) return;
    addElementToCanvas(parsed);
  };

  const saveDraftTemplateToLibraryAndTheme = () => {
    const template = parseDraftTemplate();
    if (!template) {
      setDraftError('Save failed: paste a full template JSON first.');
      return;
    }

    const normalizedTemplate: TemplateModel = {
      ...template,
      elements: (template.elements ?? []).map((element, index) => ensureElement(element, index)),
    };

    importTemplateElementsToLibrary(normalizedTemplate);

    if (!Array.isArray(normalizedTemplate.elements) || normalizedTemplate.elements.length === 0) {
      setDrawerNotice('Template saved to drawer skipped: no elements found for theme save.');
      return;
    }

    const name = themeNameDraft.trim().length > 0
      ? themeNameDraft.trim()
      : `Theme-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;
    const nextTheme: ThemeEntry = {
      id: makeId('theme'),
      name,
      template: deepClone(normalizedTemplate),
    };

    persistThemes((prev) => [...prev, nextTheme], 'Full JSON saved: elements imported + theme saved.');
  };

  const applyDraftJsonToSelectedElementLive = (nextDraft: string) => {
    if (!selectedElement || !nextDraft.trim()) return;

    try {
      const parsed = JSON.parse(nextDraft) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;

      const isTemplatePayload =
        Object.prototype.hasOwnProperty.call(parsed, 'layout') ||
        Object.prototype.hasOwnProperty.call(parsed, 'elements') ||
        Object.prototype.hasOwnProperty.call(parsed, 'scale');
      if (isTemplatePayload) return;

      const isElementPatch =
        Object.prototype.hasOwnProperty.call(parsed, 'type') ||
        Object.prototype.hasOwnProperty.call(parsed, 'params') ||
        Object.prototype.hasOwnProperty.call(parsed, 'placement') ||
        Object.prototype.hasOwnProperty.call(parsed, 'symmetry') ||
        Object.prototype.hasOwnProperty.call(parsed, 'mask') ||
        Object.prototype.hasOwnProperty.call(parsed, 'material') ||
        Object.prototype.hasOwnProperty.call(parsed, 'texture') ||
        Object.prototype.hasOwnProperty.call(parsed, 'gradient') ||
        Object.prototype.hasOwnProperty.call(parsed, 'styleAdjust') ||
        Object.prototype.hasOwnProperty.call(parsed, 'effect3d');
      if (!isElementPatch) return;

      updateTemplateElements((elements) =>
        elements.map((element, index) => {
          if (element.id !== selectedElement.id) return element;

          const parsedParams = parsed.params && typeof parsed.params === 'object' ? (parsed.params as Record<string, unknown>) : null;
          const materialPatch = parsed.material && typeof parsed.material === 'object' ? (parsed.material as Record<string, unknown>) : null;
          const mergedParams = {
            ...(element.params && typeof element.params === 'object' ? (element.params as Record<string, unknown>) : {}),
            ...(parsedParams ?? {}),
          };
          if (materialPatch && !(parsedParams && typeof parsedParams.material === 'object')) {
            mergedParams.material = materialPatch;
          }

          const patched = {
            ...element,
            ...parsed,
            params: mergedParams,
            id: element.id,
            visible: element.visible,
          } as TemplateElement;

          return ensureElement(patched, index);
        }),
      );
      setDraftError(null);
    } catch {
      // Keep typing experience smooth; errors are handled by explicit apply/save actions too.
    }
  };

  const handleDraftJsonChange = (value: string) => {
    setDraftJson(value);
    applyDraftJsonToSelectedElementLive(value);
  };

  const saveSelectedName = () => {
    if (!selectedElement) return;
    const nextName = nameDraft.trim();
    if (!nextName) return;
    updateTemplateElements((elements) => elements.map((element) => (element.id === selectedElement.id ? { ...element, name: nextName } : element)));
    setEditorNotice('Name saved.');
  };

  const saveSelectedParams = () => {
    if (!selectedElement) return;
    try {
      const parsed = JSON.parse(paramsDraft) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Params must be an object');
      }

      const isElementPatch =
        Object.prototype.hasOwnProperty.call(parsed, 'type') ||
        Object.prototype.hasOwnProperty.call(parsed, 'params') ||
        Object.prototype.hasOwnProperty.call(parsed, 'placement') ||
        Object.prototype.hasOwnProperty.call(parsed, 'symmetry') ||
        Object.prototype.hasOwnProperty.call(parsed, 'mask') ||
        Object.prototype.hasOwnProperty.call(parsed, 'material') ||
        Object.prototype.hasOwnProperty.call(parsed, 'texture') ||
        Object.prototype.hasOwnProperty.call(parsed, 'gradient') ||
        Object.prototype.hasOwnProperty.call(parsed, 'styleAdjust') ||
        Object.prototype.hasOwnProperty.call(parsed, 'effect3d');

      setDraftError(null);

      if (isElementPatch) {
        updateTemplateElements((elements) =>
          elements.map((element, index) => {
            if (element.id !== selectedElement.id) return element;
            const parsedParams = parsed.params && typeof parsed.params === 'object' ? (parsed.params as Record<string, unknown>) : null;
            const materialPatch = parsed.material && typeof parsed.material === 'object' ? (parsed.material as Record<string, unknown>) : null;
            const mergedParams = {
              ...(element.params && typeof element.params === 'object' ? (element.params as Record<string, unknown>) : {}),
              ...(parsedParams ?? {}),
            };
            if (materialPatch && !(parsedParams && typeof parsedParams.material === 'object')) {
              mergedParams.material = materialPatch;
            }
            const patched = {
              ...element,
              ...parsed,
              params: mergedParams,
              id: element.id,
              visible: element.visible,
            } as TemplateElement;
            return ensureElement(patched, index);
          }),
        );
        setEditorNotice('Element patch saved.');
        return;
      }

      updateTemplateElements((elements) =>
        elements.map((element) => (element.id === selectedElement.id ? { ...element, params: parsed } : element)),
      );
      setEditorNotice('Params saved.');
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : 'Invalid params JSON.');
      setEditorNotice('Save failed: invalid JSON.');
    }
  };

  const setNumericParam = (path: string, value: number) => {
    if (!selectedElement) return;
    const segments = path.split('.');
    const currentParams = selectedElement.params && typeof selectedElement.params === 'object' ? deepClone(selectedElement.params) : {};

    let cursor: Record<string, unknown> = currentParams;
    for (let i = 0; i < segments.length - 1; i += 1) {
      const key = segments[i];
      const child = cursor[key];
      if (!child || typeof child !== 'object') {
        cursor[key] = {};
      }
      cursor = cursor[key] as Record<string, unknown>;
    }
    cursor[segments[segments.length - 1]] = value;

    updateTemplateElements((elements) =>
      elements.map((element) => (element.id === selectedElement.id ? { ...element, params: currentParams } : element)),
    );
  };

  const getNumericParam = (path: string, fallback: number) => {
    if (!selectedElement || !selectedElement.params || typeof selectedElement.params !== 'object') return fallback;
    const segments = path.split('.');
    let cursor: unknown = selectedElement.params;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    const n = Number(cursor);
    return Number.isFinite(n) ? n : fallback;
  };

  const setStringParam = (path: string, value: string) => {
    if (!selectedElement) return;
    const segments = path.split('.');
    const currentParams = selectedElement.params && typeof selectedElement.params === 'object' ? deepClone(selectedElement.params) : {};

    let cursor: Record<string, unknown> = currentParams;
    for (let i = 0; i < segments.length - 1; i += 1) {
      const key = segments[i];
      const child = cursor[key];
      if (!child || typeof child !== 'object') {
        cursor[key] = {};
      }
      cursor = cursor[key] as Record<string, unknown>;
    }
    cursor[segments[segments.length - 1]] = value;

    updateTemplateElements((elements) =>
      elements.map((element) => (element.id === selectedElement.id ? { ...element, params: currentParams } : element)),
    );
  };

  const getStringParam = (path: string, fallback: string) => {
    if (!selectedElement || !selectedElement.params || typeof selectedElement.params !== 'object') return fallback;
    const segments = path.split('.');
    let cursor: unknown = selectedElement.params;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    return typeof cursor === 'string' ? cursor : fallback;
  };

  const getSelectedPlacementOffset = (axis: 0 | 1) => {
    if (!selectedElement || !selectedElement.placement || typeof selectedElement.placement !== 'object') return 0;
    const config = selectedElement.placement.config && typeof selectedElement.placement.config === 'object'
      ? selectedElement.placement.config
      : {};
    const offsetRaw = (config as Record<string, unknown>).offset;
    const offset = Array.isArray(offsetRaw) ? offsetRaw : [0, 0];
    const value = Number(offset[axis]);
    if (!Number.isFinite(value)) return 0;
    return Math.max(-50, Math.min(50, value));
  };

  const setSelectedPlacementOffset = (x: number, y: number) => {
    if (!selectedElement) return;
    markSelectedElementDirty('transform');
    const clampedX = Math.max(-50, Math.min(50, x));
    const clampedY = Math.max(-50, Math.min(50, y));
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const placement = element.placement && typeof element.placement === 'object'
          ? deepClone(element.placement) as { mode?: string; config?: Record<string, unknown> }
          : { mode: 'center', config: {} };
        const config = placement.config && typeof placement.config === 'object'
          ? deepClone(placement.config) as Record<string, unknown>
          : {};
        config.offset = [clampedX, clampedY];
        return { ...element, placement: { ...placement, config } };
      }),
    );
  };

  const getSelectedPlacementRotation = () => {
    if (!selectedElement || !selectedElement.placement || typeof selectedElement.placement !== 'object') return 0;
    const config = selectedElement.placement.config && typeof selectedElement.placement.config === 'object'
      ? selectedElement.placement.config
      : {};
    const value = Number((config as Record<string, unknown>).rotation);
    if (!Number.isFinite(value)) return 0;
    return Math.max(-360, Math.min(360, value));
  };

  const setSelectedPlacementRotation = (rotation: number) => {
    if (!selectedElement) return;
    markSelectedElementDirty('transform');
    const clampedRotation = Math.max(-360, Math.min(360, rotation));
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const placement = element.placement && typeof element.placement === 'object'
          ? deepClone(element.placement) as { mode?: string; config?: Record<string, unknown> }
          : { mode: 'center', config: {} };
        const config = placement.config && typeof placement.config === 'object'
          ? deepClone(placement.config) as Record<string, unknown>
          : {};
        config.rotation = clampedRotation;
        return { ...element, placement: { ...placement, config } };
      }),
    );
  };

  const getSelectedSymmetryMode = () => {
    if (!selectedElement || !selectedElement.symmetry || typeof selectedElement.symmetry !== 'object') return 'none';
    const rawMode = (selectedElement.symmetry as Record<string, unknown>).mode;
    if (rawMode === 'mirrorX' || rawMode === 'mirrorY') return rawMode;
    return 'none';
  };

  const setSelectedSymmetryMode = (mode: 'none' | 'mirrorX' | 'mirrorY') => {
    if (!selectedElement) return;
    markSelectedElementDirty('transform');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const symmetry = element.symmetry && typeof element.symmetry === 'object'
          ? deepClone(element.symmetry) as { mode?: string; config?: Record<string, unknown> }
          : { mode: 'none', config: {} };
        return {
          ...element,
          symmetry: {
            ...symmetry,
            mode,
            config: mode === 'none' ? (symmetry.config && typeof symmetry.config === 'object' ? symmetry.config : {}) : {},
          },
        };
      }),
    );
  };

  const normalizeColorHex = (value: string, fallback: string) => {
    const raw = (value ?? '').trim();
    const fullHex = /^#([0-9a-fA-F]{6})$/;
    if (fullHex.test(raw)) return raw;
    const shortHex = /^#([0-9a-fA-F]{3})$/;
    if (shortHex.test(raw)) {
      const m = raw.slice(1);
      return `#${m[0]}${m[0]}${m[1]}${m[1]}${m[2]}${m[2]}`;
    }
    return fallback;
  };

  const getColorParam = (path: string, fallback: string) => normalizeColorHex(getStringParam(path, fallback), fallback);

  const resolveElementColorTarget = (elementType: string, params: Record<string, unknown>) => {
    const fillRaw = typeof params.fill === 'string' ? params.fill.trim() : '';
    const strokeRaw = typeof params.stroke === 'string' ? params.stroke.trim() : '';
    const hasFill = fillRaw.length > 0;
    const hasStroke = strokeRaw.length > 0;
    const fillVisible = hasFill && fillRaw.toLowerCase() !== 'none';

    if (elementType === 'image_layer') return 'none';
    if (elementType === 'base') return 'fill';
    if (elementType === 'ring' || elementType === 'bezel' || elementType === 'outline_ring' || elementType === 'ticks_radial' || elementType === 'radialTicks') {
      if (hasStroke) return 'stroke';
      if (hasFill) return 'fill';
      return 'stroke';
    }

    if (fillVisible) return 'fill';
    if (hasStroke) return 'stroke';
    if (hasFill) return 'fill';
    return 'fill';
  };

  const getSelectedElementColor = () => {
    if (!selectedElement) return '#ffffff';
    const params = selectedElement.params && typeof selectedElement.params === 'object'
      ? selectedElement.params as Record<string, unknown>
      : {};
    const semanticRaw = typeof params.color === 'string' ? params.color : '';
    const semanticColor = normalizeColorHex(semanticRaw, '');
    if (semanticColor) return semanticColor;

    const selectedType = typeof selectedElement.type === 'string' ? selectedElement.type : '';
    const target = resolveElementColorTarget(selectedType, params);
    const fallbackRaw = target === 'stroke'
      ? (typeof params.stroke === 'string' ? params.stroke : '#ffffff')
      : (typeof params.fill === 'string' ? params.fill : '#ffffff');
    return normalizeColorHex(fallbackRaw, '#ffffff');
  };

  const setSelectedElementColor = (value: string) => {
    if (!selectedElement) return;
    const normalized = normalizeColorHex(value, '#ffffff');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const params = element.params && typeof element.params === 'object'
          ? deepClone(element.params) as Record<string, unknown>
          : {};
        params.color = normalized;
        const elementType = typeof element.type === 'string' ? element.type : '';
        const target = resolveElementColorTarget(elementType, params);
        params[target] = normalized;
        return { ...element, params };
      }),
    );
  };

  const isSelectedType = (...types: string[]) => {
    if (!selectedElement || typeof selectedElement.type !== 'string') return false;
    return types.includes(selectedElement.type);
  };

  const isFreeShapeFillDisabled = () => getStringParam('fill', '#58657b').trim().toLowerCase() === 'none';

  const getSideLength = (index: number, fallback = 0.1) => {
    if (!selectedElement || !selectedElement.params || typeof selectedElement.params !== 'object') return fallback;
    const params = selectedElement.params as Record<string, unknown>;

    if (selectedElement.type === 'free_polygon') {
      const sides = Array.isArray(params.sides) ? params.sides : [];
      const value = Number(sides[index]);
      return Number.isFinite(value) ? value : fallback;
    }

    const key = `side${index + 1}`;
    const value = Number(params[key]);
    return Number.isFinite(value) ? value : fallback;
  };

  const setSideLength = (index: number, value: number) => {
    if (!selectedElement) return;
    if (selectedElement.type === 'free_polygon') {
      updateTemplateElements((elements) =>
        elements.map((element) => {
          if (element.id !== selectedElement.id) return element;
          const params = element.params && typeof element.params === 'object' ? deepClone(element.params) as Record<string, unknown> : {};
          const sides = Array.isArray(params.sides) ? [...params.sides] as Array<unknown> : [];
          sides[index] = value;
          return { ...element, params: { ...params, sides } };
        }),
      );
      return;
    }

    setNumericParam(`side${index + 1}`, value);
  };

  const getSideCount = () => {
    if (!selectedElement) return 0;
    switch (selectedElement.type) {
      case 'free_triangle':
        return 3;
      case 'free_hexagon':
        return 6;
      case 'free_octagon':
        return 8;
      case 'free_polygon': {
        const count = Number((selectedElement.params as Record<string, unknown> | undefined)?.sidesCount);
        if (Number.isFinite(count)) return Math.max(3, Math.min(12, Math.floor(count)));
        return 6;
      }
      default:
        return 0;
    }
  };

  const getSelectedTextureLayers = () => {
    if (!selectedElement) return [] as Array<Record<string, unknown>>;
    return normalizeLegacyTextureLayers(selectedElement as Record<string, unknown>);
  };

  const getSelectedTextureLayer = () => {
    const layers = getSelectedTextureLayers();
    if (layers.length === 0) return null;
    const safeIndex = Math.max(0, Math.min(activeTextureLayerIndex, layers.length - 1));
    return layers[safeIndex] ?? null;
  };

  const updateSelectedTextureLayer = (updater: (layer: Record<string, unknown>, allLayers: Array<Record<string, unknown>>) => Array<Record<string, unknown>>) => {
    if (!selectedElement) return;
    markSelectedElementDirty('effects');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const layers = normalizeLegacyTextureLayers(element as Record<string, unknown>);
        const safeIndex = Math.max(0, Math.min(activeTextureLayerIndex, Math.max(0, layers.length - 1)));
        const current = layers[safeIndex] && typeof layers[safeIndex] === 'object' ? deepClone(layers[safeIndex]) as Record<string, unknown> : {};
        const nextLayers = updater(current, layers);
        return writeNormalizedTextureLayers(element as Record<string, unknown>, nextLayers) as TemplateElement;
      }),
    );
  };

  const addSelectedTextureLayer = () => {
    const defaultTarget = getDefaultClipTargetName();
    updateSelectedTextureLayer((_current, layers) => {
      const nextLayer: Record<string, unknown> = {
        kind: 'grain',
        enabled: true,
        opacity: 0.22,
        blendMode: 'overlay',
        gradient: {
          kind: 'linear',
          from: [0, 0],
          to: [100, 100],
          stops: [
            { offset: 0, color: '#ffffff', opacity: 0.22 },
            { offset: 0.5, color: '#8899aa', opacity: 0.2 },
            { offset: 1, color: '#000000', opacity: 0.18 },
          ],
        },
        noise: { amount: 0.2, radius: 24 },
        clip: {
          enabled: true,
          inheritPrevious: true,
          targetName: defaultTarget,
        },
      };
      const next = [...layers, nextLayer];
      setActiveTextureLayerIndex(Math.max(0, next.length - 1));
      return next;
    });
  };

  const removeSelectedTextureLayer = () => {
    updateSelectedTextureLayer((_current, layers) => {
      if (layers.length <= 1) {
        setActiveTextureLayerIndex(0);
        return [];
      }
      const safeIndex = Math.max(0, Math.min(activeTextureLayerIndex, layers.length - 1));
      const next = layers.filter((_, index) => index !== safeIndex);
      setActiveTextureLayerIndex(Math.max(0, Math.min(safeIndex, next.length - 1)));
      return next;
    });
  };

  const setSelectedTextureEnabled = (enabled: boolean) => {
    const defaultTarget = getDefaultClipTargetName();
    updateSelectedTextureLayer((current, layers) => {
      const safeIndex = Math.max(0, Math.min(activeTextureLayerIndex, Math.max(0, layers.length - 1)));
      const nextLayer = { ...current };
      const currentClip = nextLayer.clip && typeof nextLayer.clip === 'object' ? nextLayer.clip as Record<string, unknown> : {};
      const clip = enabled
        ? {
            ...currentClip,
            enabled: true,
            inheritPrevious: true,
            targetName: typeof currentClip.targetName === 'string' && currentClip.targetName.trim().length > 0
              ? currentClip.targetName
              : defaultTarget,
          }
        : currentClip;
      nextLayer.enabled = enabled;
      nextLayer.clip = clip;
      const next = layers.length > 0 ? [...layers] : [{}];
      next[safeIndex] = nextLayer;
      return next;
    });
  };

  const setSelectedTextureNumber = (path: string, value: number) => {
    const segments = path.split('.');
    updateSelectedTextureLayer((current, layers) => {
      const safeIndex = Math.max(0, Math.min(activeTextureLayerIndex, Math.max(0, layers.length - 1)));
      const layer = { ...current };
      let cursor: Record<string, unknown> = layer;
      for (let i = 0; i < segments.length - 1; i += 1) {
        const key = segments[i];
        const child = cursor[key];
        if (!child || typeof child !== 'object') {
          cursor[key] = {};
        }
        cursor = cursor[key] as Record<string, unknown>;
      }
      cursor[segments[segments.length - 1]] = value;
      const next = layers.length > 0 ? [...layers] : [{}];
      next[safeIndex] = layer;
      return next;
    });
  };

  const getSelectedTextureNumber = (path: string, fallback: number) => {
    const layer = getSelectedTextureLayer();
    if (!layer) return fallback;
    const segments = path.split('.');
    let cursor: unknown = layer;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    const n = Number(cursor);
    return Number.isFinite(n) ? n : fallback;
  };

  const setSelectedTextureString = (path: string, value: string) => {
    const segments = path.split('.');
    updateSelectedTextureLayer((current, layers) => {
      const safeIndex = Math.max(0, Math.min(activeTextureLayerIndex, Math.max(0, layers.length - 1)));
      const layer = { ...current };
      let cursor: Record<string, unknown> = layer;
      for (let i = 0; i < segments.length - 1; i += 1) {
        const key = segments[i];
        const child = cursor[key];
        if (!child || typeof child !== 'object') {
          cursor[key] = {};
        }
        cursor = cursor[key] as Record<string, unknown>;
      }
      cursor[segments[segments.length - 1]] = value;
      const next = layers.length > 0 ? [...layers] : [{}];
      next[safeIndex] = layer;
      return next;
    });
  };

  const setSelectedTextureBoolean = (path: string, value: boolean) => {
    const segments = path.split('.');
    updateSelectedTextureLayer((current, layers) => {
      const safeIndex = Math.max(0, Math.min(activeTextureLayerIndex, Math.max(0, layers.length - 1)));
      const layer = { ...current };
      let cursor: Record<string, unknown> = layer;
      for (let i = 0; i < segments.length - 1; i += 1) {
        const key = segments[i];
        const child = cursor[key];
        if (!child || typeof child !== 'object') {
          cursor[key] = {};
        }
        cursor = cursor[key] as Record<string, unknown>;
      }
      cursor[segments[segments.length - 1]] = value;
      const next = layers.length > 0 ? [...layers] : [{}];
      next[safeIndex] = layer;
      return next;
    });
  };

  const getSelectedTextureString = (path: string, fallback: string) => {
    const layer = getSelectedTextureLayer();
    if (!layer) return fallback;
    const segments = path.split('.');
    let cursor: unknown = layer;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    return typeof cursor === 'string' ? cursor : fallback;
  };

  const handleTextureImageFileSelection = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setEditorNotice('Texture image must be a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setEditorNotice('Failed to read image file for texture.');
    };
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        setEditorNotice('Texture image could not be loaded.');
        return;
      }

      setSelectedTextureString('image.src', dataUrl);
      const probe = new Image();
      probe.onload = () => {
        setSelectedTextureNumber('image.naturalWidth', probe.naturalWidth || 1024);
        setSelectedTextureNumber('image.naturalHeight', probe.naturalHeight || 1024);
      };
      probe.src = dataUrl;
      setEditorNotice(`Texture image loaded: ${file.name}`);
    };

    reader.readAsDataURL(file);
  };

  const getSelectedTextureBoolean = (path: string, fallback: boolean) => {
    const layer = getSelectedTextureLayer();
    if (!layer) return fallback;
    const segments = path.split('.');
    let cursor: unknown = layer;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    return typeof cursor === 'boolean' ? cursor : fallback;
  };

  const isSelectedTextureEnabled = () => {
    const layer = getSelectedTextureLayer();
    if (!layer) return false;
    return layer.enabled === true;
  };

  const setSelectedTextureClipEnabled = (enabled: boolean) => {
    const defaultTarget = getDefaultClipTargetName();
    updateSelectedTextureLayer((current, layers) => {
      const safeIndex = Math.max(0, Math.min(activeTextureLayerIndex, Math.max(0, layers.length - 1)));
      const layer = { ...current };
      const clip = layer.clip && typeof layer.clip === 'object' ? deepClone(layer.clip as Record<string, unknown>) : {};
      const nextClip = {
        ...clip,
        enabled,
        inheritPrevious: enabled ? true : clip.inheritPrevious === true,
        targetName: enabled
          ? (typeof clip.targetName === 'string' && clip.targetName.trim().length > 0 ? clip.targetName : defaultTarget)
          : (typeof clip.targetName === 'string' ? clip.targetName : ''),
      };
      layer.clip = nextClip;
      const next = layers.length > 0 ? [...layers] : [{}];
      next[safeIndex] = layer;
      return next;
    });
  };

  const getSelectedTextureClipEnabled = () => {
    const layer = getSelectedTextureLayer();
    if (!layer) return false;
    const clip = layer.clip;
    return !!(clip && typeof clip === 'object' && (clip as Record<string, unknown>).enabled === true);
  };

  const getSelectedTextureClipTargetName = () => {
    const layer = getSelectedTextureLayer();
    if (!layer) return '';
    const clip = layer.clip;
    if (!clip || typeof clip !== 'object') return '';
    const value = (clip as Record<string, unknown>).targetName;
    return typeof value === 'string' ? value : '';
  };

  const setSelectedTextureClipTargetName = (targetName: string) => {
    updateSelectedTextureLayer((current, layers) => {
      const safeIndex = Math.max(0, Math.min(activeTextureLayerIndex, Math.max(0, layers.length - 1)));
      const layer = { ...current };
      const clip = layer.clip && typeof layer.clip === 'object' ? deepClone(layer.clip as Record<string, unknown>) : {};
      layer.clip = { ...clip, targetName };
      const next = layers.length > 0 ? [...layers] : [{}];
      next[safeIndex] = layer;
      return next;
    });
  };

  const getSelectedGradientLayers = () => {
    if (!selectedElement) return [] as Array<Record<string, unknown>>;
    return normalizeLegacyGradientLayers(selectedElement as Record<string, unknown>);
  };

  const getSelectedGradientLayer = () => {
    const layers = getSelectedGradientLayers();
    if (layers.length === 0) return null;
    const safeIndex = Math.max(0, Math.min(activeGradientLayerIndex, layers.length - 1));
    return layers[safeIndex] ?? null;
  };

  const updateSelectedGradientLayer = (updater: (layer: Record<string, unknown>, allLayers: Array<Record<string, unknown>>) => Array<Record<string, unknown>>) => {
    if (!selectedElement) return;
    markSelectedElementDirty('effects');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const layers = normalizeLegacyGradientLayers(element as Record<string, unknown>);
        const safeIndex = Math.max(0, Math.min(activeGradientLayerIndex, Math.max(0, layers.length - 1)));
        const current = layers[safeIndex] && typeof layers[safeIndex] === 'object' ? deepClone(layers[safeIndex]) as Record<string, unknown> : {};
        const nextLayers = updater(current, layers);
        return writeNormalizedGradientLayers(element as Record<string, unknown>, nextLayers) as TemplateElement;
      }),
    );
  };

  const addSelectedGradientLayer = () => {
    const defaultTarget = getDefaultClipTargetName();
    updateSelectedGradientLayer((_current, layers) => {
      const nextLayer: Record<string, unknown> = {
        enabled: true,
        opacity: 0.24,
        blendMode: 'overlay',
        kind: 'linear',
        from: [0, 0],
        to: [100, 100],
        stops: [
          { offset: 0, color: '#ffffff', opacity: 0.24 },
          { offset: 0.5, color: '#8899aa', opacity: 0.2 },
          { offset: 1, color: '#000000', opacity: 0.18 },
        ],
        clip: {
          enabled: true,
          inheritPrevious: true,
          targetName: defaultTarget,
        },
      };
      const next = [...layers, nextLayer];
      setActiveGradientLayerIndex(Math.max(0, next.length - 1));
      return next;
    });
  };

  const removeSelectedGradientLayer = () => {
    updateSelectedGradientLayer((_current, layers) => {
      if (layers.length <= 1) {
        setActiveGradientLayerIndex(0);
        return [];
      }
      const safeIndex = Math.max(0, Math.min(activeGradientLayerIndex, layers.length - 1));
      const next = layers.filter((_, index) => index !== safeIndex);
      setActiveGradientLayerIndex(Math.max(0, Math.min(safeIndex, next.length - 1)));
      return next;
    });
  };

  const setSelectedGradientEnabled = (enabled: boolean) => {
    const defaultTarget = getDefaultClipTargetName();
    updateSelectedGradientLayer((current, layers) => {
      const safeIndex = Math.max(0, Math.min(activeGradientLayerIndex, Math.max(0, layers.length - 1)));
      const nextLayer = { ...current };
      const currentClip = nextLayer.clip && typeof nextLayer.clip === 'object' ? nextLayer.clip as Record<string, unknown> : {};
      const clip = enabled
        ? {
            ...currentClip,
            enabled: true,
            inheritPrevious: true,
            targetName: typeof currentClip.targetName === 'string' && currentClip.targetName.trim().length > 0
              ? currentClip.targetName
              : defaultTarget,
          }
        : currentClip;
      nextLayer.enabled = enabled;
      nextLayer.clip = clip;
      const next = layers.length > 0 ? [...layers] : [{}];
      next[safeIndex] = nextLayer;
      return next;
    });
  };

  const setSelectedGradientNumber = (path: string, value: number) => {
    const segments = path.split('.');
    updateSelectedGradientLayer((current, layers) => {
      const safeIndex = Math.max(0, Math.min(activeGradientLayerIndex, Math.max(0, layers.length - 1)));
      const layer = { ...current };
      let cursor: Record<string, unknown> = layer;
      for (let i = 0; i < segments.length - 1; i += 1) {
        const key = segments[i];
        const child = cursor[key];
        if (!child || typeof child !== 'object') {
          cursor[key] = {};
        }
        cursor = cursor[key] as Record<string, unknown>;
      }
      cursor[segments[segments.length - 1]] = value;
      const next = layers.length > 0 ? [...layers] : [{}];
      next[safeIndex] = layer;
      return next;
    });
  };

  const setSelectedGradientString = (path: string, value: string) => {
    const segments = path.split('.');
    updateSelectedGradientLayer((current, layers) => {
      const safeIndex = Math.max(0, Math.min(activeGradientLayerIndex, Math.max(0, layers.length - 1)));
      const layer = { ...current };
      let cursor: Record<string, unknown> = layer;
      for (let i = 0; i < segments.length - 1; i += 1) {
        const key = segments[i];
        const child = cursor[key];
        if (!child || typeof child !== 'object') {
          cursor[key] = {};
        }
        cursor = cursor[key] as Record<string, unknown>;
      }
      cursor[segments[segments.length - 1]] = value;
      const next = layers.length > 0 ? [...layers] : [{}];
      next[safeIndex] = layer;
      return next;
    });
  };

  const setSelectedGradientBoolean = (path: string, value: boolean) => {
    const segments = path.split('.');
    updateSelectedGradientLayer((current, layers) => {
      const safeIndex = Math.max(0, Math.min(activeGradientLayerIndex, Math.max(0, layers.length - 1)));
      const layer = { ...current };
      let cursor: Record<string, unknown> = layer;
      for (let i = 0; i < segments.length - 1; i += 1) {
        const key = segments[i];
        const child = cursor[key];
        if (!child || typeof child !== 'object') {
          cursor[key] = {};
        }
        cursor = cursor[key] as Record<string, unknown>;
      }
      cursor[segments[segments.length - 1]] = value;
      const next = layers.length > 0 ? [...layers] : [{}];
      next[safeIndex] = layer;
      return next;
    });
  };

  const getSelectedGradientNumber = (path: string, fallback: number) => {
    const layer = getSelectedGradientLayer();
    if (!layer) return fallback;
    const segments = path.split('.');
    let cursor: unknown = layer;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    const n = Number(cursor);
    return Number.isFinite(n) ? n : fallback;
  };

  const getSelectedGradientString = (path: string, fallback: string) => {
    const layer = getSelectedGradientLayer();
    if (!layer) return fallback;
    const segments = path.split('.');
    let cursor: unknown = layer;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    return typeof cursor === 'string' ? cursor : fallback;
  };

  const getSelectedGradientBoolean = (path: string, fallback: boolean) => {
    const layer = getSelectedGradientLayer();
    if (!layer) return fallback;
    const segments = path.split('.');
    let cursor: unknown = layer;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    return typeof cursor === 'boolean' ? cursor : fallback;
  };

  const isSelectedGradientEnabled = () => {
    const layer = getSelectedGradientLayer();
    if (!layer) return false;
    return layer.enabled === true;
  };

  const setSelectedGradientClipEnabled = (enabled: boolean) => {
    const defaultTarget = getDefaultClipTargetName();
    updateSelectedGradientLayer((current, layers) => {
      const safeIndex = Math.max(0, Math.min(activeGradientLayerIndex, Math.max(0, layers.length - 1)));
      const layer = { ...current };
      const clip = layer.clip && typeof layer.clip === 'object' ? deepClone(layer.clip as Record<string, unknown>) : {};
      const nextClip = {
        ...clip,
        enabled,
        inheritPrevious: enabled ? true : clip.inheritPrevious === true,
        targetName: enabled
          ? (typeof clip.targetName === 'string' && clip.targetName.trim().length > 0 ? clip.targetName : defaultTarget)
          : (typeof clip.targetName === 'string' ? clip.targetName : ''),
      };
      layer.clip = nextClip;
      const next = layers.length > 0 ? [...layers] : [{}];
      next[safeIndex] = layer;
      return next;
    });
  };

  const getSelectedGradientClipEnabled = () => {
    const layer = getSelectedGradientLayer();
    if (!layer) return false;
    const clip = layer.clip;
    return !!(clip && typeof clip === 'object' && (clip as Record<string, unknown>).enabled === true);
  };

  const getSelectedGradientClipTargetName = () => {
    const layer = getSelectedGradientLayer();
    if (!layer) return '';
    const clip = layer.clip;
    if (!clip || typeof clip !== 'object') return '';
    const value = (clip as Record<string, unknown>).targetName;
    return typeof value === 'string' ? value : '';
  };

  const setSelectedGradientClipTargetName = (targetName: string) => {
    updateSelectedGradientLayer((current, layers) => {
      const safeIndex = Math.max(0, Math.min(activeGradientLayerIndex, Math.max(0, layers.length - 1)));
      const layer = { ...current };
      const clip = layer.clip && typeof layer.clip === 'object' ? deepClone(layer.clip as Record<string, unknown>) : {};
      layer.clip = { ...clip, targetName };
      const next = layers.length > 0 ? [...layers] : [{}];
      next[safeIndex] = layer;
      return next;
    });
  };

  const setSelectedMaskEnabled = (enabled: boolean) => {
    if (!selectedElement) return;
    markSelectedElementDirty('mask');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const mask = element.mask && typeof element.mask === 'object' ? deepClone(element.mask) as Record<string, unknown> : {};
        const brush = mask.brush && typeof mask.brush === 'object' ? mask.brush as Record<string, unknown> : {};
        const hasCoordinateSpace = typeof mask.coordinateSpace === 'string';
        const hasStrokes = Array.isArray(mask.strokes) && mask.strokes.length > 0;
        const coordinateSpace = hasCoordinateSpace
          ? getMaskCoordinateSpace(mask)
          : (hasStrokes ? 'global' : 'local');
        return {
          ...element,
          mask: {
            ...mask,
            enabled,
            coordinateSpace,
            mode: typeof mask.mode === 'string' ? mask.mode : 'brush',
            invert: mask.invert === true,
            brush: {
              size: Number(brush.size) || 16,
              hardness: Number(brush.hardness) || 0.8,
              opacity: Number(brush.opacity) || 1,
              ...brush,
            },
            strokes: Array.isArray(mask.strokes) ? mask.strokes : [],
          },
        };
      }),
    );
  };

  const setSelectedMaskNumber = (path: string, value: number) => {
    if (!selectedElement) return;
    markSelectedElementDirty('mask');
    const segments = path.split('.');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;

        const mask = element.mask && typeof element.mask === 'object' ? deepClone(element.mask) as Record<string, unknown> : {};
        let cursor: Record<string, unknown> = mask;
        for (let i = 0; i < segments.length - 1; i += 1) {
          const key = segments[i];
          const child = cursor[key];
          if (!child || typeof child !== 'object') {
            cursor[key] = {};
          }
          cursor = cursor[key] as Record<string, unknown>;
        }
        cursor[segments[segments.length - 1]] = value;
        return { ...element, mask };
      }),
    );
  };

  const setSelectedMaskString = (path: string, value: string) => {
    if (!selectedElement) return;
    const segments = path.split('.');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;

        const mask = element.mask && typeof element.mask === 'object' ? deepClone(element.mask) as Record<string, unknown> : {};
        let cursor: Record<string, unknown> = mask;
        for (let i = 0; i < segments.length - 1; i += 1) {
          const key = segments[i];
          const child = cursor[key];
          if (!child || typeof child !== 'object') {
            cursor[key] = {};
          }
          cursor = cursor[key] as Record<string, unknown>;
        }
        cursor[segments[segments.length - 1]] = value;
        return { ...element, mask };
      }),
    );
  };

  const setSelectedMaskBoolean = (path: string, value: boolean) => {
    if (!selectedElement) return;
    markSelectedElementDirty('mask');
    const segments = path.split('.');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;

        const mask = element.mask && typeof element.mask === 'object' ? deepClone(element.mask) as Record<string, unknown> : {};
        let cursor: Record<string, unknown> = mask;
        for (let i = 0; i < segments.length - 1; i += 1) {
          const key = segments[i];
          const child = cursor[key];
          if (!child || typeof child !== 'object') {
            cursor[key] = {};
          }
          cursor = cursor[key] as Record<string, unknown>;
        }
        cursor[segments[segments.length - 1]] = value;
        return { ...element, mask };
      }),
    );
  };

  const getSelectedMaskNumber = (path: string, fallback: number) => {
    if (!selectedElement || !selectedElement.mask || typeof selectedElement.mask !== 'object') return fallback;
    const segments = path.split('.');
    let cursor: unknown = selectedElement.mask;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    const n = Number(cursor);
    return Number.isFinite(n) ? n : fallback;
  };

  const getSelectedMaskString = (path: string, fallback: string) => {
    if (!selectedElement || !selectedElement.mask || typeof selectedElement.mask !== 'object') return fallback;
    const segments = path.split('.');
    let cursor: unknown = selectedElement.mask;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    return typeof cursor === 'string' ? cursor : fallback;
  };

  const getSelectedMaskBoolean = (path: string, fallback: boolean) => {
    if (!selectedElement || !selectedElement.mask || typeof selectedElement.mask !== 'object') return fallback;
    const segments = path.split('.');
    let cursor: unknown = selectedElement.mask;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    return typeof cursor === 'boolean' ? cursor : fallback;
  };

  const isSelectedMaskEnabled = () => {
    if (!selectedElement || !selectedElement.mask || typeof selectedElement.mask !== 'object') return false;
    return (selectedElement.mask as Record<string, unknown>).enabled === true;
  };

  const clearSelectedMaskStrokes = () => {
    if (!selectedElement) return;
    markSelectedElementDirty('mask');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const mask = element.mask && typeof element.mask === 'object' ? deepClone(element.mask) as Record<string, unknown> : {};
        return { ...element, mask: resetMaskField({ ...mask, strokes: [] }, element) };
      }),
    );
  };

  const appendSelectedMaskStroke = (stroke: Record<string, unknown>) => {
    if (!selectedElement) return;
    markSelectedElementDirty('mask');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const mask = element.mask && typeof element.mask === 'object' ? deepClone(element.mask) as Record<string, unknown> : {};
        const strokes = Array.isArray(mask.strokes) ? [...mask.strokes] : [];
        strokes.push(stroke);
        const withStroke = {
          ...mask,
          coordinateSpace: 'local',
          strokes,
        };
        return {
          ...element,
          mask: updateMaskFieldForStroke(withStroke, stroke, element),
        };
      }),
    );
  };

  const getSelectedMaterialLayers = () => {
    if (!selectedElement) return [] as Array<Record<string, unknown>>;
    return normalizeLegacyMaterialLayers(selectedElement as Record<string, unknown>);
  };

  const getSelectedMaterialLayer = () => {
    const layers = getSelectedMaterialLayers();
    if (layers.length === 0) return null;
    const safeIndex = Math.max(0, Math.min(activeMaterialLayerIndex, layers.length - 1));
    return layers[safeIndex] ?? null;
  };

  const updateSelectedMaterialLayer = (updater: (layer: Record<string, unknown>, allLayers: Array<Record<string, unknown>>) => Array<Record<string, unknown>>) => {
    if (!selectedElement) return;
    markSelectedElementDirty('effects');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const layers = normalizeLegacyMaterialLayers(element as Record<string, unknown>);
        const safeIndex = Math.max(0, Math.min(activeMaterialLayerIndex, Math.max(0, layers.length - 1)));
        const current = layers[safeIndex] && typeof layers[safeIndex] === 'object' ? deepClone(layers[safeIndex]) as Record<string, unknown> : {};
        const nextLayers = updater(current, layers);
        return writeNormalizedMaterialLayers(element as Record<string, unknown>, nextLayers) as TemplateElement;
      }),
    );
  };

  const addSelectedMaterialLayer = () => {
    const defaultTarget = getDefaultClipTargetName();
    updateSelectedMaterialLayer((_current, layers) => {
      const nextLayer: Record<string, unknown> = {
        enabled: true,
        color: '#ffffff',
        opacity: 0.18,
        blendMode: 'multiply',
        clip: {
          enabled: true,
          inheritPrevious: true,
          targetName: defaultTarget,
        },
      };
      const next = [...layers, nextLayer];
      setActiveMaterialLayerIndex(Math.max(0, next.length - 1));
      return next;
    });
  };

  const removeSelectedMaterialLayer = () => {
    updateSelectedMaterialLayer((_current, layers) => {
      if (layers.length <= 1) {
        setActiveMaterialLayerIndex(0);
        return [];
      }
      const safeIndex = Math.max(0, Math.min(activeMaterialLayerIndex, layers.length - 1));
      const next = layers.filter((_, index) => index !== safeIndex);
      setActiveMaterialLayerIndex(Math.max(0, Math.min(safeIndex, next.length - 1)));
      return next;
    });
  };

  const setSelectedMaterialEnabled = (enabled: boolean) => {
    const defaultTarget = getDefaultClipTargetName();
    updateSelectedMaterialLayer((current, layers) => {
      const safeIndex = Math.max(0, Math.min(activeMaterialLayerIndex, Math.max(0, layers.length - 1)));
      const nextLayer = { ...current };
      const currentClip = nextLayer.clip && typeof nextLayer.clip === 'object' ? nextLayer.clip as Record<string, unknown> : {};
      const clip = enabled
        ? {
            ...currentClip,
            enabled: true,
            inheritPrevious: true,
            targetName: typeof currentClip.targetName === 'string' && currentClip.targetName.trim().length > 0
              ? currentClip.targetName
              : defaultTarget,
          }
        : currentClip;
      nextLayer.enabled = enabled;
      nextLayer.clip = clip;
      const next = layers.length > 0 ? [...layers] : [{}];
      next[safeIndex] = nextLayer;
      return next;
    });
  };

  const setSelectedMaterialNumber = (path: string, value: number) => {
    const segments = path.split('.');
    updateSelectedMaterialLayer((current, layers) => {
      const safeIndex = Math.max(0, Math.min(activeMaterialLayerIndex, Math.max(0, layers.length - 1)));
      const layer = { ...current };
      let cursor: Record<string, unknown> = layer;
      for (let i = 0; i < segments.length - 1; i += 1) {
        const key = segments[i];
        const child = cursor[key];
        if (!child || typeof child !== 'object') {
          cursor[key] = {};
        }
        cursor = cursor[key] as Record<string, unknown>;
      }
      cursor[segments[segments.length - 1]] = value;
      const next = layers.length > 0 ? [...layers] : [{}];
      next[safeIndex] = layer;
      return next;
    });
  };

  const setSelectedMaterialString = (path: string, value: string) => {
    const segments = path.split('.');
    updateSelectedMaterialLayer((current, layers) => {
      const safeIndex = Math.max(0, Math.min(activeMaterialLayerIndex, Math.max(0, layers.length - 1)));
      const layer = { ...current };
      let cursor: Record<string, unknown> = layer;
      for (let i = 0; i < segments.length - 1; i += 1) {
        const key = segments[i];
        const child = cursor[key];
        if (!child || typeof child !== 'object') {
          cursor[key] = {};
        }
        cursor = cursor[key] as Record<string, unknown>;
      }
      cursor[segments[segments.length - 1]] = value;
      const next = layers.length > 0 ? [...layers] : [{}];
      next[safeIndex] = layer;
      return next;
    });
  };

  const getSelectedMaterialNumber = (path: string, fallback: number) => {
    const layer = getSelectedMaterialLayer();
    if (!layer) return fallback;
    const segments = path.split('.');
    let cursor: unknown = layer;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    const n = Number(cursor);
    return Number.isFinite(n) ? n : fallback;
  };

  const getSelectedMaterialString = (path: string, fallback: string) => {
    const layer = getSelectedMaterialLayer();
    if (!layer) return fallback;
    const segments = path.split('.');
    let cursor: unknown = layer;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    return typeof cursor === 'string' ? cursor : fallback;
  };

  const isSelectedMaterialEnabled = () => {
    const layer = getSelectedMaterialLayer();
    if (!layer) return false;
    return layer.enabled === true;
  };

  const setSelectedMaterialClipEnabled = (enabled: boolean) => {
    const defaultTarget = getDefaultClipTargetName();
    updateSelectedMaterialLayer((current, layers) => {
      const safeIndex = Math.max(0, Math.min(activeMaterialLayerIndex, Math.max(0, layers.length - 1)));
      const layer = { ...current };
      const clip = layer.clip && typeof layer.clip === 'object' ? deepClone(layer.clip as Record<string, unknown>) : {};
      const nextClip = {
        ...clip,
        enabled,
        inheritPrevious: enabled ? true : clip.inheritPrevious === true,
        targetName: enabled
          ? (typeof clip.targetName === 'string' && clip.targetName.trim().length > 0 ? clip.targetName : defaultTarget)
          : (typeof clip.targetName === 'string' ? clip.targetName : ''),
      };
      layer.clip = nextClip;
      const next = layers.length > 0 ? [...layers] : [{}];
      next[safeIndex] = layer;
      return next;
    });
  };

  const getSelectedMaterialClipEnabled = () => {
    const layer = getSelectedMaterialLayer();
    if (!layer) return false;
    const clip = layer.clip;
    return !!(clip && typeof clip === 'object' && (clip as Record<string, unknown>).enabled === true);
  };

  const getSelectedMaterialClipTargetName = () => {
    const layer = getSelectedMaterialLayer();
    if (!layer) return '';
    const clip = layer.clip;
    if (!clip || typeof clip !== 'object') return '';
    const value = (clip as Record<string, unknown>).targetName;
    return typeof value === 'string' ? value : '';
  };

  const setSelectedMaterialClipTargetName = (targetName: string) => {
    updateSelectedMaterialLayer((current, layers) => {
      const safeIndex = Math.max(0, Math.min(activeMaterialLayerIndex, Math.max(0, layers.length - 1)));
      const layer = { ...current };
      const clip = layer.clip && typeof layer.clip === 'object' ? deepClone(layer.clip as Record<string, unknown>) : {};
      layer.clip = { ...clip, targetName };
      const next = layers.length > 0 ? [...layers] : [{}];
      next[safeIndex] = layer;
      return next;
    });
  };

  const setSelectedStyleAdjustEnabled = (enabled: boolean) => {
    if (!selectedElement) return;
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const styleAdjust = element.styleAdjust && typeof element.styleAdjust === 'object'
          ? deepClone(element.styleAdjust) as Record<string, unknown>
          : {};
        return { ...element, styleAdjust: { ...styleAdjust, enabled } };
      }),
    );
  };

  const setSelectedStyleAdjustNumber = (path: string, value: number) => {
    if (!selectedElement) return;
    const segments = path.split('.');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const styleAdjust = element.styleAdjust && typeof element.styleAdjust === 'object'
          ? deepClone(element.styleAdjust) as Record<string, unknown>
          : {};
        let cursor: Record<string, unknown> = styleAdjust;
        for (let i = 0; i < segments.length - 1; i += 1) {
          const key = segments[i];
          const child = cursor[key];
          if (!child || typeof child !== 'object') {
            cursor[key] = {};
          }
          cursor = cursor[key] as Record<string, unknown>;
        }
        cursor[segments[segments.length - 1]] = value;
        return { ...element, styleAdjust };
      }),
    );
  };

  const setSelectedStyleAdjustString = (path: string, value: string) => {
    if (!selectedElement) return;
    const segments = path.split('.');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const styleAdjust = element.styleAdjust && typeof element.styleAdjust === 'object'
          ? deepClone(element.styleAdjust) as Record<string, unknown>
          : {};
        let cursor: Record<string, unknown> = styleAdjust;
        for (let i = 0; i < segments.length - 1; i += 1) {
          const key = segments[i];
          const child = cursor[key];
          if (!child || typeof child !== 'object') {
            cursor[key] = {};
          }
          cursor = cursor[key] as Record<string, unknown>;
        }
        cursor[segments[segments.length - 1]] = value;
        return { ...element, styleAdjust };
      }),
    );
  };

  const getSelectedStyleAdjustNumber = (path: string, fallback: number) => {
    if (!selectedElement || !selectedElement.styleAdjust || typeof selectedElement.styleAdjust !== 'object') return fallback;
    const segments = path.split('.');
    let cursor: unknown = selectedElement.styleAdjust;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    const n = Number(cursor);
    return Number.isFinite(n) ? n : fallback;
  };

  const getSelectedStyleAdjustString = (path: string, fallback: string) => {
    if (!selectedElement || !selectedElement.styleAdjust || typeof selectedElement.styleAdjust !== 'object') return fallback;
    const segments = path.split('.');
    let cursor: unknown = selectedElement.styleAdjust;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    return typeof cursor === 'string' ? cursor : fallback;
  };

  const isSelectedStyleAdjustEnabled = () => {
    if (!selectedElement || !selectedElement.styleAdjust || typeof selectedElement.styleAdjust !== 'object') return true;
    return (selectedElement.styleAdjust as Record<string, unknown>).enabled !== false;
  };

  const setSelectedEffect3dEnabled = (enabled: boolean) => {
    if (!selectedElement) return;
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const effect3d = element.effect3d && typeof element.effect3d === 'object'
          ? deepClone(element.effect3d) as Record<string, unknown>
          : {};
        const normalized = normalizeDepthEffectRecord({ ...effect3d, enabled }) as Record<string, unknown>;
        normalized.presetKey = DEPTH_PRESET_CUSTOM_KEY;
        return { ...element, effect3d: normalized };
      }),
    );
  };

  const setSelectedEffect3dNumber = (path: string, value: number) => {
    if (!selectedElement) return;
    const segments = path.split('.');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const effect3d = element.effect3d && typeof element.effect3d === 'object'
          ? deepClone(element.effect3d) as Record<string, unknown>
          : {};
        let cursor: Record<string, unknown> = effect3d;
        for (let i = 0; i < segments.length - 1; i += 1) {
          const key = segments[i];
          const child = cursor[key];
          if (!child || typeof child !== 'object') {
            cursor[key] = {};
          }
          cursor = cursor[key] as Record<string, unknown>;
        }
        cursor[segments[segments.length - 1]] = value;
        const normalized = normalizeDepthEffectRecord(effect3d) as Record<string, unknown>;
        normalized.presetKey = DEPTH_PRESET_CUSTOM_KEY;
        return { ...element, effect3d: normalized };
      }),
    );
  };

  const setSelectedEffect3dString = (path: string, value: string) => {
    if (!selectedElement) return;
    const segments = path.split('.');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const effect3d = element.effect3d && typeof element.effect3d === 'object'
          ? deepClone(element.effect3d) as Record<string, unknown>
          : {};
        let cursor: Record<string, unknown> = effect3d;
        for (let i = 0; i < segments.length - 1; i += 1) {
          const key = segments[i];
          const child = cursor[key];
          if (!child || typeof child !== 'object') {
            cursor[key] = {};
          }
          cursor = cursor[key] as Record<string, unknown>;
        }
        cursor[segments[segments.length - 1]] = value;
        const normalized = normalizeDepthEffectRecord(effect3d) as Record<string, unknown>;
        normalized.presetKey = DEPTH_PRESET_CUSTOM_KEY;
        return { ...element, effect3d: normalized };
      }),
    );
  };

  const getSelectedEffect3dNumber = (path: string, fallback: number) => {
    if (!selectedElement) return fallback;
    const normalized = normalizeDepthEffectRecord(selectedElement.effect3d as Record<string, unknown> | undefined);
    const segments = path.split('.');
    let cursor: unknown = normalized;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    const n = Number(cursor);
    return Number.isFinite(n) ? n : fallback;
  };

  const getSelectedEffect3dString = (path: string, fallback: string) => {
    if (!selectedElement) return fallback;
    const normalized = normalizeDepthEffectRecord(selectedElement.effect3d as Record<string, unknown> | undefined);
    const segments = path.split('.');
    let cursor: unknown = normalized;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return fallback;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    return typeof cursor === 'string' ? cursor : fallback;
  };

  const isSelectedEffect3dEnabled = () => {
    if (!selectedElement) return false;
    const normalized = normalizeDepthEffectRecord(selectedElement.effect3d as Record<string, unknown> | undefined);
    return normalized.enabled === true;
  };

  const getSelectedDepthPresetKey = () => {
    if (!selectedElement || !selectedElement.effect3d || typeof selectedElement.effect3d !== 'object') return null;
    const presetKey = (selectedElement.effect3d as Record<string, unknown>).presetKey;
    if (typeof presetKey !== 'string') return null;
    return presetKey;
  };

  const normalizeDropShadowRecord = (source?: Record<string, unknown>) => {
    const safeColor = typeof source?.color === 'string' ? source.color : '#000000';
    const safeMode = source?.mode === 'inner' ? 'inner' : 'outer';
    const safeOpacity = Number(source?.opacity);
    const safeBlur = Number(source?.blur);
    const safeSpread = Number(source?.spread);
    const safeOffsetX = Number(source?.offsetX);
    const safeOffsetY = Number(source?.offsetY);

    const opacityProfile = getParameterProfile('shadowOpacity');
    const blurProfile = getParameterProfile('shadowBlur');
    const spreadProfile = getParameterProfile('shadowSpread');
    const offsetProfile = getParameterProfile('shadowOffset');
    const clampValue = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const normalized = {
      color: safeColor,
      opacity: clampValue(Number.isFinite(safeOpacity) ? safeOpacity : 0.45, opacityProfile?.renderMin ?? 0, opacityProfile?.renderMax ?? 1.0),
      blur: clampValue(Number.isFinite(safeBlur) ? safeBlur : 5, blurProfile?.renderMin ?? 0, blurProfile?.renderMax ?? 20),
      spread: clampValue(Number.isFinite(safeSpread) ? safeSpread : 0, spreadProfile?.renderMin ?? 0, spreadProfile?.renderMax ?? 20),
      offsetX: clampValue(Number.isFinite(safeOffsetX) ? safeOffsetX : 3, offsetProfile?.renderMin ?? -20, offsetProfile?.renderMax ?? 20),
      offsetY: clampValue(Number.isFinite(safeOffsetY) ? safeOffsetY : 3, offsetProfile?.renderMin ?? -20, offsetProfile?.renderMax ?? 20),
    } as Record<string, unknown>;
    normalized.mode = safeMode;
    return normalized;
  };

  const getSelectedDropShadowRecord = () => {
    if (!selectedElement || !selectedElement.dropShadow || typeof selectedElement.dropShadow !== 'object') {
      return normalizeDropShadowRecord();
    }
    return normalizeDropShadowRecord(selectedElement.dropShadow as Record<string, unknown>);
  };

  const isSelectedDropShadowEnabled = () => {
    if (!selectedElement || !selectedElement.dropShadow || typeof selectedElement.dropShadow !== 'object') return false;
    return true;
  };

  const setSelectedDropShadowEnabled = (enabled: boolean) => {
    if (!selectedElement) return;
    updateTemplateElements(
      (elements) =>
        elements.map((element) => {
          if (element.id !== selectedElement.id) return element;
          if (!enabled) {
            const nextElement = { ...element };
            delete nextElement.dropShadow;
            return nextElement;
          }
          const current = element.dropShadow && typeof element.dropShadow === 'object'
            ? (element.dropShadow as Record<string, unknown>)
            : undefined;
          return {
            ...element,
            dropShadow: normalizeDropShadowRecord(current),
          };
        }),
      'Toggle element drop shadow',
    );
  };

  const setSelectedDropShadowNumber = (key: 'opacity' | 'blur' | 'spread' | 'offsetX' | 'offsetY', value: number) => {
    if (!selectedElement) return;
    const profileKey = key === 'opacity'
      ? 'shadowOpacity'
      : key === 'blur'
        ? 'shadowBlur'
        : key === 'spread'
          ? 'shadowSpread'
          : 'shadowOffset';
    const profile = getParameterProfile(profileKey);
    const normalizedValue = normalizeMappedParameterValue(
      value,
      profile,
      profile?.renderMin ?? value,
      profile?.renderMax ?? value,
    );
    updateTemplateElements(
      (elements) =>
        elements.map((element) => {
          if (element.id !== selectedElement.id) return element;
          const current = element.dropShadow && typeof element.dropShadow === 'object'
            ? (element.dropShadow as Record<string, unknown>)
            : undefined;
          const next = normalizeDropShadowRecord(current);
          next[key] = normalizedValue;
          return {
            ...element,
            dropShadow: normalizeDropShadowRecord(next),
          };
        }),
      'Adjust element drop shadow',
    );
  };

  const getShadowProfileKeyForValue = (key: 'opacity' | 'blur' | 'spread' | 'offsetX' | 'offsetY') =>
    key === 'opacity'
      ? 'shadowOpacity'
      : key === 'blur'
        ? 'shadowBlur'
        : key === 'spread'
          ? 'shadowSpread'
          : 'shadowOffset';

  const setSelectedDropShadowUiNumber = (
    key: 'opacity' | 'blur' | 'spread' | 'offsetX' | 'offsetY',
    uiValue: number,
  ) => {
    const profile = getParameterProfile(getShadowProfileKeyForValue(key));
    if (!profile) {
      setSelectedDropShadowNumber(key, uiValue);
      return;
    }
    const mappedRenderValue = mapUiValueToRenderValue(uiValue, profile);
    setSelectedDropShadowNumber(key, mappedRenderValue);
  };

  const setSelectedDropShadowColor = (color: string) => {
    if (!selectedElement) return;
    updateTemplateElements(
      (elements) =>
        elements.map((element) => {
          if (element.id !== selectedElement.id) return element;
          const current = element.dropShadow && typeof element.dropShadow === 'object'
            ? (element.dropShadow as Record<string, unknown>)
            : undefined;
          const next = normalizeDropShadowRecord(current);
          next.color = color;
          return {
            ...element,
            dropShadow: normalizeDropShadowRecord(next),
          };
        }),
      'Set element drop shadow color',
    );
  };

  const setSelectedDropShadowString = (key: 'mode', value: string) => {
    if (!selectedElement) return;
    updateTemplateElements(
      (elements) =>
        elements.map((element) => {
          if (element.id !== selectedElement.id) return element;
          const current = element.dropShadow && typeof element.dropShadow === 'object'
            ? (element.dropShadow as Record<string, unknown>)
            : undefined;
          const next = normalizeDropShadowRecord(current);
          next[key] = value;
          return {
            ...element,
            dropShadow: normalizeDropShadowRecord(next),
          };
        }),
      'Set element drop shadow mode',
    );
  };

  const getSelectedDropShadowNumber = (key: 'opacity' | 'blur' | 'spread' | 'offsetX' | 'offsetY', fallback: number) => {
    const shadow = getSelectedDropShadowRecord();
    const raw = Number(shadow[key]);
    return Number.isFinite(raw) ? raw : fallback;
  };

  const getSelectedDropShadowUiNumber = (
    key: 'opacity' | 'blur' | 'spread' | 'offsetX' | 'offsetY',
    fallbackRenderValue: number,
  ) => {
    const renderValue = getSelectedDropShadowNumber(key, fallbackRenderValue);
    const profile = getParameterProfile(getShadowProfileKeyForValue(key));
    if (!profile) {
      return renderValue;
    }
    return mapRenderValueToUiValue(renderValue, profile);
  };

  const getSelectedDropShadowColor = (fallback: string) => {
    const shadow = getSelectedDropShadowRecord();
    return typeof shadow.color === 'string' ? shadow.color : fallback;
  };

  const getSelectedDropShadowString = (key: 'mode', fallback: string) => {
    const shadow = getSelectedDropShadowRecord();
    const raw = shadow[key];
    return typeof raw === 'string' ? raw : fallback;
  };

  const getShadowParameterInspectorRows = () => {
    const opacityProfile = getParameterProfile('shadowOpacity');
    const blurProfile = getParameterProfile('shadowBlur');
    const spreadProfile = getParameterProfile('shadowSpread');
    const offsetProfile = getParameterProfile('shadowOffset');

    type ShadowInspectorRow = {
      label: string;
      uiValue: number;
      mappedRenderValue: number;
      curve: ParameterCurve;
    };

    const rows: ShadowInspectorRow[] = [];

    const makeRow = (
      label: string,
      renderValue: number,
      profile: ReturnType<typeof getParameterProfile>,
    ) => {
      if (!profile) return;
      const uiValue = mapRenderValueToUiValue(renderValue, profile);
      const mappedRenderValue = mapUiValueToRenderValue(uiValue, profile);
      rows.push({
        label,
        uiValue,
        mappedRenderValue,
        curve: profile.curve,
      });
    };

    makeRow('Shadow Opacity', getSelectedDropShadowNumber('opacity', 0.12), opacityProfile);
    makeRow('Shadow Blur', getSelectedDropShadowNumber('blur', 1.2), blurProfile);
    makeRow('Shadow Spread', getSelectedDropShadowNumber('spread', 0), spreadProfile);
    makeRow('Offset X (abs)', Math.abs(getSelectedDropShadowNumber('offsetX', 1)), offsetProfile);
    makeRow('Offset Y (abs)', Math.abs(getSelectedDropShadowNumber('offsetY', 1)), offsetProfile);

    return rows;
  };

  const applySelectedDepthPreset = (presetKey: string) => {
    if (!selectedElement) return;
    const preset = DEPTH_PRESET_OPTIONS.find((entry) => entry.key === presetKey);
    if (!preset) return;

    updateTemplateElements(
      (elements) =>
        elements.map((element) => {
          if (element.id !== selectedElement.id) return element;
          const normalizedDefaults = normalizeDepthEffectRecord({ light: { ...DEFAULT_DEPTH_LIGHT_VECTOR } }) as Record<string, unknown>;
          const presetDepth = deepClone(preset.depth) as Record<string, unknown>;
          const presetLight = presetDepth.light && typeof presetDepth.light === 'object'
            ? (presetDepth.light as Record<string, unknown>)
            : {};
          return {
            ...element,
            effect3d: normalizeDepthEffectRecord({
              ...normalizedDefaults,
              ...presetDepth,
              light: {
                ...DEFAULT_DEPTH_LIGHT_VECTOR,
                ...presetLight,
              },
              presetKey: preset.key,
            }),
          };
        }),
      `Apply ${preset.label} depth preset`,
    );
  };

  const clearSelectedDepthPreset = () => {
    if (!selectedElement) return;
    updateTemplateElements(
      (elements) =>
        elements.map((element) => {
          if (element.id !== selectedElement.id) return element;
          const nextElement = { ...element };
          delete nextElement.effect3d;
          return nextElement;
        }),
      'Clear depth preset',
    );
  };

  useEffect(() => {
    if (!workingTemplate) return;
    try {
      if (historyPastRef.current.length === 0 && historyFutureRef.current.length === 0) {
        window.sessionStorage.removeItem(PARAMETRIC_HISTORY_STORAGE_KEY);
        return;
      }
      window.sessionStorage.setItem(
        PARAMETRIC_HISTORY_STORAGE_KEY,
        JSON.stringify({
          fingerprint: getTemplateFingerprint(workingTemplate),
          past: historyPastRef.current,
          future: historyFutureRef.current,
        }),
      );
    } catch {
      // Ignore sessionStorage failures.
    }
  }, [getTemplateFingerprint, historyTick, workingTemplate]);

  useEffect(() => {
    const storedTemplate = loadStoredTemplate();
    const storedLibrary = loadStoredLibrary();
    const storedThemes = loadStoredThemes();
    const storedProgressSnapshot = loadProgressSnapshotLocal();
    const initialTemplate = storedTemplate ?? deepClone(DEFAULT_EMPTY_TEMPLATE);

    setWorkingTemplate(initialTemplate);
    restoreCommandHistoryForTemplate(initialTemplate);

    if (storedTemplate) {
      if (storedTemplate.elements.length > 0) {
        setSelectedElementId(storedTemplate.elements[0].id ?? null);
        setSelectedPanelTarget('element');
      } else {
        setSelectedPanelTarget('layout');
      }
    } else {
      setSelectedPanelTarget('layout');
    }
    if (storedLibrary) {
      setLibrary(storedLibrary);
      void syncLibraryFromFirebase();
    } else {
      void syncLibraryFromFirebase();
    }
    if (storedThemes) {
      setThemes(storedThemes);
    }
    if (storedProgressSnapshot) {
      setProgressSnapshot(storedProgressSnapshot);
    }
    void syncThemesFromFirebase();

    // ── Restore local folder handle from IndexedDB and load per-file data ──
    void (async () => {
      const handle = await getHandleFromIDB();
      if (!handle) return;
      const granted = await requestFolderPermission(handle);
      if (!granted) return;
      setLocalFolderHandle(handle);

      // Load themes from disk and merge with what we already have.
      const diskThemesRaw = await loadAllThemeFiles(handle);
      const diskThemes = normalizeThemeEntries(diskThemesRaw);
      if (diskThemes.length > 0) {
        setThemes((prev) => mergeThemeEntries(prev, diskThemes));
      }

      // Load library entries from disk and merge.
      const diskLibRaw = await loadAllLibraryFiles(handle);
      const diskLib = normalizeLibraryEntries(diskLibRaw);
      if (diskLib.length > 0) {
        setLibrary((prev) => mergeLibraryEntries(prev, diskLib));
      }
    })();

    void renderPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreCommandHistoryForTemplate]);

  useEffect(() => {
    if (!authConfigured) return;

    if (getCurrentAuthUser()) {
      void syncLibraryFromFirebase();
      void syncThemesFromFirebase();
    }

    return subscribeAuthState((user) => {
      if (!user) return;
      void syncLibraryFromFirebase();
      void syncThemesFromFirebase();
    });
  }, [authConfigured, syncLibraryFromFirebase, syncThemesFromFirebase]);

  useEffect(() => {
    if (!selectedElement) return;
    setNameDraft(typeof selectedElement.name === 'string' ? selectedElement.name : '');
    const params = selectedElement.params && typeof selectedElement.params === 'object' ? selectedElement.params : {};
    setParamsDraft(JSON.stringify(params, null, 2));
  }, [selectedElement]);

  useEffect(() => {
    setActiveTextureLayerIndex(0);
    setActiveGradientLayerIndex(0);
    setActiveMaterialLayerIndex(0);
  }, [selectedElementId]);

  useEffect(() => {
    if (!workingTemplate || !workingTemplate.layout || typeof workingTemplate.layout !== 'object') return;
    setLayoutDraft(JSON.stringify(workingTemplate.layout, null, 2));
  }, [workingTemplate]);

  // Keep a ref so the Ctrl+Enter handler always sees latest template without stale closure.
  useEffect(() => {
    workingTemplateRef.current = workingTemplate ?? null;
  }, [workingTemplate]);

  // Debounced render: fires 2 s after the last change, or immediately on Ctrl+Enter.
  useEffect(() => {
    if (!workingTemplate) return;
    if (renderDebounceTimerRef.current !== null) clearTimeout(renderDebounceTimerRef.current);
    renderDebounceTimerRef.current = setTimeout(() => {
      renderDebounceTimerRef.current = null;
      void renderPreview(workingTemplate);
    }, 2000);
    return () => {
      if (renderDebounceTimerRef.current !== null) {
        clearTimeout(renderDebounceTimerRef.current);
        renderDebounceTimerRef.current = null;
      }
    };
  }, [colorMode, renderPreview, workingTemplate]);

  // Ctrl+Enter — force-render immediately (Ctrl+R avoided: browser page-refresh conflict).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (renderDebounceTimerRef.current !== null) {
          clearTimeout(renderDebounceTimerRef.current);
          renderDebounceTimerRef.current = null;
        }
        const tpl = workingTemplateRef.current;
        if (tpl) void renderPreview(tpl);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [renderPreview]);

  const exportPreviewAsPng = async () => {
    if (!svgMarkup) return;
    const size = resolveTemplatePixelSize(workingTemplate);
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    try {
      const img = await loadImageFromUrl(url);
      const canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, size.width, size.height);
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'parametric-layer.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const getCanvasGradientPointNumber = (target: 'texture' | 'gradient', anchor: 'from' | 'to' | 'center' | 'focal', axis: 0 | 1) => {
    const fallback = anchor === 'from'
      ? 0
      : anchor === 'to'
        ? 100
        : 50;
    if (target === 'texture') {
      return getSelectedTextureNumber(`gradient.${anchor}.${axis}`, fallback);
    }
    return getSelectedGradientNumber(`${anchor}.${axis}`, fallback);
  };

  const setCanvasGradientPointNumber = (target: 'texture' | 'gradient', anchor: 'from' | 'to' | 'center' | 'focal', axis: 0 | 1, value: number) => {
    const next = Math.max(-100, Math.min(200, value));
    if (target === 'texture') {
      setSelectedTextureNumber(`gradient.${anchor}.${axis}`, next);
      return;
    }
    setSelectedGradientNumber(`${anchor}.${axis}`, next);
  };

  const getCanvasGradientRadius = (target: 'texture' | 'gradient') => {
    if (target === 'texture') {
      return getSelectedTextureNumber('gradient.radius', 50);
    }
    return getSelectedGradientNumber('radius', 50);
  };

  const setCanvasGradientRadius = (target: 'texture' | 'gradient', value: number) => {
    const next = Math.max(0, Math.min(200, value));
    if (target === 'texture') {
      setSelectedTextureNumber('gradient.radius', next);
      return;
    }
    setSelectedGradientNumber('radius', next);
  };

  const getCanvasGradientAngleStart = (target: 'texture' | 'gradient') => {
    if (target === 'texture') {
      return getSelectedTextureNumber('gradient.angleStart', 0);
    }
    return getSelectedGradientNumber('angleStart', 0);
  };

  const setCanvasGradientAngleStart = (target: 'texture' | 'gradient', value: number) => {
    const next = Math.max(-360, Math.min(360, value));
    if (target === 'texture') {
      setSelectedTextureNumber('gradient.angleStart', next);
      return;
    }
    setSelectedGradientNumber('angleStart', next);
  };

  const getCanvasGradientKind = (target: 'texture' | 'gradient') => {
    const kind = target === 'texture'
      ? getSelectedTextureString('gradient.kind', 'linear')
      : getSelectedGradientString('kind', 'linear');
    if (kind === 'radial' || kind === 'conic') return kind;
    return 'linear';
  };

  const setCanvasGradientKind = (target: 'texture' | 'gradient', value: string) => {
    const next = value === 'radial' || value === 'conic' ? value : 'linear';
    if (target === 'texture') {
      setSelectedTextureString('gradient.kind', next);
      return;
    }
    setSelectedGradientString('kind', next);
  };

  const textureGradientKind = getCanvasGradientKind('texture');
  const elementGradientKind = getCanvasGradientKind('gradient');
  const activeHandleGradientKind = getCanvasGradientKind(gradientHandleTarget);
  const showLinearGradientHandles = activeHandleGradientKind === 'linear';
  const showRadialGradientHandles = activeHandleGradientKind === 'radial';
  const showConicGradientHandles = activeHandleGradientKind === 'conic';

  const gradientFromX = getCanvasGradientPointNumber(gradientHandleTarget, 'from', 0);
  const gradientFromY = getCanvasGradientPointNumber(gradientHandleTarget, 'from', 1);
  const gradientToX = getCanvasGradientPointNumber(gradientHandleTarget, 'to', 0);
  const gradientToY = getCanvasGradientPointNumber(gradientHandleTarget, 'to', 1);
  const gradientCenterX = getCanvasGradientPointNumber(gradientHandleTarget, 'center', 0);
  const gradientCenterY = getCanvasGradientPointNumber(gradientHandleTarget, 'center', 1);
  const gradientFocalX = getCanvasGradientPointNumber(gradientHandleTarget, 'focal', 0);
  const gradientFocalY = getCanvasGradientPointNumber(gradientHandleTarget, 'focal', 1);
  const gradientRadius = getCanvasGradientRadius(gradientHandleTarget);
  const gradientRadiusHandleX = Math.max(-100, Math.min(200, gradientCenterX + gradientRadius));
  const gradientRadiusHandleY = gradientCenterY;
  const gradientAngleStart = getCanvasGradientAngleStart(gradientHandleTarget);
  const gradientConicHandleRadius = Math.max(12, Math.min(80, gradientRadius > 0 ? gradientRadius : 24));
  const gradientAngleHandleX = gradientCenterX + Math.cos((gradientAngleStart * Math.PI) / 180) * gradientConicHandleRadius;
  const gradientAngleHandleY = gradientCenterY + Math.sin((gradientAngleStart * Math.PI) / 180) * gradientConicHandleRadius;
  const gradientLineDx = gradientToX - gradientFromX;
  const gradientLineDy = gradientToY - gradientFromY;
  const gradientLineLen = Math.max(0.1, Math.sqrt(gradientLineDx * gradientLineDx + gradientLineDy * gradientLineDy));
  const gradientLineAngle = (Math.atan2(gradientLineDy, gradientLineDx) * 180) / Math.PI;
  const showGradientCanvasHandles = selectedPanelTarget === 'element' && !!selectedElement && contextTab === 'gradient';
  const showLinearGradientCanvasHandles = showGradientCanvasHandles && showLinearGradientHandles;
  const showRadialGradientCanvasHandles = showGradientCanvasHandles && showRadialGradientHandles;
  const showConicGradientCanvasHandles = showGradientCanvasHandles && showConicGradientHandles;
  const selectedTextureKind = getSelectedTextureString('kind', 'grain');
  const showTextureCanvasHandles = selectedPanelTarget === 'element' && !!selectedElement && contextTab === 'texture';
  const showBrushedTextureHandles = showTextureCanvasHandles && selectedTextureKind === 'brushed';
  const showImageTextureHandles = showTextureCanvasHandles && selectedTextureKind === 'image';
  const brushedDirection = getSelectedTextureNumber('direction', 0);
  const brushedDirectionHandleRadius = 24;
  const brushedDirectionHandleX = 50 + Math.cos((brushedDirection * Math.PI) / 180) * brushedDirectionHandleRadius;
  const brushedDirectionHandleY = 50 + Math.sin((brushedDirection * Math.PI) / 180) * brushedDirectionHandleRadius;
  const textureImageOffsetX = getSelectedTextureNumber('image.offsetX', 0);
  const textureImageOffsetY = getSelectedTextureNumber('image.offsetY', 0);
  const textureImageScale = getSelectedTextureNumber('image.scale', 1);
  const textureImageRotation = getSelectedTextureNumber('image.rotation', 0);
  const textureImageOffsetHandleX = Math.max(0, Math.min(100, 50 + textureImageOffsetX / 2));
  const textureImageOffsetHandleY = Math.max(0, Math.min(100, 50 + textureImageOffsetY / 2));
  const textureImageScaleRadius = Math.max(2, Math.min(40, textureImageScale * 8));
  const textureImageScaleHandleX = Math.max(0, Math.min(100, textureImageOffsetHandleX + textureImageScaleRadius));
  const textureImageScaleHandleY = textureImageOffsetHandleY;
  const textureImageRotationHandleRadius = textureImageScaleRadius + 8;
  const textureImageRotationHandleX = Math.max(0, Math.min(100, textureImageOffsetHandleX + Math.cos((textureImageRotation * Math.PI) / 180) * textureImageRotationHandleRadius));
  const textureImageRotationHandleY = Math.max(0, Math.min(100, textureImageOffsetHandleY + Math.sin((textureImageRotation * Math.PI) / 180) * textureImageRotationHandleRadius));
  const showElementCanvasHandles = selectedPanelTarget === 'element' && !!selectedElement && contextTab === 'element';
  const showMaskCanvasEditor = !!selectedElement && isSelectedMaskEnabled() && isMaskBrushEditEnabled;
  const isolatedPreviewLayerStyle = { isolation: 'isolate' as const };
  const selectedTextureClipEnabled = getSelectedTextureClipEnabled();
  const selectedGradientClipEnabled = getSelectedGradientClipEnabled();
  const selectedMaterialClipEnabled = getSelectedMaterialClipEnabled();
  const selectedMaskMode = getSelectedMaskString('mode', 'brush');
  const isBrushMaskMode = selectedMaskMode === 'brush';
  const isSelectionMaskMode = selectedMaskMode === 'selection';
  const selectedTickTokenMode = getStringParam('token.mode', 'line');
  const tickStepApplicable = selectedTickTokenMode === 'line' || selectedTickTokenMode === 'text' || selectedTickTokenMode === 'icon';
  const selectedMaskSelectionShape = (() => {
    const shape = getSelectedMaskString('selection.shape', 'rect');
    if (shape === 'square' || shape === 'circle' || shape === 'oval' || shape === 'free') return shape;
    return 'rect';
  })() as MaskSelectionShape;
  const selectionMirrorHorizontal = getSelectedMaskBoolean('selection.mirrorHorizontal', false);
  const selectionMirrorVertical = getSelectedMaskBoolean('selection.mirrorVertical', false);
  const selectionControlX = Math.max(0, Math.min(100, getSelectedMaskNumber('selection.x', 50)));
  const selectionControlY = Math.max(0, Math.min(100, getSelectedMaskNumber('selection.y', 50)));
  const selectionControlWidth = Math.max(0.2, Math.min(100, getSelectedMaskNumber('selection.width', 24)));
  const selectionControlHeight = Math.max(0.2, Math.min(100, getSelectedMaskNumber('selection.height', 16)));
  const selectionControlDiameter = Math.max(0.2, Math.min(100, getSelectedMaskNumber('selection.diameter', 18)));
  const isGlobal3DLightingMode = getTemplateLightingMode() === '3d';
  const showGlobalLightingCanvasOverlay = contextTab === 'fx' && getTemplateEffectEnabled() && !isGlobal3DLightingMode;
  // Spec 074 T5: globalMaskGuideStrokes IIFE was previously here, but it
  // referenced helpers (getMaskCoordinateSpace, convertMaskStrokePoints,
  // elementMaskLocalToCanvasPoint) declared later in the function body â€”
  // hitting TDZ ReferenceError on every render that toggled global mask
  // guides on. The IIFE has been moved below those helpers (search for
  // `globalMaskGuideStrokes` further down in this file).
  const canvasMarkerLegendEntries = (() => {
    const entries: Array<{ key: string; meaning: string }> = [];
    if (showLinearGradientCanvasHandles) {
      entries.push({ key: 'S', meaning: 'Gradient Start' });
      entries.push({ key: 'E', meaning: 'Gradient End' });
    }
    if (showRadialGradientCanvasHandles) {
      entries.push({ key: 'C', meaning: 'Radial Center' });
      entries.push({ key: 'R', meaning: 'Radial Radius' });
      entries.push({ key: 'F', meaning: 'Radial Focal' });
    }
    if (showConicGradientCanvasHandles) {
      entries.push({ key: 'C', meaning: 'Conic Center' });
      entries.push({ key: 'A', meaning: 'Conic Angle' });
    }
    if (showBrushedTextureHandles) {
      entries.push({ key: 'A', meaning: 'Texture Direction Angle' });
    }
    if (showImageTextureHandles) {
      entries.push({ key: 'O', meaning: 'Image Offset' });
      entries.push({ key: 'R', meaning: 'Image Scale Radius' });
      entries.push({ key: 'A', meaning: 'Image Rotation Angle' });
    }
    if (showElementCanvasHandles) {
      entries.push({ key: 'O', meaning: 'Element Offset' });
      if (Number.isFinite(getNumericParam('radius', Number.NaN))) entries.push({ key: 'R', meaning: 'Element Radius' });
      if (showMaskCanvasEditor) {
        entries.push({ key: 'Mask', meaning: selectedMaskMode === 'selection' ? `Selection (${selectedMaskSelectionShape}) Mask Edit` : 'Brush Mask Edit' });
      }
    }
    if (showGlobalLightingCanvasOverlay) {
      entries.push({ key: 'L', meaning: 'Global Light Direction' });
    }

    // Keep order while removing duplicate key+meaning entries.
    return entries.filter((entry, index) => entries.findIndex((candidate) => candidate.key === entry.key && candidate.meaning === entry.meaning) === index);
  })();
  const globalLightAngle = getTemplateEffectNumber('angle', -35);
  const globalLightIntensity = getTemplateEffectNumber('intensity', 0.46);
  const globalLightRadius = 22 + globalLightIntensity * 20;
  const globalLightTipX = 50 + Math.cos((globalLightAngle * Math.PI) / 180) * globalLightRadius;
  const globalLightTipY = 50 + Math.sin((globalLightAngle * Math.PI) / 180) * globalLightRadius;
  const selectedOffsetX = getSelectedPlacementOffset(0);
  const selectedOffsetY = getSelectedPlacementOffset(1);
  const offsetHandleX = Math.max(0, Math.min(100, 50 + selectedOffsetX));
  const offsetHandleY = Math.max(0, Math.min(100, 50 + selectedOffsetY));
  const selectedRadius = getNumericParam('radius', Number.NaN);
  const hasRadiusHandle = Number.isFinite(selectedRadius);
  const radiusHandleX = hasRadiusHandle ? Math.max(0, Math.min(100, 50 + selectedRadius * 50)) : 50;

  const getMaskCoordinateSpace = (mask: Record<string, unknown> | null | undefined): 'local' | 'global' => {
    if (!mask || typeof mask !== 'object') return 'global';
    const raw = typeof mask.coordinateSpace === 'string' ? mask.coordinateSpace.trim().toLowerCase() : '';
    return raw === 'local' ? 'local' : 'global';
  };

  const resolveElementPlacementPoint = (element: TemplateElement | null | undefined) => {
    if (!element || !element.placement || typeof element.placement !== 'object') {
      return { x: 50, y: 50, rotation: 0 };
    }
    const placement = element.placement as { mode?: string; config?: Record<string, unknown> };
    const config = placement.config && typeof placement.config === 'object' ? placement.config : {};
    const mode = typeof placement.mode === 'string' ? placement.mode : 'center';
    const rotation = Number.isFinite(Number(config.rotation)) ? Number(config.rotation) : 0;

    if (mode === 'polar') {
      const radius = Math.max(0, Math.min(1, Number(config.radius) || 0));
      const angle = Number(config.angle) || 0;
      const rad = (angle * Math.PI) / 180;
      const r = radius * 50;
      return {
        x: 50 + r * Math.cos(rad),
        y: 50 + r * Math.sin(rad),
        rotation,
      };
    }

    if (mode === 'anchor') {
      const anchorKey = typeof config.anchor === 'string' ? config.anchor : 'center';
      const anchors: Record<string, { x: number; y: number }> = {
        center: { x: 50, y: 50 },
        top: { x: 50, y: 0 },
        bottom: { x: 50, y: 100 },
        left: { x: 0, y: 50 },
        right: { x: 100, y: 50 },
      };
      const anchor = anchors[anchorKey] ?? anchors.center;
      const offset = Array.isArray(config.offset) ? config.offset : [0, 0];
      const dx = Math.max(-50, Math.min(50, Number(offset[0]) || 0));
      const dy = Math.max(-50, Math.min(50, Number(offset[1]) || 0));
      return {
        x: anchor.x + dx,
        y: anchor.y + dy,
        rotation,
      };
    }

    const offset = Array.isArray(config.offset) ? config.offset : [0, 0];
    const dx = Math.max(-50, Math.min(50, Number(offset[0]) || 0));
    const dy = Math.max(-50, Math.min(50, Number(offset[1]) || 0));
    return {
      x: 50 + dx,
      y: 50 + dy,
      rotation,
    };
  };

  const resolveMaskTransformForElement = (element: TemplateElement | null | undefined) => {
    const placement = resolveElementPlacementPoint(element);
    const layout = workingTemplate?.layout && typeof workingTemplate.layout === 'object'
      ? workingTemplate.layout
      : {};
    const width = Math.max(1, Number((layout as Record<string, unknown>).width) || 100);
    const height = Math.max(1, Number((layout as Record<string, unknown>).height) || 100);
    return {
      width,
      height,
      centerX: (placement.x / 100) * width,
      centerY: (placement.y / 100) * height,
      rotation: placement.rotation,
    };
  };

  const canvasToElementMaskLocalPoint = (canvasPoint: { x: number; y: number }, element: TemplateElement | null | undefined) => {
    // Spec 074 T4: route through shared helper (single source of truth).
    const transform = resolveMaskTransformForElement(element);
    return mapCanvasPointToLocalShared(canvasPoint, transform);
  };

  const elementMaskLocalToCanvasPoint = (localPoint: { x: number; y: number }, element: TemplateElement | null | undefined) => {
    // Spec 074 T4: route through shared helper (single source of truth).
    const transform = resolveMaskTransformForElement(element);
    return mapLocalPointToCanvasShared(localPoint, transform);
  };

  const canvasToSelectedMaskLocalPoint = (canvasPoint: { x: number; y: number }) => {
    return canvasToElementMaskLocalPoint(canvasPoint, selectedElement);
  };

  const selectedMaskLocalToCanvasPoint = (localPoint: { x: number; y: number }) => {
    return elementMaskLocalToCanvasPoint(localPoint, selectedElement);
  };

  const convertMaskStrokePoints = (
    stroke: Record<string, unknown>,
    mapPoint: (point: { x: number; y: number }) => { x: number; y: number },
  ) => {
    const next = deepClone(stroke);
    const points = Array.isArray(next.points)
      ? (next.points.filter((point) => point && typeof point === 'object') as Array<Record<string, unknown>>)
      : [];
    if (points.length > 0) {
      next.points = points.map((point) => mapPoint({ x: Number(point.x) || 0, y: Number(point.y) || 0 }));
    }
    if (next.tool === 'selection') {
      const shape = typeof next.shape === 'string' ? next.shape : 'rect';
      if (shape !== 'free') {
        const x = Math.max(0, Math.min(100, Number(next.x) || 0));
        const y = Math.max(0, Math.min(100, Number(next.y) || 0));
        const width = Math.max(0, Math.min(100, Number(next.width) || 0));
        const height = Math.max(0, Math.min(100, Number(next.height) || 0));
        const p1 = mapPoint({ x, y });
        const p2 = mapPoint({ x: x + width, y });
        const p3 = mapPoint({ x, y: y + height });
        const p4 = mapPoint({ x: x + width, y: y + height });
        const xs = [p1.x, p2.x, p3.x, p4.x];
        const ys = [p1.y, p2.y, p3.y, p4.y];
        const minX = Math.max(0, Math.min(...xs));
        const maxX = Math.min(100, Math.max(...xs));
        const minY = Math.max(0, Math.min(...ys));
        const maxY = Math.min(100, Math.max(...ys));
        next.x = minX;
        next.y = minY;
        next.width = Math.max(0, maxX - minX);
        next.height = Math.max(0, maxY - minY);
      }
    }
    return next;
  };

  const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

  const resolveMaskFieldFrameForElement = (element: TemplateElement | null | undefined) => {
    const transform = resolveMaskTransformForElement(element);
    const renderState = element?.renderState && typeof element.renderState === 'object'
      ? element.renderState as Record<string, unknown>
      : {};
    const snapshot = renderState.snapshot && typeof renderState.snapshot === 'object'
      ? renderState.snapshot as Record<string, unknown>
      : null;
    const width = Number(snapshot?.width);
    const height = Number(snapshot?.height);
    const resolvedWidth = Number.isFinite(width) && width > 0 ? width : transform.width;
    const resolvedHeight = Number.isFinite(height) && height > 0 ? height : transform.height;
    return {
      width: Math.max(16, Math.min(2048, Math.round(resolvedWidth))),
      height: Math.max(16, Math.min(2048, Math.round(resolvedHeight))),
    };
  };

  const buildMaskFieldDataUrl = (values: Uint8ClampedArray, width: number, height: number) => {
    if (typeof document === 'undefined') return '';
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    for (let i = 0; i < values.length; i += 1) {
      const offset = i * 4;
      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = values[i];
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  };

  const decodeMaskFieldValues = (field: Record<string, unknown> | null, width: number, height: number, initialValue: number) => {
    const total = width * height;
    const out = new Uint8ClampedArray(total);
    out.fill(initialValue);
    if (!field) return out;
    const values = Array.isArray(field.values) ? field.values : [];
    if (values.length !== total) return out;
    for (let i = 0; i < total; i += 1) {
      const n = Number(values[i]);
      out[i] = Number.isFinite(n) ? Math.max(0, Math.min(255, Math.round(n))) : initialValue;
    }
    return out;
  };

  const applyMaskDeltaU8 = (values: Uint8ClampedArray, width: number, height: number, x: number, y: number, action: MaskBrushAction, strength: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    values[idx] = applyMaskValueU8(values[idx], action, strength);
  };

  const pointInPolygon = (x: number, y: number, polygon: Array<{ x: number; y: number }>) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;
      const intersects = ((yi > y) !== (yj > y))
        && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 0.000001) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  };

  const applySelectionStrokeToField = (
    values: Uint8ClampedArray,
    width: number,
    height: number,
    stroke: Record<string, unknown>,
  ) => {
    const action = stroke.action === 'reveal' ? 'reveal' : 'hide';
    const opacity = clamp01(Number(stroke.opacity));
    const shape = typeof stroke.shape === 'string' ? stroke.shape : 'rect';

    if (shape === 'free') {
      const points = Array.isArray(stroke.points)
        ? stroke.points
            .filter((p) => p && typeof p === 'object')
            .map((p) => ({
              x: (Math.max(0, Math.min(100, Number((p as Record<string, unknown>).x) || 0)) / 100) * width,
              y: (Math.max(0, Math.min(100, Number((p as Record<string, unknown>).y) || 0)) / 100) * height,
            }))
        : [];
      if (points.length < 3) return;
      const minX = Math.max(0, Math.floor(Math.min(...points.map((p) => p.x))));
      const maxX = Math.min(width - 1, Math.ceil(Math.max(...points.map((p) => p.x))));
      const minY = Math.max(0, Math.floor(Math.min(...points.map((p) => p.y))));
      const maxY = Math.min(height - 1, Math.ceil(Math.max(...points.map((p) => p.y))));
      for (let py = minY; py <= maxY; py += 1) {
        for (let px = minX; px <= maxX; px += 1) {
          if (!pointInPolygon(px + 0.5, py + 0.5, points)) continue;
          applyMaskDeltaU8(values, width, height, px, py, action, opacity);
        }
      }
      return;
    }

    const x = Math.max(0, Math.min(100, Number(stroke.x) || 0));
    const y = Math.max(0, Math.min(100, Number(stroke.y) || 0));
    const w = Math.max(0, Math.min(100, Number(stroke.width) || 0));
    const h = Math.max(0, Math.min(100, Number(stroke.height) || 0));
    const px0 = (x / 100) * width;
    const py0 = (y / 100) * height;
    const px1 = ((x + w) / 100) * width;
    const py1 = ((y + h) / 100) * height;
    const minX = Math.max(0, Math.floor(Math.min(px0, px1)));
    const maxX = Math.min(width - 1, Math.ceil(Math.max(px0, px1)));
    const minY = Math.max(0, Math.floor(Math.min(py0, py1)));
    const maxY = Math.min(height - 1, Math.ceil(Math.max(py0, py1)));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = Math.max(0.001, (maxX - minX) / 2);
    const ry = Math.max(0.001, (maxY - minY) / 2);
    const rr = Math.max(0.001, Math.min(rx, ry));

    for (let py = minY; py <= maxY; py += 1) {
      for (let px = minX; px <= maxX; px += 1) {
        let covered = true;
        if (shape === 'circle') {
          const dx = px + 0.5 - cx;
          const dy = py + 0.5 - cy;
          covered = (dx * dx + dy * dy) <= rr * rr;
        } else if (shape === 'oval') {
          const dx = (px + 0.5 - cx) / rx;
          const dy = (py + 0.5 - cy) / ry;
          covered = (dx * dx + dy * dy) <= 1;
        }
        if (!covered) continue;
        applyMaskDeltaU8(values, width, height, px, py, action, opacity);
      }
    }
  };

  const applyBrushStrokeToField = (
    values: Uint8ClampedArray,
    width: number,
    height: number,
    stroke: Record<string, unknown>,
  ) => {
    const points = Array.isArray(stroke.points)
      ? stroke.points
          .filter((p) => p && typeof p === 'object')
          .map((p) => ({
            x: (Math.max(0, Math.min(100, Number((p as Record<string, unknown>).x) || 0)) / 100) * width,
            y: (Math.max(0, Math.min(100, Number((p as Record<string, unknown>).y) || 0)) / 100) * height,
          }))
      : [];
    if (points.length === 0) return;

    const action = stroke.action === 'reveal' ? 'reveal' : 'hide';
    const baseOpacity = clamp01(Number(stroke.opacity));
    const hardness = clamp01(Number(stroke.hardness));
    const scale = Math.max(0.0001, Math.min(width, height) / 100);
    const strokeWidth = Math.max(0.2, (Math.max(1, Number(stroke.size) || 16) / 5.2)) * scale;
    const radius = Math.max(0.5, strokeWidth / 2);

    const stamp = (sx: number, sy: number) => {
      const minX = Math.max(0, Math.floor(sx - radius - 1));
      const maxX = Math.min(width - 1, Math.ceil(sx + radius + 1));
      const minY = Math.max(0, Math.floor(sy - radius - 1));
      const maxY = Math.min(height - 1, Math.ceil(sy + radius + 1));
      for (let py = minY; py <= maxY; py += 1) {
        for (let px = minX; px <= maxX; px += 1) {
          const dx = px + 0.5 - sx;
          const dy = py + 0.5 - sy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > radius) continue;
          const t = dist / radius;
          const falloff = t <= hardness
            ? 1
            : Math.max(0, 1 - ((t - hardness) / Math.max(0.0001, 1 - hardness)));
          const strength = maskStrength(baseOpacity, falloff, 1);
          if (strength <= 0) continue;
          applyMaskDeltaU8(values, width, height, px, py, action, strength);
        }
      }
    };

    for (let i = 0; i < points.length; i += 1) {
      const current = points[i];
      stamp(current.x, current.y);
      if (i === 0) continue;
      const prev = points[i - 1];
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = Math.max(0.5, radius * 0.5);
      const steps = Math.max(1, Math.ceil(dist / step));
      for (let s = 1; s < steps; s += 1) {
        const t = s / steps;
        stamp(prev.x + dx * t, prev.y + dy * t);
      }
    }
  };

  const updateMaskFieldForStroke = (
    mask: Record<string, unknown>,
    stroke: Record<string, unknown>,
    element: TemplateElement,
  ) => {
    const frame = resolveMaskFieldFrameForElement(element);
    const field = mask.field && typeof mask.field === 'object' ? mask.field as Record<string, unknown> : null;
    // initialValue is always 255: renderer alpha-flips (255→hidden, 0→shown) when invert=true,
    // so both paths start with "all opaque" and the alpha-flip in the renderer handles the inversion.
    const initialValue = 255;
    const values = decodeMaskFieldValues(field, frame.width, frame.height, initialValue);
    // When invert=true, the renderer alpha-flips the field image (255→hidden, 0→shown).
    // So we must flip the stroke action so the user-visible intent (reveal/hide) is correct.
    const effectiveStroke = mask.invert === true
      ? { ...stroke, action: stroke.action === 'reveal' ? 'hide' : 'reveal' }
      : stroke;
    if (effectiveStroke.tool === 'selection') {
      applySelectionStrokeToField(values, frame.width, frame.height, effectiveStroke);
    } else {
      applyBrushStrokeToField(values, frame.width, frame.height, effectiveStroke);
    }
    const imageDataUrl = buildMaskFieldDataUrl(values, frame.width, frame.height);
    return {
      ...mask,
      field: {
        version: 'v1',
        source: 'editable-buffer',
        valuesEncoding: 'u8',
        width: frame.width,
        height: frame.height,
        values: Array.from(values),
        imageDataUrl,
        updatedAt: Date.now(),
      },
    };
  };

  const resetMaskField = (mask: Record<string, unknown>, element: TemplateElement) => {
    const frame = resolveMaskFieldFrameForElement(element);
    // Always 255: renderer alpha-flip handles invert=true display (255→alpha-flip→0→hidden).
    const values = new Uint8ClampedArray(frame.width * frame.height);
    values.fill(255);
    const imageDataUrl = buildMaskFieldDataUrl(values, frame.width, frame.height);
    return {
      ...mask,
      field: {
        version: 'v1',
        source: 'editable-buffer',
        valuesEncoding: 'u8',
        width: frame.width,
        height: frame.height,
        values: Array.from(values),
        imageDataUrl,
        updatedAt: Date.now(),
      },
    };
  };

  const ensureSelectedMaskLocalCoordinateSpace = () => {
    if (!selectedElement) return;
    markSelectedElementDirty('mask');
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const mask = element.mask && typeof element.mask === 'object' ? deepClone(element.mask) as Record<string, unknown> : null;
        if (!mask) return element;
        const space = getMaskCoordinateSpace(mask);
        if (space === 'local') return element;
        const strokes = Array.isArray(mask.strokes)
          ? (mask.strokes.filter((entry) => entry && typeof entry === 'object') as Array<Record<string, unknown>>)
          : [];
        const convertedStrokes = strokes.map((stroke) =>
          convertMaskStrokePoints(stroke, (point) => canvasToElementMaskLocalPoint(point, element)),
        );
        return {
          ...element,
          mask: {
            ...mask,
            coordinateSpace: 'local',
            strokes: convertedStrokes,
          },
        };
      }),
      'Migrate mask to local space',
    );
  };

  // Spec 074 T6 / K.04 / K.05 / K.08 / V.02: load-time migration. Walks every
  // element in the working template, converts any mask whose strokes are still
  // stored in legacy 'global' canvas-space into the canonical 'local' space.
  // Idempotent: re-runs are no-ops once all masks are local.
  // Logs to console.debug for audit (dev-only via Vite DCE in prod).
  useEffect(() => {
    if (!workingTemplate || !Array.isArray(workingTemplate.elements)) return;
    const needsMigration = workingTemplate.elements.some((element) => {
      if (!element || typeof element !== 'object') return false;
      const mask = element.mask;
      if (!mask || typeof mask !== 'object') return false;
      if ((mask as Record<string, unknown>).enabled !== true) return false;
      return getMaskCoordinateSpace(mask as Record<string, unknown>) !== 'local';
    });
    if (!needsMigration) return;
    const migratedIds: Array<string> = [];
    updateTemplateElements((elements) =>
      elements.map((element) => {
        if (!element || typeof element !== 'object') return element;
        const mask = element.mask && typeof element.mask === 'object'
          ? deepClone(element.mask) as Record<string, unknown>
          : null;
        if (!mask) return element;
        if (mask.enabled !== true) return element;
        const space = getMaskCoordinateSpace(mask);
        if (space === 'local') return element;
        const strokes = Array.isArray(mask.strokes)
          ? (mask.strokes.filter((entry) => entry && typeof entry === 'object') as Array<Record<string, unknown>>)
          : [];
        const convertedStrokes = strokes.map((stroke) =>
          convertMaskStrokePoints(stroke, (point) => canvasToElementMaskLocalPoint(point, element)),
        );
        migratedIds.push(String(element.id ?? '?'));
        return {
          ...element,
          mask: {
            ...mask,
            coordinateSpace: 'local',
            strokes: convertedStrokes,
          },
        };
      }),
      'Migrate masks to local space (load)',
    );
    if (migratedIds.length > 0 && typeof console !== 'undefined' && console.debug) {
      console.debug('[mask] migrated to local space:', migratedIds);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workingTemplate]);

  // Spec 074 T7 / B.08 / B.09: stroke abort policy. When the selected element
  // changes or the mask edit mode is turned off, any in-progress paint stroke
  // or selection-shape draft must be discarded so it cannot leak onto the new
  // element / persist into a non-edit state.
  useEffect(() => {
    setActiveMaskStroke(null);
    setActiveMaskSelectionShape(null);
    setIsMaskPainting(false);
  }, [selectedElement?.id, showMaskCanvasEditor]);

  const mapMaskStrokeLocalToCanvas = (stroke: Record<string, unknown>) =>
    convertMaskStrokePoints(stroke, (point) => selectedMaskLocalToCanvasPoint(point));

  // Spec 074 T5: relocated below its helper dependencies to avoid TDZ.
  const globalMaskGuideStrokes = (() => {
    if (!showGlobalMaskGuides || !workingTemplate || !Array.isArray(workingTemplate.elements)) {
      return [] as Array<{ key: string; stroke: Record<string, unknown> }>;
    }

    return workingTemplate.elements.flatMap((element, elementIndex) => {
      if (!element || typeof element !== 'object' || element.visible === false) {
        return [] as Array<{ key: string; stroke: Record<string, unknown> }>;
      }
      if (!element.mask || typeof element.mask !== 'object') {
        return [] as Array<{ key: string; stroke: Record<string, unknown> }>;
      }

      const mask = element.mask as Record<string, unknown>;
      if (mask.enabled !== true) {
        return [] as Array<{ key: string; stroke: Record<string, unknown> }>;
      }

      const coordinateSpace = getMaskCoordinateSpace(mask);

      const strokes = Array.isArray(mask.strokes)
        ? (mask.strokes.filter((entry) => entry && typeof entry === 'object') as Array<Record<string, unknown>>)
        : [];

      return strokes.map((stroke, strokeIndex) => ({
        key: `${String(element.id ?? `layer-${elementIndex}`)}-${strokeIndex}`,
        stroke: coordinateSpace === 'local'
          ? convertMaskStrokePoints(stroke, (point) => elementMaskLocalToCanvasPoint(point, element))
          : stroke,
      }));
    });
  })();

  const selectedMaskStrokes = (() => {
    if (!selectedElement || !selectedElement.mask || typeof selectedElement.mask !== 'object') return [] as Array<Record<string, unknown>>;
    const mask = selectedElement.mask as Record<string, unknown>;
    const strokes = mask.strokes;
    if (!Array.isArray(strokes)) return [] as Array<Record<string, unknown>>;
    const base = strokes.filter((entry) => entry && typeof entry === 'object') as Array<Record<string, unknown>>;
    const coordinateSpace = getMaskCoordinateSpace(mask);
    return coordinateSpace === 'local'
      ? base.map((stroke) => mapMaskStrokeLocalToCanvas(stroke))
      : base;
  })();

  const finishMaskStroke = () => {
    if (activeMaskStroke && activeMaskStroke.points.length > 0) {
      appendSelectedMaskStroke(activeMaskStroke as unknown as Record<string, unknown>);
    }
    setActiveMaskStroke(null);
    setIsMaskPainting(false);
  };

  const buildSelectionStrokeFromBounds = (
    shape: MaskSelectionShape,
    action: MaskBrushAction,
    opacity: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): Record<string, unknown> | null => {
    const x1 = Math.max(0, Math.min(100, startX));
    const y1 = Math.max(0, Math.min(100, startY));
    const x2 = Math.max(0, Math.min(100, endX));
    const y2 = Math.max(0, Math.min(100, endY));
    let minX = Math.min(x1, x2);
    let minY = Math.min(y1, y2);
    let width = Math.abs(x2 - x1);
    let height = Math.abs(y2 - y1);

    if (shape === 'square' || shape === 'circle') {
      const side = Math.max(width, height);
      const signX = x2 >= x1 ? 1 : -1;
      const signY = y2 >= y1 ? 1 : -1;
      const forcedX = x1 + signX * side;
      const forcedY = y1 + signY * side;
      minX = Math.min(x1, forcedX);
      minY = Math.min(y1, forcedY);
      width = side;
      height = side;
    }

    if (width <= 0.2 || height <= 0.2) return null;
    return {
      tool: 'selection',
      shape,
      action,
      opacity,
      x: minX,
      y: minY,
      width,
      height,
    };
  };

  const mirrorSelectionStroke = (
    stroke: Record<string, unknown>,
    mirrorHorizontal: boolean,
    mirrorVertical: boolean,
  ): Record<string, unknown> | null => {
    if (!mirrorHorizontal && !mirrorVertical) return deepClone(stroke);
    if (stroke.tool !== 'selection') return null;
    const shape = typeof stroke.shape === 'string' ? stroke.shape : 'rect';

    // Spec 075 T3: mirror in CANVAS space so element rotation is honoured.
    // Legacy mirrored in mask-LOCAL space (e.g. x -> 100-x), which only matched
    // canvas axes when rotation === 0. For rotated elements (e.g. 90deg) local-X
    // aligns with canvas-Y, so 'mirror horizontal' flipped the wrong visual axis.
    // Fix: local -> canvas (rotation-aware) -> mirror in canvas -> canvas -> local.
    // Rect/circle/oval are symmetric about both local axes, so mirroring the
    // centre point is sufficient (width/height preserved).
    const mirrorCanvas = (point: { x: number; y: number }) => ({
      x: mirrorHorizontal ? 100 - point.x : point.x,
      y: mirrorVertical ? 100 - point.y : point.y,
    });
    const mirrorLocal = (localPoint: { x: number; y: number }) => {
      const canvas = selectedMaskLocalToCanvasPoint(localPoint);
      const flipped = mirrorCanvas(canvas);
      return canvasToSelectedMaskLocalPoint(flipped);
    };

    if (shape === 'free') {
      const points = Array.isArray(stroke.points) ? stroke.points as Array<{ x: number; y: number }> : [];
      if (points.length < 3) return null;
      const mirrored = points.map((point) => {
        const local = {
          x: Math.max(0, Math.min(100, Number(point.x) || 0)),
          y: Math.max(0, Math.min(100, Number(point.y) || 0)),
        };
        const back = mirrorLocal(local);
        return {
          x: Math.max(0, Math.min(100, back.x)),
          y: Math.max(0, Math.min(100, back.y)),
        };
      });
      return { ...deepClone(stroke), points: mirrored };
    }

    const x = Math.max(0, Math.min(100, Number(stroke.x) || 0));
    const y = Math.max(0, Math.min(100, Number(stroke.y) || 0));
    const width = Math.max(0, Math.min(100, Number(stroke.width) || 0));
    const height = Math.max(0, Math.min(100, Number(stroke.height) || 0));
    const centerLocal = { x: x + width / 2, y: y + height / 2 };
    const newCenterLocal = mirrorLocal(centerLocal);
    const mirroredX = Math.max(0, Math.min(100, newCenterLocal.x - width / 2));
    const mirroredY = Math.max(0, Math.min(100, newCenterLocal.y - height / 2));

    return {
      ...deepClone(stroke),
      x: mirroredX,
      y: mirroredY,
      width,
      height,
    };
  };

  const appendSelectionStrokeWithMirrors = (baseStroke: Record<string, unknown>) => {
    const variants: Array<Record<string, unknown>> = [deepClone(baseStroke)];
    if (selectionMirrorHorizontal) {
      const mirrored = mirrorSelectionStroke(baseStroke, true, false);
      if (mirrored) variants.push(mirrored);
    }
    if (selectionMirrorVertical) {
      const mirrored = mirrorSelectionStroke(baseStroke, false, true);
      if (mirrored) variants.push(mirrored);
    }
    if (selectionMirrorHorizontal && selectionMirrorVertical) {
      const mirrored = mirrorSelectionStroke(baseStroke, true, true);
      if (mirrored) variants.push(mirrored);
    }

    const unique = new Set<string>();
    variants.forEach((variant) => {
      const key = JSON.stringify(variant);
      if (unique.has(key)) return;
      unique.add(key);
      appendSelectedMaskStroke(variant);
    });
  };

  const finishMaskSelectionShapeDraft = () => {
    if (activeMaskSelectionShape) {
      if (activeMaskSelectionShape.shape === 'free') {
        const points = Array.isArray(activeMaskSelectionShape.points) ? activeMaskSelectionShape.points : [];
        if (points.length >= 3) {
          const freeStroke = {
            tool: 'selection',
            shape: 'free',
            action: activeMaskSelectionShape.action,
            opacity: activeMaskSelectionShape.opacity,
            points: points.map((point) => ({
              x: Math.max(0, Math.min(100, Number(point.x) || 0)),
              y: Math.max(0, Math.min(100, Number(point.y) || 0)),
            })),
          };
          appendSelectionStrokeWithMirrors(freeStroke);
        }
      } else {
        let shapeStroke = buildSelectionStrokeFromBounds(
          activeMaskSelectionShape.shape,
          activeMaskSelectionShape.action,
          activeMaskSelectionShape.opacity,
          activeMaskSelectionShape.startX,
          activeMaskSelectionShape.startY,
          activeMaskSelectionShape.endX,
          activeMaskSelectionShape.endY,
        );
        if (!shapeStroke) {
          // Single-click placement: use configured size centered at click point.
          const halfWidth = (activeMaskSelectionShape.shape === 'circle' || activeMaskSelectionShape.shape === 'square')
            ? selectionControlDiameter / 2
            : selectionControlWidth / 2;
          const halfHeight = (activeMaskSelectionShape.shape === 'circle' || activeMaskSelectionShape.shape === 'square')
            ? selectionControlDiameter / 2
            : selectionControlHeight / 2;
          shapeStroke = buildSelectionStrokeFromBounds(
            activeMaskSelectionShape.shape,
            activeMaskSelectionShape.action,
            activeMaskSelectionShape.opacity,
            activeMaskSelectionShape.startX - halfWidth,
            activeMaskSelectionShape.startY - halfHeight,
            activeMaskSelectionShape.startX + halfWidth,
            activeMaskSelectionShape.startY + halfHeight,
          );
        }
        if (shapeStroke) {
          appendSelectionStrokeWithMirrors(shapeStroke);
          const sx = Math.max(0, Math.min(100, Number(shapeStroke.x) || 0));
          const sy = Math.max(0, Math.min(100, Number(shapeStroke.y) || 0));
          const sw = Math.max(0.2, Math.min(100, Number(shapeStroke.width) || 0));
          const sh = Math.max(0.2, Math.min(100, Number(shapeStroke.height) || 0));
          setSelectedMaskNumber('selection.x', sx + sw / 2);
          setSelectedMaskNumber('selection.y', sy + sh / 2);
          if (activeMaskSelectionShape.shape === 'circle' || activeMaskSelectionShape.shape === 'square') {
            setSelectedMaskNumber('selection.diameter', Math.max(sw, sh));
          } else {
            setSelectedMaskNumber('selection.width', sw);
            setSelectedMaskNumber('selection.height', sh);
          }
        }
      }
    }
    setActiveMaskSelectionShape(null);
  };

  const addSelectionShapeFromControls = () => {
    if (!isSelectionMaskMode || selectedMaskSelectionShape === 'free') return;
    const halfWidth = (selectedMaskSelectionShape === 'circle' || selectedMaskSelectionShape === 'square')
      ? selectionControlDiameter / 2
      : selectionControlWidth / 2;
    const halfHeight = (selectedMaskSelectionShape === 'circle' || selectedMaskSelectionShape === 'square')
      ? selectionControlDiameter / 2
      : selectionControlHeight / 2;
    const stroke = buildSelectionStrokeFromBounds(
      selectedMaskSelectionShape,
      maskBrushAction,
      getSelectedMaskNumber('brush.opacity', 1),
      selectionControlX - halfWidth,
      selectionControlY - halfHeight,
      selectionControlX + halfWidth,
      selectionControlY + halfHeight,
    );
    if (stroke) {
      appendSelectionStrokeWithMirrors(stroke);
      const sx = Math.max(0, Math.min(100, Number(stroke.x) || 0));
      const sy = Math.max(0, Math.min(100, Number(stroke.y) || 0));
      const sw = Math.max(0.2, Math.min(100, Number(stroke.width) || 0));
      const sh = Math.max(0.2, Math.min(100, Number(stroke.height) || 0));
      setSelectedMaskNumber('selection.x', sx + sw / 2);
      setSelectedMaskNumber('selection.y', sy + sh / 2);
      if (selectedMaskSelectionShape === 'circle' || selectedMaskSelectionShape === 'square') {
        setSelectedMaskNumber('selection.diameter', Math.max(sw, sh));
      } else {
        setSelectedMaskNumber('selection.width', sw);
        setSelectedMaskNumber('selection.height', sh);
      }
    }
  };

  const activeSelectionDraftMetrics = (() => {
    if (!activeMaskSelectionShape || activeMaskSelectionShape.shape === 'free') return null;
    const stroke = buildSelectionStrokeFromBounds(
      activeMaskSelectionShape.shape,
      activeMaskSelectionShape.action,
      activeMaskSelectionShape.opacity,
      activeMaskSelectionShape.startX,
      activeMaskSelectionShape.startY,
      activeMaskSelectionShape.endX,
      activeMaskSelectionShape.endY,
    );
    if (!stroke) return null;
    const x = Math.max(0, Math.min(100, Number(stroke.x) || 0));
    const y = Math.max(0, Math.min(100, Number(stroke.y) || 0));
    const width = Math.max(0.2, Math.min(100, Number(stroke.width) || 0));
    const height = Math.max(0.2, Math.min(100, Number(stroke.height) || 0));
    return {
      x: x + width / 2,
      y: y + height / 2,
      width,
      height,
      diameter: Math.max(width, height),
    };
  })();

  const selectionControlDisplayX = activeSelectionDraftMetrics ? activeSelectionDraftMetrics.x : selectionControlX;
  const selectionControlDisplayY = activeSelectionDraftMetrics ? activeSelectionDraftMetrics.y : selectionControlY;
  const selectionControlDisplayWidth = activeSelectionDraftMetrics ? activeSelectionDraftMetrics.width : selectionControlWidth;
  const selectionControlDisplayHeight = activeSelectionDraftMetrics ? activeSelectionDraftMetrics.height : selectionControlHeight;
  const selectionControlDisplayDiameter = activeSelectionDraftMetrics ? activeSelectionDraftMetrics.diameter : selectionControlDiameter;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_8%_12%,#1e293b_0%,#0b1020_35%,#08090c_100%)] text-white p-4 md:p-6">
      {/* ── Crash-recovery banner ───────────────────────────────────────── */}
      {autoSaveRecovery && (
        <div className="mb-4 mx-auto w-full max-w-[1700px] flex items-center justify-between gap-3 rounded-xl border border-amber-700 bg-amber-950/60 px-4 py-2.5 shadow-lg">
          <div>
            <span className="text-[12px] font-semibold text-amber-300">Auto-save found</span>
            <span className="ml-2 text-[11px] text-amber-400/80">
              from {new Date(autoSaveRecovery._autoSavedAt as string).toLocaleString()} — restore to recover your work?
            </span>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => restoreFromAutoSave(autoSaveRecovery)}
              className="rounded border border-amber-600 bg-amber-900/50 px-3 py-1 text-[11px] text-amber-200 hover:bg-amber-800/60 font-medium"
            >
              Restore
            </button>
            <button
              type="button"
              onClick={() => setAutoSaveRecovery(null)}
              className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      <section className="mx-auto w-full max-w-[1700px] rounded-2xl border border-zinc-800/80 bg-zinc-950/90 p-4 md:p-6 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-amber-300">Deterministic Engine</p>
            <h1 className="mt-2 text-2xl font-semibold">Parametric Watchface Designer</h1>
            <p className="mt-2 inline-flex items-center rounded border border-zinc-700 bg-zinc-900/70 px-2 py-1 text-[11px] tracking-[0.08em] text-zinc-300">
              Build {buildVersion}
            </p>
            <p className="mt-2 text-sm text-zinc-300">
              Left: element library. Center: preview + layers. Right: tabbed control inspector.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            onClick={() => navigate('/studio')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Studio
          </Button>
        </div>

        <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span className="rounded border border-zinc-700 bg-zinc-950/70 px-2 py-1">Global Controls</span>
              <span className="rounded border border-zinc-700 bg-zinc-950/70 px-2 py-1">Top Bar Dock</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFocusMode((prev) => !prev)}
                className="rounded border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
              >
                {isFocusMode ? 'Exit Focus' : 'Focus Mode'}
              </button>

              <button
                type="button"
                onClick={() => setIsSoloMode((prev) => !prev)}
                className={`rounded border px-2 py-1 text-[11px] hover:bg-zinc-800 ${isSoloMode ? 'border-amber-400 bg-amber-500/10 text-amber-200' : 'border-zinc-700 bg-zinc-950/70 text-zinc-300'}`}
              >
                {isSoloMode ? 'Solo On' : 'Solo Off'}
              </button>

              <button
                type="button"
                onClick={() => setIsDimMode((prev) => !prev)}
                className={`rounded border px-2 py-1 text-[11px] hover:bg-zinc-800 ${isDimMode ? 'border-amber-400 bg-amber-500/10 text-amber-200' : 'border-zinc-700 bg-zinc-950/70 text-zinc-300'}`}
              >
                {isDimMode ? 'Dim On' : 'Dim Off'}
              </button>

              <label className="flex items-center gap-2 rounded border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-[11px] text-zinc-300">
                <input
                  type="checkbox"
                  checked={showGlobalMaskGuides}
                  onChange={(e) => setShowGlobalMaskGuides(e.target.checked)}
                />
                Global mask guides
              </label>

              <button
                type="button"
                onClick={runUndoCommand}
                disabled={!canUndo}
                className={`rounded border px-2 py-1 text-[11px] ${canUndo ? 'border-zinc-700 bg-zinc-950/70 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-800 bg-zinc-950/30 text-zinc-600'}`}
                title="Undo last template command"
              >
                Undo
              </button>

              <button
                type="button"
                onClick={runRedoCommand}
                disabled={!canRedo}
                className={`rounded border px-2 py-1 text-[11px] ${canRedo ? 'border-zinc-700 bg-zinc-950/70 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-800 bg-zinc-950/30 text-zinc-600'}`}
                title="Redo last template command"
              >
                Redo
              </button>

              <button
                type="button"
                onClick={() => {
                  let lsTemplate: unknown = null;
                  let lsTemplateRaw: string | null = null;
                  try {
                    lsTemplateRaw = window.localStorage.getItem(PARAMETRIC_TEMPLATE_STORAGE_KEY);
                    if (lsTemplateRaw) lsTemplate = JSON.parse(lsTemplateRaw);
                  } catch (err) {
                    lsTemplate = { __error: String(err) };
                  }
                  const payload = {
                    spec: '075-debug-export-v1',
                    ts: new Date().toISOString(),
                    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
                    href: typeof window !== 'undefined' ? window.location.href : '',
                    selectedElementId,
                    selectedElement: selectedElement ?? null,
                    workingTemplate,
                    localStorageTemplate: lsTemplate,
                    localStorageRawLength: lsTemplateRaw ? lsTemplateRaw.length : 0,
                    svgMarkupLength: svgMarkup ? svgMarkup.length : 0,
                    svgOverlayLayersCount: svgOverlayLayers.length,
                    svgMarkup,
                    svgOverlayLayers,
                    svgOverlayMarkup,
                    svgTopOverlayMarkup,
                    colorMode,
                    isSoloMode,
                    isDimMode,
                  };
                  const text = JSON.stringify(payload, null, 2);
                  setDebugExportText(text);
                  setDebugExportCopied(false);
                  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                    navigator.clipboard.writeText(text).then(
                      () => setDebugExportCopied(true),
                      () => setDebugExportCopied(false),
                    );
                  }
                }}
                className="rounded border border-amber-700 bg-amber-950/60 px-2 py-1 text-[11px] text-amber-200 hover:bg-amber-900"
                title="Spec 075 â€” copy live template + selected element + preview SVG to clipboard for diagnosis"
              >
                ðŸ”§ Debug Export
              </button>

              {contextTab === 'gradient' ? (
                <label className="flex items-center gap-2 rounded border border-zinc-700 bg-zinc-950/70 px-2 py-1">
                  <span className="text-[11px] text-zinc-400">Handle Target</span>
                  <select
                    value={gradientHandleTarget}
                    onChange={(e) => setGradientHandleTarget(e.target.value === 'texture' ? 'texture' : 'gradient')}
                    className="h-7 rounded border border-zinc-700 bg-zinc-950 px-2 text-[11px] text-zinc-100"
                  >
                    <option value="gradient">gradient</option>
                    <option value="texture">texture</option>
                  </select>
                </label>
              ) : null}

              <label className="flex items-center gap-2 rounded border border-zinc-700 bg-zinc-950/70 px-2 py-1">
                <span className="text-[11px] text-zinc-400">Color</span>
                <select
                  value={colorMode}
                  onChange={(e) => setColorMode(e.target.value as ColorMode)}
                  className="h-7 rounded border border-zinc-700 bg-zinc-950 px-2 text-[11px] text-zinc-100"
                >
                  <option value="off">off</option>
                  <option value="warning">warning</option>
                  <option value="enforce">enforce</option>
                </select>
              </label>

              <label className="flex items-center gap-2 rounded border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-[11px] text-zinc-300">
                <input
                  type="checkbox"
                  checked={getTemplateEffectEnabled()}
                  onChange={(e) => updateTemplateEffects3d((fx) => ({ ...fx, enabled: e.target.checked }))}
                />
                Global light
              </label>

              <button
                type="button"
                onClick={() => setIsGlobalPanelCollapsed((prev) => !prev)}
                className="rounded border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
              >
                {isGlobalPanelCollapsed ? 'Expand Lighting' : 'Collapse Lighting'}
              </button>

              <span className="rounded border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-[11px] text-zinc-300">
                Active target: {selectedPanelTarget}
              </span>
              <span className="rounded border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-[11px] text-zinc-300">
                Layers: {(workingTemplate?.elements ?? []).length}
              </span>
            </div>
          </div>

          {!isGlobalPanelCollapsed ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <label className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1">
                <span className="text-[11px] text-zinc-500">Lighting Space</span>
                <select
                  value={getTemplateLightingMode()}
                  onChange={(e) => updateTemplateEffects3d((fx) => ({
                    ...fx,
                    lightingMode: e.target.value === '3d' ? '3d' : '2d',
                    mode: e.target.value === '3d'
                      ? ((fx.mode === 'inner' || fx.mode === 'front') ? fx.mode : 'outer')
                      : (fx.mode === 'inner' ? 'inner' : 'outer'),
                  }))}
                  className="mt-1 h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                >
                  <option value="2d">2D Circumference</option>
                  <option value="3d">3D Depth</option>
                </select>
              </label>

              <label className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1">
                <span className="text-[11px] text-zinc-500">{isGlobal3DLightingMode ? 'Depth Mode' : 'Mode'}</span>
                <select
                  value={(() => {
                    const raw = workingTemplate?.effects3d && typeof workingTemplate.effects3d === 'object'
                      ? (workingTemplate.effects3d as Record<string, unknown>).mode
                      : undefined;
                    if (isGlobal3DLightingMode && raw === 'front') return 'front';
                    return raw === 'inner' ? 'inner' : 'outer';
                  })()}
                  onChange={(e) => updateTemplateEffects3d((fx) => ({
                    ...fx,
                    mode: e.target.value === 'inner'
                      ? 'inner'
                      : (isGlobal3DLightingMode && e.target.value === 'front' ? 'front' : 'outer'),
                  }))}
                  className="mt-1 h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                >
                  <option value="outer">Emboss (Outer)</option>
                  <option value="inner">Engrave (Inner)</option>
                  {isGlobal3DLightingMode ? <option value="front">Front Rim</option> : null}
                </select>
              </label>

              <label className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1">
                <span className="text-[11px] text-zinc-500">Angle {Math.round(getTemplateEffectNumber('angle', -35))}deg</span>
                <input
                  type="range"
                  min={DEPTH_CONTROL_LIMITS.angle.min}
                  max={DEPTH_CONTROL_LIMITS.angle.max}
                  step={DEPTH_CONTROL_LIMITS.angle.step}
                  value={getTemplateEffectNumber('angle', -35)}
                  onChange={(e) => updateTemplateEffects3d((fx) => ({ ...fx, angle: Number(e.target.value) }))}
                  className="mt-1 w-full"
                />
              </label>

              {isGlobal3DLightingMode ? (
                <>
                  <label className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1">
                    <span className="text-[11px] text-zinc-500">Light X {formatSignedPercent(getTemplateEffectPathNumber('light.x', 0))}</span>
                    <input
                      type="range"
                      min={DEPTH_CONTROL_LIMITS.lightAxis.min}
                      max={DEPTH_CONTROL_LIMITS.lightAxis.max}
                      step={DEPTH_CONTROL_LIMITS.lightAxis.step}
                      value={getTemplateEffectPathNumber('light.x', 0)}
                      onChange={(e) => updateTemplateEffects3d((fx) => ({
                        ...fx,
                        light: {
                          ...(fx.light && typeof fx.light === 'object' ? fx.light as Record<string, unknown> : {}),
                          x: Number(e.target.value),
                        },
                      }))}
                      className="mt-1 w-full"
                    />
                  </label>

                  <label className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1">
                    <span className="text-[11px] text-zinc-500">Light Y {formatSignedPercent(getTemplateEffectPathNumber('light.y', 0))}</span>
                    <input
                      type="range"
                      min={DEPTH_CONTROL_LIMITS.lightAxis.min}
                      max={DEPTH_CONTROL_LIMITS.lightAxis.max}
                      step={DEPTH_CONTROL_LIMITS.lightAxis.step}
                      value={getTemplateEffectPathNumber('light.y', 0)}
                      onChange={(e) => updateTemplateEffects3d((fx) => ({
                        ...fx,
                        light: {
                          ...(fx.light && typeof fx.light === 'object' ? fx.light as Record<string, unknown> : {}),
                          y: Number(e.target.value),
                        },
                      }))}
                      className="mt-1 w-full"
                    />
                  </label>

                  <label className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1">
                    <span className="text-[11px] text-zinc-500">Light Z {formatSignedPercent(getTemplateEffectPathNumber('light.z', 1))}</span>
                    <input
                      type="range"
                      min={DEPTH_CONTROL_LIMITS.lightAxisZ.min}
                      max={DEPTH_CONTROL_LIMITS.lightAxisZ.max}
                      step={DEPTH_CONTROL_LIMITS.lightAxisZ.step}
                      value={getTemplateEffectPathNumber('light.z', 1)}
                      onChange={(e) => updateTemplateEffects3d((fx) => ({
                        ...fx,
                        light: {
                          ...(fx.light && typeof fx.light === 'object' ? fx.light as Record<string, unknown> : {}),
                          z: Number(e.target.value),
                        },
                      }))}
                      className="mt-1 w-full"
                    />
                  </label>
                </>
              ) : null}

              <label className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1">
                <span className="text-[11px] text-zinc-500">Intensity {formatPercent(getTemplateEffectNumber('intensity', 0.46))}</span>
                <input
                  type="range"
                  min={DEPTH_CONTROL_LIMITS.intensity.min}
                  max={DEPTH_CONTROL_LIMITS.intensity.max}
                  step={DEPTH_CONTROL_LIMITS.intensity.step}
                  value={getTemplateEffectNumber('intensity', 0.46)}
                  onChange={(e) => updateTemplateEffects3d((fx) => ({ ...fx, intensity: Number(e.target.value) }))}
                  className="mt-1 w-full"
                />
              </label>

              <label className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1">
                <span className="text-[11px] text-zinc-500">Opacity {formatPercent(getTemplateEffectNumber('opacity', 0.8))}</span>
                <input
                  type="range"
                  min={DEPTH_CONTROL_LIMITS.opacity.min}
                  max={DEPTH_CONTROL_LIMITS.opacity.max}
                  step={DEPTH_CONTROL_LIMITS.opacity.step}
                  value={getTemplateEffectNumber('opacity', 0.8)}
                  onChange={(e) => updateTemplateEffects3d((fx) => ({ ...fx, opacity: Number(e.target.value) }))}
                  className="mt-1 w-full"
                />
              </label>

              <label className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1">
                <span className="text-[11px] text-zinc-500">Distance {formatUnit(getTemplateEffectNumber('distance', 1.2), 'x', 1)}</span>
                <input
                  type="range"
                  min={DEPTH_CONTROL_LIMITS.distance.min}
                  max={DEPTH_CONTROL_LIMITS.distance.max}
                  step={DEPTH_CONTROL_LIMITS.distance.step}
                  value={getTemplateEffectNumber('distance', 1.2)}
                  onChange={(e) => updateTemplateEffects3d((fx) => ({ ...fx, distance: Number(e.target.value) }))}
                  className="mt-1 w-full"
                />
              </label>

              <label className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1">
                <span className="text-[11px] text-zinc-500">Falloff {formatUnit(getTemplateEffectNumber('falloff', 1), 'x', 2)}</span>
                <input
                  type="range"
                  min={DEPTH_CONTROL_LIMITS.falloff.min}
                  max={DEPTH_CONTROL_LIMITS.falloff.max}
                  step={DEPTH_CONTROL_LIMITS.falloff.step}
                  value={getTemplateEffectNumber('falloff', 1)}
                  onChange={(e) => updateTemplateEffects3d((fx) => ({ ...fx, falloff: Number(e.target.value) }))}
                  className="mt-1 w-full"
                />
              </label>

              <label className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1">
                <span className="text-[11px] text-zinc-500">White Balance {formatSignedPercent(getTemplateEffectNumber('whiteBalance', 0))}</span>
                <input
                  type="range"
                  min={DEPTH_CONTROL_LIMITS.whiteBalance.min}
                  max={DEPTH_CONTROL_LIMITS.whiteBalance.max}
                  step={DEPTH_CONTROL_LIMITS.whiteBalance.step}
                  value={getTemplateEffectNumber('whiteBalance', 0)}
                  onChange={(e) => updateTemplateEffects3d((fx) => ({ ...fx, whiteBalance: Number(e.target.value) }))}
                  className="mt-1 w-full"
                />
              </label>

              <label className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1">
                <span className="text-[11px] text-zinc-500">Spreading {formatPercent(getTemplateEffectNumber('spread', 0))}</span>
                <input
                  type="range"
                  min={DEPTH_CONTROL_LIMITS.spread.min}
                  max={DEPTH_CONTROL_LIMITS.spread.max}
                  step={DEPTH_CONTROL_LIMITS.spread.step}
                  value={getTemplateEffectNumber('spread', 0)}
                  onChange={(e) => updateTemplateEffects3d((fx) => ({ ...fx, spread: Number(e.target.value) }))}
                  className="mt-1 w-full"
                />
              </label>
            </div>
          ) : null}
        </div>

        <div className={`mt-4 grid gap-4 ${isFocusMode ? 'grid-cols-1' : 'xl:grid-cols-[240px_minmax(0,1fr)_320px]'}`}>
          {!isFocusMode ? (
          <aside className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 space-y-4 xl:max-h-[calc(100vh-190px)] xl:min-h-[calc(100vh-190px)] xl:overflow-auto">
            <h2 className="text-sm font-semibold text-zinc-100">Element Drawer</h2>
            <p className="text-xs text-zinc-400">Pick from categories, then Add to Canvas. Saved items persist in this browser local storage.</p>
            {drawerNotice ? <p className="text-xs text-emerald-400">{drawerNotice}</p> : null}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAllDrawerSectionsCollapsed(false)}
                className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
              >
                Expand All Drawers
              </button>
              <button
                type="button"
                onClick={() => setAllDrawerSectionsCollapsed(true)}
                className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
              >
                Collapse All Drawers
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedPanelTarget('layout');
                setSelectedElementId(null);
              }}
              className={`w-full rounded border px-3 py-2 text-left ${selectedPanelTarget === 'layout' ? 'border-amber-400 bg-amber-500/10' : 'border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800/70'}`}
            >
              <p className="text-xs font-medium text-zinc-100">Layout Space</p>
              <p className="mt-1 text-[11px] text-zinc-400">Click to edit layout controls on the right panel.</p>
            </button>

            <div className="rounded border border-zinc-800 bg-zinc-900/60 p-2">
              <p className="text-[11px] uppercase tracking-wide text-zinc-400">Themes Library</p>
              <p className="mt-1 text-[11px] text-zinc-500">Save all current layers as one theme pack, then load later.</p>

              <div className="mt-2 rounded border border-zinc-800 bg-zinc-950/40 p-2">
                <p className="text-[11px] text-zinc-400">Work Progress Snapshot (separate from drawer/themes)</p>
                <p className="mt-1 text-[11px] text-zinc-500">Use this while building. It does not add reusable theme entries.</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={saveCurrentProgressSnapshot}
                    className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                  >
                    Save Progress
                  </button>
                  <button
                    type="button"
                    onClick={loadProgressSnapshot}
                    disabled={!progressSnapshot}
                    className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Load Progress
                  </button>
                </div>
                <div className="mt-2 border-t border-zinc-800 pt-2">
                  <p className="text-[11px] text-zinc-500">Export / Import all data (elements, themes, progress) as a file on your disk. No size limit, no cloud.</p>
                  <div className="mt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={exportAllDataToFile}
                      className="rounded border border-emerald-800 bg-emerald-950/40 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-900/40"
                    >
                      Export All → File
                    </button>
                    <button
                      type="button"
                      onClick={importAllDataFromFile}
                      className="rounded border border-sky-800 bg-sky-950/40 px-2 py-1 text-[11px] text-sky-300 hover:bg-sky-900/40"
                    >
                      Import All ← File
                    </button>
                  </div>
                </div>

                {/* ── Local disk folder (File System Access API) ── */}
                {isFileSystemAccessSupported() && (
                  <div className="mt-2 border-t border-zinc-800 pt-2 space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-400">Local Disk Folder</p>
                    <p className="text-[10px] text-zinc-500">
                      Each theme and element gets its own <code className="text-zinc-400">.json</code> file in the folder you pick.
                      Survives browser cache clears. Works on localhost. When online, Firebase is still used in addition.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={async () => {
                          const handle = await pickLocalDataFolder();
                          if (!handle) return;
                          setLocalFolderHandle(handle);
                          // Write all current themes + library entries to disk immediately.
                          for (const t of themes) {
                            void saveThemeFile(handle, t as { id: string; name: string; [key: string]: unknown }).catch(() => {});
                          }
                          for (const e of library) {
                            void saveLibraryFile(handle, e as { id: string; name: string; [key: string]: unknown }).catch(() => {});
                          }
                          setDrawerNotice(`Local folder set: ${handle.name}. All themes & elements written to disk.`);
                        }}
                        className="rounded border border-violet-700 bg-violet-950/40 px-2 py-1 text-[11px] text-violet-200 hover:bg-violet-900/40"
                      >
                        📁 {localFolderHandle ? `Change folder (${localFolderHandle.name})` : 'Set local data folder…'}
                      </button>
                      {localFolderHandle && (
                        <button
                          type="button"
                          onClick={async () => {
                            await clearHandleFromIDB();
                            setLocalFolderHandle(null);
                            setDrawerNotice('Local folder unlinked. Data still in localStorage & Firebase.');
                          }}
                          className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800"
                        >
                          Unlink
                        </button>
                      )}
                    </div>
                    {localFolderHandle && (
                      <p className="text-[10px] text-emerald-400">✓ Linked: {localFolderHandle.name} — themes & elements save to disk automatically.</p>
                    )}
                  </div>
                )}

                {/* ── Auto-save ─────────────────────────────── */}
                <div className="mt-2 border-t border-zinc-800 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-zinc-400">Auto-Save (crash protection)</p>
                    <button
                      type="button"
                      onClick={() => setAutoSaveEnabled(v => !v)}
                      className={`rounded px-2 py-0.5 text-[10px] font-medium border ${autoSaveEnabled ? 'border-emerald-700 bg-emerald-950/50 text-emerald-300' : 'border-zinc-700 bg-zinc-800 text-zinc-400'}`}
                    >
                      {autoSaveEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {autoSaveEnabled && (
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-zinc-500">Every</span>
                      {AUTO_SAVE_INTERVAL_OPTIONS.map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setAutoSaveIntervalMin(m)}
                          className={`rounded px-1.5 py-0.5 text-[10px] border ${autoSaveIntervalMin === m ? 'border-amber-600 bg-amber-950/50 text-amber-300' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    {lastAutoSaveAt ? (
                      <span className="text-[10px] text-zinc-500">Last saved: {lastAutoSaveAt.toLocaleTimeString()}</span>
                    ) : (
                      <span className="text-[10px] text-zinc-600">No save yet this session</span>
                    )}
                    <button
                      type="button"
                      onClick={downloadAutoSaveAsFile}
                      className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800"
                    >
                      ↓ Download last auto-save
                    </button>
                  </div>
                </div>
              </div>
            
              <div className="mt-2 flex gap-2">
                <input
                  value={themeNameDraft}
                  onChange={(e) => setThemeNameDraft(e.target.value)}
                  placeholder="Theme name"
                  className="h-8 w-full rounded border border-zinc-700 bg-zinc-950 px-2 text-[11px] text-zinc-100"
                />
                <button
                  type="button"
                  onClick={saveCurrentAsTheme}
                  className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                >
                  Save Theme
                </button>
              </div>

              <div className="mt-2 max-h-36 overflow-auto space-y-2">
                {visibleThemes.map((theme) => (
                  <div key={theme.id} className="rounded border border-zinc-800 bg-zinc-900 p-2">
                    <p className="text-xs font-medium text-zinc-200">{theme.name}</p>
                    <p className="text-[11px] text-zinc-500">{(theme.template.elements ?? []).length} layers</p>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={themeNameDrafts[theme.id] ?? theme.name}
                        onChange={(e) => setThemeNameDrafts((prev) => ({ ...prev, [theme.id]: e.target.value }))}
                        className="h-7 w-full rounded border border-zinc-700 bg-zinc-950 px-2 text-[11px] text-zinc-100"
                      />
                      <button
                        type="button"
                        onClick={() => renameThemeById(theme.id)}
                        className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                      >
                        Rename
                      </button>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => applyThemeById(theme.id)}
                        className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteThemeById(theme.id)}
                        className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {visibleThemes.length === 0 ? <p className="text-[11px] text-zinc-500">No saved themes yet.</p> : null}
              </div>
            </div>

            <div className="max-h-80 overflow-auto space-y-3 pr-1">
              {groupedLibrary.map(({ category, entries, fallbackElement }) => {
                const isDrawerCollapsed = drawerCollapsedByCategory[category] === true;
                return (
                <div key={category} className="rounded border border-zinc-800 bg-zinc-950/50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-400">{category}</p>
                    <button
                      type="button"
                      onClick={() => setDrawerCollapsedByCategory((prev) => ({ ...prev, [category]: !isDrawerCollapsed }))}
                      className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                    >
                      {isDrawerCollapsed ? 'Expand' : 'Collapse'}
                    </button>
                  </div>

                  {!isDrawerCollapsed ? (
                    <>

                  <div className="mt-2 rounded border border-zinc-800 bg-zinc-900/60 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Type Draft JSON</p>
                    <p className="mt-1 text-[11px] text-zinc-500">Paste/edit JSON for this element type.</p>
                    {category === 'Free Objects' ? (
                      <label className="mt-2 block space-y-1">
                        <span className="text-[11px] text-zinc-500">Free Shape Type</span>
                        <select
                          value={freeObjectShapeType}
                          onChange={(e) => setFreeObjectShapeType(e.target.value)}
                          className="h-8 w-full rounded border border-zinc-700 bg-zinc-950 px-2 text-[11px] text-zinc-100"
                        >
                          {FREE_OBJECT_SHAPE_OPTIONS.map((item) => (
                            <option key={item.type} value={item.type}>{item.label}</option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <label className="mt-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isCategoryHeaderLocked(category)}
                        onChange={(e) => setCategoryHeaderLocks((prev) => ({ ...prev, [category]: e.target.checked }))}
                      />
                      <span className="text-[11px] text-zinc-400">
                        Lock type/role header for this type
                      </span>
                    </label>
                    {isCategoryHeaderLocked(category) ? (
                      <p className="mt-1 text-[11px] text-amber-300">
                        Enforced header: {resolveCategoryHeader(category, fallbackElement).type} / {resolveCategoryHeader(category, fallbackElement).role}
                      </p>
                    ) : null}
                    <textarea
                      value={getCategoryDraftText(category, fallbackElement)}
                      onChange={(e) => setCategoryDrafts((prev) => ({ ...prev, [category]: e.target.value }))}
                      className="mt-2 h-24 w-full resize-y rounded border border-zinc-800 bg-zinc-950 p-2 font-mono text-[11px] text-zinc-300"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => addNewElementFromDefaults(category, fallbackElement)}
                        className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                      >
                        New
                      </button>
                      <button
                        type="button"
                        onClick={() => addCategoryDraftToCanvas(category, fallbackElement)}
                        className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                      >
                        Add Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => saveCategoryDraftToLibrary(category, fallbackElement)}
                        className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                      >
                        Save Draft
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 rounded border border-zinc-800 bg-zinc-900/50 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Saved {category} Elements ({entries.length})</p>
                    <div className="mt-2 space-y-2">
                    {entries.map((entry) => (
                      <div key={entry.id} className="rounded border border-zinc-800 bg-zinc-900 p-2">
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => addElementToCanvas(entry.element)}
                            className="w-full text-left"
                          >
                            <p className="text-xs font-medium text-zinc-200">{entry.name}</p>
                          </button>

                          <div className="flex gap-2">
                            <input
                              value={libraryNameDrafts[entry.id] ?? entry.name}
                              onChange={(e) => setLibraryNameDrafts((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                              className="h-7 w-full rounded border border-zinc-700 bg-zinc-950 px-2 text-[11px] text-zinc-100"
                            />
                            <button
                              type="button"
                              onClick={() => renameLibraryEntry(entry.id)}
                              className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                            >
                              Rename
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => addElementToCanvas(entry.element)}
                            className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDraftJson(JSON.stringify(entry.element, null, 2));
                              setCategoryDrafts((prev) => ({ ...prev, [category]: JSON.stringify(entry.element, null, 2) }));
                              setDrawerNotice(`${category}: copied element JSON to draft box.`);
                            }}
                            className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                          >
                            JSON
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteLibraryEntry(entry.id)}
                            className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {entries.length === 0 ? <p className="text-[11px] text-zinc-500">No saved elements in this type yet.</p> : null}
                    </div>
                  </div>
                    </>
                  ) : null}
                </div>
                );
              })}
            </div>

            <div className="rounded border border-zinc-800 bg-zinc-950/60 p-2">
              <p className="text-[11px] uppercase tracking-wide text-zinc-400">JSON Input (Element or Full Template)</p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Paste element JSON, full template JSON, or layout-only JSON to update template space.
              </p>
              <textarea
                value={draftJson}
                onChange={(e) => handleDraftJsonChange(e.target.value)}
                className="mt-2 h-40 w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 p-2 font-mono text-[11px] leading-5 text-zinc-300"
              />
              {draftError ? <p className="mt-2 text-xs text-red-400">{draftError}</p> : null}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDraftJson(BASE_TEMPLATE_DRAFT)}
                  className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                >
                  Use Base JSON
                </button>
                <button
                  type="button"
                  onClick={addDraftToCanvas}
                  className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                >
                  Add to Canvas
                </button>
                <button
                  type="button"
                  onClick={saveDraftTemplateToLibraryAndTheme}
                  className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                >
                  Save Full JSON
                </button>
                <button
                  type="button"
                  onClick={saveDraftToLibrary}
                  className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                >
                  Save to Drawer
                </button>
              </div>
            </div>
          </aside>
          ) : null}

          <section className={`space-y-4 min-w-0 ${isFocusMode ? 'mx-auto w-full max-w-[980px]' : 'xl:self-start'}`}>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-100">Preview</h2>
                <div className="flex items-center gap-2">
                  {svgMarkup ? (
                    <Button
                      type="button"
                      className="h-9 bg-emerald-600 text-white hover:bg-emerald-500"
                      onClick={() => void exportPreviewAsPng()}
                    >
                      Export PNG
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    className="h-9 bg-amber-500 text-black hover:bg-amber-400"
                    onClick={() => void renderPreview()}
                    disabled={isRendering}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isRendering ? 'animate-spin' : ''}`} />
                    {isRendering ? 'Rendering...' : 'Apply Preview'}
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid place-items-center rounded-lg border border-zinc-800 bg-black/60 p-4 min-h-[360px]">
                {svgMarkup ? (
                  <div className="relative w-full max-w-[520px]">
                    <div
                      style={isolatedPreviewLayerStyle}
                      className={isDimMode && !isSoloMode && selectedElement ? 'opacity-45' : ''}
                      dangerouslySetInnerHTML={{ __html: svgMarkup }}
                    />
                    {!isSoloMode && svgOverlayLayers.length > 0
                      ? svgOverlayLayers.map((layerMarkup, layerIndex) => (
                        <div
                          key={`stacked-layer-${layerIndex}`}
                          className="pointer-events-none absolute inset-0"
                          style={isolatedPreviewLayerStyle}
                          dangerouslySetInnerHTML={{ __html: layerMarkup }}
                        />
                      ))
                      : null}
                    {!isSoloMode && svgOverlayMarkup ? (
                      <div
                        className="pointer-events-none absolute inset-0"
                        style={isolatedPreviewLayerStyle}
                        dangerouslySetInnerHTML={{ __html: svgOverlayMarkup }}
                      />
                    ) : null}
                    {!isSoloMode && svgTopOverlayMarkup ? (
                      <div
                        className="pointer-events-none absolute inset-0"
                        style={isolatedPreviewLayerStyle}
                        dangerouslySetInnerHTML={{ __html: svgTopOverlayMarkup }}
                      />
                    ) : null}
                    {pixelEnforcedDataUrl ? (
                      <img
                        src={pixelEnforcedDataUrl}
                        alt="Enforced pixel preview"
                        className="pointer-events-none absolute inset-0 h-full w-full"
                      />
                    ) : null}
                    {pixelWarningOverlayDataUrl ? (
                      <img
                        src={pixelWarningOverlayDataUrl}
                        alt="Warning pixel overlay"
                        className="pointer-events-none absolute inset-0 h-full w-full"
                      />
                    ) : null}

                    {showGlobalMaskGuides && globalMaskGuideStrokes.length > 0 ? (
                      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        {globalMaskGuideStrokes.map(({ key, stroke }) => {
                          const points = Array.isArray(stroke.points)
                            ? (stroke.points
                              .filter((point) => point && typeof point === 'object')
                              .map((point) => ({
                                x: Math.max(0, Math.min(100, Number((point as Record<string, unknown>).x) || 0)),
                                y: Math.max(0, Math.min(100, Number((point as Record<string, unknown>).y) || 0)),
                              })) as Array<{ x: number; y: number }>)
                            : [];
                          const action = stroke.action === 'reveal' ? 'reveal' : 'hide';
                          const strokeColor = action === 'reveal' ? '#22c55e' : '#ef4444';
                          const opacity = Math.max(0.08, Math.min(1, Number(stroke.opacity) || 1)) * 0.72;
                          if (stroke.tool === 'selection') {
                            const shape = typeof stroke.shape === 'string' ? stroke.shape : 'rect';
                            if (shape === 'free' && points.length >= 3) {
                              const pointsString = points.map((point) => `${point.x},${point.y}`).join(' ');
                              return (
                                <polygon
                                  key={`global-mask-free-${key}`}
                                  points={pointsString}
                                  fill={strokeColor}
                                  fillOpacity={opacity * 0.2}
                                  stroke={strokeColor}
                                  strokeOpacity={opacity}
                                  strokeWidth={0.42}
                                />
                              );
                            }

                            const x = Math.max(0, Math.min(100, Number(stroke.x) || 0));
                            const y = Math.max(0, Math.min(100, Number(stroke.y) || 0));
                            const width = Math.max(0, Math.min(100, Number(stroke.width) || 0));
                            const height = Math.max(0, Math.min(100, Number(stroke.height) || 0));
                            if (shape === 'circle') {
                              const radius = Math.max(0, Math.min(width, height) / 2);
                              return (
                                <circle
                                  key={`global-mask-circle-${key}`}
                                  cx={x + width / 2}
                                  cy={y + height / 2}
                                  r={radius}
                                  fill={strokeColor}
                                  fillOpacity={opacity * 0.2}
                                  stroke={strokeColor}
                                  strokeOpacity={opacity}
                                  strokeWidth={0.46}
                                />
                              );
                            }

                            if (shape === 'oval') {
                              return (
                                <ellipse
                                  key={`global-mask-oval-${key}`}
                                  cx={x + width / 2}
                                  cy={y + height / 2}
                                  rx={Math.max(0, width / 2)}
                                  ry={Math.max(0, height / 2)}
                                  fill={strokeColor}
                                  fillOpacity={opacity * 0.2}
                                  stroke={strokeColor}
                                  strokeOpacity={opacity}
                                  strokeWidth={0.46}
                                />
                              );
                            }

                            return (
                              <rect
                                key={`global-mask-rect-${key}`}
                                x={x}
                                y={y}
                                width={width}
                                height={height}
                                fill={strokeColor}
                                fillOpacity={opacity * 0.2}
                                stroke={strokeColor}
                                strokeOpacity={opacity}
                                strokeWidth={0.46}
                              />
                            );
                          }

                          if (points.length === 0) return null;
                          const pointsString = points.map((point) => `${point.x},${point.y}`).join(' ');
                          const strokeWidth = Math.max(0.2, Number(stroke.size) / 5.2);
                          return (
                            <polyline
                              key={`global-mask-stroke-${key}`}
                              points={pointsString}
                              fill="none"
                              stroke={strokeColor}
                              strokeOpacity={opacity}
                              strokeWidth={strokeWidth}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          );
                        })}
                      </svg>
                    ) : null}

                    {showGlobalLightingCanvasOverlay ? (
                      <>
                        <div
                          className="pointer-events-none absolute h-[2px] bg-cyan-300/80"
                          style={{
                            left: '50%',
                            top: '50%',
                            width: `${globalLightRadius}%`,
                            transform: `translateY(-50%) rotate(${globalLightAngle}deg)`,
                            transformOrigin: '0 50%',
                          }}
                        />
                        <div
                          className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/60 bg-cyan-200"
                          style={{ left: `${globalLightTipX}%`, top: `${globalLightTipY}%` }}
                        />
                      </>
                    ) : null}

                    {selectedPanelTarget === 'element' && selectedElement ? (
                      <div
                        className={`absolute inset-0 ${showMaskCanvasEditor ? 'cursor-crosshair' : ''}`}
                        onMouseDown={(event) => {
                          if (!showMaskCanvasEditor) return;
                          const target = event.target as HTMLElement;
                          if (target.closest('button')) return;
                          ensureSelectedMaskLocalCoordinateSpace();
                          const rect = event.currentTarget.getBoundingClientRect();
                          if (rect.width <= 0 || rect.height <= 0) return;
                          const x = ((event.clientX - rect.left) / rect.width) * 100;
                          const y = ((event.clientY - rect.top) / rect.height) * 100;
                          const localPoint = canvasToSelectedMaskLocalPoint({ x, y });
                          setMaskCursorPoint({ x, y });
                          const maskMode = getSelectedMaskString('mode', 'brush');
                          if (maskMode === 'selection') {
                            beginCanvasInteraction();
                            const shape = selectedMaskSelectionShape;
                            setActiveMaskSelectionShape({
                              action: maskBrushAction,
                              shape,
                              startX: localPoint.x,
                              startY: localPoint.y,
                              endX: localPoint.x,
                              endY: localPoint.y,
                              opacity: getSelectedMaskNumber('brush.opacity', 1),
                              points: shape === 'free' ? [{ x: localPoint.x, y: localPoint.y }] : undefined,
                            });
                            return;
                          }
                          beginCanvasInteraction();
                          setIsMaskPainting(true);
                          setActiveMaskStroke({
                            action: maskBrushAction,
                            size: getSelectedMaskNumber('brush.size', 16),
                            hardness: getSelectedMaskNumber('brush.hardness', 0.8),
                            opacity: getSelectedMaskNumber('brush.opacity', 1),
                            points: [{ x: localPoint.x, y: localPoint.y }],
                          });
                        }}
                        onMouseMove={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect();
                          if (rect.width <= 0 || rect.height <= 0) return;
                          const x = ((event.clientX - rect.left) / rect.width) * 100;
                          const y = ((event.clientY - rect.top) / rect.height) * 100;
                          const localPoint = canvasToSelectedMaskLocalPoint({ x, y });
                          if (showMaskCanvasEditor) {
                            setMaskCursorPoint({ x, y });
                          }
                          if (showGradientCanvasHandles && draggingGradientHandle) {
                            if (draggingGradientHandle === 'radius') {
                              const dx = x - gradientCenterX;
                              const dy = y - gradientCenterY;
                              setCanvasGradientRadius(gradientHandleTarget, Math.sqrt(dx * dx + dy * dy));
                            } else if (draggingGradientHandle === 'angle') {
                              const dx = x - gradientCenterX;
                              const dy = y - gradientCenterY;
                              const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                              setCanvasGradientAngleStart(gradientHandleTarget, angle);
                            } else {
                              setCanvasGradientPointNumber(gradientHandleTarget, draggingGradientHandle, 0, x);
                              setCanvasGradientPointNumber(gradientHandleTarget, draggingGradientHandle, 1, y);
                            }
                          }
                          if (showTextureCanvasHandles && draggingTextureHandle) {
                            if (draggingTextureHandle === 'direction') {
                              const dx = x - 50;
                              const dy = y - 50;
                              const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                              setSelectedTextureNumber('direction', angle);
                            } else if (draggingTextureHandle === 'imageOffset') {
                              setSelectedTextureNumber('image.offsetX', Math.max(-100, Math.min(100, (x - 50) * 2)));
                              setSelectedTextureNumber('image.offsetY', Math.max(-100, Math.min(100, (y - 50) * 2)));
                            } else if (draggingTextureHandle === 'imageScale') {
                              const dx = x - textureImageOffsetHandleX;
                              const dy = y - textureImageOffsetHandleY;
                              const radius = Math.sqrt(dx * dx + dy * dy);
                              setSelectedTextureNumber('image.scale', Math.max(0.1, Math.min(5, radius / 8)));
                            } else if (draggingTextureHandle === 'imageRotation') {
                              const dx = x - textureImageOffsetHandleX;
                              const dy = y - textureImageOffsetHandleY;
                              const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                              setSelectedTextureNumber('image.rotation', angle);
                            }
                          }
                          if (showElementCanvasHandles && draggingOffsetHandle) {
                            const ox = Math.max(-50, Math.min(50, x - 50));
                            const oy = Math.max(-50, Math.min(50, y - 50));
                            setSelectedPlacementOffset(ox, oy);
                          }
                          if (showElementCanvasHandles && draggingRadiusHandle && hasRadiusHandle) {
                            const dx = x - 50;
                            const dy = y - 50;
                            const r = Math.max(0, Math.min(1, Math.sqrt(dx * dx + dy * dy) / 50));
                            setNumericParam('radius', r);
                          }
                          if (showMaskCanvasEditor && isMaskPainting) {
                            setActiveMaskStroke((prev) => {
                              if (!prev) return prev;
                              const last = prev.points[prev.points.length - 1];
                              if (last) {
                                const dx = localPoint.x - last.x;
                                const dy = localPoint.y - last.y;
                                if (Math.sqrt(dx * dx + dy * dy) < 0.6) return prev;
                              }
                              return { ...prev, points: [...prev.points, { x: localPoint.x, y: localPoint.y }] };
                            });
                          }
                          if (showMaskCanvasEditor && activeMaskSelectionShape) {
                            setActiveMaskSelectionShape((prev) => {
                              if (!prev) return prev;
                              if (prev.shape === 'free') {
                                const points = Array.isArray(prev.points) ? prev.points : [];
                                const last = points[points.length - 1];
                                if (last) {
                                  const dx = localPoint.x - last.x;
                                  const dy = localPoint.y - last.y;
                                  if (Math.sqrt(dx * dx + dy * dy) < 0.6) return prev;
                                }
                                return { ...prev, points: [...points, { x: localPoint.x, y: localPoint.y }], endX: localPoint.x, endY: localPoint.y };
                              }
                              return { ...prev, endX: localPoint.x, endY: localPoint.y };
                            });
                          }
                        }}
                        onMouseUp={() => {
                          setDraggingGradientHandle(null);
                          setDraggingTextureHandle(null);
                          setDraggingOffsetHandle(false);
                          setDraggingRadiusHandle(false);
                          finishMaskStroke();
                          finishMaskSelectionShapeDraft();
                          endCanvasInteraction();
                        }}
                        onMouseLeave={() => {
                          setDraggingGradientHandle(null);
                          setDraggingTextureHandle(null);
                          setDraggingOffsetHandle(false);
                          setDraggingRadiusHandle(false);
                          finishMaskStroke();
                          finishMaskSelectionShapeDraft();
                          setMaskCursorPoint(null);
                          endCanvasInteraction();
                        }}
                      >
                        {showLinearGradientCanvasHandles ? (
                          <>
                            <div
                              className="pointer-events-none absolute h-[2px] bg-amber-300/80"
                              style={{
                                left: `${gradientFromX}%`,
                                top: `${gradientFromY}%`,
                                width: `${gradientLineLen}%`,
                                transform: `translateY(-50%) rotate(${gradientLineAngle}deg)`,
                                transformOrigin: '0 50%',
                              }}
                            />

                            <button
                              type="button"
                              onMouseDown={() => { beginCanvasInteraction(); setDraggingGradientHandle('from'); }}
                              className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/60 bg-emerald-300 text-[10px] font-semibold text-black"
                              style={{ left: `${gradientFromX}%`, top: `${gradientFromY}%` }}
                              title="Drag gradient start handle"
                            >
                              S
                            </button>

                            <button
                              type="button"
                              onMouseDown={() => { beginCanvasInteraction(); setDraggingGradientHandle('to'); }}
                              className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/60 bg-sky-300 text-[10px] font-semibold text-black"
                              style={{ left: `${gradientToX}%`, top: `${gradientToY}%` }}
                              title="Drag gradient end handle"
                            >
                              E
                            </button>
                          </>
                        ) : null}

                        {showRadialGradientCanvasHandles ? (
                          <>
                            <div
                              className="pointer-events-none absolute h-[2px] bg-fuchsia-300/70"
                              style={{
                                left: `${gradientCenterX}%`,
                                top: `${gradientCenterY}%`,
                                width: `${Math.max(0.1, gradientRadius)}%`,
                                transform: 'translateY(-50%)',
                                transformOrigin: '0 50%',
                              }}
                            />
                            <div
                              className="pointer-events-none absolute h-[1px] bg-fuchsia-200/60"
                              style={{
                                left: `${gradientCenterX}%`,
                                top: `${gradientCenterY}%`,
                                width: `${Math.max(0.1, Math.sqrt((gradientFocalX - gradientCenterX) ** 2 + (gradientFocalY - gradientCenterY) ** 2))}%`,
                                transform: `translateY(-50%) rotate(${(Math.atan2(gradientFocalY - gradientCenterY, gradientFocalX - gradientCenterX) * 180) / Math.PI}deg)`,
                                transformOrigin: '0 50%',
                              }}
                            />

                            <button
                              type="button"
                              onMouseDown={() => { beginCanvasInteraction(); setDraggingGradientHandle('center'); }}
                              className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/60 bg-fuchsia-300 text-[10px] font-semibold text-black"
                              style={{ left: `${gradientCenterX}%`, top: `${gradientCenterY}%` }}
                              title="Drag radial center handle"
                            >
                              C
                            </button>

                            <button
                              type="button"
                              onMouseDown={() => { beginCanvasInteraction(); setDraggingGradientHandle('radius'); }}
                              className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/60 bg-violet-300 text-[10px] font-semibold text-black"
                              style={{ left: `${gradientRadiusHandleX}%`, top: `${gradientRadiusHandleY}%` }}
                              title="Drag radial radius handle"
                            >
                              R
                            </button>

                            <button
                              type="button"
                              onMouseDown={() => { beginCanvasInteraction(); setDraggingGradientHandle('focal'); }}
                              className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/60 bg-pink-300 text-[10px] font-semibold text-black"
                              style={{ left: `${gradientFocalX}%`, top: `${gradientFocalY}%` }}
                              title="Drag radial focal handle"
                            >
                              F
                            </button>
                          </>
                        ) : null}

                        {showConicGradientCanvasHandles ? (
                          <>
                            <div
                              className="pointer-events-none absolute h-[1px] bg-orange-200/70"
                              style={{
                                left: `${gradientCenterX}%`,
                                top: `${gradientCenterY}%`,
                                width: `${Math.max(0.1, Math.sqrt((gradientAngleHandleX - gradientCenterX) ** 2 + (gradientAngleHandleY - gradientCenterY) ** 2))}%`,
                                transform: `translateY(-50%) rotate(${(Math.atan2(gradientAngleHandleY - gradientCenterY, gradientAngleHandleX - gradientCenterX) * 180) / Math.PI}deg)`,
                                transformOrigin: '0 50%',
                              }}
                            />

                            <button
                              type="button"
                              onMouseDown={() => { beginCanvasInteraction(); setDraggingGradientHandle('center'); }}
                              className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/60 bg-orange-300 text-[10px] font-semibold text-black"
                              style={{ left: `${gradientCenterX}%`, top: `${gradientCenterY}%` }}
                              title="Drag conic center handle"
                            >
                              C
                            </button>

                            <button
                              type="button"
                              onMouseDown={() => { beginCanvasInteraction(); setDraggingGradientHandle('angle'); }}
                              className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/60 bg-amber-300 text-[10px] font-semibold text-black"
                              style={{ left: `${gradientAngleHandleX}%`, top: `${gradientAngleHandleY}%` }}
                              title="Drag conic angle handle"
                            >
                              A
                            </button>
                          </>
                        ) : null}

                        {showBrushedTextureHandles ? (
                          <>
                            <div
                              className="pointer-events-none absolute h-[1px] bg-cyan-200/70"
                              style={{
                                left: '50%',
                                top: '50%',
                                width: `${Math.max(0.1, Math.sqrt((brushedDirectionHandleX - 50) ** 2 + (brushedDirectionHandleY - 50) ** 2))}%`,
                                transform: `translateY(-50%) rotate(${(Math.atan2(brushedDirectionHandleY - 50, brushedDirectionHandleX - 50) * 180) / Math.PI}deg)`,
                                transformOrigin: '0 50%',
                              }}
                            />
                            <button
                              type="button"
                              onMouseDown={() => { beginCanvasInteraction(); setDraggingTextureHandle('direction'); }}
                              className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/60 bg-cyan-300 text-[10px] font-semibold text-black"
                              style={{ left: `${brushedDirectionHandleX}%`, top: `${brushedDirectionHandleY}%` }}
                              title="Drag texture direction handle"
                            >
                              A
                            </button>
                          </>
                        ) : null}

                        {showImageTextureHandles ? (
                          <>
                            <div
                              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200/60 border-dashed"
                              style={{
                                left: `${textureImageOffsetHandleX}%`,
                                top: `${textureImageOffsetHandleY}%`,
                                width: `${textureImageScaleRadius * 2}%`,
                                height: `${textureImageScaleRadius * 2}%`,
                              }}
                            />
                            <div
                              className="pointer-events-none absolute h-[1px] bg-amber-200/80"
                              style={{
                                left: `${textureImageOffsetHandleX}%`,
                                top: `${textureImageOffsetHandleY}%`,
                                width: `${Math.max(0.1, Math.sqrt((textureImageRotationHandleX - textureImageOffsetHandleX) ** 2 + (textureImageRotationHandleY - textureImageOffsetHandleY) ** 2))}%`,
                                transform: `translateY(-50%) rotate(${(Math.atan2(textureImageRotationHandleY - textureImageOffsetHandleY, textureImageRotationHandleX - textureImageOffsetHandleX) * 180) / Math.PI}deg)`,
                                transformOrigin: '0 50%',
                              }}
                            />

                            <button
                              type="button"
                              onMouseDown={() => { beginCanvasInteraction(); setDraggingTextureHandle('imageOffset'); }}
                              className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/60 bg-emerald-300 text-[10px] font-semibold text-black"
                              style={{ left: `${textureImageOffsetHandleX}%`, top: `${textureImageOffsetHandleY}%` }}
                              title="Drag image texture offset handle"
                            >
                              O
                            </button>

                            <button
                              type="button"
                              onMouseDown={() => { beginCanvasInteraction(); setDraggingTextureHandle('imageScale'); }}
                              className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/60 bg-sky-300 text-[10px] font-semibold text-black"
                              style={{ left: `${textureImageScaleHandleX}%`, top: `${textureImageScaleHandleY}%` }}
                              title="Drag image texture scale handle"
                            >
                              R
                            </button>

                            <button
                              type="button"
                              onMouseDown={() => { beginCanvasInteraction(); setDraggingTextureHandle('imageRotation'); }}
                              className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/60 bg-amber-300 text-[10px] font-semibold text-black"
                              style={{ left: `${textureImageRotationHandleX}%`, top: `${textureImageRotationHandleY}%` }}
                              title="Drag image texture rotation handle"
                            >
                              A
                            </button>
                          </>
                        ) : null}

                        {showElementCanvasHandles ? (
                          <>
                            <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200/90" />
                            <div
                              className="pointer-events-none absolute h-[1px] bg-emerald-200/80"
                              style={{
                                left: '50%',
                                top: '50%',
                                width: `${Math.max(0.1, Math.sqrt((offsetHandleX - 50) ** 2 + (offsetHandleY - 50) ** 2))}%`,
                                transform: `translateY(-50%) rotate(${(Math.atan2(offsetHandleY - 50, offsetHandleX - 50) * 180) / Math.PI}deg)`,
                                transformOrigin: '0 50%',
                              }}
                            />
                            <button
                              type="button"
                              onMouseDown={() => { beginCanvasInteraction(); setDraggingOffsetHandle(true); }}
                              className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/60 bg-emerald-400 text-[10px] font-semibold text-black"
                              style={{ left: `${offsetHandleX}%`, top: `${offsetHandleY}%` }}
                              title="Drag offset handle"
                            >
                              O
                            </button>

                            {hasRadiusHandle ? (
                              <>
                                <div
                                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-200/60 border-dashed"
                                  style={{ width: `${selectedRadius * 100}%`, height: `${selectedRadius * 100}%` }}
                                />
                                <button
                                  type="button"
                                  onMouseDown={() => { beginCanvasInteraction(); setDraggingRadiusHandle(true); }}
                                  className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/60 bg-sky-400 text-[10px] font-semibold text-black"
                                  style={{ left: `${radiusHandleX}%`, top: '50%' }}
                                  title="Drag radius handle"
                                >
                                  R
                                </button>
                              </>
                            ) : null}
                          </>
                        ) : null}

                        {showMaskCanvasEditor ? (
                          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {selectedMaskStrokes.map((stroke, index) => {
                              const points = Array.isArray(stroke.points) ? stroke.points as Array<{ x: number; y: number }> : [];
                              const action = stroke.action === 'reveal' ? 'reveal' : 'hide';
                              const strokeColor = action === 'reveal' ? '#22c55e' : '#ef4444';
                              const opacity = Math.max(0.08, Math.min(1, Number(stroke.opacity) || 1)) * 0.9;
                              if (stroke.tool === 'selection') {
                                const shape = typeof stroke.shape === 'string' ? stroke.shape : 'rect';
                                if (shape === 'free' && points.length >= 3) {
                                  const pointsString = points.map((point) => `${point.x},${point.y}`).join(' ');
                                  return (
                                    <polygon
                                      key={`mask-free-${index}`}
                                      points={pointsString}
                                      fill={strokeColor}
                                      fillOpacity={opacity * 0.22}
                                      stroke={strokeColor}
                                      strokeOpacity={opacity}
                                      strokeWidth={0.55}
                                    />
                                  );
                                }
                                const x = Math.max(0, Math.min(100, Number(stroke.x) || 0));
                                const y = Math.max(0, Math.min(100, Number(stroke.y) || 0));
                                const width = Math.max(0, Math.min(100, Number(stroke.width) || 0));
                                const height = Math.max(0, Math.min(100, Number(stroke.height) || 0));
                                if (shape === 'circle') {
                                  const radius = Math.max(0, Math.min(width, height) / 2);
                                  return (
                                    <circle
                                      key={`mask-circle-${index}`}
                                      cx={x + width / 2}
                                      cy={y + height / 2}
                                      r={radius}
                                      fill={strokeColor}
                                      fillOpacity={opacity * 0.25}
                                      stroke={strokeColor}
                                      strokeOpacity={opacity}
                                      strokeWidth={0.6}
                                    />
                                  );
                                }
                                if (shape === 'oval') {
                                  return (
                                    <ellipse
                                      key={`mask-oval-${index}`}
                                      cx={x + width / 2}
                                      cy={y + height / 2}
                                      rx={Math.max(0, width / 2)}
                                      ry={Math.max(0, height / 2)}
                                      fill={strokeColor}
                                      fillOpacity={opacity * 0.25}
                                      stroke={strokeColor}
                                      strokeOpacity={opacity}
                                      strokeWidth={0.6}
                                    />
                                  );
                                }
                                return (
                                  <rect
                                    key={`mask-rect-${index}`}
                                    x={x}
                                    y={y}
                                    width={width}
                                    height={height}
                                    fill={strokeColor}
                                    fillOpacity={opacity * 0.25}
                                    stroke={strokeColor}
                                    strokeOpacity={opacity}
                                    strokeWidth={0.6}
                                  />
                                );
                              }
                              if (points.length === 0) return null;
                              const strokeWidth = Math.max(0.2, Number(stroke.size) / 5.2);
                              // Spec 075: single-point strokes render as <circle> to avoid degenerate <polyline> rendering.
                              if (points.length === 1) {
                                return (
                                  <circle
                                    key={`mask-stroke-${index}`}
                                    cx={points[0].x}
                                    cy={points[0].y}
                                    r={strokeWidth / 2}
                                    fill={strokeColor}
                                    fillOpacity={opacity}
                                  />
                                );
                              }
                              const pointsString = points.map((point) => `${point.x},${point.y}`).join(' ');
                              return (
                                <polyline
                                  key={`mask-stroke-${index}`}
                                  points={pointsString}
                                  fill="none"
                                  stroke={strokeColor}
                                  strokeOpacity={opacity}
                                  strokeWidth={strokeWidth}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              );
                            })}
                            {activeMaskStroke && activeMaskStroke.points.length > 0 ? (() => {
                              const canvasPoints = activeMaskStroke.points.map((point) => selectedMaskLocalToCanvasPoint(point));
                              const strokeColor = activeMaskStroke.action === 'reveal' ? '#4ade80' : '#f87171';
                              const strokeWidth = Math.max(0.2, activeMaskStroke.size / 5.2);
                              // Spec 075: single-point active stroke rendered as <circle>.
                              if (canvasPoints.length === 1) {
                                return (
                                  <circle
                                    cx={canvasPoints[0].x}
                                    cy={canvasPoints[0].y}
                                    r={strokeWidth / 2}
                                    fill={strokeColor}
                                    fillOpacity={0.95}
                                  />
                                );
                              }
                              return (
                                <polyline
                                  points={canvasPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                                  fill="none"
                                  stroke={strokeColor}
                                  strokeOpacity={0.95}
                                  strokeWidth={strokeWidth}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              );
                            })() : null}
                            {activeMaskSelectionShape ? (
                              (() => {
                                const previewColor = activeMaskSelectionShape.action === 'reveal' ? '#22c55e' : '#ef4444';
                                const previewStroke = activeMaskSelectionShape.action === 'reveal' ? '#4ade80' : '#f87171';
                                if (activeMaskSelectionShape.shape === 'free') {
                                  const points = Array.isArray(activeMaskSelectionShape.points) ? activeMaskSelectionShape.points : [];
                                  if (points.length < 2) return null;
                                  const mirrorPoints = (src: Array<{ x: number; y: number }>, mirrorHorizontal: boolean, mirrorVertical: boolean) =>
                                    src.map((point) => ({
                                      x: mirrorHorizontal ? 100 - Math.max(0, Math.min(100, Number(point.x) || 0)) : Math.max(0, Math.min(100, Number(point.x) || 0)),
                                      y: mirrorVertical ? 100 - Math.max(0, Math.min(100, Number(point.y) || 0)) : Math.max(0, Math.min(100, Number(point.y) || 0)),
                                    }));
                                  const variants: Array<Array<{ x: number; y: number }>> = [points];
                                  if (selectionMirrorHorizontal) variants.push(mirrorPoints(points, true, false));
                                  if (selectionMirrorVertical) variants.push(mirrorPoints(points, false, true));
                                  if (selectionMirrorHorizontal && selectionMirrorVertical) variants.push(mirrorPoints(points, true, true));

                                  const unique = new Set<string>();
                                  const uniqueVariants = variants.filter((variant) => {
                                    const key = JSON.stringify(variant);
                                    if (unique.has(key)) return false;
                                    unique.add(key);
                                    return true;
                                  });

                                  if (points.length < 3) {
                                    return (
                                      <>
                                        {uniqueVariants.map((variant, index) => (
                                          <polyline
                                            key={`active-mask-free-line-${index}`}
                                            points={variant.map((point) => {
                                              const canvasPoint = selectedMaskLocalToCanvasPoint(point);
                                              return `${canvasPoint.x},${canvasPoint.y}`;
                                            }).join(' ')}
                                            fill="none"
                                            stroke={previewStroke}
                                            strokeOpacity={0.95}
                                            strokeWidth={0.65}
                                          />
                                        ))}
                                      </>
                                    );
                                  }
                                  return (
                                    <>
                                      {uniqueVariants.map((variant, index) => (
                                        <polygon
                                          key={`active-mask-free-poly-${index}`}
                                          points={variant.map((point) => {
                                            const canvasPoint = selectedMaskLocalToCanvasPoint(point);
                                            return `${canvasPoint.x},${canvasPoint.y}`;
                                          }).join(' ')}
                                          fill={previewColor}
                                          fillOpacity={0.15}
                                          stroke={previewStroke}
                                          strokeOpacity={0.95}
                                          strokeWidth={0.7}
                                        />
                                      ))}
                                    </>
                                  );
                                }
                                const startPoint = selectedMaskLocalToCanvasPoint({
                                  x: activeMaskSelectionShape.startX,
                                  y: activeMaskSelectionShape.startY,
                                });
                                const endPoint = selectedMaskLocalToCanvasPoint({
                                  x: activeMaskSelectionShape.endX,
                                  y: activeMaskSelectionShape.endY,
                                });
                                const x1 = Math.max(0, Math.min(100, startPoint.x));
                                const y1 = Math.max(0, Math.min(100, startPoint.y));
                                const x2 = Math.max(0, Math.min(100, endPoint.x));
                                const y2 = Math.max(0, Math.min(100, endPoint.y));
                                let minX = Math.min(x1, x2);
                                let minY = Math.min(y1, y2);
                                let width = Math.abs(x2 - x1);
                                let height = Math.abs(y2 - y1);
                                if (activeMaskSelectionShape.shape === 'square' || activeMaskSelectionShape.shape === 'circle') {
                                  const side = Math.max(width, height);
                                  const signX = x2 >= x1 ? 1 : -1;
                                  const signY = y2 >= y1 ? 1 : -1;
                                  minX = Math.min(x1, x1 + signX * side);
                                  minY = Math.min(y1, y1 + signY * side);
                                  width = side;
                                  height = side;
                                }
                                const renderPreviewShape = (shapeX: number, shapeY: number, shapeWidth: number, shapeHeight: number, key: string) => {
                                  if (activeMaskSelectionShape.shape === 'circle') {
                                    return (
                                      <circle
                                        key={key}
                                        cx={shapeX + shapeWidth / 2}
                                        cy={shapeY + shapeHeight / 2}
                                        r={Math.max(0, Math.min(shapeWidth, shapeHeight) / 2)}
                                        fill={previewColor}
                                        fillOpacity={0.15}
                                        stroke={previewStroke}
                                        strokeOpacity={0.95}
                                        strokeWidth={0.7}
                                      />
                                    );
                                  }
                                  if (activeMaskSelectionShape.shape === 'oval') {
                                    return (
                                      <ellipse
                                        key={key}
                                        cx={shapeX + shapeWidth / 2}
                                        cy={shapeY + shapeHeight / 2}
                                        rx={Math.max(0, shapeWidth / 2)}
                                        ry={Math.max(0, shapeHeight / 2)}
                                        fill={previewColor}
                                        fillOpacity={0.15}
                                        stroke={previewStroke}
                                        strokeOpacity={0.95}
                                        strokeWidth={0.7}
                                      />
                                    );
                                  }
                                  return (
                                    <rect
                                      key={key}
                                      x={shapeX}
                                      y={shapeY}
                                      width={shapeWidth}
                                      height={shapeHeight}
                                      fill={previewColor}
                                      fillOpacity={0.15}
                                      stroke={previewStroke}
                                      strokeOpacity={0.95}
                                      strokeWidth={0.7}
                                    />
                                  );
                                };

                                const variants: Array<{ x: number; y: number; width: number; height: number }> = [
                                  { x: minX, y: minY, width, height },
                                ];
                                if (selectionMirrorHorizontal) {
                                  variants.push({ x: Math.max(0, Math.min(100, 100 - (minX + width))), y: minY, width, height });
                                }
                                if (selectionMirrorVertical) {
                                  variants.push({ x: minX, y: Math.max(0, Math.min(100, 100 - (minY + height))), width, height });
                                }
                                if (selectionMirrorHorizontal && selectionMirrorVertical) {
                                  variants.push({ x: Math.max(0, Math.min(100, 100 - (minX + width))), y: Math.max(0, Math.min(100, 100 - (minY + height))), width, height });
                                }

                                const unique = new Set<string>();
                                const uniqueVariants = variants.filter((variant) => {
                                  const key = `${variant.x.toFixed(3)}|${variant.y.toFixed(3)}|${variant.width.toFixed(3)}|${variant.height.toFixed(3)}`;
                                  if (unique.has(key)) return false;
                                  unique.add(key);
                                  return true;
                                });

                                return (
                                  <>
                                    {uniqueVariants.map((variant, index) =>
                                      renderPreviewShape(variant.x, variant.y, variant.width, variant.height, `active-mask-shape-${index}`),
                                    )}
                                  </>
                                );
                              })()
                            ) : null}
                            {isBrushMaskMode && maskCursorPoint ? (
                              <>
                                <circle
                                  cx={maskCursorPoint.x}
                                  cy={maskCursorPoint.y}
                                  r={Math.max(0.2, getSelectedMaskNumber('brush.size', 16) / 5.2) / 2}
                                  fill="none"
                                  stroke="#ffffff"
                                  strokeOpacity={0.95}
                                  strokeWidth={0.35}
                                  strokeDasharray="1.2 1.2"
                                />
                                <circle
                                  cx={maskCursorPoint.x}
                                  cy={maskCursorPoint.y}
                                  r={Math.max(0.2, getSelectedMaskNumber('brush.size', 16) / 5.2) / 2 + 0.18}
                                  fill="none"
                                  stroke={maskBrushAction === 'reveal' ? '#4ade80' : '#f87171'}
                                  strokeOpacity={0.85}
                                  strokeWidth={0.3}
                                />
                              </>
                            ) : null}
                            {isSelectionMaskMode && maskCursorPoint && !activeMaskSelectionShape ? (
                              (() => {
                                const previewStroke = maskBrushAction === 'reveal' ? '#4ade80' : '#f87171';
                                if (selectedMaskSelectionShape === 'free') {
                                  const points = [
                                    { x: maskCursorPoint.x, y: maskCursorPoint.y },
                                  ];
                                  const variants: Array<{ x: number; y: number }> = [points[0]];
                                  if (selectionMirrorHorizontal) variants.push({ x: 100 - points[0].x, y: points[0].y });
                                  if (selectionMirrorVertical) variants.push({ x: points[0].x, y: 100 - points[0].y });
                                  if (selectionMirrorHorizontal && selectionMirrorVertical) variants.push({ x: 100 - points[0].x, y: 100 - points[0].y });
                                  const unique = new Set<string>();
                                  const uniqueVariants = variants.filter((variant) => {
                                    const key = `${variant.x.toFixed(3)}|${variant.y.toFixed(3)}`;
                                    if (unique.has(key)) return false;
                                    unique.add(key);
                                    return true;
                                  });
                                  return (
                                    <>
                                      {uniqueVariants.map((variant, index) => (
                                        <circle
                                          key={`mask-cursor-dot-${index}`}
                                          cx={variant.x}
                                          cy={variant.y}
                                          r={0.9}
                                          fill={previewStroke}
                                          fillOpacity={0.9}
                                          stroke="#ffffff"
                                          strokeOpacity={0.9}
                                          strokeWidth={0.2}
                                        />
                                      ))}
                                    </>
                                  );
                                }

                                const width = selectedMaskSelectionShape === 'circle' || selectedMaskSelectionShape === 'square'
                                  ? selectionControlDiameter
                                  : selectionControlWidth;
                                const height = selectedMaskSelectionShape === 'circle' || selectedMaskSelectionShape === 'square'
                                  ? selectionControlDiameter
                                  : selectionControlHeight;
                                const x = Math.max(0, Math.min(100, maskCursorPoint.x - width / 2));
                                const y = Math.max(0, Math.min(100, maskCursorPoint.y - height / 2));

                                const variants: Array<{ x: number; y: number; width: number; height: number }> = [
                                  { x, y, width: Math.max(0.2, width), height: Math.max(0.2, height) },
                                ];
                                if (selectionMirrorHorizontal) {
                                  variants.push({ x: Math.max(0, Math.min(100, 100 - (x + width))), y, width: Math.max(0.2, width), height: Math.max(0.2, height) });
                                }
                                if (selectionMirrorVertical) {
                                  variants.push({ x, y: Math.max(0, Math.min(100, 100 - (y + height))), width: Math.max(0.2, width), height: Math.max(0.2, height) });
                                }
                                if (selectionMirrorHorizontal && selectionMirrorVertical) {
                                  variants.push({ x: Math.max(0, Math.min(100, 100 - (x + width))), y: Math.max(0, Math.min(100, 100 - (y + height))), width: Math.max(0.2, width), height: Math.max(0.2, height) });
                                }

                                const unique = new Set<string>();
                                const uniqueVariants = variants.filter((variant) => {
                                  const key = `${variant.x.toFixed(3)}|${variant.y.toFixed(3)}|${variant.width.toFixed(3)}|${variant.height.toFixed(3)}`;
                                  if (unique.has(key)) return false;
                                  unique.add(key);
                                  return true;
                                });

                                const renderVariant = (variant: { x: number; y: number; width: number; height: number }, key: string) => {
                                  if (selectedMaskSelectionShape === 'circle') {
                                    return (
                                      <circle
                                        key={key}
                                        cx={variant.x + variant.width / 2}
                                        cy={variant.y + variant.height / 2}
                                        r={Math.max(0.2, Math.min(variant.width, variant.height) / 2)}
                                        fill={previewStroke}
                                        fillOpacity={0.08}
                                        stroke={previewStroke}
                                        strokeOpacity={0.92}
                                        strokeWidth={0.45}
                                        strokeDasharray="1.2 1.2"
                                      />
                                    );
                                  }

                                  if (selectedMaskSelectionShape === 'oval') {
                                    return (
                                      <ellipse
                                        key={key}
                                        cx={variant.x + variant.width / 2}
                                        cy={variant.y + variant.height / 2}
                                        rx={Math.max(0.2, variant.width / 2)}
                                        ry={Math.max(0.2, variant.height / 2)}
                                        fill={previewStroke}
                                        fillOpacity={0.08}
                                        stroke={previewStroke}
                                        strokeOpacity={0.92}
                                        strokeWidth={0.45}
                                        strokeDasharray="1.2 1.2"
                                      />
                                    );
                                  }

                                  return (
                                    <rect
                                      key={key}
                                      x={variant.x}
                                      y={variant.y}
                                      width={variant.width}
                                      height={variant.height}
                                      fill={previewStroke}
                                      fillOpacity={0.08}
                                      stroke={previewStroke}
                                      strokeOpacity={0.92}
                                      strokeWidth={0.45}
                                      strokeDasharray="1.2 1.2"
                                    />
                                  );
                                };

                                return (
                                  <>
                                    {uniqueVariants.map((variant, index) => renderVariant(variant, `mask-cursor-shape-${index}`))}
                                  </>
                                );
                              })()
                            ) : null}
                          </svg>
                        ) : null}

                        {showMaskCanvasEditor && isBrushMaskMode && maskCursorPoint ? (
                          <div
                            className="pointer-events-none absolute z-20 rounded-full border border-white shadow-[0_0_0_1px_rgba(0,0,0,0.85),0_0_14px_rgba(255,255,255,0.35)]"
                            style={{
                              left: `${maskCursorPoint.x}%`,
                              top: `${maskCursorPoint.y}%`,
                              width: `${Math.max(0.2, getSelectedMaskNumber('brush.size', 16) / 5.2)}%`,
                              height: `${Math.max(0.2, getSelectedMaskNumber('brush.size', 16) / 5.2)}%`,
                              transform: 'translate(-50%, -50%)',
                            }}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No preview yet.</p>
                )}
              </div>
              <p className="mt-2 text-[11px] text-zinc-500">
                Canvas overlays follow active tab: Gradient tab shows kind handles, Texture tab shows direction or image O/R/A handles, Element tab shows O/R and mask brush, FX tab shows global lighting direction.
              </p>
              {canvasMarkerLegendEntries.length > 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-zinc-500">Marker Legend</span>
                  {canvasMarkerLegendEntries.map((entry, index) => (
                    <span
                      key={`marker-legend-${entry.key}-${entry.meaning}-${index}`}
                      title={entry.meaning}
                      className="rounded border border-zinc-700 bg-zinc-950/80 px-2 py-0.5 text-zinc-300"
                    >
                      {entry.key}: {entry.meaning}
                    </span>
                  ))}
                </div>
              ) : null}
              {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-100">Layers (Order = Render Order)</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">{(workingTemplate?.elements ?? []).length} layer(s)</span>
                  <span className="text-[11px] text-zinc-500">Height {Math.round(layersPanelHeight)}px</span>
                </div>
              </div>

              <label className="mt-2 block space-y-1">
                <span className="text-[11px] text-zinc-500">Layers Panel Height (Capped)</span>
                <input
                  type="range"
                  min={160}
                  max={360}
                  step={4}
                  value={layersPanelHeight}
                  onChange={(e) => setLayersPanelHeight(Number(e.target.value))}
                  className="w-full"
                />
              </label>

              <div
                className="mt-3 overflow-auto rounded-md border border-zinc-800 bg-zinc-950/70"
                style={{ height: `${layersPanelHeight}px`, minHeight: '160px', maxHeight: '360px' }}
              >
                {(workingTemplate?.elements ?? []).map((element, index) => {
                  const isSelected = selectedPanelTarget === 'element' && selectedElementId === element.id;
                  return (
                    <div
                      key={element.id ?? `${element.type}-${index}`}
                      className={`flex items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2 text-xs ${isSelected ? 'bg-zinc-800/60' : ''} ${dragOverLayerId === element.id ? 'ring-1 ring-amber-400/80' : ''}`}
                      draggable={typeof element.id === 'string' && element.id.length > 0}
                      onDragStart={(event) => {
                        if (!element.id) return;
                        beginRenderInteraction('layer-drag');
                        setDraggingLayerId(element.id);
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', element.id);
                      }}
                      onDragOver={(event) => {
                        if (!draggingLayerId || !element.id || draggingLayerId === element.id) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        setDragOverLayerId(element.id);
                      }}
                      onDrop={(event) => {
                        if (!element.id) return;
                        event.preventDefault();
                        const sourceId = draggingLayerId || event.dataTransfer.getData('text/plain');
                        if (!sourceId || sourceId === element.id) {
                          setDraggingLayerId(null);
                          setDragOverLayerId(null);
                          endRenderInteraction('layer-drag');
                          return;
                        }
                        moveElementToIndex(sourceId, index);
                        setDraggingLayerId(null);
                        setDragOverLayerId(null);
                        endRenderInteraction('layer-drag');
                      }}
                      onDragEnd={() => {
                        setDraggingLayerId(null);
                        setDragOverLayerId(null);
                        endRenderInteraction('layer-drag');
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedElementId(element.id ?? null);
                          setSelectedPanelTarget('element');
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate font-medium text-zinc-200">{element.name ?? `layer-${index + 1}`}</p>
                        <p className="truncate text-zinc-500">{element.type} - {element.role}</p>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleElementVisibility(element.id ?? '')}
                          className="rounded border border-zinc-700 p-1 text-zinc-300 hover:bg-zinc-800"
                          title={element.visible === false ? 'Show layer' : 'Hide layer'}
                        >
                          {element.visible === false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => moveElement(element.id ?? '', 'up')}
                          className="rounded border border-zinc-700 px-1.5 py-0.5 text-zinc-300 hover:bg-zinc-800"
                          title="Move layer up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveElement(element.id ?? '', 'down')}
                          className="rounded border border-zinc-700 px-1.5 py-0.5 text-zinc-300 hover:bg-zinc-800"
                          title="Move layer down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateElement(element.id ?? '')}
                          className="rounded border border-zinc-700 px-1.5 py-0.5 text-zinc-300 hover:bg-zinc-800"
                          title="Duplicate layer"
                        >
                          dup
                        </button>
                        <button
                          type="button"
                          onClick={() => void createBakedLayerFromElement(element.id ?? '')}
                          disabled={isSnapshotActionRunning || !element.id}
                          className="rounded border border-zinc-700 px-1.5 py-0.5 text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Bake this layer to a new layer"
                        >
                          bake
                        </button>
                        <button
                          type="button"
                          onClick={() => removeElement(element.id ?? '')}
                          className="rounded border border-zinc-700 px-1.5 py-0.5 text-zinc-300 hover:bg-zinc-800"
                        >
                          x
                        </button>
                      </div>
                    </div>
                  );
                })}
                {(workingTemplate?.elements ?? []).length === 0 ? (
                  <div className="px-3 py-4">
                    <p className="text-xs text-zinc-500">No layers yet. Add from left drawer or create a new element now.</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <select
                        value={quickNewCategory}
                        onChange={(e) => setQuickNewCategory(e.target.value)}
                        className="h-8 rounded border border-zinc-700 bg-zinc-950 px-2 text-[11px] text-zinc-100"
                      >
                        {DEFAULT_DRAWER_CATEGORY_ORDER.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                      {quickNewCategory === 'Free Objects' ? (
                        <select
                          value={freeObjectShapeType}
                          onChange={(e) => setFreeObjectShapeType(e.target.value)}
                          className="h-8 rounded border border-zinc-700 bg-zinc-950 px-2 text-[11px] text-zinc-100"
                        >
                          {FREE_OBJECT_SHAPE_OPTIONS.map((item) => (
                            <option key={item.type} value={item.type}>{item.label}</option>
                          ))}
                        </select>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => addNewElementFromDefaults(quickNewCategory)}
                        className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                      >
                        + New Element
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {!isFocusMode ? (
          <aside
            ref={contextInspectorRef}
            className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4 xl:sticky xl:top-6 xl:max-h-[calc(100vh-14rem)] xl:overflow-y-auto"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-100">Right Context Inspector</h2>
              <span className="text-[11px] text-zinc-500">Docked right for non-overlap editing.</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { key: 'element', label: 'Element' },
                { key: 'fx', label: 'FX' },
                { key: 'texture', label: 'Texture' },
                { key: 'gradient', label: 'Gradient' },
                { key: 'material', label: 'Material' },
                { key: 'json', label: 'JSON' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setContextTab(tab.key as 'element' | 'fx' | 'texture' | 'gradient' | 'material' | 'json')}
                  className={`rounded border px-3 py-1 text-[11px] ${contextTab === tab.key ? 'border-amber-400 bg-amber-500/10 text-amber-200' : 'border-zinc-700 bg-zinc-950/70 text-zinc-300 hover:bg-zinc-800'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="rounded border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-[11px] text-zinc-400">
              Active tab: {contextTab}. Full control migration preserved in this panel.
            </div>

            {selectedPanelTarget === 'layout' ? (
            <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-xs uppercase tracking-wide text-amber-300">Template Space Controls</p>
              <p className="text-[11px] text-zinc-500">These define the coordinate space only. Add a Base element from left drawer to draw the first visible layer.</p>

              <div className="rounded border border-zinc-800 bg-zinc-950/60 p-2">
                <p className="text-[11px] uppercase tracking-wide text-zinc-400">Layout JSON</p>
                <p className="mt-1 text-[11px] text-zinc-500">Paste layout JSON here and apply directly.</p>
                <textarea
                  value={layoutDraft}
                  onChange={(e) => setLayoutDraft(e.target.value)}
                  className="mt-2 h-28 w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 p-2 font-mono text-[11px] leading-5 text-zinc-300"
                />
                {layoutDraftError ? <p className="mt-2 text-xs text-red-400">{layoutDraftError}</p> : null}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={applyLayoutDraft}
                    className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                  >
                    Apply Layout JSON
                  </button>
                </div>
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] text-zinc-400">Base Shape</span>
                <select
                  value={getLayoutShape()}
                  onChange={(e) => {
                    const nextShape = e.target.value === 'rectangle' ? 'rectangle' : 'circle';
                    syncBaseElementShapeToLayout(nextShape);
                  }}
                  className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs"
                >
                  <option value="circle">circle</option>
                  <option value="rectangle">rectangle</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] text-zinc-500">Width {Math.round(getLayoutNumber('width', 480))}</span>
                <input
                  type="range"
                  min={200}
                  max={900}
                  step={10}
                  value={getLayoutNumber('width', 480)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    updateTemplateLayout((layout) => ({ ...layout, width: next }));
                  }}
                  className="w-full"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] text-zinc-500">Height {Math.round(getLayoutNumber('height', 480))}</span>
                <input
                  type="range"
                  min={200}
                  max={900}
                  step={10}
                  value={getLayoutNumber('height', 480)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    updateTemplateLayout((layout) => ({ ...layout, height: next }));
                  }}
                  className="w-full"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] text-zinc-500">Base Radius {getLayoutNumber('baseRadius', 0.5).toFixed(3)}</span>
                <input
                  type="range"
                  min={0.1}
                  max={0.5}
                  step={0.005}
                  value={getLayoutNumber('baseRadius', 0.5)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    updateTemplateLayout((layout) => ({ ...layout, baseRadius: next }));
                  }}
                  className="w-full"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] text-zinc-500">Padding {getLayoutNumber('padding', 0.04).toFixed(3)}</span>
                <input
                  type="range"
                  min={0}
                  max={0.2}
                  step={0.002}
                  value={getLayoutNumber('padding', 0.04)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    updateTemplateLayout((layout) => ({ ...layout, padding: next }));
                  }}
                  className="w-full"
                />
              </label>
            </div>
            ) : null}

            {selectedPanelTarget === 'element' && selectedElement ? (
              <div className="space-y-3 rounded border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-xs uppercase tracking-wide text-amber-300">Editing: {selectedElement.type}</p>

                {/* ── Image Layer inspector ─────────────────────────────── */}
                {selectedElement.type === 'image_layer' && (() => {
                  const imgParams = selectedElement.params && typeof selectedElement.params === 'object' ? selectedElement.params as Record<string, unknown> : {};
                  const currentDataUrl = typeof imgParams.imageDataUrl === 'string' ? imgParams.imageDataUrl : '';
                  const approxBytes = Math.round(currentDataUrl.length * 0.75);
                  const approxKB = Math.round(approxBytes / 1024);
                  const sizeWarning = approxKB > 2048
                    ? { level: 'red', msg: `Image is very large (~${approxKB} KB) — auto-save may fail. Please resize.` }
                    : approxKB > 800
                      ? { level: 'orange', msg: `Large image (~${approxKB} KB) — consider resizing before upload.` }
                      : approxKB > 500
                        ? { level: 'yellow', msg: `Image is ${approxKB} KB — may slow auto-save.` }
                        : null;
                  const setImgParam = (key: string, value: unknown) => {
                    const updated = { ...imgParams, [key]: value };
                    applyTemplateCommand(`Image Layer: set ${key}`, (prev) => ({
                      ...prev,
                      elements: (prev.elements ?? []).map(el =>
                        el.id === selectedElement.id ? { ...el, params: updated } : el
                      ),
                    }));
                    markSelectedElementDirty('geometry');
                  };
                  return (
                    <div className="space-y-2 rounded border border-sky-800/60 bg-sky-950/20 p-2">
                      <p className="text-[11px] uppercase tracking-wide text-sky-300">Image Layer</p>
                      <p className="text-[10px] text-zinc-500">Upload a PNG/JPG as a base reference layer. Stacks with other elements by layer order.</p>

                      {/* Upload / Clear */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = () => {
                              const file = input.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const result = ev.target?.result as string;
                                if (typeof result === 'string' && result.startsWith('data:image/')) {
                                  setImgParam('imageDataUrl', result);
                                }
                              };
                              reader.readAsDataURL(file);
                            };
                            document.body.appendChild(input);
                            input.click();
                            document.body.removeChild(input);
                          }}
                          className="rounded border border-sky-700 bg-sky-950/40 px-2 py-1 text-[11px] text-sky-200 hover:bg-sky-900/40"
                        >
                          {currentDataUrl ? 'Replace image…' : 'Upload image…'}
                        </button>
                        {currentDataUrl && (
                          <button
                            type="button"
                            onClick={() => setImgParam('imageDataUrl', '')}
                            className="rounded border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-400 hover:bg-zinc-800"
                          >
                            Clear
                          </button>
                        )}
                        {currentDataUrl && (
                          <span className="text-[10px] text-zinc-500">~{approxKB} KB</span>
                        )}
                      </div>

                      {/* Size warning */}
                      {sizeWarning && (
                        <p className={`text-[10px] ${sizeWarning.level === 'red' ? 'text-red-400' : sizeWarning.level === 'orange' ? 'text-orange-400' : 'text-yellow-400'}`}>
                          ⚠ {sizeWarning.msg}
                        </p>
                      )}

                      {/* Fit */}
                      <div className="space-y-1">
                        <p className="text-[11px] text-zinc-400">Fit</p>
                        <div className="flex gap-2">
                          {(['fill', 'cover', 'contain'] as const).map(f => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => setImgParam('fit', f)}
                              className={`rounded border px-2 py-0.5 text-[10px] ${(imgParams.fit ?? 'fill') === f ? 'border-sky-600 bg-sky-950/50 text-sky-300' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-zinc-600">
                          {(imgParams.fit ?? 'fill') === 'fill' ? 'Stretch to exact canvas size — best for dial photos' :
                           (imgParams.fit ?? 'fill') === 'cover' ? 'Fill canvas, crop overflow — preserves aspect ratio' :
                           'Fit inside canvas — may show bars'}
                        </p>
                      </div>

                      {/* Opacity */}
                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-400">Opacity {(Number(imgParams.opacity ?? 1) * 100).toFixed(0)}%</span>
                        <input
                          type="range" min={0} max={1} step={0.01}
                          value={Number(imgParams.opacity ?? 1)}
                          onChange={e => setImgParam('opacity', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      {/* Position + Size */}
                      <div className="grid grid-cols-2 gap-2">
                        {(['x', 'y', 'width', 'height'] as const).map(k => (
                          <label key={k} className="block space-y-0.5">
                            <span className="text-[10px] text-zinc-500">{k.toUpperCase()} (fraction)</span>
                            <input
                              type="number" step={0.01} min={k === 'x' || k === 'y' ? -1 : 0.01} max={2}
                              value={Number(imgParams[k] ?? (k === 'width' || k === 'height' ? 1 : 0)).toFixed(3)}
                              onChange={e => setImgParam(k, Number(e.target.value))}
                              className="h-7 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-100"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {selectedElement.type !== 'image_layer' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAllEffectPanelsCollapsed(false)}
                    className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                  >
                    Expand All Effects
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllEffectPanelsCollapsed(true)}
                    className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                  >
                    Collapse All Effects
                  </button>
                </div>
                )}

                {selectedElement.type !== 'image_layer' && (
                <div className="space-y-2 rounded border border-zinc-800 p-2">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-400">Snapshot Render Source</p>
                  <p className="text-[11px] text-zinc-500">
                    Current mode: {selectedRenderSourceMode}. Snapshot status: {selectedSnapshotStatus}.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-400">Status</span>
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] uppercase tracking-wide ${selectedSnapshotStatus === 'fresh'
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                        : selectedSnapshotStatus === 'outdated'
                          ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                          : 'border-zinc-600 bg-zinc-800/80 text-zinc-300'}`}
                    >
                      {selectedSnapshotStatus}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500">{snapshotActionHint}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { void createSnapshotForSelectedElement(); }}
                      disabled={!canCreateSnapshot}
                      title={!canCreateSnapshot ? snapshotActionHint : 'Capture a new baked snapshot for this element'}
                      className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSnapshotActionRunning ? 'Creating...' : 'Create Snapshot'}
                    </button>
                    <button
                      type="button"
                      onClick={useSnapshotForSelectedElement}
                      disabled={!canUseSnapshot}
                      title={!canUseSnapshot ? snapshotActionHint : 'Render this element from stored snapshot'}
                      className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Use Snapshot
                    </button>
                    <button
                      type="button"
                      onClick={useLiveRenderForSelectedElement}
                      disabled={!canUseLiveRender}
                      title={!canUseLiveRender ? snapshotActionHint : 'Render this element from live procedural pipeline'}
                      className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Use Live Render
                    </button>
                    <button
                      type="button"
                      onClick={deleteSnapshotForSelectedElement}
                      disabled={!canDeleteSnapshot}
                      title={!canDeleteSnapshot ? snapshotActionHint : 'Delete stored snapshot (confirmation required)'}
                      className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Delete Snapshot
                    </button>
                    <button
                      type="button"
                      onClick={() => { void createBakedLayerFromSelectedSnapshot(); }}
                      disabled={!canBakeSnapshotToLayer}
                      title={!canBakeSnapshotToLayer ? snapshotActionHint : 'Create a new baked layer from selected element including current mask result'}
                      className="col-span-2 rounded border border-amber-700 bg-amber-950/40 px-2 py-1 text-[11px] text-amber-200 hover:bg-amber-900/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSnapshotActionRunning ? 'Baking...' : 'Snapshot -> New Baked Layer'}
                    </button>
                  </div>
                </div>
                )}

                <label className="block space-y-1">
                  <span className="text-[11px] text-zinc-400">Name</span>
                  <div className="flex gap-2">
                    <input
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={saveSelectedName}
                      className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                    >
                      Save
                    </button>
                  </div>
                </label>

                <div className="space-y-2 rounded border border-zinc-800 p-2">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-400">Transform (All Types)</p>
                  <p className="text-[11px] text-zinc-500">Use sliders for exact position and rotation. Canvas O handle still works for interactive placement.</p>

                  <button
                    type="button"
                    onClick={createQuadrantDuplicates}
                    className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                  >
                    One-Click Quadrant Duplicate (MX + MY + MXY)
                  </button>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Offset X {getSelectedPlacementOffset(0).toFixed(1)}</span>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      step={0.1}
                      value={getSelectedPlacementOffset(0)}
                      onChange={(e) => setSelectedPlacementOffset(Number(e.target.value), getSelectedPlacementOffset(1))}
                      className="w-full"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Offset Y {getSelectedPlacementOffset(1).toFixed(1)}</span>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      step={0.1}
                      value={getSelectedPlacementOffset(1)}
                      onChange={(e) => setSelectedPlacementOffset(getSelectedPlacementOffset(0), Number(e.target.value))}
                      className="w-full"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Placement Rotation {Math.round(getSelectedPlacementRotation())}deg</span>
                    <input
                      type="range"
                      min={-360}
                      max={360}
                      step={1}
                      value={getSelectedPlacementRotation()}
                      onChange={(e) => setSelectedPlacementRotation(Number(e.target.value))}
                      className="w-full"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Mirror Mode</span>
                    <select
                      value={getSelectedSymmetryMode()}
                      onChange={(e) => setSelectedSymmetryMode((e.target.value === 'mirrorX' || e.target.value === 'mirrorY') ? e.target.value : 'none')}
                      className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                    >
                      <option value="none">None</option>
                      <option value="mirrorX">Horizontal Mirror</option>
                      <option value="mirrorY">Vertical Mirror</option>
                    </select>
                  </label>
                </div>

                {isSelectedType('ring', 'bezel', 'ticks_radial', 'radialTicks', 'circle', 'outline_ring', 'outline_rect', 'free_rect', 'rect') ? (
                  <div className="space-y-2 rounded border border-zinc-800 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-400">Rect Layout Reshape</p>
                    <p className="text-[11px] text-zinc-500">When layout is rectangle, choose whether this element stays circular or follows rectangular proportions.</p>

                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Shape Follow Mode</span>
                      <select
                        value={getStringParam('layoutShapeMode', 'rect')}
                        onChange={(e) => setStringParam('layoutShapeMode', e.target.value)}
                        className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                      >
                        {RECT_LAYOUT_SHAPE_MODE_OPTIONS.map((option) => (
                          <option key={`layout-shape-mode-${option.value}`} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>

                    {getStringParam('layoutShapeMode', 'rect') !== 'circle' ? (
                      <>
                        <label className="block space-y-1">
                          <span className="text-[11px] text-zinc-500">Auto Reshape Strength {getNumericParam('layoutShapeStrength', 1).toFixed(2)}</span>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={getNumericParam('layoutShapeStrength', 1)}
                            onChange={(e) => setNumericParam('layoutShapeStrength', Number(e.target.value))}
                            className="w-full"
                          />
                        </label>

                        <label className="block space-y-1">
                          <span className="text-[11px] text-zinc-500">Manual Scale X {getNumericParam('layoutShapeScaleX', 1).toFixed(2)}</span>
                          <input
                            type="range"
                            min={0.25}
                            max={2.5}
                            step={0.01}
                            value={getNumericParam('layoutShapeScaleX', 1)}
                            onChange={(e) => setNumericParam('layoutShapeScaleX', Number(e.target.value))}
                            className="w-full"
                          />
                        </label>

                        <label className="block space-y-1">
                          <span className="text-[11px] text-zinc-500">Manual Scale Y {getNumericParam('layoutShapeScaleY', 1).toFixed(2)}</span>
                          <input
                            type="range"
                            min={0.25}
                            max={2.5}
                            step={0.01}
                            value={getNumericParam('layoutShapeScaleY', 1)}
                            onChange={(e) => setNumericParam('layoutShapeScaleY', Number(e.target.value))}
                            className="w-full"
                          />
                        </label>
                      </>
                    ) : null}
                  </div>
                ) : null}

                {isSelectedType('free_circle', 'free_ring', 'free_rect') ? (
                  <div className="space-y-2 rounded border border-zinc-800 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-400">Free Shape Resize</p>
                    <p className="text-[11px] text-zinc-500">Manual resize controls for free objects. Canvas handles remain active where available.</p>

                    {isSelectedType('free_circle', 'free_ring') ? (
                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Radius {getNumericParam('radius', 0.08).toFixed(3)}</span>
                        <input
                          type="range"
                          min={0.01}
                          max={0.5}
                          step={0.001}
                          value={getNumericParam('radius', 0.08)}
                          onChange={(e) => setNumericParam('radius', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>
                    ) : null}

                    {isSelectedType('free_rect') ? (
                      <>
                        <label className="block space-y-1">
                          <span className="text-[11px] text-zinc-500">Width {getNumericParam('width', 0.24).toFixed(3)}</span>
                          <input
                            type="range"
                            min={0.02}
                            max={1}
                            step={0.001}
                            value={getNumericParam('width', 0.24)}
                            onChange={(e) => setNumericParam('width', Number(e.target.value))}
                            className="w-full"
                          />
                        </label>

                        <label className="block space-y-1">
                          <span className="text-[11px] text-zinc-500">Height {getNumericParam('height', 0.14).toFixed(3)}</span>
                          <input
                            type="range"
                            min={0.02}
                            max={1}
                            step={0.001}
                            value={getNumericParam('height', 0.14)}
                            onChange={(e) => setNumericParam('height', Number(e.target.value))}
                            className="w-full"
                          />
                        </label>

                        <label className="block space-y-1">
                          <span className="text-[11px] text-zinc-500">Corner Radius {getNumericParam('cornerRadius', 0.02).toFixed(3)}</span>
                          <input
                            type="range"
                            min={0}
                            max={0.5}
                            step={0.001}
                            value={getNumericParam('cornerRadius', 0.02)}
                            onChange={(e) => setNumericParam('cornerRadius', Number(e.target.value))}
                            className="w-full"
                          />
                        </label>
                      </>
                    ) : null}
                  </div>
                ) : null}

                {selectedElement.type === 'bezel' || selectedElement.type === 'outline_ring' || selectedElement.type === 'free_ring' ? (
                  <div className="space-y-2 rounded border border-zinc-800 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-400">Ring Controls</p>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Radius {getNumericParam('radius', 0.45).toFixed(3)}</span>
                      <input type="range" min={0} max={1} step={0.005} value={getNumericParam('radius', 0.45)} onChange={(e) => setNumericParam('radius', Number(e.target.value))} className="w-full" />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Thickness {getNumericParam('thickness', 0.02).toFixed(3)}</span>
                      <input type="range" min={0.001} max={0.2} step={0.001} value={getNumericParam('thickness', 0.02)} onChange={(e) => setNumericParam('thickness', Number(e.target.value))} className="w-full" />
                    </label>
                  </div>
                ) : null}

                {selectedElement.type === 'ticks_radial' ? (
                  <div className="space-y-2 rounded border border-zinc-800 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-400">Ticks Controls</p>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Tick Shape</span>
                      <select
                        value={getStringParam('tickShape', 'line')}
                        onChange={(e) => {
                          const value = (e.target.value || 'line').toLowerCase();
                          const nextShape = value === 'rect' || value === 'triangle' || value === 'round' ? value : 'line';
                          setStringParam('tickShape', nextShape);
                        }}
                        className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                      >
                        <option value="line">Line (legacy)</option>
                        <option value="rect">Rectangle</option>
                        <option value="triangle">Triangle</option>
                        <option value="round">Round</option>
                      </select>
                    </label>

                    {getStringParam('tickShape', 'line') !== 'line' ? (
                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Shape Align</span>
                        <select
                          value={getStringParam('rectAlign', 'radial')}
                          onChange={(e) => setStringParam('rectAlign', e.target.value === 'radial' ? 'radial' : 'screen')}
                          className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                        >
                          <option value="radial">Radial (follow center)</option>
                          <option value="screen">Screen Lock (upright)</option>
                        </select>
                      </label>
                    ) : null}

                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Radius {getNumericParam('radius', 0.42).toFixed(3)}</span>
                      <input type="range" min={0} max={1} step={0.005} value={getNumericParam('radius', 0.42)} onChange={(e) => setNumericParam('radius', Number(e.target.value))} className="w-full" />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Minor Length {getNumericParam('length', 0.02).toFixed(3)}</span>
                      <input type="range" min={0.001} max={0.2} step={0.001} value={getNumericParam('length', 0.02)} onChange={(e) => setNumericParam('length', Number(e.target.value))} className="w-full" />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Major Length {getNumericParam('majorLength', 0.035).toFixed(3)}</span>
                      <input type="range" min={0.001} max={0.2} step={0.001} value={getNumericParam('majorLength', 0.035)} onChange={(e) => setNumericParam('majorLength', Number(e.target.value))} className="w-full" />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Major Every (N ticks)</span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={Math.max(1, Math.round(getNumericParam('majorEvery', 5)))}
                        onChange={(e) => setNumericParam('majorEvery', Math.max(1, Number(e.target.value)))}
                        className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Width {getNumericParam('width', 0.003).toFixed(3)}</span>
                      <input type="range" min={0.001} max={0.1} step={0.001} value={getNumericParam('width', 0.003)} onChange={(e) => setNumericParam('width', Number(e.target.value))} className="w-full" />
                    </label>
                    <p className="text-[10px] text-zinc-500">Minor and major lengths are independent. Set equal for same size, or make either one larger/smaller.</p>

                    <div className="rounded border border-zinc-800 bg-zinc-900/35 p-2 space-y-2">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-400">Tick Token Mode</p>
                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Mode</span>
                        <select
                          value={selectedTickTokenMode}
                          onChange={(e) => setStringParam('token.mode', e.target.value)}
                          className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                        >
                          {TICK_TOKEN_MODE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>

                      {tickStepApplicable ? (
                        <label className="block space-y-1">
                          <span className="text-[11px] text-zinc-500">Tick Step (Every N ticks)</span>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={getNumericParam('token.every', Math.max(1, getNumericParam('majorEvery', 5)))}
                            onChange={(e) => setNumericParam('token.every', Math.max(1, Number(e.target.value)))}
                            className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                          />
                        </label>
                      ) : null}

                      {selectedTickTokenMode !== 'line' ? (
                        <>
                          <label className="block space-y-1">
                            <span className="text-[11px] text-zinc-500">Font Style (Library)</span>
                            <select
                              value={getStringParam('token.font.styleKey', 'arial')}
                              onChange={(e) => {
                                const nextStyle = FONT_STYLES.find((style) => style.key === e.target.value);
                                setStringParam('token.font.styleKey', e.target.value);
                                if (nextStyle) {
                                  setStringParam('token.font.family', nextStyle.fontFamily);
                                  setStringParam('token.font.weight', nextStyle.fontWeight);
                                }
                              }}
                              className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                            >
                              {FONT_STYLES.map((style) => (
                                <option key={style.key} value={style.key}>{style.label}</option>
                              ))}
                            </select>
                          </label>

                          <label className="block space-y-1">
                            <span className="text-[11px] text-zinc-500">Locale (IETF tag)</span>
                            <input
                              value={getStringParam('token.locale', 'en')}
                              onChange={(e) => setStringParam('token.locale', e.target.value)}
                              className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                              placeholder="en, ar, hi, ja, zh-CN"
                            />
                          </label>

                          <label className="block space-y-1">
                            <span className="text-[11px] text-zinc-500">Numbering System (optional)</span>
                            <input
                              value={getStringParam('token.numberingSystem', '')}
                              onChange={(e) => setStringParam('token.numberingSystem', e.target.value)}
                              className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                              placeholder="latn, arab, deva"
                            />
                          </label>

                          <label className="block space-y-1">
                            <span className="text-[11px] text-zinc-500">Text Radius Offset {getNumericParam('token.offset', 0.012).toFixed(3)}</span>
                            <input
                              type="range"
                              min={0}
                              max={0.08}
                              step={0.001}
                              value={getNumericParam('token.offset', 0.012)}
                              onChange={(e) => setNumericParam('token.offset', Number(e.target.value))}
                              className="w-full"
                            />
                          </label>

                          <label className="block space-y-1">
                            <span className="text-[11px] text-zinc-500">Text Size {getNumericParam('token.font.size', 0.06).toFixed(3)}</span>
                            <input
                              type="range"
                              min={0.02}
                              max={0.14}
                              step={0.001}
                              value={getNumericParam('token.font.size', 0.06)}
                              onChange={(e) => setNumericParam('token.font.size', Number(e.target.value))}
                              className="w-full"
                            />
                          </label>

                          <label className="block space-y-1">
                            <span className="text-[11px] text-zinc-500">Text Color</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={getColorParam('token.font.fill', '#ffffff')}
                                onChange={(e) => setStringParam('token.font.fill', e.target.value)}
                                className="h-8 w-10 rounded border border-zinc-700 bg-zinc-900 p-1"
                              />
                              <input
                                value={getStringParam('token.font.fill', '#ffffff')}
                                onChange={(e) => setStringParam('token.font.fill', e.target.value)}
                                className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                              />
                            </div>
                          </label>

                          {selectedTickTokenMode === 'number' ? (
                            <div className="grid grid-cols-3 gap-2">
                              <label className="block space-y-1">
                                <span className="text-[11px] text-zinc-500">Start</span>
                                <input
                                  type="number"
                                  value={getNumericParam('token.number.start', 12)}
                                  onChange={(e) => setNumericParam('token.number.start', Number(e.target.value))}
                                  className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                                />
                              </label>
                              <label className="block space-y-1">
                                <span className="text-[11px] text-zinc-500">Step</span>
                                <input
                                  type="number"
                                  value={getNumericParam('token.number.step', 1)}
                                  onChange={(e) => setNumericParam('token.number.step', Number(e.target.value))}
                                  className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                                />
                              </label>
                              <label className="block space-y-1">
                                <span className="text-[11px] text-zinc-500">Pad</span>
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={getNumericParam('token.number.pad', 0)}
                                  onChange={(e) => setNumericParam('token.number.pad', Number(e.target.value))}
                                  className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                                />
                              </label>
                            </div>
                          ) : null}

                          {selectedTickTokenMode === 'text' ? (
                            <div className="space-y-2">
                              <label className="block space-y-1">
                                <span className="text-[11px] text-zinc-500">Single Text Value</span>
                                <input
                                  value={getStringParam('token.text.value', '')}
                                  onChange={(e) => setStringParam('token.text.value', e.target.value)}
                                  className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                                  placeholder="Ù…Ø«Ø§Ù„"
                                />
                              </label>
                              <label className="block space-y-1">
                                <span className="text-[11px] text-zinc-500">Multilingual Token List (| separated)</span>
                                <input
                                  value={getStringParam('token.text.values', '')}
                                  onChange={(e) => setStringParam('token.text.values', e.target.value)}
                                  className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                                  placeholder="ä¸€|äºŒ|ä¸‰|å›› or Ø§Ù„Ø§Ø«Ù†ÙŠÙ†|Ø§Ù„Ø«Ù„Ø§Ø«Ø§Ø¡"
                                />
                              </label>
                            </div>
                          ) : null}

                          {selectedTickTokenMode === 'icon' ? (
                            <div className="space-y-2">
                              <label className="block space-y-1">
                                <span className="text-[11px] text-zinc-500">Icon Preset</span>
                                <select
                                  value={getStringParam('token.icon.key', 'dot')}
                                  onChange={(e) => setStringParam('token.icon.key', e.target.value)}
                                  className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                                >
                                  {TICK_ICON_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="block space-y-1">
                                <span className="text-[11px] text-zinc-500">Custom Icon Glyph (optional)</span>
                                <input
                                  value={getStringParam('token.icon.glyph', '')}
                                  onChange={(e) => setStringParam('token.icon.glyph', e.target.value)}
                                  className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                                  placeholder="â˜…"
                                />
                              </label>
                            </div>
                          ) : null}

                          <p className="text-[11px] text-zinc-500">
                            Token rendering active for number, text, and icon modes. Default line mode remains backward-compatible.
                          </p>
                        </>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {isSelectedType('free_circle', 'free_rect', 'free_ring', 'free_triangle', 'free_hexagon', 'free_octagon', 'free_polygon') ? (
                  <div className="space-y-2 rounded border border-zinc-800 p-2">
                    {(() => {
                      const freeShapeStrokeWidth = getNumericParam('thickness', getNumericParam('strokeWidth', 0.008));
                      return (
                        <>
                    <p className="text-[11px] uppercase tracking-wide text-zinc-400">Free Shape Paint</p>
                    <p className="text-[11px] text-zinc-500">Use color wheel or hex picker for fill and stroke.</p>

                    <label className="flex items-center justify-between gap-2 rounded border border-zinc-800 bg-zinc-950/40 px-2 py-1.5">
                      <span className="text-[11px] text-zinc-400">Fill Enabled</span>
                      <input
                        type="checkbox"
                        checked={!isFreeShapeFillDisabled()}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const currentFill = getStringParam('fill', '#58657b').trim();
                            setStringParam('fill', currentFill.toLowerCase() === 'none' || currentFill.length === 0 ? '#58657b' : currentFill);
                            return;
                          }
                          setStringParam('fill', 'none');
                        }}
                        className="h-4 w-4 accent-zinc-200"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Fill Color</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={getColorParam('fill', '#58657b')}
                          onChange={(e) => setStringParam('fill', e.target.value)}
                          disabled={isFreeShapeFillDisabled()}
                          className="h-8 w-10 rounded border border-zinc-700 bg-zinc-900 p-1"
                        />
                        <input
                          value={getStringParam('fill', '#58657b')}
                          onChange={(e) => setStringParam('fill', e.target.value)}
                          disabled={isFreeShapeFillDisabled()}
                          className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                        />
                      </div>
                    </label>

                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Stroke Color</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={getColorParam('stroke', '#e5ecff')}
                          onChange={(e) => setStringParam('stroke', e.target.value)}
                          className="h-8 w-10 rounded border border-zinc-700 bg-zinc-900 p-1"
                        />
                        <input
                          value={getStringParam('stroke', '#e5ecff')}
                          onChange={(e) => setStringParam('stroke', e.target.value)}
                          className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                        />
                      </div>
                    </label>

                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Stroke Width {freeShapeStrokeWidth.toFixed(3)}</span>
                      <input
                        type="range"
                        min={0}
                        max={0.06}
                        step={0.001}
                        value={freeShapeStrokeWidth}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          setNumericParam('thickness', next);
                        }}
                        className="w-full"
                      />
                    </label>
                        </>
                      );
                    })()}
                  </div>
                ) : null}

                {isSelectedType('free_triangle', 'free_hexagon', 'free_octagon', 'free_polygon') ? (
                  <div className="space-y-2 rounded border border-zinc-800 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-400">Side Length Controls</p>
                    <p className="text-[11px] text-zinc-500">Each side length is editable independently.</p>

                    {Array.from({ length: getSideCount() }).map((_, index) => (
                      <label key={`side-${index + 1}`} className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Side {index + 1}: {getSideLength(index, 0.1).toFixed(3)}</span>
                        <input
                          type="range"
                          min={0.02}
                          max={0.5}
                          step={0.001}
                          value={getSideLength(index, 0.1)}
                          onChange={(e) => setSideLength(index, Number(e.target.value))}
                          className="w-full"
                        />
                      </label>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-2 rounded border border-zinc-800 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-400">Element Style FX (All Types)</p>
                    <button
                      type="button"
                      onClick={() => setEffectPanelCollapsed((prev) => ({ ...prev, styleFx: !isEffectPanelCollapsed('styleFx') }))}
                      className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                    >
                      {isEffectPanelCollapsed('styleFx') ? 'Expand' : 'Collapse'}
                    </button>
                  </div>
                  {!isEffectPanelCollapsed('styleFx') ? (
                    <>
                  <p className="text-[11px] text-zinc-500">Highlight, shadows, sharpness, hue, and tint apply to any selected element.</p>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelectedStyleAdjustEnabled()}
                      onChange={(e) => setSelectedStyleAdjustEnabled(e.target.checked)}
                    />
                    <span className="text-[11px] text-zinc-400">Enable style adjustments</span>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Highlight {Math.round(mapEffectRenderToUi('highlight', getSelectedStyleAdjustNumber('highlight', 0)))}%</span>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      step={resolveAdaptiveRenderStep(getEffectParameterProfile('highlight'), mapEffectRenderToUi('highlight', getSelectedStyleAdjustNumber('highlight', 0)), 1)}
                      value={mapEffectRenderToUi('highlight', getSelectedStyleAdjustNumber('highlight', 0))}
                      onChange={(e) => {
                        const render = mapEffectUiToRender('highlight', Number(e.target.value));
                        queueThrottledSliderUpdate(() => setSelectedStyleAdjustNumber('highlight', render), getEffectParameterProfile('highlight').debounceMs ?? 16);
                      }}
                      className="w-full"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Shadows {Math.round(mapEffectRenderToUi('shadows', getSelectedStyleAdjustNumber('shadows', 0)))}%</span>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      step={resolveAdaptiveRenderStep(getEffectParameterProfile('shadows'), mapEffectRenderToUi('shadows', getSelectedStyleAdjustNumber('shadows', 0)), 1)}
                      value={mapEffectRenderToUi('shadows', getSelectedStyleAdjustNumber('shadows', 0))}
                      onChange={(e) => {
                        const render = mapEffectUiToRender('shadows', Number(e.target.value));
                        queueThrottledSliderUpdate(() => setSelectedStyleAdjustNumber('shadows', render), getEffectParameterProfile('shadows').debounceMs ?? 16);
                      }}
                      className="w-full"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Contrast {Math.round(mapEffectRenderToUi('contrast', getSelectedStyleAdjustNumber('contrast', 0)))}%</span>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      step={resolveAdaptiveRenderStep(getEffectParameterProfile('contrast'), mapEffectRenderToUi('contrast', getSelectedStyleAdjustNumber('contrast', 0)), 1)}
                      value={mapEffectRenderToUi('contrast', getSelectedStyleAdjustNumber('contrast', 0))}
                      onChange={(e) => {
                        const render = mapEffectUiToRender('contrast', Number(e.target.value));
                        queueThrottledSliderUpdate(() => setSelectedStyleAdjustNumber('contrast', render), getEffectParameterProfile('contrast').debounceMs ?? 16);
                      }}
                      className="w-full"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Sharpness {Math.round(mapEffectRenderToUi('sharpness', getSelectedStyleAdjustNumber('sharpness', 0)))}%</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={resolveAdaptiveRenderStep(getEffectParameterProfile('sharpness'), mapEffectRenderToUi('sharpness', getSelectedStyleAdjustNumber('sharpness', 0)), 1)}
                      value={mapEffectRenderToUi('sharpness', getSelectedStyleAdjustNumber('sharpness', 0))}
                      onChange={(e) => {
                        const render = mapEffectUiToRender('sharpness', Number(e.target.value));
                        queueThrottledSliderUpdate(() => setSelectedStyleAdjustNumber('sharpness', render), getEffectParameterProfile('sharpness').debounceMs ?? 16);
                      }}
                      className="w-full"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Hue {Math.round(getSelectedStyleAdjustNumber('hue', 0))}°</span>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={1}
                      value={getSelectedStyleAdjustNumber('hue', 0)}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        queueThrottledSliderUpdate(() => setSelectedStyleAdjustNumber('hue', v), 16);
                      }}
                      className="w-full"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Color</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={getSelectedElementColor()}
                        onChange={(e) => setSelectedElementColor(e.target.value)}
                        className="h-8 w-10 rounded border border-zinc-700 bg-zinc-900 p-1"
                      />
                      <input
                        value={getSelectedElementColor()}
                        onChange={(e) => setSelectedElementColor(e.target.value)}
                        className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                      />
                    </div>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Tint Color</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={normalizeColorHex(getSelectedStyleAdjustString('color', '#ffffff'), '#ffffff')}
                        onChange={(e) => setSelectedStyleAdjustString('color', e.target.value)}
                        className="h-8 w-10 rounded border border-zinc-700 bg-zinc-900 p-1"
                      />
                      <input
                        value={getSelectedStyleAdjustString('color', '#ffffff')}
                        onChange={(e) => setSelectedStyleAdjustString('color', e.target.value)}
                        className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                      />
                    </div>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Tint Opacity {Math.round(mapEffectRenderToUi('colorOpacity', getSelectedStyleAdjustNumber('colorOpacity', 0)))}%</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={mapEffectRenderToUi('colorOpacity', getSelectedStyleAdjustNumber('colorOpacity', 0))}
                      onChange={(e) => {
                        const render = mapEffectUiToRender('colorOpacity', Number(e.target.value));
                        queueThrottledSliderUpdate(() => setSelectedStyleAdjustNumber('colorOpacity', render), getEffectParameterProfile('colorOpacity').debounceMs ?? 16);
                      }}
                      className="w-full"
                    />
                  </label>
                    </>
                  ) : null}
                </div>

                <div className="space-y-2 rounded border border-zinc-800 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-400">Element Depth FX (All Types)</p>
                    <button
                      type="button"
                      onClick={() => setEffectPanelCollapsed((prev) => ({ ...prev, depthFx: !isEffectPanelCollapsed('depthFx') }))}
                      className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                    >
                      {isEffectPanelCollapsed('depthFx') ? 'Expand' : 'Collapse'}
                    </button>
                  </div>
                  {!isEffectPanelCollapsed('depthFx') ? (
                    <>
                  <p className="text-[11px] text-zinc-500">Optional per-element light direction and depth strength.</p>

                  <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/60 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500">Depth Presets</p>
                      <button
                        type="button"
                        onClick={clearSelectedDepthPreset}
                        className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                      >
                        Clear
                      </button>
                    </div>
                    {getSelectedDepthPresetKey() ? (
                      <p className="text-[11px] text-zinc-500">
                        Active: {getSelectedDepthPresetKey() === DEPTH_PRESET_CUSTOM_KEY
                          ? 'Custom'
                          : (DEPTH_PRESET_OPTIONS.find((entry) => entry.key === getSelectedDepthPresetKey())?.label ?? 'Custom')}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-1">
                      {DEPTH_PRESET_OPTIONS.map((preset) => (
                        <button
                          key={`depth-preset-${preset.key}`}
                          type="button"
                          onClick={() => applySelectedDepthPreset(preset.key)}
                          className={`rounded border px-2 py-1 text-[11px] hover:bg-zinc-800 ${getSelectedDepthPresetKey() === preset.key ? 'border-amber-400 bg-amber-500/10 text-amber-200' : 'border-zinc-700 text-zinc-300'}`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Depth Mode</span>
                    <select
                      value={(() => {
                        const mode = getSelectedEffect3dString('mode', 'outer');
                        if (mode === 'inner' || mode === 'front') return mode;
                        return 'outer';
                      })()}
                      onChange={(e) => {
                        const next = e.target.value === 'inner' || e.target.value === 'front' ? e.target.value : 'outer';
                        setSelectedEffect3dString('mode', next);
                      }}
                      className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                    >
                      <option value="outer">Emboss (Outer)</option>
                      <option value="inner">Engrave (Inner)</option>
                      <option value="front">Front Rim</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelectedEffect3dEnabled()}
                      onChange={(e) => setSelectedEffect3dEnabled(e.target.checked)}
                    />
                    <span className="text-[11px] text-zinc-400">Enable depth effect</span>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Depth Intensity {Math.round(mapEffectRenderToUi('depthIntensity', getSelectedEffect3dNumber('intensity', 0.22)))}%</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={resolveAdaptiveRenderStep(getEffectParameterProfile('depthIntensity'), mapEffectRenderToUi('depthIntensity', getSelectedEffect3dNumber('intensity', 0.22)), 1)}
                      value={mapEffectRenderToUi('depthIntensity', getSelectedEffect3dNumber('intensity', 0.22))}
                      onChange={(e) => {
                        const render = mapEffectUiToRender('depthIntensity', Number(e.target.value));
                        queueThrottledSliderUpdate(() => setSelectedEffect3dNumber('intensity', render), getEffectParameterProfile('depthIntensity').debounceMs ?? 16);
                      }}
                      className="w-full"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Depth Opacity {Math.round(mapEffectRenderToUi('depthOpacity', getSelectedEffect3dNumber('opacity', 0.44)))}%</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={resolveAdaptiveRenderStep(getEffectParameterProfile('depthOpacity'), mapEffectRenderToUi('depthOpacity', getSelectedEffect3dNumber('opacity', 0.44)), 1)}
                      value={mapEffectRenderToUi('depthOpacity', getSelectedEffect3dNumber('opacity', 0.44))}
                      onChange={(e) => {
                        const render = mapEffectUiToRender('depthOpacity', Number(e.target.value));
                        queueThrottledSliderUpdate(() => setSelectedEffect3dNumber('opacity', render), getEffectParameterProfile('depthOpacity').debounceMs ?? 16);
                      }}
                      className="w-full"
                    />
                  </label>

                  <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/60 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Manual 3D Light Vector</p>

                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Light X {Math.round(mapEffectRenderToUi('lightX', getSelectedEffect3dNumber('light.x', 0)))}%</span>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        step={resolveAdaptiveRenderStep(getEffectParameterProfile('lightX'), mapEffectRenderToUi('lightX', getSelectedEffect3dNumber('light.x', 0)), 1)}
                        value={mapEffectRenderToUi('lightX', getSelectedEffect3dNumber('light.x', 0))}
                        onChange={(e) => {
                          const render = mapEffectUiToRender('lightX', Number(e.target.value));
                          queueThrottledSliderUpdate(() => setSelectedEffect3dNumber('light.x', render), getEffectParameterProfile('lightX').debounceMs ?? 16);
                        }}
                        className="w-full"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Light Y {Math.round(mapEffectRenderToUi('lightY', getSelectedEffect3dNumber('light.y', 0)))}%</span>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        step={resolveAdaptiveRenderStep(getEffectParameterProfile('lightY'), mapEffectRenderToUi('lightY', getSelectedEffect3dNumber('light.y', 0)), 1)}
                        value={mapEffectRenderToUi('lightY', getSelectedEffect3dNumber('light.y', 0))}
                        onChange={(e) => {
                          const render = mapEffectUiToRender('lightY', Number(e.target.value));
                          queueThrottledSliderUpdate(() => setSelectedEffect3dNumber('light.y', render), getEffectParameterProfile('lightY').debounceMs ?? 16);
                        }}
                        className="w-full"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Light Z {Math.round(mapEffectRenderToUi('lightZ', getSelectedEffect3dNumber('light.z', 1)))}%</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={resolveAdaptiveRenderStep(getEffectParameterProfile('lightZ'), mapEffectRenderToUi('lightZ', getSelectedEffect3dNumber('light.z', 1)), 1)}
                        value={mapEffectRenderToUi('lightZ', getSelectedEffect3dNumber('light.z', 1))}
                        onChange={(e) => {
                          const render = mapEffectUiToRender('lightZ', Number(e.target.value));
                          queueThrottledSliderUpdate(() => setSelectedEffect3dNumber('light.z', render), getEffectParameterProfile('lightZ').debounceMs ?? 16);
                        }}
                        className="w-full"
                      />
                    </label>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Depth Distance {Math.round(mapEffectRenderToUi('depthDistance', getSelectedEffect3dNumber('distance', 1.2)))}%</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={resolveAdaptiveRenderStep(getEffectParameterProfile('depthDistance'), mapEffectRenderToUi('depthDistance', getSelectedEffect3dNumber('distance', 1.2)), 1)}
                      value={mapEffectRenderToUi('depthDistance', getSelectedEffect3dNumber('distance', 1.2))}
                      onChange={(e) => {
                        const render = mapEffectUiToRender('depthDistance', Number(e.target.value));
                        queueThrottledSliderUpdate(() => setSelectedEffect3dNumber('distance', render), getEffectParameterProfile('depthDistance').debounceMs ?? 16);
                      }}
                      className="w-full"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Depth Falloff {Math.round(mapEffectRenderToUi('depthFalloff', getSelectedEffect3dNumber('falloff', 1)))}%</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={resolveAdaptiveRenderStep(getEffectParameterProfile('depthFalloff'), mapEffectRenderToUi('depthFalloff', getSelectedEffect3dNumber('falloff', 1)), 1)}
                      value={mapEffectRenderToUi('depthFalloff', getSelectedEffect3dNumber('falloff', 1))}
                      onChange={(e) => {
                        const render = mapEffectUiToRender('depthFalloff', Number(e.target.value));
                        queueThrottledSliderUpdate(() => setSelectedEffect3dNumber('falloff', render), getEffectParameterProfile('depthFalloff').debounceMs ?? 16);
                      }}
                      className="w-full"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Depth White Balance {Math.round(mapEffectRenderToUi('depthWhiteBalance', getSelectedEffect3dNumber('whiteBalance', 0)))}%</span>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      step={resolveAdaptiveRenderStep(getEffectParameterProfile('depthWhiteBalance'), mapEffectRenderToUi('depthWhiteBalance', getSelectedEffect3dNumber('whiteBalance', 0)), 1)}
                      value={mapEffectRenderToUi('depthWhiteBalance', getSelectedEffect3dNumber('whiteBalance', 0))}
                      onChange={(e) => {
                        const render = mapEffectUiToRender('depthWhiteBalance', Number(e.target.value));
                        queueThrottledSliderUpdate(() => setSelectedEffect3dNumber('whiteBalance', render), getEffectParameterProfile('depthWhiteBalance').debounceMs ?? 16);
                      }}
                      className="w-full"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Depth Spread {Math.round(mapEffectRenderToUi('depthSpread', getSelectedEffect3dNumber('spread', 0)))}%</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={resolveAdaptiveRenderStep(getEffectParameterProfile('depthSpread'), mapEffectRenderToUi('depthSpread', getSelectedEffect3dNumber('spread', 0)), 1)}
                      value={mapEffectRenderToUi('depthSpread', getSelectedEffect3dNumber('spread', 0))}
                      onChange={(e) => {
                        const render = mapEffectUiToRender('depthSpread', Number(e.target.value));
                        queueThrottledSliderUpdate(() => setSelectedEffect3dNumber('spread', render), getEffectParameterProfile('depthSpread').debounceMs ?? 16);
                      }}
                      className="w-full"
                    />
                  </label>
                    </>
                  ) : null}
                </div>

                <div className="space-y-2 rounded border border-zinc-800 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-400">Element Texture (Clipped)</p>
                    <button
                      type="button"
                      onClick={() => setEffectPanelCollapsed((prev) => ({ ...prev, textureFx: !isEffectPanelCollapsed('textureFx') }))}
                      className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                    >
                      {isEffectPanelCollapsed('textureFx') ? 'Expand' : 'Collapse'}
                    </button>

                <div className="space-y-2 rounded border border-zinc-800 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-400">Element Drop Shadow (All Types)</p>
                    <button
                      type="button"
                      onClick={() => setEffectPanelCollapsed((prev) => ({ ...prev, shadowFx: !isEffectPanelCollapsed('shadowFx') }))}
                      className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                    >
                      {isEffectPanelCollapsed('shadowFx') ? 'Expand' : 'Collapse'}
                    </button>
                  </div>
                  {!isEffectPanelCollapsed('shadowFx') ? (
                    <>
                      <p className="text-[11px] text-zinc-500">Unified shadow controls for preview and export parity.</p>

                      <button
                        type="button"
                        onClick={() => setSelectedDropShadowEnabled(false)}
                        className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                      >
                        Clear Shadow
                      </button>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelectedDropShadowEnabled()}
                          onChange={(e) => setSelectedDropShadowEnabled(e.target.checked)}
                        />
                        <span className="text-[11px] text-zinc-400">Enable drop shadow</span>
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Shadow Mode</span>
                        <select
                          value={getSelectedDropShadowString('mode', 'outer') === 'inner' ? 'inner' : 'outer'}
                          onChange={(e) => setSelectedDropShadowString('mode', e.target.value === 'inner' ? 'inner' : 'outer')}
                          className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                        >
                          <option value="outer">Outer</option>
                          <option value="inner">Inner</option>
                        </select>
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Shadow Color</span>
                        <input
                          type="color"
                          value={getSelectedDropShadowColor('#000000')}
                          onChange={(e) => setSelectedDropShadowColor(e.target.value)}
                          className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-1"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">Shadow Opacity {Math.round(getSelectedDropShadowUiNumber('opacity', 0.12))}%<button type="button" data-reset-chip="true" onClick={() => { cancelPendingSliderUpdate(); setSelectedDropShadowUiNumber('opacity', 0); }} className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded border border-zinc-600 bg-zinc-900 text-[10px] leading-none text-zinc-300 hover:bg-zinc-700" title="Reset opacity to 0">R</button></span>
                        <input
                          type="range"
                          min={DROP_SHADOW_CONTROL_LIMITS.opacity.min}
                          max={DROP_SHADOW_CONTROL_LIMITS.opacity.max}
                          step={resolveAdaptiveRenderStep(
                            getParameterProfile('shadowOpacity'),
                            getSelectedDropShadowUiNumber('opacity', 0.12),
                            DROP_SHADOW_CONTROL_LIMITS.opacity.step,
                          )}
                          value={getSelectedDropShadowUiNumber('opacity', 0.12)}
                          onChange={(e) => {
                            const nextValue = Number(e.target.value);
                            const debounceMs = getParameterProfile('shadowOpacity')?.debounceMs ?? 16;
                            queueThrottledSliderUpdate(() => setSelectedDropShadowUiNumber('opacity', nextValue), debounceMs);
                          }}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">Shadow Blur {Math.round(getSelectedDropShadowUiNumber('blur', 1.2))}%<button type="button" data-reset-chip="true" onClick={() => { cancelPendingSliderUpdate(); setSelectedDropShadowUiNumber('blur', 0); }} className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded border border-zinc-600 bg-zinc-900 text-[10px] leading-none text-zinc-300 hover:bg-zinc-700" title="Reset blur to 0">R</button></span>
                        <input
                          type="range"
                          min={DROP_SHADOW_CONTROL_LIMITS.blur.min}
                          max={DROP_SHADOW_CONTROL_LIMITS.blur.max}
                          step={resolveAdaptiveRenderStep(
                            getParameterProfile('shadowBlur'),
                            getSelectedDropShadowUiNumber('blur', 1.2),
                            DROP_SHADOW_CONTROL_LIMITS.blur.step,
                          )}
                          value={getSelectedDropShadowUiNumber('blur', 1.2)}
                          onChange={(e) => {
                            const nextValue = Number(e.target.value);
                            const debounceMs = getParameterProfile('shadowBlur')?.debounceMs ?? 16;
                            queueThrottledSliderUpdate(() => setSelectedDropShadowUiNumber('blur', nextValue), debounceMs);
                          }}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">Shadow Spread {Math.round(getSelectedDropShadowUiNumber('spread', 0))}%<button type="button" data-reset-chip="true" onClick={() => { cancelPendingSliderUpdate(); setSelectedDropShadowUiNumber('spread', 0); }} className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded border border-zinc-600 bg-zinc-900 text-[10px] leading-none text-zinc-300 hover:bg-zinc-700" title="Reset spread to 0">R</button></span>
                        <input
                          type="range"
                          min={DROP_SHADOW_CONTROL_LIMITS.spread.min}
                          max={DROP_SHADOW_CONTROL_LIMITS.spread.max}
                          step={resolveAdaptiveRenderStep(
                            getParameterProfile('shadowSpread'),
                            getSelectedDropShadowUiNumber('spread', 0),
                            DROP_SHADOW_CONTROL_LIMITS.spread.step,
                          )}
                          value={getSelectedDropShadowUiNumber('spread', 0)}
                          onChange={(e) => {
                            const nextValue = Number(e.target.value);
                            const debounceMs = getParameterProfile('shadowSpread')?.debounceMs ?? 16;
                            queueThrottledSliderUpdate(() => setSelectedDropShadowUiNumber('spread', nextValue), debounceMs);
                          }}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">Offset X {Math.round(getSelectedDropShadowUiNumber('offsetX', 1))}% ({getSelectedDropShadowNumber('offsetX', 1).toFixed(1)}px)<button type="button" data-reset-chip="true" onClick={() => { cancelPendingSliderUpdate(); setSelectedDropShadowUiNumber('offsetX', 0); }} className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded border border-zinc-600 bg-zinc-900 text-[10px] leading-none text-zinc-300 hover:bg-zinc-700" title="Reset offset X to 0">R</button></span>
                        <input
                          type="range"
                          min={DROP_SHADOW_CONTROL_LIMITS.offset.min}
                          max={DROP_SHADOW_CONTROL_LIMITS.offset.max}
                          step={resolveAdaptiveRenderStep(
                            getParameterProfile('shadowOffset'),
                            getSelectedDropShadowUiNumber('offsetX', 1),
                            DROP_SHADOW_CONTROL_LIMITS.offset.step,
                          )}
                          value={getSelectedDropShadowUiNumber('offsetX', 1)}
                          onChange={(e) => {
                            const nextValue = Number(e.target.value);
                            const debounceMs = getParameterProfile('shadowOffset')?.debounceMs ?? 16;
                            queueThrottledSliderUpdate(() => setSelectedDropShadowUiNumber('offsetX', nextValue), debounceMs);
                          }}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">Offset Y {Math.round(getSelectedDropShadowUiNumber('offsetY', 1))}% ({getSelectedDropShadowNumber('offsetY', 1).toFixed(1)}px)<button type="button" data-reset-chip="true" onClick={() => { cancelPendingSliderUpdate(); setSelectedDropShadowUiNumber('offsetY', 0); }} className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded border border-zinc-600 bg-zinc-900 text-[10px] leading-none text-zinc-300 hover:bg-zinc-700" title="Reset offset Y to 0">R</button></span>
                        <input
                          type="range"
                          min={DROP_SHADOW_CONTROL_LIMITS.offset.min}
                          max={DROP_SHADOW_CONTROL_LIMITS.offset.max}
                          step={resolveAdaptiveRenderStep(
                            getParameterProfile('shadowOffset'),
                            getSelectedDropShadowUiNumber('offsetY', 1),
                            DROP_SHADOW_CONTROL_LIMITS.offset.step,
                          )}
                          value={getSelectedDropShadowUiNumber('offsetY', 1)}
                          onChange={(e) => {
                            const nextValue = Number(e.target.value);
                            const debounceMs = getParameterProfile('shadowOffset')?.debounceMs ?? 16;
                            queueThrottledSliderUpdate(() => setSelectedDropShadowUiNumber('offsetY', nextValue), debounceMs);
                          }}
                          className="w-full"
                        />
                      </label>

                      {import.meta.env.DEV ? (
                        <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/60 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Parameter Inspector (Dev)</p>
                            <button
                              type="button"
                              onClick={() => setShowParameterInspector((prev) => !prev)}
                              className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                            >
                              {showParameterInspector ? 'Hide' : 'Show'}
                            </button>
                          </div>
                          {showParameterInspector ? (
                            <div className="space-y-1">
                              {getShadowParameterInspectorRows().map((row) => (
                                <div key={`shadow-inspector-${row.label}`} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 text-[11px] text-zinc-400">
                                  <span className="text-zinc-300">{row.label}</span>
                                  <span>ui: {row.uiValue.toFixed(2)}</span>
                                  <span>render: {row.mappedRenderValue.toFixed(3)}</span>
                                  <span className="uppercase text-zinc-500">{row.curve}</span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
                  </div>
                  {!isEffectPanelCollapsed('textureFx') ? (
                    <>
                  <p className="text-[11px] text-zinc-500">Layered texture system. Each texture layer has independent blend mode, blur, and clip target.</p>

                  <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/60 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500">Texture Layers</p>
                      <span className="text-[11px] text-zinc-500">{getSelectedTextureLayers().length} layer(s)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={Math.max(0, Math.min(activeTextureLayerIndex, Math.max(0, getSelectedTextureLayers().length - 1)))}
                        onChange={(e) => setActiveTextureLayerIndex(Number(e.target.value))}
                        className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                      >
                        {getSelectedTextureLayers().length === 0 ? <option value={0}>No layer</option> : null}
                        {getSelectedTextureLayers().map((_layer: Record<string, unknown>, index: number) => (
                          <option key={`texture-layer-${index}`} value={index}>Layer {index + 1}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={addSelectedTextureLayer}
                        className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={removeSelectedTextureLayer}
                        className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelectedTextureEnabled()}
                      onChange={(e) => setSelectedTextureEnabled(e.target.checked)}
                    />
                    <span className="text-[11px] text-zinc-400">Enable texture on this element</span>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Texture Kind</span>
                    <select
                      value={getSelectedTextureString('kind', 'grain')}
                      onChange={(e) => setSelectedTextureString('kind', e.target.value)}
                      className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                    >
                      {TEXTURE_KIND_OPTIONS.map((option) => (
                        <option key={`texture-kind-${option.value}`} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>

                  {getSelectedTextureString('kind', 'grain') === 'grain' || getSelectedTextureString('kind', 'grain') === 'noise' ? (
                    <>
                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Noise Amount {getSelectedTextureNumber('noise.amount', 0.2).toFixed(2)}</span>
                        <input
                          type="range"
                          min={0}
                          max={3}
                          step={0.01}
                          value={getSelectedTextureNumber('noise.amount', 0.2)}
                          onChange={(e) => setSelectedTextureNumber('noise.amount', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Noise Radius {getSelectedTextureNumber('noise.radius', 24).toFixed(1)}</span>
                        <input
                          type="range"
                          min={0.1}
                          max={320}
                          step={0.1}
                          value={getSelectedTextureNumber('noise.radius', 24)}
                          onChange={(e) => setSelectedTextureNumber('noise.radius', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>
                    </>
                  ) : null}

                  {getSelectedTextureString('kind', 'grain') === 'brushed' ? (
                    <>
                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Brushed Amount {getSelectedTextureNumber('noise.amount', 0.24).toFixed(2)}</span>
                        <input
                          type="range"
                          min={0}
                          max={3}
                          step={0.01}
                          value={getSelectedTextureNumber('noise.amount', 0.24)}
                          onChange={(e) => setSelectedTextureNumber('noise.amount', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Brushed Radius {getSelectedTextureNumber('noise.radius', 24).toFixed(1)}</span>
                        <input
                          type="range"
                          min={0.1}
                          max={320}
                          step={0.1}
                          value={getSelectedTextureNumber('noise.radius', 24)}
                          onChange={(e) => setSelectedTextureNumber('noise.radius', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Direction {Math.round(getSelectedTextureNumber('direction', 0))}deg</span>
                        <input
                          type="range"
                          min={-180}
                          max={180}
                          step={1}
                          value={getSelectedTextureNumber('direction', 0)}
                          onChange={(e) => setSelectedTextureNumber('direction', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>
                    </>
                  ) : null}

                  {getSelectedTextureString('kind', 'grain') === 'fabric' ? (
                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Density {getSelectedTextureNumber('density', 0.5).toFixed(2)}</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={getSelectedTextureNumber('density', 0.5)}
                        onChange={(e) => setSelectedTextureNumber('density', Number(e.target.value))}
                        className="w-full"
                      />
                    </label>
                  ) : null}

                  {getSelectedTextureString('kind', 'grain') === 'paper' ? (
                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Fiber {getSelectedTextureNumber('fiber', 0.5).toFixed(2)}</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={getSelectedTextureNumber('fiber', 0.5)}
                        onChange={(e) => setSelectedTextureNumber('fiber', Number(e.target.value))}
                        className="w-full"
                      />
                    </label>
                  ) : null}

                  {getSelectedTextureString('kind', 'grain') === 'image' ? (
                    <>
                      <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/60 p-2">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">Image Texture Source</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
                            handleTextureImageFileSelection(file);
                            e.currentTarget.value = '';
                          }}
                          className="block w-full text-[11px] text-zinc-300 file:mr-3 file:rounded file:border file:border-zinc-700 file:bg-zinc-900 file:px-2 file:py-1 file:text-[11px] file:text-zinc-200"
                        />
                        {getSelectedTextureString('image.src', '').trim().length > 0 ? (
                          <>
                            <img
                              src={getSelectedTextureString('image.src', '')}
                              alt="Texture source"
                              className="h-24 w-full rounded border border-zinc-800 bg-zinc-900 object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setSelectedTextureString('image.src', '')}
                              className="h-7 rounded border border-zinc-700 px-2 text-[11px] text-zinc-300 hover:border-zinc-500"
                            >
                              Clear image
                            </button>
                          </>
                        ) : (
                          <p className="text-[11px] text-zinc-500">Upload image to drive texture mapping.</p>
                        )}
                      </div>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Offset X {Math.round(getSelectedTextureNumber('image.offsetX', 0))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          step={1}
                          value={getSelectedTextureNumber('image.offsetX', 0)}
                          onChange={(e) => setSelectedTextureNumber('image.offsetX', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Offset Y {Math.round(getSelectedTextureNumber('image.offsetY', 0))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          step={1}
                          value={getSelectedTextureNumber('image.offsetY', 0)}
                          onChange={(e) => setSelectedTextureNumber('image.offsetY', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Scale {getSelectedTextureNumber('image.scale', 1).toFixed(2)}</span>
                        <input
                          type="range"
                          min={0.1}
                          max={5}
                          step={0.01}
                          value={getSelectedTextureNumber('image.scale', 1)}
                          onChange={(e) => setSelectedTextureNumber('image.scale', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Rotation {Math.round(getSelectedTextureNumber('image.rotation', 0))}deg</span>
                        <input
                          type="range"
                          min={-180}
                          max={180}
                          step={1}
                          value={getSelectedTextureNumber('image.rotation', 0)}
                          onChange={(e) => setSelectedTextureNumber('image.rotation', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Image Fit</span>
                        <select
                          value={getSelectedTextureString('image.fit', 'cover')}
                          onChange={(e) => setSelectedTextureString('image.fit', e.target.value)}
                          className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                        >
                          <option value="cover">Cover</option>
                          <option value="contain">Contain</option>
                          <option value="stretch">Stretch</option>
                        </select>
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Texture Radius {getSelectedTextureNumber('image.radius', 0).toFixed(1)}</span>
                        <input
                          type="range"
                          min={0}
                          max={120}
                          step={0.1}
                          value={getSelectedTextureNumber('image.radius', 0)}
                          onChange={(e) => setSelectedTextureNumber('image.radius', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>
                    </>
                  ) : null}

                  {getSelectedTextureString('kind', 'grain') === 'proceduralMap' ? (
                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Seed</span>
                      <input
                        type="number"
                        step={1}
                        value={Math.round(getSelectedTextureNumber('seed', 1))}
                        onChange={(e) => setSelectedTextureNumber('seed', Number(e.target.value))}
                        className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                      />
                    </label>
                  ) : null}

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Opacity {getSelectedTextureNumber('opacity', 0.3).toFixed(2)}</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={getSelectedTextureNumber('opacity', 0.3)}
                      onChange={(e) => setSelectedTextureNumber('opacity', Number(e.target.value))}
                      className="w-full"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Texture Blend Mode</span>
                    <select
                      value={getSelectedTextureString('blendMode', 'overlay')}
                      onChange={(e) => setSelectedTextureString('blendMode', e.target.value)}
                      className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                    >
                      {BLEND_MODE_OPTIONS.map((option) => (
                        <option key={`texture-blend-${option.value}`} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>

                  <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/60 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Texture Blur</p>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={getSelectedTextureBoolean('blur.enabled', false)}
                        onChange={(e) => setSelectedTextureBoolean('blur.enabled', e.target.checked)}
                      />
                      <span className="text-[11px] text-zinc-400">Enable texture blur</span>
                    </label>

                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Blur Mode</span>
                      <select
                        value={getSelectedTextureString('blur.type', 'gaussian')}
                        onChange={(e) => setSelectedTextureString('blur.type', e.target.value)}
                        className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                      >
                        {BLUR_MODE_OPTIONS.map((option) => (
                          <option key={`texture-blur-${option.value}`} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Blur Amount {getSelectedTextureNumber('blur.amount', 0).toFixed(2)}</span>
                      <input
                        type="range"
                        min={0}
                        max={72}
                        step={0.1}
                        value={getSelectedTextureNumber('blur.amount', 0)}
                        onChange={(e) => setSelectedTextureNumber('blur.amount', Number(e.target.value))}
                        className="w-full"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Blur Angle {Math.round(getSelectedTextureNumber('blur.angle', 0))}deg</span>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={1}
                        value={getSelectedTextureNumber('blur.angle', 0)}
                        onChange={(e) => setSelectedTextureNumber('blur.angle', Number(e.target.value))}
                        className="w-full"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Blur Samples {Math.round(getSelectedTextureNumber('blur.samples', 8))}</span>
                      <input
                        type="range"
                        min={3}
                        max={24}
                        step={1}
                        value={getSelectedTextureNumber('blur.samples', 8)}
                        onChange={(e) => setSelectedTextureNumber('blur.samples', Number(e.target.value))}
                        className="w-full"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Blur Strength {getSelectedTextureNumber('blur.strength', 0.5).toFixed(2)}</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={getSelectedTextureNumber('blur.strength', 0.5)}
                        onChange={(e) => setSelectedTextureNumber('blur.strength', Number(e.target.value))}
                        className="w-full"
                      />
                    </label>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Gradient Type</span>
                    <select
                      value={textureGradientKind}
                      onChange={(e) => setCanvasGradientKind('texture', e.target.value)}
                      className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                    >
                      {GRADIENT_KIND_OPTIONS.map((option) => (
                        <option key={`texture-gradient-kind-${option.value}`} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>

                  {textureGradientKind === 'linear' ? (
                    <>
                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient Start X {Math.round(getSelectedTextureNumber('gradient.from.0', 0))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={200}
                          step={1}
                          value={getSelectedTextureNumber('gradient.from.0', 0)}
                          onChange={(e) => setSelectedTextureNumber('gradient.from.0', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient Start Y {Math.round(getSelectedTextureNumber('gradient.from.1', 0))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={200}
                          step={1}
                          value={getSelectedTextureNumber('gradient.from.1', 0)}
                          onChange={(e) => setSelectedTextureNumber('gradient.from.1', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient End X {Math.round(getSelectedTextureNumber('gradient.to.0', 100))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={200}
                          step={1}
                          value={getSelectedTextureNumber('gradient.to.0', 100)}
                          onChange={(e) => setSelectedTextureNumber('gradient.to.0', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient End Y {Math.round(getSelectedTextureNumber('gradient.to.1', 100))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={200}
                          step={1}
                          value={getSelectedTextureNumber('gradient.to.1', 100)}
                          onChange={(e) => setSelectedTextureNumber('gradient.to.1', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>
                    </>
                  ) : textureGradientKind === 'radial' ? (
                    <>
                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient Center X {Math.round(getSelectedTextureNumber('gradient.center.0', 50))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={200}
                          step={1}
                          value={getSelectedTextureNumber('gradient.center.0', 50)}
                          onChange={(e) => setSelectedTextureNumber('gradient.center.0', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient Center Y {Math.round(getSelectedTextureNumber('gradient.center.1', 50))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={200}
                          step={1}
                          value={getSelectedTextureNumber('gradient.center.1', 50)}
                          onChange={(e) => setSelectedTextureNumber('gradient.center.1', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient Radius {getSelectedTextureNumber('gradient.radius', 50).toFixed(1)}%</span>
                        <input
                          type="range"
                          min={0}
                          max={200}
                          step={0.5}
                          value={getSelectedTextureNumber('gradient.radius', 50)}
                          onChange={(e) => setSelectedTextureNumber('gradient.radius', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient Focal X {Math.round(getSelectedTextureNumber('gradient.focal.0', 50))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={200}
                          step={1}
                          value={getSelectedTextureNumber('gradient.focal.0', 50)}
                          onChange={(e) => setSelectedTextureNumber('gradient.focal.0', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient Focal Y {Math.round(getSelectedTextureNumber('gradient.focal.1', 50))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={200}
                          step={1}
                          value={getSelectedTextureNumber('gradient.focal.1', 50)}
                          onChange={(e) => setSelectedTextureNumber('gradient.focal.1', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>
                    </>
                  ) : textureGradientKind === 'conic' ? (
                    <>
                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient Center X {Math.round(getSelectedTextureNumber('gradient.center.0', 50))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={200}
                          step={1}
                          value={getSelectedTextureNumber('gradient.center.0', 50)}
                          onChange={(e) => setSelectedTextureNumber('gradient.center.0', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient Center Y {Math.round(getSelectedTextureNumber('gradient.center.1', 50))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={200}
                          step={1}
                          value={getSelectedTextureNumber('gradient.center.1', 50)}
                          onChange={(e) => setSelectedTextureNumber('gradient.center.1', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Start Angle {Math.round(getSelectedTextureNumber('gradient.angleStart', 0))}deg</span>
                        <input
                          type="range"
                          min={-360}
                          max={360}
                          step={1}
                          value={getSelectedTextureNumber('gradient.angleStart', 0)}
                          onChange={(e) => setSelectedTextureNumber('gradient.angleStart', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Angle Span {Math.round(getSelectedTextureNumber('gradient.angleSpan', 360))}deg</span>
                        <input
                          type="range"
                          min={0}
                          max={360}
                          step={1}
                          value={getSelectedTextureNumber('gradient.angleSpan', 360)}
                          onChange={(e) => setSelectedTextureNumber('gradient.angleSpan', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>
                    </>
                  ) : (
                    <p className="text-[11px] text-zinc-500">Choose gradient type to edit controls.</p>
                  )}

                  <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/60 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Gradient Stops</p>
                    {[0, 1, 2].map((stopIndex) => (
                      <div key={`stop-${stopIndex}`} className="space-y-1">
                        <p className="text-[11px] text-zinc-500">Stop {stopIndex + 1}</p>
                        <label className="block space-y-1">
                          <span className="text-[11px] text-zinc-500">Offset {getSelectedTextureNumber(`gradient.stops.${stopIndex}.offset`, stopIndex === 0 ? 0 : stopIndex === 1 ? 0.5 : 1).toFixed(2)}</span>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={getSelectedTextureNumber(`gradient.stops.${stopIndex}.offset`, stopIndex === 0 ? 0 : stopIndex === 1 ? 0.5 : 1)}
                            onChange={(e) => setSelectedTextureNumber(`gradient.stops.${stopIndex}.offset`, Number(e.target.value))}
                            className="w-full"
                          />
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={normalizeColorHex(getSelectedTextureString(`gradient.stops.${stopIndex}.color`, stopIndex === 0 ? '#ffffff' : stopIndex === 1 ? '#8899aa' : '#000000'), '#ffffff')}
                            onChange={(e) => setSelectedTextureString(`gradient.stops.${stopIndex}.color`, e.target.value)}
                            className="h-8 w-10 rounded border border-zinc-700 bg-zinc-900 p-1"
                          />
                          <input
                            value={getSelectedTextureString(`gradient.stops.${stopIndex}.color`, stopIndex === 0 ? '#ffffff' : stopIndex === 1 ? '#8899aa' : '#000000')}
                            onChange={(e) => setSelectedTextureString(`gradient.stops.${stopIndex}.color`, e.target.value)}
                            className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                          />
                        </div>
                        <label className="block space-y-1">
                          <span className="text-[11px] text-zinc-500">Stop Opacity {getSelectedTextureNumber(`gradient.stops.${stopIndex}.opacity`, stopIndex === 0 ? 0.22 : stopIndex === 1 ? 0.2 : 0.18).toFixed(2)}</span>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={getSelectedTextureNumber(`gradient.stops.${stopIndex}.opacity`, stopIndex === 0 ? 0.22 : stopIndex === 1 ? 0.2 : 0.18)}
                            onChange={(e) => setSelectedTextureNumber(`gradient.stops.${stopIndex}.opacity`, Number(e.target.value))}
                            className="w-full"
                          />
                        </label>
                      </div>
                    ))}
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedTextureClipEnabled}
                      onChange={(e) => setSelectedTextureClipEnabled(e.target.checked)}
                    />
                    <span className="text-[11px] text-zinc-400">Clip texture to target element</span>
                  </label>

                  {selectedTextureClipEnabled ? (
                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Texture Clip Target Name</span>
                      <input
                        value={getSelectedTextureClipTargetName()}
                        onChange={(e) => setSelectedTextureClipTargetName(e.target.value)}
                        className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                      />
                    </label>
                  ) : null}
                    </>
                  ) : null}
                </div>

                <div className="space-y-2 rounded border border-zinc-800 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-400">Element Gradient (Separate)</p>
                    <button
                      type="button"
                      onClick={() => setEffectPanelCollapsed((prev) => ({ ...prev, gradientFx: !isEffectPanelCollapsed('gradientFx') }))}
                      className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                    >
                      {isEffectPanelCollapsed('gradientFx') ? 'Expand' : 'Collapse'}
                    </button>
                  </div>
                  {!isEffectPanelCollapsed('gradientFx') ? (
                    <>
                  <p className="text-[11px] text-zinc-500">Independent gradient overlay separate from texture and material.</p>

                  <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/60 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500">Gradient Layers</p>
                      <span className="text-[11px] text-zinc-500">{getSelectedGradientLayers().length} layer(s)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={Math.max(0, Math.min(activeGradientLayerIndex, Math.max(0, getSelectedGradientLayers().length - 1)))}
                        onChange={(e) => setActiveGradientLayerIndex(Number(e.target.value))}
                        className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                      >
                        {getSelectedGradientLayers().length === 0 ? <option value={0}>No layer</option> : null}
                        {getSelectedGradientLayers().map((_layer: Record<string, unknown>, index: number) => (
                          <option key={`gradient-layer-${index}`} value={index}>Layer {index + 1}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={addSelectedGradientLayer}
                        className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={removeSelectedGradientLayer}
                        className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelectedGradientEnabled()}
                      onChange={(e) => setSelectedGradientEnabled(e.target.checked)}
                    />
                    <span className="text-[11px] text-zinc-400">Enable separate gradient on this element</span>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Opacity {getSelectedGradientNumber('opacity', 0.24).toFixed(2)}</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={getSelectedGradientNumber('opacity', 0.24)}
                      onChange={(e) => setSelectedGradientNumber('opacity', Number(e.target.value))}
                      className="w-full"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Blend Mode</span>
                    <select
                      value={getSelectedGradientString('blendMode', 'overlay')}
                      onChange={(e) => setSelectedGradientString('blendMode', e.target.value)}
                      className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                    >
                      {BLEND_MODE_OPTIONS.map((option) => (
                        <option key={`gradient-blend-${option.value}`} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>

                  <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/60 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Gradient Blur</p>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={getSelectedGradientBoolean('blur.enabled', false)}
                        onChange={(e) => setSelectedGradientBoolean('blur.enabled', e.target.checked)}
                      />
                      <span className="text-[11px] text-zinc-400">Enable gradient blur</span>
                    </label>
                    {getSelectedGradientBoolean('blur.enabled', false) ? (
                      <>
                        <label className="block space-y-1">
                          <span className="text-[11px] text-zinc-500">Blur Mode</span>
                          <select
                            value={getSelectedGradientString('blur.type', 'gaussian')}
                            onChange={(e) => setSelectedGradientString('blur.type', e.target.value)}
                            className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                          >
                            {BLUR_MODE_OPTIONS.map((option) => (
                              <option key={`gradient-blur-${option.value}`} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>

                        <label className="block space-y-1">
                          <span className="text-[11px] text-zinc-500">Blur Amount {getSelectedGradientNumber('blur.amount', 0).toFixed(2)}</span>
                          <input
                            type="range"
                            min={0}
                            max={72}
                            step={0.1}
                            value={getSelectedGradientNumber('blur.amount', 0)}
                            onChange={(e) => setSelectedGradientNumber('blur.amount', Number(e.target.value))}
                            className="w-full"
                          />
                        </label>

                        <label className="block space-y-1">
                          <span className="text-[11px] text-zinc-500">Blur Angle {Math.round(getSelectedGradientNumber('blur.angle', 0))}deg</span>
                          <input
                            type="range"
                            min={-180}
                            max={180}
                            step={1}
                            value={getSelectedGradientNumber('blur.angle', 0)}
                            onChange={(e) => setSelectedGradientNumber('blur.angle', Number(e.target.value))}
                            className="w-full"
                          />
                        </label>

                        <label className="block space-y-1">
                          <span className="text-[11px] text-zinc-500">Blur Samples {Math.round(getSelectedGradientNumber('blur.samples', 8))}</span>
                          <input
                            type="range"
                            min={3}
                            max={24}
                            step={1}
                            value={getSelectedGradientNumber('blur.samples', 8)}
                            onChange={(e) => setSelectedGradientNumber('blur.samples', Number(e.target.value))}
                            className="w-full"
                          />
                        </label>

                        <label className="block space-y-1">
                          <span className="text-[11px] text-zinc-500">Blur Strength {getSelectedGradientNumber('blur.strength', 0.5).toFixed(2)}</span>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={getSelectedGradientNumber('blur.strength', 0.5)}
                            onChange={(e) => setSelectedGradientNumber('blur.strength', Number(e.target.value))}
                            className="w-full"
                          />
                        </label>
                      </>
                    ) : null}
                  </div>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Gradient Type</span>
                    <select
                      value={elementGradientKind}
                      onChange={(e) => setCanvasGradientKind('gradient', e.target.value)}
                      className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                    >
                      {GRADIENT_KIND_OPTIONS.map((option) => (
                        <option key={`element-gradient-kind-${option.value}`} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>

                  {elementGradientKind === 'linear' ? (
                    <>
                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient Start X {Math.round(getSelectedGradientNumber('from.0', 0))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={200}
                          step={1}
                          value={getSelectedGradientNumber('from.0', 0)}
                          onChange={(e) => setSelectedGradientNumber('from.0', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient Start Y {Math.round(getSelectedGradientNumber('from.1', 0))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={200}
                          step={1}
                          value={getSelectedGradientNumber('from.1', 0)}
                          onChange={(e) => setSelectedGradientNumber('from.1', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient End X {Math.round(getSelectedGradientNumber('to.0', 100))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={200}
                          step={1}
                          value={getSelectedGradientNumber('to.0', 100)}
                          onChange={(e) => setSelectedGradientNumber('to.0', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient End Y {Math.round(getSelectedGradientNumber('to.1', 100))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={200}
                          step={1}
                          value={getSelectedGradientNumber('to.1', 100)}
                          onChange={(e) => setSelectedGradientNumber('to.1', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>
                    </>
                  ) : elementGradientKind === 'radial' ? (
                    <>
                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient Center X {Math.round(getSelectedGradientNumber('center.0', 50))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={200}
                          step={1}
                          value={getSelectedGradientNumber('center.0', 50)}
                          onChange={(e) => setSelectedGradientNumber('center.0', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient Center Y {Math.round(getSelectedGradientNumber('center.1', 50))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={200}
                          step={1}
                          value={getSelectedGradientNumber('center.1', 50)}
                          onChange={(e) => setSelectedGradientNumber('center.1', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient Radius {getSelectedGradientNumber('radius', 50).toFixed(1)}%</span>
                        <input
                          type="range"
                          min={0}
                          max={200}
                          step={0.5}
                          value={getSelectedGradientNumber('radius', 50)}
                          onChange={(e) => setSelectedGradientNumber('radius', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient Focal X {Math.round(getSelectedGradientNumber('focal.0', 50))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={200}
                          step={1}
                          value={getSelectedGradientNumber('focal.0', 50)}
                          onChange={(e) => setSelectedGradientNumber('focal.0', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient Focal Y {Math.round(getSelectedGradientNumber('focal.1', 50))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={200}
                          step={1}
                          value={getSelectedGradientNumber('focal.1', 50)}
                          onChange={(e) => setSelectedGradientNumber('focal.1', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>
                    </>
                  ) : elementGradientKind === 'conic' ? (
                    <>
                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient Center X {Math.round(getSelectedGradientNumber('center.0', 50))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={200}
                          step={1}
                          value={getSelectedGradientNumber('center.0', 50)}
                          onChange={(e) => setSelectedGradientNumber('center.0', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Gradient Center Y {Math.round(getSelectedGradientNumber('center.1', 50))}%</span>
                        <input
                          type="range"
                          min={-100}
                          max={200}
                          step={1}
                          value={getSelectedGradientNumber('center.1', 50)}
                          onChange={(e) => setSelectedGradientNumber('center.1', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Start Angle {Math.round(getSelectedGradientNumber('angleStart', 0))}deg</span>
                        <input
                          type="range"
                          min={-360}
                          max={360}
                          step={1}
                          value={getSelectedGradientNumber('angleStart', 0)}
                          onChange={(e) => setSelectedGradientNumber('angleStart', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Angle Span {Math.round(getSelectedGradientNumber('angleSpan', 360))}deg</span>
                        <input
                          type="range"
                          min={0}
                          max={360}
                          step={1}
                          value={getSelectedGradientNumber('angleSpan', 360)}
                          onChange={(e) => setSelectedGradientNumber('angleSpan', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>
                    </>
                  ) : (
                    <p className="text-[11px] text-zinc-500">Choose gradient type to edit controls.</p>
                  )}

                  <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/60 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Gradient Stops</p>
                    {[0, 1, 2].map((stopIndex) => (
                      <div key={`overlay-stop-${stopIndex}`} className="space-y-1">
                        <p className="text-[11px] text-zinc-500">Stop {stopIndex + 1}</p>
                        <label className="block space-y-1">
                          <span className="text-[11px] text-zinc-500">Offset {getSelectedGradientNumber(`stops.${stopIndex}.offset`, stopIndex === 0 ? 0 : stopIndex === 1 ? 0.5 : 1).toFixed(2)}</span>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={getSelectedGradientNumber(`stops.${stopIndex}.offset`, stopIndex === 0 ? 0 : stopIndex === 1 ? 0.5 : 1)}
                            onChange={(e) => setSelectedGradientNumber(`stops.${stopIndex}.offset`, Number(e.target.value))}
                            className="w-full"
                          />
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={normalizeColorHex(getSelectedGradientString(`stops.${stopIndex}.color`, stopIndex === 0 ? '#ffffff' : stopIndex === 1 ? '#8899aa' : '#000000'), '#ffffff')}
                            onChange={(e) => setSelectedGradientString(`stops.${stopIndex}.color`, e.target.value)}
                            className="h-8 w-10 rounded border border-zinc-700 bg-zinc-900 p-1"
                          />
                          <input
                            value={getSelectedGradientString(`stops.${stopIndex}.color`, stopIndex === 0 ? '#ffffff' : stopIndex === 1 ? '#8899aa' : '#000000')}
                            onChange={(e) => setSelectedGradientString(`stops.${stopIndex}.color`, e.target.value)}
                            className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                          />
                        </div>
                        <label className="block space-y-1">
                          <span className="text-[11px] text-zinc-500">Stop Opacity {getSelectedGradientNumber(`stops.${stopIndex}.opacity`, stopIndex === 0 ? 0.24 : stopIndex === 1 ? 0.2 : 0.18).toFixed(2)}</span>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={getSelectedGradientNumber(`stops.${stopIndex}.opacity`, stopIndex === 0 ? 0.24 : stopIndex === 1 ? 0.2 : 0.18)}
                            onChange={(e) => setSelectedGradientNumber(`stops.${stopIndex}.opacity`, Number(e.target.value))}
                            className="w-full"
                          />
                        </label>
                      </div>
                    ))}
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedGradientClipEnabled}
                      onChange={(e) => setSelectedGradientClipEnabled(e.target.checked)}
                    />
                    <span className="text-[11px] text-zinc-400">Clip gradient to target element</span>
                  </label>

                  {selectedGradientClipEnabled ? (
                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Gradient Clip Target Name</span>
                      <input
                        value={getSelectedGradientClipTargetName()}
                        onChange={(e) => setSelectedGradientClipTargetName(e.target.value)}
                        className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                      />
                    </label>
                  ) : null}
                    </>
                  ) : null}
                </div>

                <div className="space-y-2 rounded border border-zinc-800 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-400">Element Material (Clipped)</p>
                    <button
                      type="button"
                      onClick={() => setEffectPanelCollapsed((prev) => ({ ...prev, materialFx: !isEffectPanelCollapsed('materialFx') }))}
                      className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                    >
                      {isEffectPanelCollapsed('materialFx') ? 'Expand' : 'Collapse'}
                    </button>
                  </div>
                  {!isEffectPanelCollapsed('materialFx') ? (
                    <>
                  <p className="text-[11px] text-zinc-500">Layered material overlay. Each material layer has independent color, blend mode, and clip target.</p>

                  <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/60 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500">Material Layers</p>
                      <span className="text-[11px] text-zinc-500">{getSelectedMaterialLayers().length} layer(s)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={Math.max(0, Math.min(activeMaterialLayerIndex, Math.max(0, getSelectedMaterialLayers().length - 1)))}
                        onChange={(e) => setActiveMaterialLayerIndex(Number(e.target.value))}
                        className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                      >
                        {getSelectedMaterialLayers().length === 0 ? <option value={0}>No layer</option> : null}
                        {getSelectedMaterialLayers().map((_layer: Record<string, unknown>, index: number) => (
                          <option key={`material-layer-${index}`} value={index}>Layer {index + 1}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={addSelectedMaterialLayer}
                        className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={removeSelectedMaterialLayer}
                        className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelectedMaterialEnabled()}
                      onChange={(e) => setSelectedMaterialEnabled(e.target.checked)}
                    />
                    <span className="text-[11px] text-zinc-400">Enable material on this element</span>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Color</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={normalizeColorHex(getSelectedMaterialString('color', '#ffffff'), '#ffffff')}
                        onChange={(e) => setSelectedMaterialString('color', e.target.value)}
                        className="h-8 w-10 rounded border border-zinc-700 bg-zinc-900 p-1"
                      />
                      <input
                        value={getSelectedMaterialString('color', '#ffffff')}
                        onChange={(e) => setSelectedMaterialString('color', e.target.value)}
                        className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                      />
                    </div>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Opacity {getSelectedMaterialNumber('opacity', 0.18).toFixed(2)}</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={getSelectedMaterialNumber('opacity', 0.18)}
                      onChange={(e) => setSelectedMaterialNumber('opacity', Number(e.target.value))}
                      className="w-full"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Blend Mode</span>
                    <select
                      value={getSelectedMaterialString('blendMode', 'multiply')}
                      onChange={(e) => setSelectedMaterialString('blendMode', e.target.value)}
                      className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                    >
                      {BLEND_MODE_OPTIONS.map((option) => (
                        <option key={`material-blend-${option.value}`} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedMaterialClipEnabled}
                      onChange={(e) => setSelectedMaterialClipEnabled(e.target.checked)}
                    />
                    <span className="text-[11px] text-zinc-400">Clip material to target element</span>
                  </label>

                  {selectedMaterialClipEnabled ? (
                    <label className="block space-y-1">
                      <span className="text-[11px] text-zinc-500">Material Clip Target Name</span>
                      <input
                        value={getSelectedMaterialClipTargetName()}
                        onChange={(e) => setSelectedMaterialClipTargetName(e.target.value)}
                        className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                      />
                    </label>
                  ) : null}
                    </>
                  ) : null}
                </div>

                <div className="space-y-2 rounded border border-zinc-800 p-2">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-400">Element Mask (Data Model)</p>
                  <p className="text-[11px] text-zinc-500">Optional mask payload. Backward compatible when disabled.</p>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelectedMaskEnabled()}
                      onChange={(e) => {
                        setSelectedMaskEnabled(e.target.checked);
                        if (e.target.checked) setIsMaskBrushEditEnabled(true);
                      }}
                    />
                    <span className="text-[11px] text-zinc-400">Enable mask model on this element</span>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Mask Mode</span>
                    <select
                      value={selectedMaskMode}
                      onChange={(e) => setSelectedMaskString('mode', e.target.value)}
                      className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                    >
                      <option value="brush">brush</option>
                      <option value="selection">selection</option>
                    </select>
                  </label>

                  {isSelectionMaskMode ? (
                    <>
                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Selection Shape</span>
                        <select
                          value={selectedMaskSelectionShape}
                          onChange={(e) => setSelectedMaskString('selection.shape', e.target.value)}
                          className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                        >
                          <option value="rect">Rectangle</option>
                          <option value="square">Square</option>
                          <option value="circle">Circle</option>
                          <option value="oval">Oval</option>
                          <option value="free">Free (Lasso)</option>
                        </select>
                      </label>

                      {selectedMaskSelectionShape !== 'free' ? (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="flex items-center gap-2 rounded border border-zinc-800 px-2 py-1">
                              <input
                                type="checkbox"
                                checked={selectionMirrorHorizontal}
                                onChange={(e) => setSelectedMaskBoolean('selection.mirrorHorizontal', e.target.checked)}
                              />
                              <span className="text-[11px] text-zinc-400">Mirror Horizontal</span>
                            </label>
                            <label className="flex items-center gap-2 rounded border border-zinc-800 px-2 py-1">
                              <input
                                type="checkbox"
                                checked={selectionMirrorVertical}
                                onChange={(e) => setSelectedMaskBoolean('selection.mirrorVertical', e.target.checked)}
                              />
                              <span className="text-[11px] text-zinc-400">Mirror Vertical</span>
                            </label>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <label className="block space-y-1">
                              <span className="text-[11px] text-zinc-500">X</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.1}
                                value={selectionControlDisplayX}
                                onChange={(e) => setSelectedMaskNumber('selection.x', Number(e.target.value))}
                                className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                              />
                            </label>
                            <label className="block space-y-1">
                              <span className="text-[11px] text-zinc-500">Y</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.1}
                                value={selectionControlDisplayY}
                                onChange={(e) => setSelectedMaskNumber('selection.y', Number(e.target.value))}
                                className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                              />
                            </label>
                          </div>

                          {selectedMaskSelectionShape === 'circle' || selectedMaskSelectionShape === 'square' ? (
                            <label className="block space-y-1">
                              <span className="text-[11px] text-zinc-500">Diameter / Side</span>
                              <input
                                type="number"
                                min={0.2}
                                max={100}
                                step={0.1}
                                value={selectionControlDisplayDiameter}
                                onChange={(e) => setSelectedMaskNumber('selection.diameter', Number(e.target.value))}
                                className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                              />
                            </label>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <label className="block space-y-1">
                                <span className="text-[11px] text-zinc-500">W</span>
                                <input
                                  type="number"
                                  min={0.2}
                                  max={100}
                                  step={0.1}
                                  value={selectionControlDisplayWidth}
                                  onChange={(e) => setSelectedMaskNumber('selection.width', Number(e.target.value))}
                                  className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                                />
                              </label>
                              <label className="block space-y-1">
                                <span className="text-[11px] text-zinc-500">L</span>
                                <input
                                  type="number"
                                  min={0.2}
                                  max={100}
                                  step={0.1}
                                  value={selectionControlDisplayHeight}
                                  onChange={(e) => setSelectedMaskNumber('selection.height', Number(e.target.value))}
                                  className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                                />
                              </label>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={addSelectionShapeFromControls}
                            className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                          >
                            Add Selection Shape (X/Y + size)
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="flex items-center gap-2 rounded border border-zinc-800 px-2 py-1">
                              <input
                                type="checkbox"
                                checked={selectionMirrorHorizontal}
                                onChange={(e) => setSelectedMaskBoolean('selection.mirrorHorizontal', e.target.checked)}
                              />
                              <span className="text-[11px] text-zinc-400">Mirror Horizontal</span>
                            </label>
                            <label className="flex items-center gap-2 rounded border border-zinc-800 px-2 py-1">
                              <input
                                type="checkbox"
                                checked={selectionMirrorVertical}
                                onChange={(e) => setSelectedMaskBoolean('selection.mirrorVertical', e.target.checked)}
                              />
                              <span className="text-[11px] text-zinc-400">Mirror Vertical</span>
                            </label>
                          </div>
                          <p className="text-[11px] text-zinc-500">Free selection: click and drag on preview to draw lasso.</p>
                        </>
                      )}
                    </>
                  ) : null}

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isMaskBrushEditEnabled}
                      onChange={(e) => setIsMaskBrushEditEnabled(e.target.checked)}
                    />
                    <span className="text-[11px] text-zinc-400">Enable mask editing on preview</span>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Brush Action</span>
                    <select
                      value={maskBrushAction}
                      onChange={(e) => setMaskBrushAction(e.target.value === 'reveal' ? 'reveal' : 'hide')}
                      className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                    >
                      <option value="hide">hide</option>
                      <option value="reveal">reveal</option>
                    </select>
                    <span className="text-[10px] text-zinc-500">Shortcut: Ctrl+I toggles hide/reveal while mask editing.</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={getSelectedMaskBoolean('invert', false)}
                      onChange={(e) => setSelectedMaskBoolean('invert', e.target.checked)}
                    />
                    <span className="text-[11px] text-zinc-400">Invert mask</span>
                  </label>

                  {isBrushMaskMode ? (
                    <>
                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Brush Size {Math.round(getSelectedMaskNumber('brush.size', 16))}</span>
                        <input
                          type="range"
                          min={1}
                          max={128}
                          step={1}
                          value={getSelectedMaskNumber('brush.size', 16)}
                          onChange={(e) => setSelectedMaskNumber('brush.size', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[11px] text-zinc-500">Brush Hardness {getSelectedMaskNumber('brush.hardness', 0.8).toFixed(2)}</span>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={getSelectedMaskNumber('brush.hardness', 0.8)}
                          onChange={(e) => setSelectedMaskNumber('brush.hardness', Number(e.target.value))}
                          className="w-full"
                        />
                      </label>
                    </>
                  ) : null}

                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">Mask Opacity {getSelectedMaskNumber('brush.opacity', 1).toFixed(2)}</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={getSelectedMaskNumber('brush.opacity', 1)}
                      onChange={(e) => setSelectedMaskNumber('brush.opacity', Number(e.target.value))}
                      className="w-full"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={clearSelectedMaskStrokes}
                    className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                  >
                    Clear Mask Strokes Payload
                  </button>
                </div>

                <label className="block space-y-1">
                  <span className="text-[11px] text-zinc-400">Params JSON</span>
                  <textarea
                    value={paramsDraft}
                    onChange={(e) => setParamsDraft(e.target.value)}
                    className="h-36 w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 p-2 font-mono text-[11px] text-zinc-300"
                  />
                  <p className="text-[11px] text-zinc-500">Accepts params-only JSON or full element patch JSON.</p>
                  <button
                    type="button"
                    onClick={saveSelectedParams}
                    className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                  >
                    Save Params
                  </button>
                  <button
                    type="button"
                    onClick={saveSelectedToLibrary}
                    className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                  >
                    Save Selected to Drawer
                  </button>
                  {editorNotice ? <p className="text-xs text-emerald-400">{editorNotice}</p> : null}
                </label>
              </div>
            ) : selectedPanelTarget === 'element' ? (
              <div className="rounded border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Element Controls</p>
                <p className="mt-2 text-xs text-zinc-500">No element selected yet. Pick a layer in the middle panel to edit element-specific controls.</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={quickNewCategory}
                    onChange={(e) => setQuickNewCategory(e.target.value)}
                    className="h-8 rounded border border-zinc-700 bg-zinc-950 px-2 text-[11px] text-zinc-100"
                  >
                    {DEFAULT_DRAWER_CATEGORY_ORDER.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                  {quickNewCategory === 'Free Objects' ? (
                    <select
                      value={freeObjectShapeType}
                      onChange={(e) => setFreeObjectShapeType(e.target.value)}
                      className="h-8 rounded border border-zinc-700 bg-zinc-950 px-2 text-[11px] text-zinc-100"
                    >
                      {FREE_OBJECT_SHAPE_OPTIONS.map((item) => (
                        <option key={item.type} value={item.type}>{item.label}</option>
                      ))}
                    </select>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => addNewElementFromDefaults(quickNewCategory)}
                    className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                  >
                    + New Element
                  </button>
                </div>
              </div>
            ) : null}
          </aside>
          ) : null}
        </div>


      </section>
      {debugExportText !== null && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setDebugExportText(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-2 rounded border border-amber-700 bg-zinc-950 p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-semibold text-amber-200">
                Debug Export {debugExportCopied ? '(copied)' : '(select all + copy)'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (debugExportText && navigator.clipboard) {
                      navigator.clipboard.writeText(debugExportText).then(
                        () => setDebugExportCopied(true),
                        () => setDebugExportCopied(false),
                      );
                    }
                  }}
                  className="rounded border border-amber-700 bg-amber-950/60 px-2 py-1 text-[11px] text-amber-200 hover:bg-amber-900"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => setDebugExportText(null)}
                  className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                >
                  Close
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={debugExportText}
              className="min-h-[60vh] w-full flex-1 resize-none rounded border border-zinc-800 bg-black p-2 font-mono text-[10px] text-zinc-200"
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
        </div>
      )}
    </main>
  );
}

