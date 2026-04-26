/**
 * customIconStore.ts
 * Persistent IndexedDB storage for user-created custom icons.
 * Icons survive browser cache clears and app redeployments.
 */

const DB_NAME = 'zepp-studio';
const DB_VERSION = 2;
const ICON_STORE = 'custom-icons';

export interface CustomIconRecord {
  key: string;        // "custom:category/name-slug"  — primary key
  name: string;       // display label, e.g. "My Heart"
  category: string;   // user-defined group, e.g. "My Icons"
  dataUrl: string;    // PNG data-URL
  width: number;
  height: number;
  createdAt: number;
  sourceMode?: 'svg' | 'html';
  sourceCode?: string;
  sourceVersion?: number;
}

export interface CustomIconSourcePayload {
  sourceMode: 'svg' | 'html';
  sourceCode: string;
  sourceVersion?: number;
}

// ── DB open ───────────────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(ICON_STORE)) {
        db.createObjectStore(ICON_STORE, { keyPath: 'key' });
      }
      // Font store created by customFontStore — both share the same DB
      if (!db.objectStoreNames.contains('custom-fonts')) {
        db.createObjectStore('custom-fonts', { keyPath: 'name' });
      }
    };
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function makeKey(category: string, name: string): string {
  return `custom:${slugify(category)}/${slugify(name)}`;
}

function normalizeCustomIconRecord(record: CustomIconRecord): CustomIconRecord {
  const sourceCode = typeof record.sourceCode === 'string' ? record.sourceCode : '';
  const sourceMode = record.sourceMode === 'svg' || record.sourceMode === 'html' ? record.sourceMode : undefined;

  if (!sourceMode || !sourceCode.trim()) {
    return {
      ...record,
      sourceMode: undefined,
      sourceCode: undefined,
      sourceVersion: undefined,
    };
  }

  return {
    ...record,
    sourceMode,
    sourceCode,
    sourceVersion: record.sourceVersion ?? 1,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Load all stored custom icons. */
export async function loadCustomIcons(): Promise<CustomIconRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ICON_STORE, 'readonly');
    const req = tx.objectStore(ICON_STORE).getAll();
    req.onsuccess = () => {
      const records = (req.result as CustomIconRecord[])
        .map(normalizeCustomIconRecord)
        .sort((a, b) => a.createdAt - b.createdAt);
      resolve(records);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Save a new custom icon (overwrites if same key). */
export async function saveCustomIcon(
  name: string,
  category: string,
  dataUrl: string,
  width = 64,
  height = 64,
  sourcePayload?: CustomIconSourcePayload,
): Promise<CustomIconRecord> {
  const db = await openDB();
  const sourceCode = sourcePayload?.sourceCode?.trim();
  const hasSource = !!(sourcePayload?.sourceMode && sourceCode);
  const record: CustomIconRecord = {
    key: makeKey(category, name),
    name,
    category,
    dataUrl,
    width,
    height,
    createdAt: Date.now(),
    sourceMode: hasSource ? sourcePayload?.sourceMode : undefined,
    sourceCode: hasSource ? sourceCode : undefined,
    sourceVersion: hasSource ? (sourcePayload?.sourceVersion ?? 1) : undefined,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ICON_STORE, 'readwrite');
    const req = tx.objectStore(ICON_STORE).put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

/** Delete a custom icon by key. */
export async function deleteCustomIcon(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ICON_STORE, 'readwrite');
    const req = tx.objectStore(ICON_STORE).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Replace icon library with synced records from cloud.
 */
export async function replaceCustomIcons(records: CustomIconRecord[]): Promise<void> {
  const db = await openDB();
  const normalized = records.map(normalizeCustomIconRecord);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ICON_STORE, 'readwrite');
    const store = tx.objectStore(ICON_STORE);
    const clearReq = store.clear();
    clearReq.onerror = () => reject(clearReq.error);
    clearReq.onsuccess = () => {
      for (const record of normalized) {
        store.put(record);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/**
 * Render an SVG string to a PNG data-URL at a given size.
 * Used to convert Lab SVG output before saving.
 * Pre-processes SVG to:
 *   - inject color="white" so currentColor resolves to white (not black)
 *   - inject explicit width/height from viewBox if missing (for reliable sizing)
 */
export function renderSvgToDataUrl(svgString: string, size = 64): Promise<string> {
  return new Promise((resolve, reject) => {
    let svg = svgString.trim();

    // Inject color="white" so elements using currentColor render white, not black
    if (/<svg\b/.test(svg) && !svg.includes('color="') && !svg.includes("color='")) {
      svg = svg.replace('<svg', '<svg color="white"');
    }

    // If viewBox is present but no explicit width/height, derive them for proper sizing
    if (!svg.match(/\bwidth=/i) && !svg.match(/\bheight=/i)) {
      const vbMatch = svg.match(/viewBox=["']([^"']+)["']/);
      if (vbMatch) {
        const parts = vbMatch[1].trim().split(/[\s,]+/);
        if (parts.length >= 4) {
          const w = parseFloat(parts[2]);
          const h = parseFloat(parts[3]);
          if (w > 0 && h > 0) {
            svg = svg.replace('<svg', `<svg width="${w}" height="${h}"`);
          }
        }
      }
    }

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG render failed')); };
    img.src = url;
  });
}

/**
 * Render an HTML snippet to a PNG data-URL.
 * Extracts any SVG from the HTML and renders it via renderSvgToDataUrl.
 * Falls back to an iframe DOM approach if the HTML loads an SVG dynamically.
 * Returns empty string if no renderable content is found.
 */
export async function renderHtmlToDataUrl(htmlString: string, size = 64): Promise<string> {
  // Fast path: extract SVG tag directly from the HTML string
  const svgMatch = htmlString.match(/<svg[\s\S]*?<\/svg>/i);
  if (svgMatch) {
    try { return await renderSvgToDataUrl(svgMatch[0], size); } catch { return ''; }
  }

  // Slower path: load into an iframe and extract SVG from DOM
  // (handles cases where SVG is generated by inline JS or deferred)
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${size}px;height:${size}px;border:none;visibility:hidden;`;
    document.body.appendChild(iframe);

    const cleanup = () => { if (iframe.parentNode) document.body.removeChild(iframe); };
    const timeout = setTimeout(() => { cleanup(); resolve(''); }, 2000);

    iframe.onload = () => {
      clearTimeout(timeout);
      try {
        const svgEl = iframe.contentDocument?.querySelector('svg');
        if (svgEl) {
          const svgStr = new XMLSerializer().serializeToString(svgEl);
          cleanup();
          renderSvgToDataUrl(svgStr, size).then(resolve).catch(() => resolve(''));
        } else {
          cleanup(); resolve('');
        }
      } catch { cleanup(); resolve(''); }
    };
    iframe.srcdoc = `<html><body style="margin:0;padding:0;width:${size}px;height:${size}px;overflow:hidden;">${htmlString}</body></html>`;
  });
}
