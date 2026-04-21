/**
 * customHandStore.ts
 * Persistent IndexedDB storage for user-created clock hand styles.
 * Each record stores pre-rendered PNG data URLs for all 4 hand images.
 */

const DB_NAME = 'zepp-studio-hands';
const DB_VERSION = 1;
const STORE = 'custom-hands';
const HUB_RENDER_VERSION = 2;

export interface CustomHandRecord {
  key: string;           // 'custom_hand:slug'
  name: string;
  hourDataUrl: string;   // 22×140 PNG data URL
  minuteDataUrl: string; // 16×200 PNG data URL
  secondDataUrl: string; // 8×240 PNG data URL
  coverDataUrl: string;  // 30×30 PNG data URL
  swatchDataUrl: string; // 24×24 thumbnail for UI preview
  // Optional per-hand pivot points (in pixels) derived from marker metadata.
  // These map directly to TIME_POINTER hour_posX/Y, minute_posX/Y, second_posX/Y.
  hourPosX?: number;
  hourPosY?: number;
  minutePosX?: number;
  minutePosY?: number;
  secondPosX?: number;
  secondPosY?: number;
  // Optional composer metadata for separated HTML workflow.
  sourceHourHtml?: string;
  sourceMinuteHtml?: string;
  sourceSecondHtml?: string;
  sourceHubHtml?: string;
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

// ── Public API ────────────────────────────────────────────────────────────────

export async function loadCustomHandStyles(): Promise<CustomHandRecord[]> {
  const db = await openDB();
  const rows = await new Promise<CustomHandRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as CustomHandRecord[]);
    req.onerror = () => reject(req.error);
  });
  const migrated = await Promise.all(rows.map(maybeMigrateHubRecord));
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
  return maybeMigrateHubRecord(row);
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

  const [hourDataUrl, minuteDataUrl, secondDataUrl, coverDataUrl, swatchDataUrl] =
    await Promise.all([
      renderToHandPng(hourSvg, 22, 140),
      renderToHandPng(minuteSvg, 16, 200),
      renderToHandPng(secondSvg, 8, 240),
      renderHubToContainPng(hubSvg, 30),  // hub: trim transparent bounds before fitting
      renderHubToContainPng(hubSvg, 24),  // swatch: trim transparent bounds before fitting
    ]);

  const hourPivot = hourPivotSource ? computePivotPx(hourPivotSource, 22, 140) : null;
  const minutePivot = minutePivotSource ? computePivotPx(minutePivotSource, 16, 200) : null;
  const secondPivot = secondPivotSource ? computePivotPx(secondPivotSource, 8, 240) : null;

  const pivotOffsets = options?.pivotOffsets;

  // Effective hand positions for TIME_POINTER selection/export.
  // If no marker-derived pivot exists, fall back to known stable defaults.
  const baseHour = hourPivot ?? { x: 11, y: 118 };
  const baseMinute = minutePivot ?? { x: 8, y: 172 };
  const baseSecond = secondPivot ?? { x: 4, y: 180 };
  const effectiveHour = pivotOffsets
    ? { x: clamp(Math.round(baseHour.x + pivotOffsets.hour.x), 0, 22), y: clamp(Math.round(baseHour.y + pivotOffsets.hour.y), 0, 140) }
    : baseHour;
  const effectiveMinute = pivotOffsets
    ? { x: clamp(Math.round(baseMinute.x + pivotOffsets.minute.x), 0, 16), y: clamp(Math.round(baseMinute.y + pivotOffsets.minute.y), 0, 200) }
    : baseMinute;
  const effectiveSecond = pivotOffsets
    ? { x: clamp(Math.round(baseSecond.x + pivotOffsets.second.x), 0, 8), y: clamp(Math.round(baseSecond.y + pivotOffsets.second.y), 0, 240) }
    : baseSecond;

  const record: CustomHandRecord = {
    key: `custom_hand:${slugify(name)}`,
    name,
    hourDataUrl,
    minuteDataUrl,
    secondDataUrl,
    coverDataUrl,
    swatchDataUrl,
    hourPosX: effectiveHour.x,
    hourPosY: effectiveHour.y,
    minutePosX: effectiveMinute.x,
    minutePosY: effectiveMinute.y,
    secondPosX: effectiveSecond.x,
    secondPosY: effectiveSecond.y,
    ...(hasComposedSources ? {
      sourceHourHtml: composed!.hourHtml,
      sourceMinuteHtml: composed!.minuteHtml,
      sourceSecondHtml: composed!.secondHtml,
      sourceHubHtml: composed!.hubHtml,
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

async function maybeMigrateHubRecord(record: CustomHandRecord): Promise<CustomHandRecord> {
  if (!record.sourceHubHtml || record.hubRenderVersion === HUB_RENDER_VERSION) return record;
  try {
    const [coverDataUrl, swatchDataUrl] = await Promise.all([
      renderHubToContainPng(record.sourceHubHtml, 30),
      renderHubToContainPng(record.sourceHubHtml, 24),
    ]);
    const next: CustomHandRecord = {
      ...record,
      coverDataUrl,
      swatchDataUrl,
      hubRenderVersion: HUB_RENDER_VERSION,
    };
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
