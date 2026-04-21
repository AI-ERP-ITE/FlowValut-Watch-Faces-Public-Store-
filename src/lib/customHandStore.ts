/**
 * customHandStore.ts
 * Persistent IndexedDB storage for user-created clock hand styles.
 * Each record stores pre-rendered PNG data URLs for all 4 hand images.
 */

const DB_NAME = 'zepp-studio-hands';
const DB_VERSION = 1;
const STORE = 'custom-hands';

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
  createdAt: number;
}

interface ParsedPivot {
  xRatio: number;
  yRatio: number;
  aspect: number;
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

  // Preferred: explicit marker element with id="pivot" and cx/cy.
  const pivotEl = svg.match(/<[^>]*\bid\s*=\s*["']pivot["'][^>]*>/i)?.[0] ?? '';
  const cxMatch = pivotEl.match(/\bcx\s*=\s*["']([^"']+)["']/i);
  const cyMatch = pivotEl.match(/\bcy\s*=\s*["']([^"']+)["']/i);

  // Secondary option: put data-pivot-x / data-pivot-y on the svg root.
  const svgTag = svg.match(/<svg\b[^>]*>/i)?.[0] ?? '';
  const dataX = svgTag.match(/\bdata-pivot-x\s*=\s*["']([^"']+)["']/i);
  const dataY = svgTag.match(/\bdata-pivot-y\s*=\s*["']([^"']+)["']/i);

  const x = Number(cxMatch?.[1] ?? dataX?.[1]);
  const y = Number(cyMatch?.[1] ?? dataY?.[1]);
  if (Number.isNaN(x) || Number.isNaN(y)) return null;

  const xRatio = (x - vb.minX) / vb.width;
  const yRatio = (y - vb.minY) / vb.height;
  return {
    xRatio: clamp(xRatio, 0, 1),
    yRatio: clamp(yRatio, 0, 1),
    aspect: vb.width / vb.height,
  };
}

function stripPivotMarkers(svg: string): string {
  // Remove explicit pivot / tip markers so they never appear in the exported PNGs.
  return svg
    .replace(/<[^>]*\bid\s*=\s*["']pivot["'][^>]*>\s*<\/[^>]+>\s*/gi, '')
    .replace(/<[^>]*\bid\s*=\s*["']tip["'][^>]*>\s*<\/[^>]+>\s*/gi, '')
    .replace(/<[^>]*\bid\s*=\s*["']pivot["'][^>]*\/?>\s*/gi, '')
    .replace(/<[^>]*\bid\s*=\s*["']tip["'][^>]*\/?>\s*/gi, '');
}

function computePivotPx(pivot: ParsedPivot, outW: number, outH: number): { x: number; y: number } {
  const drawW = outH * pivot.aspect;
  const dx = (outW - drawW) / 2;
  const x = dx + (pivot.xRatio * drawW);
  const y = pivot.yRatio * outH;
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
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () =>
      resolve((req.result as CustomHandRecord[]).sort((a, b) => a.createdAt - b.createdAt));
    req.onerror = () => reject(req.error);
  });
}

export async function getCustomHandByKey(key: string): Promise<CustomHandRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as CustomHandRecord) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCustomHandStyle(
  name: string,
  svgCode: string,
): Promise<CustomHandRecord> {
  const sourceSvg = extractSvgFromCode(svgCode);
  const parsedPivot = extractPivotFromSvg(sourceSvg);
  const cleanedSvg = stripPivotMarkers(sourceSvg);

  const [hourDataUrl, minuteDataUrl, secondDataUrl, coverDataUrl, swatchDataUrl] =
    await Promise.all([
      renderToHandPng(cleanedSvg, 22, 140),
      renderToHandPng(cleanedSvg, 16, 200),
      renderToHandPng(cleanedSvg, 8, 240),
      renderToContainPng(cleanedSvg, 30),  // hub: SVG fitted inside 30×30 square
      renderToContainPng(cleanedSvg, 24),  // swatch: SVG fitted inside 24×24 square
    ]);

  const hourPivot = parsedPivot ? computePivotPx(parsedPivot, 22, 140) : null;
  const minutePivot = parsedPivot ? computePivotPx(parsedPivot, 16, 200) : null;
  const secondPivot = parsedPivot ? computePivotPx(parsedPivot, 8, 240) : null;

  const record: CustomHandRecord = {
    key: `custom_hand:${slugify(name)}`,
    name,
    hourDataUrl,
    minuteDataUrl,
    secondDataUrl,
    coverDataUrl,
    swatchDataUrl,
    ...(hourPivot ? { hourPosX: hourPivot.x, hourPosY: hourPivot.y } : {}),
    ...(minutePivot ? { minutePosX: minutePivot.x, minutePosY: minutePivot.y } : {}),
    ...(secondPivot ? { secondPosX: secondPivot.x, secondPosY: secondPivot.y } : {}),
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
      // Scale to fill the HEIGHT exactly, preserve aspect ratio, center horizontally.
      // This keeps the hand shape consistent across hour (22×140), minute (16×200),
      // and second (8×240) canvases — same design, different thickness/length.
      // The pivot fraction (~85% down the height) remains valid for all three.
      const nw = img.naturalWidth || 100;
      const nh = img.naturalHeight || 100;
      const scale = h / nh;
      const dw = nw * scale;
      const dx = (w - dw) / 2; // center (clips edges if SVG is wider than canvas)
      ctx.drawImage(img, dx, 0, dw, h);
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
