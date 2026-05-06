import { generateElementRenderHash } from './snapshotHash';

type TemplateElement = Record<string, unknown>;

type TemplateModel = {
  layout?: Record<string, unknown>;
  scale?: Record<string, unknown>;
  effects3d?: Record<string, unknown>;
  elements: TemplateElement[];
};

type EngineModule = {
  runEngine: (args?: {
    activeStyle?: string;
    paramOverrides?: Record<string, Record<string, number>>;
    templateInput?: TemplateModel;
    colorControl?: Record<string, unknown>;
  }) => string;
};

export type ElementSnapshotCaptureInput = {
  template: TemplateModel;
  elementId?: string;
  element?: TemplateElement;
  activeStyle?: string;
  mimeType?: 'image/png' | 'image/webp';
  quality?: number;
  colorControl?: Record<string, unknown>;
  runEngine?: EngineModule['runEngine'];
};

export type ElementSnapshotCaptureResult = {
  id: string;
  imageDataUrl: string;
  sourceHash: string;
  createdAt: number;
  updatedAt: number;
  width: number;
  height: number;
  mimeType: string;
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function resolveTemplatePixelSize(template: TemplateModel): { width: number; height: number } {
  const layout = template.layout && typeof template.layout === 'object' ? template.layout : {};
  const width = Number(layout.width);
  const height = Number(layout.height);
  return {
    width: Number.isFinite(width) ? Math.max(1, Math.min(2048, Math.round(width))) : 480,
    height: Number.isFinite(height) ? Math.max(1, Math.min(2048, Math.round(height))) : 480,
  };
}

function sanitizeElementForEngine(source: TemplateElement): TemplateElement {
  const next = deepClone(source);
  delete next.id;
  delete next.visible;
  // Always bake from procedural live source to include current effect stack.
  if (next.renderState && typeof next.renderState === 'object') {
    next.renderState = {
      ...(next.renderState as Record<string, unknown>),
      sourceMode: 'live',
    };
  }
  return next;
}

function resolveTargetElement(input: ElementSnapshotCaptureInput): { id: string; element: TemplateElement } {
  if (input.element && typeof input.element === 'object') {
    const resolvedId = typeof input.element.id === 'string' && input.element.id.trim().length > 0
      ? input.element.id.trim()
      : `snapshot-${Date.now()}`;
    return { id: resolvedId, element: input.element };
  }

  const all = Array.isArray(input.template?.elements) ? input.template.elements : [];
  if (typeof input.elementId === 'string' && input.elementId.trim().length > 0) {
    const found = all.find((entry) => entry && typeof entry === 'object' && entry.id === input.elementId);
    if (!found) {
      throw new Error(`Snapshot capture failed: element not found for id "${input.elementId}".`);
    }
    return { id: input.elementId, element: found };
  }

  if (all.length === 1 && all[0] && typeof all[0] === 'object') {
    const fallbackId = typeof all[0].id === 'string' && all[0].id.trim().length > 0
      ? all[0].id.trim()
      : `snapshot-${Date.now()}`;
    return { id: fallbackId, element: all[0] };
  }

  throw new Error('Snapshot capture failed: provide element or elementId.');
}

async function resolveEngineRunEngine(input: ElementSnapshotCaptureInput): Promise<EngineModule['runEngine']> {
  if (typeof input.runEngine === 'function') return input.runEngine;
  const module = (await import('../index.js')) as EngineModule;
  if (!module || typeof module.runEngine !== 'function') {
    throw new Error('Snapshot capture failed: runEngine is unavailable.');
  }
  return module.runEngine;
}

function loadImageFromObjectUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Snapshot capture failed: unable to decode SVG.'));
    img.src = url;
  });
}

async function rasterizeSvg(svgMarkup: string, width: number, height: number, mimeType: string, quality?: number): Promise<string> {
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await loadImageFromObjectUrl(objectUrl);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Snapshot capture failed: canvas context unavailable.');
    }
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL(mimeType, quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function createElementSnapshot(input: ElementSnapshotCaptureInput): Promise<ElementSnapshotCaptureResult> {
  if (!input || !input.template || typeof input.template !== 'object') {
    throw new Error('Snapshot capture failed: template is required.');
  }

  const { id, element } = resolveTargetElement(input);
  const runEngine = await resolveEngineRunEngine(input);
  const sourceHash = generateElementRenderHash(element);
  const now = Date.now();
  const size = resolveTemplatePixelSize(input.template);
  const safeElement = sanitizeElementForEngine(element);
  const templateInput: TemplateModel = {
    ...deepClone(input.template),
    elements: [safeElement],
  };
  const svgMarkup = runEngine({
    activeStyle: input.activeStyle,
    templateInput,
    colorControl: input.colorControl,
  });

  if (typeof svgMarkup !== 'string' || svgMarkup.trim().length === 0) {
    throw new Error('Snapshot capture failed: renderer produced empty SVG output.');
  }

  const mimeType = input.mimeType === 'image/webp' ? 'image/webp' : 'image/png';
  const quality = Number.isFinite(Number(input.quality)) ? Number(input.quality) : undefined;
  const imageDataUrl = await rasterizeSvg(svgMarkup, size.width, size.height, mimeType, quality);

  return {
    id,
    imageDataUrl,
    sourceHash,
    createdAt: now,
    updatedAt: now,
    width: size.width,
    height: size.height,
    mimeType,
  };
}
