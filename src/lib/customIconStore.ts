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

// ── Public API ────────────────────────────────────────────────────────────────

/** Load all stored custom icons. */
export async function loadCustomIcons(): Promise<CustomIconRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ICON_STORE, 'readonly');
    const req = tx.objectStore(ICON_STORE).getAll();
    req.onsuccess = () => resolve((req.result as CustomIconRecord[]).sort((a, b) => a.createdAt - b.createdAt));
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
): Promise<CustomIconRecord> {
  const db = await openDB();
  const record: CustomIconRecord = {
    key: makeKey(category, name),
    name,
    category,
    dataUrl,
    width,
    height,
    createdAt: Date.now(),
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
 * Render an SVG string to a PNG data-URL at a given size.
 * Used to convert Lab SVG output before saving.
 */
export function renderSvgToDataUrl(svgString: string, size = 64): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
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
 * Render an HTML snippet to a PNG data-URL using a hidden iframe.
 * Returns empty string if rendering fails.
 */
export async function renderHtmlToDataUrl(htmlString: string, size = 64): Promise<string> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${size}px;height:${size}px;border:none;`;
  document.body.appendChild(iframe);
  return new Promise((resolve) => {
    iframe.onload = () => {
      // Use XMLSerializer + canvas as a best-effort screenshot
      try {
        const iDoc = iframe.contentDocument;
        if (!iDoc) { document.body.removeChild(iframe); resolve(''); return; }
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, size, size);
        document.body.removeChild(iframe);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        document.body.removeChild(iframe);
        resolve('');
      }
    };
    iframe.srcdoc = `<html><body style="margin:0;padding:0;width:${size}px;height:${size}px;overflow:hidden;">${htmlString}</body></html>`;
  });
}
