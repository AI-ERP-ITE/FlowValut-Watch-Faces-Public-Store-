/**
 * customFontStore.ts
 * Persistent IndexedDB storage for user-uploaded custom fonts.
 * Fonts are stored as ArrayBuffers and reloaded via FontFace API on startup.
 */

const DB_NAME = 'zepp-studio';
const DB_VERSION = 2;
const FONT_STORE = 'custom-fonts';

export interface CustomFontRecord {
  name: string;         // display name & FontFace family name — primary key
  fileName: string;     // original uploaded filename
  buffer: ArrayBuffer;  // raw font bytes
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
      if (!db.objectStoreNames.contains(FONT_STORE)) {
        db.createObjectStore(FONT_STORE, { keyPath: 'name' });
      }
      if (!db.objectStoreNames.contains('custom-icons')) {
        db.createObjectStore('custom-icons', { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Load all stored custom fonts. */
export async function loadCustomFonts(): Promise<CustomFontRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FONT_STORE, 'readonly');
    const req = tx.objectStore(FONT_STORE).getAll();
    req.onsuccess = () => resolve((req.result as CustomFontRecord[]).sort((a, b) => a.createdAt - b.createdAt));
    req.onerror = () => reject(req.error);
  });
}

/** Save a new custom font. */
export async function saveCustomFont(name: string, fileName: string, buffer: ArrayBuffer): Promise<CustomFontRecord> {
  const db = await openDB();
  const record: CustomFontRecord = { name, fileName, buffer, createdAt: Date.now() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FONT_STORE, 'readwrite');
    const req = tx.objectStore(FONT_STORE).put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

/** Delete a custom font by name. */
export async function deleteCustomFont(name: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FONT_STORE, 'readwrite');
    const req = tx.objectStore(FONT_STORE).delete(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Register all stored fonts with the browser's FontFace API.
 * Call once on app startup — safe to call multiple times (skips already-loaded).
 * Returns the list of successfully loaded font names.
 */
export async function registerCustomFonts(): Promise<string[]> {
  const fonts = await loadCustomFonts();
  const loaded: string[] = [];
  for (const f of fonts) {
    // Skip if already registered
    const already = [...document.fonts].some(ff => ff.family === `"${f.name}"` || ff.family === f.name);
    if (already) { loaded.push(f.name); continue; }
    try {
      const face = new FontFace(f.name, f.buffer);
      await face.load();
      document.fonts.add(face);
      loaded.push(f.name);
    } catch {
      console.warn(`[customFontStore] Failed to load font: ${f.name}`);
    }
  }
  return loaded;
}
