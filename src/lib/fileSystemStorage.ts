/**
 * File System Access API storage for localhost persistence.
 *
 * Themes → <root>/themes/<id>.json       (one file per theme)
 * Library elements → <root>/library/<id>.json  (one file per element)
 *
 * The directory handle is persisted in IndexedDB so the folder link survives
 * page reloads without prompting the user each time.
 *
 * This is only available in Chromium browsers (Chrome/Edge) on secure origins
 * (localhost or https). On Firefox / Safari it gracefully no-ops.
 */

// ─── Minimal FS Access API type declarations ─────────────────────────────────

interface FileSystemPermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

interface FileSystemHandle {
  readonly kind: 'file' | 'directory';
  readonly name: string;
  queryPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>;
}

interface FileSystemFileHandle extends FileSystemHandle {
  readonly kind: 'file';
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | BufferSource | Blob): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  readonly kind: 'directory';
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  [Symbol.asyncIterator](): AsyncIterableIterator<[string, FileSystemHandle]>;
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  values(): AsyncIterableIterator<FileSystemHandle>;
  keys(): AsyncIterableIterator<string>;
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite'; startIn?: string }) => Promise<FileSystemDirectoryHandle>;
  }
}

export type { FileSystemDirectoryHandle };

// ─── Feature detection ────────────────────────────────────────────────────────

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

const IDB_DB_NAME = 'parametric-fs-v1';
const IDB_STORE = 'handles';
const IDB_KEY = 'dataFolder';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveHandleToIDB(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getHandleFromIDB(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function clearHandleFromIDB(): Promise<void> {
  try {
    const db = await openIDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

// ─── Permission helpers ───────────────────────────────────────────────────────

/**
 * Returns true if we already have (or were just granted) readwrite permission.
 * May show a browser prompt the first time after a page reload.
 */
export async function requestFolderPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    const state = await handle.queryPermission({ mode: 'readwrite' });
    if (state === 'granted') return true;
    const requested = await handle.requestPermission({ mode: 'readwrite' });
    return requested === 'granted';
  } catch {
    return false;
  }
}

// ─── Folder picker ────────────────────────────────────────────────────────────

/**
 * Opens the OS folder picker. Returns the handle on success or null on cancel.
 */
export async function pickLocalDataFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) return null;
  try {
    const handle = await window.showDirectoryPicker!({ mode: 'readwrite' });
    await saveHandleToIDB(handle);
    return handle;
  } catch {
    // User cancelled or permission denied.
    return null;
  }
}

// ─── Generic file helpers ─────────────────────────────────────────────────────

async function getSubfolder(
  root: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle> {
  return root.getDirectoryHandle(name, { create: true });
}

async function writeJsonFile(
  dir: FileSystemDirectoryHandle,
  filename: string,
  data: unknown,
): Promise<void> {
  const fh = await dir.getFileHandle(filename, { create: true });
  const writable = await fh.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

async function readJsonFile(fh: FileSystemFileHandle): Promise<unknown> {
  const file = await fh.getFile();
  const text = await file.text();
  return JSON.parse(text);
}

async function deleteFile(
  dir: FileSystemDirectoryHandle,
  filename: string,
): Promise<void> {
  try {
    await dir.removeEntry(filename);
  } catch {
    // File may not exist — ignore.
  }
}

// ─── Theme file ops ───────────────────────────────────────────────────────────

const THEMES_DIR = 'themes';

/** Save (or overwrite) one theme as <root>/themes/<id>.json */
export async function saveThemeFile(
  root: FileSystemDirectoryHandle,
  theme: { id: string; name: string; [key: string]: unknown },
): Promise<void> {
  const dir = await getSubfolder(root, THEMES_DIR);
  await writeJsonFile(dir, `${theme.id}.json`, theme);
}

/** Delete <root>/themes/<id>.json */
export async function deleteThemeFile(
  root: FileSystemDirectoryHandle,
  themeId: string,
): Promise<void> {
  const dir = await getSubfolder(root, THEMES_DIR);
  await deleteFile(dir, `${themeId}.json`);
}

/** Load all <root>/themes/*.json files and return parsed objects */
export async function loadAllThemeFiles(
  root: FileSystemDirectoryHandle,
): Promise<unknown[]> {
  try {
    const dir = await getSubfolder(root, THEMES_DIR);
    const results: unknown[] = [];
    for await (const [, handle] of dir.entries()) {
      if (handle.kind === 'file' && handle.name.endsWith('.json')) {
        try {
          const data = await readJsonFile(handle as FileSystemFileHandle);
          results.push(data);
        } catch {
          // Skip corrupt files.
        }
      }
    }
    return results;
  } catch {
    return [];
  }
}

// ─── Library element file ops ─────────────────────────────────────────────────

const LIBRARY_DIR = 'library';

/** Save (or overwrite) one library entry as <root>/library/<id>.json */
export async function saveLibraryFile(
  root: FileSystemDirectoryHandle,
  entry: { id: string; name: string; [key: string]: unknown },
): Promise<void> {
  const dir = await getSubfolder(root, LIBRARY_DIR);
  await writeJsonFile(dir, `${entry.id}.json`, entry);
}

/** Delete <root>/library/<id>.json */
export async function deleteLibraryFile(
  root: FileSystemDirectoryHandle,
  entryId: string,
): Promise<void> {
  const dir = await getSubfolder(root, LIBRARY_DIR);
  await deleteFile(dir, `${entryId}.json`);
}

/** Load all <root>/library/*.json files and return parsed objects */
export async function loadAllLibraryFiles(
  root: FileSystemDirectoryHandle,
): Promise<unknown[]> {
  try {
    const dir = await getSubfolder(root, LIBRARY_DIR);
    const results: unknown[] = [];
    for await (const [, handle] of dir.entries()) {
      if (handle.kind === 'file' && handle.name.endsWith('.json')) {
        try {
          const data = await readJsonFile(handle as FileSystemFileHandle);
          results.push(data);
        } catch {
          // Skip corrupt files.
        }
      }
    }
    return results;
  } catch {
    return [];
  }
}
