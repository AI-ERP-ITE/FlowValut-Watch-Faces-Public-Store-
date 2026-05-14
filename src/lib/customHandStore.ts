/**
 * customHandStore.ts
 * Persistent IndexedDB storage for user-created clock hand styles.
 * Each record stores pre-rendered PNG data URLs for all 4 hand images.
 */

const DB_NAME = 'zepp-studio-hands';
const DB_VERSION = 1;
const STORE = 'custom-hands';
const HAND_RENDER_VERSION = 4;
const HUB_RENDER_VERSION = 4;

export interface CustomHandRecord {
  key: string;           // 'custom_hand:slug'
  name: string;
  hourDataUrl: string;   // 22×140 PNG data URL
  minuteDataUrl: string; // 16×200 PNG data URL
  secondDataUrl: string; // 8×240 PNG data URL
  coverDataUrl: string;  // Hub PNG data URL — size = baked dimensions below
  swatchDataUrl: string; // 24×24 thumbnail for UI preview
  // Baked hub PNG dimensions (derived from source SVG natural size, clamped to safe range).
  // The ZPK exporter and composer preview both read these so the cap reflects the artwork's
  // true aspect/size instead of being locked to a fixed square.
  coverWidth?: number;
  coverHeight?: number;
  // Optional per-hand pivot points (in pixels) derived from marker metadata.
  // These map directly to TIME_POINTER hour_posX/Y, minute_posX/Y, second_posX/Y.
  hourPosX?: number;
  hourPosY?: number;
  minutePosX?: number;
  minutePosY?: number;
  secondPosX?: number;
  secondPosY?: number;
  // Normalized pivot positions [0=tip, 1=tail] relative to the trimmed visible
  // art bounds in the baked PNG. These are the canonical reference for the
  // tip-tail slider — posY fields above are derived from these.
  hourPivotNorm?: number;
  hourArtMinY?: number;
  hourArtMaxY?: number;
  minutePivotNorm?: number;
  minuteArtMinY?: number;
  minuteArtMaxY?: number;
  secondPivotNorm?: number;
  secondArtMinY?: number;
  secondArtMaxY?: number;
  // Optional composer metadata for separated HTML workflow.
  sourceHourHtml?: string;
  sourceMinuteHtml?: string;
  sourceSecondHtml?: string;
  sourceHubHtml?: string;
  handRenderVersion?: number;
  hubRenderVersion?: number;
  pivotOffsets?: {
    hour: { x: number; y: number };
    minute: { x: number; y: number };
    second: { x: number; y: number };
  };
  createdAt: number;
}

export interface SaveCustomHandStyleOptions {
  composedSources?: {
    hourHtml: string;
    minuteHtml: string;
    secondHtml: string;
    hubHtml: string;
  };
  pivotOffsets?: {
    hour: { x: number; y: number };
    minute: { x: number; y: number };
    second: { x: number; y: number };
  };
  /**
   * Direct normalized pivot overrides [0=tip, 1=tail] within the trimmed art
   * of the baked PNG. Supersedes pivotOffsets when provided. The slider in
   * IconLab sends these after the geometry model fix.
   */
  pivotNormOverrides?: {
    hour?: number;
    minute?: number;
    second?: number;
  };
}

export type CustomHandPackMode = 'source-based-custom' | 'legacy-normalized';

export interface ResolvedCustomHandPack {
  mode: CustomHandPackMode;
  sources: {
    hour: string | null;
    minute: string | null;
    second: string | null;
    cover: string | null;
  };
  missingLayers: Array<'hour' | 'minute' | 'second' | 'cover'>;
}

interface ParsedPivot {
  xRatio: number;
  yRatio: number;
  sourceW: number;
  sourceH: number;
}

function parseSvgSize(svg: string): { width: number; height: number } | null {
  const vb = parseViewBox(svg);
  if (vb) return { width: vb.width, height: vb.height };

  const tag = svg.match(/<svg\b[^>]*>/i)?.[0] ?? '';
  const wMatch = tag.match(/\bwidth\s*=\s*["']?([0-9.]+)(?:px)?["']?/i);
  const hMatch = tag.match(/\bheight\s*=\s*["']?([0-9.]+)(?:px)?["']?/i);
  const width = Number(wMatch?.[1]);
  const height = Number(hMatch?.[1]);
  if (!Number.isNaN(width) && !Number.isNaN(height) && width > 0 && height > 0) {
    return { width, height };
  }
  return null;
}

function inferCenteredPivot(svg: string): ParsedPivot | null {
  const size = parseSvgSize(svg);
  if (!size) return null;
  return {
    xRatio: 0.5,
    yRatio: 0.5,
    sourceW: size.width,
    sourceH: size.height,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function extractSvgFromCode(code: string): string {
  const svgMatch = code.match(/<svg[\s\S]*<\/svg>/i);
  return svgMatch ? svgMatch[0] : code;
}

function parseViewBox(svg: string): { minX: number; minY: number; width: number; height: number } | null {
  const tagMatch = svg.match(/<svg\b[^>]*>/i);
  if (!tagMatch) return null;
  const vbMatch = tagMatch[0].match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (!vbMatch) return null;

  const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length < 4 || parts.some(Number.isNaN)) return null;
  const [minX, minY, width, height] = parts;
  if (width <= 0 || height <= 0) return null;
  return { minX, minY, width, height };
}

function extractPivotFromSvg(svg: string): ParsedPivot | null {
  const vb = parseViewBox(svg);
  if (!vb) return null;

  // Preferred marker: put data-pivot-x / data-pivot-y on the svg root.
  const svgTag = svg.match(/<svg\b[^>]*>/i)?.[0] ?? '';
  const dataX = svgTag.match(/\bdata-pivot-x\s*=\s*["']([^"']+)["']/i);
  const dataY = svgTag.match(/\bdata-pivot-y\s*=\s*["']([^"']+)["']/i);

  // Legacy fallback (older auto-marker): tiny magenta circle with id="pivot".
  // IMPORTANT: do not parse arbitrary id="pivot" elements from user artwork.
  const legacyPivotEl = svg.match(/<circle[^>]*\bid\s*=\s*["']pivot["'][^>]*\bfill\s*=\s*["']#ff00ff["'][^>]*>/i)?.[0] ?? '';
  const cxMatch = legacyPivotEl.match(/\bcx\s*=\s*["']([^"']+)["']/i);
  const cyMatch = legacyPivotEl.match(/\bcy\s*=\s*["']([^"']+)["']/i);

  const x = Number(dataX?.[1] ?? cxMatch?.[1]);
  const y = Number(dataY?.[1] ?? cyMatch?.[1]);
  if (Number.isNaN(x) || Number.isNaN(y)) return null;

  const xRatio = (x - vb.minX) / vb.width;
  const yRatio = (y - vb.minY) / vb.height;
  return {
    xRatio: clamp(xRatio, 0, 1),
    yRatio: clamp(yRatio, 0, 1),
    sourceW: vb.width,
    sourceH: vb.height,
  };
}

function stripPivotMarkers(svg: string): string {
  // Remove only known marker artifacts created by this app.
  // Do NOT strip arbitrary id="pivot" from user artwork.
  return svg
    // Legacy auto-added pivot marker (tiny magenta circle)
    .replace(/<circle[^>]*\bid\s*=\s*["']pivot["'][^>]*\bfill\s*=\s*["']#ff00ff["'][^>]*>\s*<\/circle>\s*/gi, '')
    .replace(/<circle[^>]*\bid\s*=\s*["']pivot["'][^>]*\bfill\s*=\s*["']#ff00ff["'][^>]*\/?>\s*/gi, '');
}

function extractLayerFromCompositeSvg(svg: string, layer: 'hour' | 'minute' | 'second' | 'hub'): string | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const sourceSvg = doc.querySelector('svg');
    if (!sourceSvg) return null;

    // Supported marker conventions in one combined SVG.
    const selectorsByLayer: Record<typeof layer, string[]> = {
      hour: ['#hour-hand', '[data-hand="hour"]', '.hour-hand'],
      minute: ['#minute-hand', '[data-hand="minute"]', '.minute-hand'],
      second: ['#second-hand', '[data-hand="second"]', '.second-hand'],
      hub: ['#pinion-cap', '#hub', '[data-hand="hub"]', '.pinion-cap', '.hub'],
    };
    const allLayerSelectors = [
      '#hour-hand', '[data-hand="hour"]', '.hour-hand',
      '#minute-hand', '[data-hand="minute"]', '.minute-hand',
      '#second-hand', '[data-hand="second"]', '.second-hand',
      '#pinion-cap', '#hub', '[data-hand="hub"]', '.pinion-cap', '.hub',
    ];

    const keepSelectors = selectorsByLayer[layer];
    const hasAnyLayer = keepSelectors.some(sel => sourceSvg.querySelector(sel));
    if (!hasAnyLayer) return null;

    // Clone full tree first so parent transforms/viewBox/defs stay intact.
    const outDoc = document.implementation.createDocument('http://www.w3.org/2000/svg', 'svg', null);
    const outSvg = outDoc.documentElement;

    for (const attr of Array.from(sourceSvg.attributes)) {
      outSvg.setAttribute(attr.name, attr.value);
    }
    if (!outSvg.getAttribute('xmlns')) {
      outSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    outSvg.appendChild(outDoc.importNode(sourceSvg, true));

    const root = outSvg.querySelector('svg');
    if (!root) return null;

    const shouldKeep = (el: Element): boolean => keepSelectors.some(sel => el.matches(sel));

    // Remove all known hand/hub layers that are not the target one.
    for (const sel of allLayerSelectors) {
      root.querySelectorAll(sel).forEach((el) => {
        if (!shouldKeep(el)) {
          el.remove();
        }
      });
    }

    return new XMLSerializer().serializeToString(root as Element);
  } catch {
    return null;
  }
}

function computePivotPx(pivot: ParsedPivot, outW: number, outH: number): { x: number; y: number } {
  // Match renderToHandPng transform: cover-fit so hands stay full-size in tall canvases.
  const scale = Math.max(outW / pivot.sourceW, outH / pivot.sourceH);
  const drawW = pivot.sourceW * scale;
  const drawH = pivot.sourceH * scale;
  const dx = (outW - drawW) / 2;
  const dy = (outH - drawH) / 2;
  const x = dx + (pivot.xRatio * drawW);
  const y = dy + (pivot.yRatio * drawH);
  return {
    x: Math.round(clamp(x, 0, outW)),
    y: Math.round(clamp(y, 0, outH)),
  };
}

// ── DB open ───────────────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function htmlToSvgDataUrl(code?: string): string | null {
  if (!code) return null;
  const svg = extractSvgFromCode(code);
  if (!svg || !svg.trim().startsWith('<svg')) return null;
  return svgToDataUrl(svg);
}

export function resolveCustomHandPack(record: CustomHandRecord | null | undefined): ResolvedCustomHandPack | null {
  if (!record) return null;

  const hasAnySource = !!(
    record.sourceHourHtml
    || record.sourceMinuteHtml
    || record.sourceSecondHtml
    || record.sourceHubHtml
  );

  const mode: CustomHandPackMode = hasAnySource ? 'source-based-custom' : 'legacy-normalized';

  const sourceHour = htmlToSvgDataUrl(record.sourceHourHtml);
  const sourceMinute = htmlToSvgDataUrl(record.sourceMinuteHtml);
  const sourceSecond = htmlToSvgDataUrl(record.sourceSecondHtml);
  const sourceCover = htmlToSvgDataUrl(record.sourceHubHtml);

  const sources = {
    hour: mode === 'source-based-custom' ? (sourceHour ?? record.hourDataUrl ?? null) : (record.hourDataUrl ?? null),
    minute: mode === 'source-based-custom' ? (sourceMinute ?? record.minuteDataUrl ?? null) : (record.minuteDataUrl ?? null),
    second: mode === 'source-based-custom' ? (sourceSecond ?? record.secondDataUrl ?? null) : (record.secondDataUrl ?? null),
    cover: mode === 'source-based-custom' ? (sourceCover ?? record.coverDataUrl ?? null) : (record.coverDataUrl ?? null),
  };

  const missingLayers: Array<'hour' | 'minute' | 'second' | 'cover'> = [];
  if (!sources.hour) missingLayers.push('hour');
  if (!sources.minute) missingLayers.push('minute');
  if (!sources.second) missingLayers.push('second');
  if (!sources.cover) missingLayers.push('cover');

  return {
    mode,
    sources,
    missingLayers,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function loadCustomHandStyles(): Promise<CustomHandRecord[]> {
  const db = await openDB();
  const rows = await new Promise<CustomHandRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as CustomHandRecord[]);
    req.onerror = () => reject(req.error);
  });
  const migrated = await Promise.all(rows.map(maybeMigrateRecord));
  return migrated.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getCustomHandByKey(key: string): Promise<CustomHandRecord | null> {
  const db = await openDB();
  const row = await new Promise<CustomHandRecord | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as CustomHandRecord) ?? null);
    req.onerror = () => reject(req.error);
  });
  if (!row) return null;
  return maybeMigrateRecord(row);
}

export async function saveCustomHandStyle(
  name: string,
  svgCode: string,
  options?: SaveCustomHandStyleOptions,
): Promise<CustomHandRecord> {
  const sourceSvg = extractSvgFromCode(svgCode);
  const parsedPivot = extractPivotFromSvg(sourceSvg);
  const cleanedSvg = stripPivotMarkers(sourceSvg);

  const composed = options?.composedSources;
  const hasComposedSources = !!(
    composed
    && composed.hourHtml.trim()
    && composed.minuteHtml.trim()
    && composed.secondHtml.trim()
    && composed.hubHtml.trim()
  );

  // One-input composite support:
  // if the user provides a stacked SVG with tagged groups (hour/minute/second/hub),
  // extract each layer so exported assets stay clean and don't bleed into each other.
  const hourSvg = hasComposedSources
    ? stripPivotMarkers(extractSvgFromCode(composed!.hourHtml))
    : (extractLayerFromCompositeSvg(cleanedSvg, 'hour') ?? cleanedSvg);
  const minuteSvg = hasComposedSources
    ? stripPivotMarkers(extractSvgFromCode(composed!.minuteHtml))
    : (extractLayerFromCompositeSvg(cleanedSvg, 'minute') ?? cleanedSvg);
  const secondSvg = hasComposedSources
    ? stripPivotMarkers(extractSvgFromCode(composed!.secondHtml))
    : (extractLayerFromCompositeSvg(cleanedSvg, 'second') ?? cleanedSvg);
  const hubSvg = hasComposedSources
    ? stripPivotMarkers(extractSvgFromCode(composed!.hubHtml))
    : (extractLayerFromCompositeSvg(cleanedSvg, 'hub') ?? cleanedSvg);

  const hourSourceSvg = hasComposedSources ? extractSvgFromCode(composed!.hourHtml) : sourceSvg;
  const minuteSourceSvg = hasComposedSources ? extractSvgFromCode(composed!.minuteHtml) : sourceSvg;
  const secondSourceSvg = hasComposedSources ? extractSvgFromCode(composed!.secondHtml) : sourceSvg;

  const hourPivotSource = hasComposedSources
    ? (extractPivotFromSvg(hourSourceSvg) ?? inferCenteredPivot(hourSourceSvg))
    : parsedPivot;
  const minutePivotSource = hasComposedSources
    ? (extractPivotFromSvg(minuteSourceSvg) ?? inferCenteredPivot(minuteSourceSvg))
    : parsedPivot;
  const secondPivotSource = hasComposedSources
    ? (extractPivotFromSvg(secondSourceSvg) ?? inferCenteredPivot(secondSourceSvg))
    : parsedPivot;

  // Derive cap dimensions from the actual rendered art (not the SVG viewBox),
  // so a 17px cap drawn inside a 120×120 viewBox bakes as ~34×34, not 120×120.
  // Falls back to 30×30 if measurement fails.
  const hubSize = await measureHubArtSize(hubSvg);
  const [hourLayer, minuteLayer, secondLayer, coverDataUrl, swatchDataUrl] =
    await Promise.all([
      renderHandToPngWithPivot(hourSvg, 22, 140, hourPivotSource),
      renderHandToPngWithPivot(minuteSvg, 16, 200, minutePivotSource),
      renderHandToPngWithPivot(secondSvg, 8, 240, secondPivotSource),
      renderHubToFittedPng(hubSvg, hubSize.width, hubSize.height),  // hub at natural size
      renderHubToContainPng(hubSvg, 24),  // swatch: trim transparent bounds before fitting
    ]);

  const hourPivot = hourLayer.pivot;
  const minutePivot = minuteLayer.pivot;
  const secondPivot = secondLayer.pivot;

  const pivotOffsets = options?.pivotOffsets;
  const pivotNormOverrides = options?.pivotNormOverrides;

  // ── Helper: normalize a canvas-px pivot into [0,1] within the art bounds ──
  // If art bounds are unavailable, fall back to canvas-fraction.
  function toPivotNorm(
    posY: number,
    artBoundsY: { minY: number; maxY: number } | null,
    canvasH: number,
  ): number {
    if (artBoundsY && artBoundsY.maxY > artBoundsY.minY) {
      return clamp((posY - artBoundsY.minY) / (artBoundsY.maxY - artBoundsY.minY), 0, 1);
    }
    return clamp(posY / canvasH, 0, 1);
  }

  // ── Helper: reconstruct canvas-px pivot from normalized position ──
  function fromPivotNorm(
    norm: number,
    artBoundsY: { minY: number; maxY: number } | null,
    canvasH: number,
  ): number {
    if (artBoundsY && artBoundsY.maxY > artBoundsY.minY) {
      return Math.round(artBoundsY.minY + clamp(norm, 0, 1) * (artBoundsY.maxY - artBoundsY.minY));
    }
    return Math.round(clamp(norm, 0, 1) * canvasH);
  }

  // Effective hand positions for TIME_POINTER selection/export.
  // If no marker-derived pivot exists, fall back to known stable defaults.
  const baseHour = hourPivot ?? { x: 11, y: 118 };
  const baseMinute = minutePivot ?? { x: 8, y: 172 };
  const baseSecond = secondPivot ?? { x: 4, y: 180 };

  // ── Hour ──
  // Priority: pivotNormOverrides > pivotOffsets (legacy pixel offset) > marker-derived
  let hourPosY: number;
  let hourPivotNorm: number;
  if (pivotNormOverrides?.hour !== undefined) {
    // Slider sends a direct normalized position within the art bounds.
    hourPivotNorm = clamp(pivotNormOverrides.hour, 0, 1);
    hourPosY = fromPivotNorm(hourPivotNorm, hourLayer.artBoundsY, 140);
  } else if (pivotOffsets) {
    // Legacy pixel-offset path (backward compat — old records without norm data).
    hourPosY = clamp(Math.round(baseHour.y + pivotOffsets.hour.y), 0, 140);
    hourPivotNorm = toPivotNorm(hourPosY, hourLayer.artBoundsY, 140);
  } else {
    hourPosY = baseHour.y;
    hourPivotNorm = toPivotNorm(hourPosY, hourLayer.artBoundsY, 140);
  }
  const hourPosX = pivotOffsets
    ? clamp(Math.round(baseHour.x + pivotOffsets.hour.x), 0, 22)
    : baseHour.x;

  // ── Minute ──
  let minutePosY: number;
  let minutePivotNorm: number;
  if (pivotNormOverrides?.minute !== undefined) {
    minutePivotNorm = clamp(pivotNormOverrides.minute, 0, 1);
    minutePosY = fromPivotNorm(minutePivotNorm, minuteLayer.artBoundsY, 200);
  } else if (pivotOffsets) {
    minutePosY = clamp(Math.round(baseMinute.y + pivotOffsets.minute.y), 0, 200);
    minutePivotNorm = toPivotNorm(minutePosY, minuteLayer.artBoundsY, 200);
  } else {
    minutePosY = baseMinute.y;
    minutePivotNorm = toPivotNorm(minutePosY, minuteLayer.artBoundsY, 200);
  }
  const minutePosX = pivotOffsets
    ? clamp(Math.round(baseMinute.x + pivotOffsets.minute.x), 0, 16)
    : baseMinute.x;

  // ── Second ──
  let secondPosY: number;
  let secondPivotNorm: number;
  if (pivotNormOverrides?.second !== undefined) {
    secondPivotNorm = clamp(pivotNormOverrides.second, 0, 1);
    secondPosY = fromPivotNorm(secondPivotNorm, secondLayer.artBoundsY, 240);
  } else if (pivotOffsets) {
    secondPosY = clamp(Math.round(baseSecond.y + pivotOffsets.second.y), 0, 240);
    secondPivotNorm = toPivotNorm(secondPosY, secondLayer.artBoundsY, 240);
  } else {
    secondPosY = baseSecond.y;
    secondPivotNorm = toPivotNorm(secondPosY, secondLayer.artBoundsY, 240);
  }
  const secondPosX = pivotOffsets
    ? clamp(Math.round(baseSecond.x + pivotOffsets.second.x), 0, 8)
    : baseSecond.x;

  const record: CustomHandRecord = {
    key: `custom_hand:${slugify(name)}`,
    name,
    hourDataUrl: hourLayer.dataUrl,
    minuteDataUrl: minuteLayer.dataUrl,
    secondDataUrl: secondLayer.dataUrl,
    coverDataUrl,
    coverWidth: hubSize.width,
    coverHeight: hubSize.height,
    swatchDataUrl,
    hourPosX,
    hourPosY,
    minutePosX,
    minutePosY,
    secondPosX,
    secondPosY,
    // Geometry metadata for the tip-tail pivot model.
    hourPivotNorm,
    ...(hourLayer.artBoundsY ? { hourArtMinY: hourLayer.artBoundsY.minY, hourArtMaxY: hourLayer.artBoundsY.maxY } : {}),
    minutePivotNorm,
    ...(minuteLayer.artBoundsY ? { minuteArtMinY: minuteLayer.artBoundsY.minY, minuteArtMaxY: minuteLayer.artBoundsY.maxY } : {}),
    secondPivotNorm,
    ...(secondLayer.artBoundsY ? { secondArtMinY: secondLayer.artBoundsY.minY, secondArtMaxY: secondLayer.artBoundsY.maxY } : {}),
    ...(hasComposedSources ? {
      sourceHourHtml: composed!.hourHtml,
      sourceMinuteHtml: composed!.minuteHtml,
      sourceSecondHtml: composed!.secondHtml,
      sourceHubHtml: composed!.hubHtml,
      handRenderVersion: HAND_RENDER_VERSION,
      hubRenderVersion: HUB_RENDER_VERSION,
    } : {}),
    ...(pivotOffsets ? { pivotOffsets } : {}),
    createdAt: Date.now(),
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCustomHandStyle(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Replace all stored hand styles with cloud-synced records.
 */
export async function replaceCustomHandStyles(records: CustomHandRecord[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const clearReq = store.clear();
    clearReq.onerror = () => reject(clearReq.error);
    clearReq.onsuccess = () => {
      for (const record of records) {
        store.put(record);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// ── Rendering helpers ─────────────────────────────────────────────────────────

/**
 * Render SVG code (or an HTML string containing an SVG) to a PNG at w×h.
 * The design is expected to point upward (tip at top) for clock hand use.
 */
export function renderToHandPng(code: string, w: number, h: number): Promise<string> {
  // Extract SVG tag if the code is HTML
  const svgMatch = code.match(/<svg[\s\S]*<\/svg>/i);
  const svgCode = svgMatch ? svgMatch[0] : code;

  return new Promise((resolve) => {
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, w, h);
      // Use cover-fit so square source SVGs don't become tiny inside tall hand canvases.
      // This keeps pointer length visible and mirrors watch runtime better.
      const nw = img.naturalWidth || 100;
      const nh = img.naturalHeight || 100;
      const scale = Math.max(w / nw, h / nh);
      const dw = nw * scale;
      const dh = nh * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Fallback: draw a simple rectangle as a hand shape
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, 'rgba(180,180,200,0.8)');
      grad.addColorStop(0.5, 'rgba(240,240,255,1)');
      grad.addColorStop(1, 'rgba(180,180,200,0.8)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(w * 0.1, h * 0.02, w * 0.8, h * 0.8, 2);
      ctx.fill();
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = url;
  });
}

/**
 * Render SVG fitted inside a square (object-fit: contain).
 * Used for the hub cover and swatch where a non-distorted square preview is needed.
 */
function renderToContainPng(code: string, size: number): Promise<string> {
  const svgMatch = code.match(/<svg[\s\S]*<\/svg>/i);
  const svgCode = svgMatch ? svgMatch[0] : code;
  return new Promise((resolve) => {
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, size, size);
      const nw = img.naturalWidth || size;
      const nh = img.naturalHeight || size;
      const scale = Math.min(size / nw, size / nh);
      const dw = nw * scale;
      const dh = nh * scale;
      ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(generateDefaultCover()); };
    img.src = url;
  });
}

function findOpaqueBounds(canvas: HTMLCanvasElement): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { minX, minY, maxX, maxY };
}

function padBounds(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  width: number,
  height: number,
): { minX: number; minY: number; maxX: number; maxY: number } {
  const span = Math.max(bounds.maxX - bounds.minX + 1, bounds.maxY - bounds.minY + 1);
  const pad = Math.ceil(span * 0.04);
  return {
    minX: Math.max(0, bounds.minX - pad),
    minY: Math.max(0, bounds.minY - pad),
    maxX: Math.min(width - 1, bounds.maxX + pad),
    maxY: Math.min(height - 1, bounds.maxY + pad),
  };
}

async function renderHandToPngWithPivot(
  code: string,
  outW: number,
  outH: number,
  pivotSource: ParsedPivot | null,
): Promise<{ dataUrl: string; pivot: { x: number; y: number } | null; artBoundsY: { minY: number; maxY: number } | null }> {
  const svgMatch = code.match(/<svg[\s\S]*<\/svg>/i);
  const svgCode = svgMatch ? svgMatch[0] : code;

  return new Promise((resolve) => {
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = async () => {
      const nw = Math.max(1, img.naturalWidth || outW);
      const nh = Math.max(1, img.naturalHeight || outH);

      const maxSide = 1024;
      const downscale = Math.min(1, maxSide / Math.max(nw, nh));
      const sampleW = Math.max(1, Math.round(nw * downscale));
      const sampleH = Math.max(1, Math.round(nh * downscale));

      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = sampleW;
      sampleCanvas.height = sampleH;
      const sampleCtx = sampleCanvas.getContext('2d');
      if (!sampleCtx) {
        URL.revokeObjectURL(url);
        const fallback = await renderToHandPng(code, outW, outH);
        resolve({ dataUrl: fallback, pivot: pivotSource ? computePivotPx(pivotSource, outW, outH) : null, artBoundsY: null });
        return;
      }
      sampleCtx.clearRect(0, 0, sampleW, sampleH);
      sampleCtx.imageSmoothingEnabled = true;
      sampleCtx.imageSmoothingQuality = 'high';
      sampleCtx.drawImage(img, 0, 0, sampleW, sampleH);

      const rawBounds = findOpaqueBounds(sampleCanvas);
      if (!rawBounds) {
        URL.revokeObjectURL(url);
        const fallback = await renderToHandPng(code, outW, outH);
        resolve({ dataUrl: fallback, pivot: pivotSource ? computePivotPx(pivotSource, outW, outH) : null, artBoundsY: null });
        return;
      }

      const bounds = padBounds(rawBounds, sampleW, sampleH);
      const cropW = Math.max(1, bounds.maxX - bounds.minX + 1);
      const cropH = Math.max(1, bounds.maxY - bounds.minY + 1);

      const outCanvas = document.createElement('canvas');
      outCanvas.width = outW;
      outCanvas.height = outH;
      const outCtx = outCanvas.getContext('2d');
      if (!outCtx) {
        URL.revokeObjectURL(url);
        const fallback = await renderToHandPng(code, outW, outH);
        resolve({ dataUrl: fallback, pivot: pivotSource ? computePivotPx(pivotSource, outW, outH) : null, artBoundsY: null });
        return;
      }

      outCtx.clearRect(0, 0, outW, outH);
      outCtx.imageSmoothingEnabled = true;
      outCtx.imageSmoothingQuality = 'high';

      // Legacy-style larger fit: fill hand height/width using cover policy.
      // This matches older stack sizing behavior better than contain-fit.
      const scale = Math.max(outW / cropW, outH / cropH);
      const drawW = cropW * scale;
      const drawH = cropH * scale;
      const dx = (outW - drawW) / 2;
      const dy = (outH - drawH) / 2;

      outCtx.drawImage(sampleCanvas, bounds.minX, bounds.minY, cropW, cropH, dx, dy, drawW, drawH);

      let pivot: { x: number; y: number } | null = null;
      if (pivotSource) {
        const pivotXInSample = pivotSource.xRatio * sampleW;
        const pivotYInSample = pivotSource.yRatio * sampleH;
        const px = dx + ((pivotXInSample - bounds.minX) * scale);
        const py = dy + ((pivotYInSample - bounds.minY) * scale);
        pivot = {
          x: Math.round(clamp(px, 0, outW)),
          y: Math.round(clamp(py, 0, outH)),
        };
      }

      // Measure where the art actually landed in the output canvas.
      // This is the canonical geometry reference for pivot normalization.
      const outArtBounds = findOpaqueBounds(outCanvas);
      const artBoundsY = outArtBounds ? { minY: outArtBounds.minY, maxY: outArtBounds.maxY } : null;

      URL.revokeObjectURL(url);
      resolve({ dataUrl: outCanvas.toDataURL('image/png'), pivot, artBoundsY });
    };
    img.onerror = async () => {
      URL.revokeObjectURL(url);
      const fallback = await renderToHandPng(code, outW, outH);
      resolve({ dataUrl: fallback, pivot: pivotSource ? computePivotPx(pivotSource, outW, outH) : null, artBoundsY: null });
    };
    img.src = url;
  });
}

/**
 * Resolve the baked hub PNG dimensions from the source SVG.
 *
 * Reads the SVG's natural size (viewBox or width/height attributes), preserves
 * aspect ratio, and clamps to a safe range so neither degenerate nor absurd
 * sizes leak into the ZPK. Returns 30×30 when no usable size is found
 * (matches the legacy default).
 */
const HUB_MIN_SIDE = 8;
const HUB_MAX_SIDE = 120;
const HUB_DEFAULT_SIDE = 30;

export function resolveHubBakeSize(svg: string): { width: number; height: number } {
  const natural = parseSvgSize(svg);
  if (!natural || natural.width <= 0 || natural.height <= 0) {
    return { width: HUB_DEFAULT_SIDE, height: HUB_DEFAULT_SIDE };
  }
  const longest = Math.max(natural.width, natural.height);
  // Scale so the longer side fits inside [HUB_MIN_SIDE, HUB_MAX_SIDE].
  let scale = 1;
  if (longest > HUB_MAX_SIDE) scale = HUB_MAX_SIDE / longest;
  else if (longest < HUB_MIN_SIDE) scale = HUB_MIN_SIDE / longest;
  const w = Math.max(HUB_MIN_SIDE, Math.min(HUB_MAX_SIDE, Math.round(natural.width * scale)));
  const h = Math.max(HUB_MIN_SIDE, Math.min(HUB_MAX_SIDE, Math.round(natural.height * scale)));
  return { width: w, height: h };
}

/**
 * Measure the cap's true rendered art size by rasterizing the SVG and finding
 * the opaque pixel bounds. This catches the common case where the SVG viewBox
 * is large (e.g. 120×120) but the cap art only occupies a small inner region
 * (e.g. r=17 → ~34px). Returns dimensions clamped to [HUB_MIN_SIDE, HUB_MAX_SIDE]
 * with aspect ratio preserved. Falls back to viewBox-based sizing on error.
 */
export function measureHubArtSize(code: string): Promise<{ width: number; height: number }> {
  const fallback = resolveHubBakeSize(code);
  const svgMatch = code.match(/<svg[\s\S]*<\/svg>/i);
  const svgCode = svgMatch ? svgMatch[0] : code;
  return new Promise((resolve) => {
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const nw = Math.max(1, img.naturalWidth || fallback.width);
      const nh = Math.max(1, img.naturalHeight || fallback.height);
      const maxSide = 1024;
      const downscale = Math.min(1, maxSide / Math.max(nw, nh));
      const sampleW = Math.max(1, Math.round(nw * downscale));
      const sampleH = Math.max(1, Math.round(nh * downscale));
      const canvas = document.createElement('canvas');
      canvas.width = sampleW;
      canvas.height = sampleH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(fallback);
        return;
      }
      ctx.clearRect(0, 0, sampleW, sampleH);
      ctx.drawImage(img, 0, 0, sampleW, sampleH);
      URL.revokeObjectURL(url);
      const bounds = findOpaqueBounds(canvas);
      if (!bounds) {
        resolve(fallback);
        return;
      }
      // Project measured pixel size back to the SVG's natural coordinate space
      // so we don't get tiny bakes when the rasterizer downscaled big SVGs.
      const artW = (bounds.maxX - bounds.minX + 1) / downscale;
      const artH = (bounds.maxY - bounds.minY + 1) / downscale;
      const longest = Math.max(artW, artH);
      let scale = 1;
      if (longest > HUB_MAX_SIDE) scale = HUB_MAX_SIDE / longest;
      else if (longest < HUB_MIN_SIDE) scale = HUB_MIN_SIDE / longest;
      const w = Math.max(HUB_MIN_SIDE, Math.min(HUB_MAX_SIDE, Math.round(artW * scale)));
      const h = Math.max(HUB_MIN_SIDE, Math.min(HUB_MAX_SIDE, Math.round(artH * scale)));
      resolve({ width: w, height: h });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(fallback);
    };
    img.src = url;
  });
}

/**
 * Bake the hub SVG to a PNG of the given (possibly non-square) dimensions,
 * trimming transparent padding first so the artwork fills the box.
 */
function renderHubToFittedPng(code: string, outW: number, outH: number): Promise<string> {
  const svgMatch = code.match(/<svg[\s\S]*<\/svg>/i);
  const svgCode = svgMatch ? svgMatch[0] : code;
  return new Promise((resolve) => {
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const nw = Math.max(1, img.naturalWidth || outW);
      const nh = Math.max(1, img.naturalHeight || outH);
      const maxSide = 1024;
      const downscale = Math.min(1, maxSide / Math.max(nw, nh));
      const sampleW = Math.max(1, Math.round(nw * downscale));
      const sampleH = Math.max(1, Math.round(nh * downscale));
      const sample = document.createElement('canvas');
      sample.width = sampleW;
      sample.height = sampleH;
      const sctx = sample.getContext('2d');
      if (!sctx) {
        URL.revokeObjectURL(url);
        renderToContainPng(code, Math.max(outW, outH)).then(resolve);
        return;
      }
      sctx.clearRect(0, 0, sampleW, sampleH);
      sctx.drawImage(img, 0, 0, sampleW, sampleH);

      const raw = findOpaqueBounds(sample);
      const cropX = raw ? raw.minX : 0;
      const cropY = raw ? raw.minY : 0;
      const cropW = raw ? Math.max(1, raw.maxX - raw.minX + 1) : sampleW;
      const cropH = raw ? Math.max(1, raw.maxY - raw.minY + 1) : sampleH;

      const out = document.createElement('canvas');
      out.width = outW;
      out.height = outH;
      const octx = out.getContext('2d');
      if (!octx) {
        URL.revokeObjectURL(url);
        renderToContainPng(code, Math.max(outW, outH)).then(resolve);
        return;
      }
      octx.clearRect(0, 0, outW, outH);
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = 'high';
      const scale = Math.min(outW / cropW, outH / cropH);
      const dW = cropW * scale;
      const dH = cropH * scale;
      octx.drawImage(sample, cropX, cropY, cropW, cropH, (outW - dW) / 2, (outH - dH) / 2, dW, dH);
      URL.revokeObjectURL(url);
      resolve(out.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      renderToContainPng(code, Math.max(outW, outH)).then(resolve);
    };
    img.src = url;
  });
}

function renderHubToContainPng(code: string, size: number): Promise<string> {
  const svgMatch = code.match(/<svg[\s\S]*<\/svg>/i);
  const svgCode = svgMatch ? svgMatch[0] : code;
  return new Promise((resolve) => {
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const nw = Math.max(1, img.naturalWidth || size);
      const nh = Math.max(1, img.naturalHeight || size);

      const maxSide = 1024;
      const downscale = Math.min(1, maxSide / Math.max(nw, nh));
      const sampleW = Math.max(1, Math.round(nw * downscale));
      const sampleH = Math.max(1, Math.round(nh * downscale));
      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = sampleW;
      sampleCanvas.height = sampleH;
      const sampleCtx = sampleCanvas.getContext('2d');
      if (!sampleCtx) {
        URL.revokeObjectURL(url);
        renderToContainPng(code, size).then(resolve);
        return;
      }
      sampleCtx.clearRect(0, 0, sampleW, sampleH);
      sampleCtx.drawImage(img, 0, 0, sampleW, sampleH);
      const data = sampleCtx.getImageData(0, 0, sampleW, sampleH).data;

      let minX = sampleW;
      let minY = sampleH;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < sampleH; y++) {
        for (let x = 0; x < sampleW; x++) {
          const alpha = data[(y * sampleW + x) * 4 + 3];
          if (alpha > 8) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxX < minX || maxY < minY) {
        URL.revokeObjectURL(url);
        renderToContainPng(code, size).then(resolve);
        return;
      }

      const pad = Math.ceil(Math.max(maxX - minX + 1, maxY - minY + 1) * 0.2);
      minX = Math.max(0, minX - pad);
      minY = Math.max(0, minY - pad);
      maxX = Math.min(sampleW - 1, maxX + pad);
      maxY = Math.min(sampleH - 1, maxY + pad);

      const cropW = Math.max(1, maxX - minX + 1);
      const cropH = Math.max(1, maxY - minY + 1);

      const outCanvas = document.createElement('canvas');
      outCanvas.width = size;
      outCanvas.height = size;
      const outCtx = outCanvas.getContext('2d');
      if (!outCtx) {
        URL.revokeObjectURL(url);
        renderToContainPng(code, size).then(resolve);
        return;
      }
      outCtx.clearRect(0, 0, size, size);
      outCtx.imageSmoothingEnabled = true;
      outCtx.imageSmoothingQuality = 'high';

      const scale = Math.min(size / cropW, size / cropH);
      const dw = cropW * scale;
      const dh = cropH * scale;
      const dx = (size - dw) / 2;
      const dy = (size - dh) / 2;
      outCtx.drawImage(sampleCanvas, minX, minY, cropW, cropH, dx, dy, dw, dh);

      URL.revokeObjectURL(url);
      resolve(outCanvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      renderToContainPng(code, size).then(resolve);
    };
    img.src = url;
  });
}

async function putHandRecord(record: CustomHandRecord): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function maybeMigrateRecord(record: CustomHandRecord): Promise<CustomHandRecord> {
  const shouldMigrateHands = !!(
    record.sourceHourHtml
    && record.sourceMinuteHtml
    && record.sourceSecondHtml
    && record.handRenderVersion !== HAND_RENDER_VERSION
  );
  const shouldMigrateHub = !!(record.sourceHubHtml && record.hubRenderVersion !== HUB_RENDER_VERSION);
  if (!shouldMigrateHands && !shouldMigrateHub) return record;

  try {
    let next: CustomHandRecord = { ...record };

    if (shouldMigrateHands) {
      const hourSourceSvg = extractSvgFromCode(record.sourceHourHtml!);
      const minuteSourceSvg = extractSvgFromCode(record.sourceMinuteHtml!);
      const secondSourceSvg = extractSvgFromCode(record.sourceSecondHtml!);
      const hourPivotSource = extractPivotFromSvg(hourSourceSvg) ?? inferCenteredPivot(hourSourceSvg);
      const minutePivotSource = extractPivotFromSvg(minuteSourceSvg) ?? inferCenteredPivot(minuteSourceSvg);
      const secondPivotSource = extractPivotFromSvg(secondSourceSvg) ?? inferCenteredPivot(secondSourceSvg);

      const [hourLayer, minuteLayer, secondLayer] = await Promise.all([
        renderHandToPngWithPivot(hourSourceSvg, 22, 140, hourPivotSource),
        renderHandToPngWithPivot(minuteSourceSvg, 16, 200, minutePivotSource),
        renderHandToPngWithPivot(secondSourceSvg, 8, 240, secondPivotSource),
      ]);

      const off = next.pivotOffsets;
      const baseHour = hourLayer.pivot ?? { x: 11, y: 118 };
      const baseMinute = minuteLayer.pivot ?? { x: 8, y: 172 };
      const baseSecond = secondLayer.pivot ?? { x: 4, y: 180 };
      const effectiveHour = off
        ? { x: clamp(Math.round(baseHour.x + off.hour.x), 0, 22), y: clamp(Math.round(baseHour.y + off.hour.y), 0, 140) }
        : baseHour;
      const effectiveMinute = off
        ? { x: clamp(Math.round(baseMinute.x + off.minute.x), 0, 16), y: clamp(Math.round(baseMinute.y + off.minute.y), 0, 200) }
        : baseMinute;
      const effectiveSecond = off
        ? { x: clamp(Math.round(baseSecond.x + off.second.x), 0, 8), y: clamp(Math.round(baseSecond.y + off.second.y), 0, 240) }
        : baseSecond;

      next = {
        ...next,
        hourDataUrl: hourLayer.dataUrl,
        minuteDataUrl: minuteLayer.dataUrl,
        secondDataUrl: secondLayer.dataUrl,
        hourPosX: effectiveHour.x,
        hourPosY: effectiveHour.y,
        minutePosX: effectiveMinute.x,
        minutePosY: effectiveMinute.y,
        secondPosX: effectiveSecond.x,
        secondPosY: effectiveSecond.y,
        handRenderVersion: HAND_RENDER_VERSION,
      };
    }

    if (shouldMigrateHub) {
      const hubSize = await measureHubArtSize(extractSvgFromCode(next.sourceHubHtml!));
      const [coverDataUrl, swatchDataUrl] = await Promise.all([
        renderHubToFittedPng(next.sourceHubHtml!, hubSize.width, hubSize.height),
        renderHubToContainPng(next.sourceHubHtml!, 24),
      ]);
      next = {
        ...next,
        coverDataUrl,
        coverWidth: hubSize.width,
        coverHeight: hubSize.height,
        swatchDataUrl,
        hubRenderVersion: HUB_RENDER_VERSION,
      };
    }

    await putHandRecord(next);
    return next;
  } catch {
    return record;
  }
}

function generateDefaultCover(): Promise<string> {
  return Promise.resolve((() => {
    const canvas = document.createElement('canvas');
    canvas.width = 30;
    canvas.height = 30;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(12, 10, 2, 15, 15, 13);
    grad.addColorStop(0, '#E8ECF8');
    grad.addColorStop(0.5, '#C0C8D8');
    grad.addColorStop(1, '#606878');
    ctx.beginPath();
    ctx.arc(15, 15, 13, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,70,90,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    return canvas.toDataURL('image/png');
  })());
}
