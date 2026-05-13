/**
 * customGaugePointerStore.ts
 * Persistent IndexedDB storage for user-created custom gauge pointer assets.
 * Part of Spec 087 Phase 3.
 *
 * IDB: 'zepp-studio-gauge' (v1), store 'custom-gauge-pointers', keyPath 'key'
 */

const DB_NAME = 'zepp-studio-gauge';
const DB_VERSION = 1;
const STORE = 'custom-gauge-pointers';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CustomGaugePointerRecord {
  key: string;        // 'custom_gauge:<slug>'
  name: string;       // display label
  sourceHtml: string; // raw HTML/SVG the user typed
  dataUrl: string;    // rendered PNG data URL (for preview + use)
  pivotX: number;     // 0–1 ratio (horizontal pivot), default 0.5
  pivotY: number;     // 0–1 ratio (vertical pivot), default 0.9
  createdAt: number;  // Unix ms timestamp
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

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'gauge';
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function loadCustomGaugePointers(): Promise<CustomGaugePointerRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as CustomGaugePointerRecord[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCustomGaugePointer(
  name: string,
  sourceHtml: string,
  dataUrl: string,
  pivotX: number,
  pivotY: number,
): Promise<CustomGaugePointerRecord> {
  const db = await openDB();
  const key = `custom_gauge:${slugify(name)}`;
  const record: CustomGaugePointerRecord = {
    key,
    name: name.trim(),
    sourceHtml,
    dataUrl,
    pivotX: Math.max(0, Math.min(1, pivotX)),
    pivotY: Math.max(0, Math.min(1, pivotY)),
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCustomGaugePointer(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function replaceCustomGaugePointers(
  records: CustomGaugePointerRecord[],
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.clear();
    for (const rec of records) {
      store.put(rec);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
