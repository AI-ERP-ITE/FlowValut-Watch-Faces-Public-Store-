/**
 * imageSwitcherStore.ts — Spec 088 Phase B
 * IDB: 'zepp-studio-switchers' (v1), store 'switcher-definitions', keyPath 'id'
 */

import type { ImageSwitcherDefinition } from '@/types/imageSwitcher';
import { normalizeDataAlias } from './elementDataRules';

const DB_NAME = 'zepp-studio-switchers';
const DB_VERSION = 1;
const STORE = 'switcher-definitions';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadSwitcherDefinitions(): Promise<ImageSwitcherDefinition[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as ImageSwitcherDefinition[]).map(normalizeDefinition));
    req.onerror = () => reject(req.error);
  });
}

export async function getSwitcherDefinition(id: string): Promise<ImageSwitcherDefinition | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => {
      const result = req.result as ImageSwitcherDefinition | undefined;
      resolve(result ? normalizeDefinition(result) : null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveSwitcherDefinition(def: ImageSwitcherDefinition): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(normalizeDefinition(def));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteSwitcherDefinition(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Replace the entire store (used during pull sync). */
export async function replaceSwitcherDefinitions(defs: ImageSwitcherDefinition[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.clear();
    for (const def of defs) store.put(normalizeDefinition(def));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function normalizeDefinition(def: ImageSwitcherDefinition): ImageSwitcherDefinition {
  const dataType = normalizeDataAlias(def.dataType) ?? def.dataType;
  return dataType === def.dataType ? def : { ...def, dataType };
}
