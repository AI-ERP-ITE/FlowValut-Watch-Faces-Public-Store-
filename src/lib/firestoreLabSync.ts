/**
 * firestoreLabSync.ts
 * Firestore-backed persistence for all lab assets (icons, hands, fonts).
 * Phase 2 of Spec 087 — replaces GitHub-bridge cloud sync.
 *
 * Contract:
 *  - Pull = UPSERT (Firestore wins on conflict, local-only records are preserved)
 *  - Push = setDoc immediately on save (fire-and-forget, never blocks IDB)
 *  - Delete = deleteDoc immediately on delete
 *  - Auth not available → skip silently, IDB works standalone
 *
 * T-014 will extend this file to add 'gaugePointers' support.
 */

import { getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';

import { getCurrentAuthUser } from './firebaseAuthClient';
import type { CustomIconRecord } from './customIconStore';
import type { CustomHandRecord } from './customHandStore';
import type { CustomFontRecord, SerializableCustomFontRecord } from './customFontStore';
import {
  loadCustomIcons,
  replaceCustomIcons,
} from './customIconStore';
import {
  loadCustomHandStyles,
  replaceCustomHandStyles,
} from './customHandStore';
import {
  loadCustomFonts,
  replaceCustomFonts,
  registerCustomFonts,
  serializeCustomFonts,
  deserializeCustomFonts,
} from './customFontStore';
import type { CustomGaugePointerRecord } from './customGaugePointerStore';
import {
  loadCustomGaugePointers,
  replaceCustomGaugePointers,
} from './customGaugePointerStore';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Asset type keys. */
export type LabAssetType = 'icons' | 'hands' | 'fonts' | 'gaugePointers';

export type LabRecord = CustomIconRecord | CustomHandRecord | CustomFontRecord | CustomGaugePointerRecord;

// ── Firestore helpers ─────────────────────────────────────────────────────────

function getDb() {
  return getFirestore(getApp());
}

function getUid(): string | null {
  return getCurrentAuthUser()?.uid ?? null;
}

/** Returns true when a signed-in user is available for Firestore operations. */
export function isFirestoreSyncEnabled(): boolean {
  return getUid() !== null;
}

function labCol(uid: string, type: LabAssetType) {
  return collection(getDb(), 'users', uid, 'labAssets', type);
}

function labDocRef(uid: string, type: LabAssetType, docId: string) {
  return doc(getDb(), 'users', uid, 'labAssets', type, docId);
}

// ── Pull helpers (per type) ───────────────────────────────────────────────────

async function pullIcons(uid: string): Promise<void> {
  const snap = await getDocs(labCol(uid, 'icons'));
  if (snap.empty) return;

  const firestoreMap = new Map<string, CustomIconRecord>();
  snap.forEach(d => firestoreMap.set(d.id, d.data() as CustomIconRecord));

  const local = await loadCustomIcons();
  const merged = new Map<string, CustomIconRecord>(local.map(r => [r.key, r]));
  // Firestore wins on conflict
  firestoreMap.forEach((rec, key) => merged.set(key, rec));

  await replaceCustomIcons([...merged.values()]);
}

async function pullHands(uid: string): Promise<void> {
  const snap = await getDocs(labCol(uid, 'hands'));
  if (snap.empty) return;

  const firestoreMap = new Map<string, CustomHandRecord>();
  snap.forEach(d => firestoreMap.set(d.id, d.data() as CustomHandRecord));

  const local = await loadCustomHandStyles();
  const merged = new Map<string, CustomHandRecord>(local.map(r => [r.key, r]));
  firestoreMap.forEach((rec, key) => merged.set(key, rec));

  await replaceCustomHandStyles([...merged.values()]);
}

async function pullFonts(uid: string): Promise<void> {
  const snap = await getDocs(labCol(uid, 'fonts'));
  if (snap.empty) return;

  const firestoreMap = new Map<string, SerializableCustomFontRecord>();
  snap.forEach(d => firestoreMap.set(d.id, d.data() as SerializableCustomFontRecord));

  const local = await loadCustomFonts();
  const localSerialized = serializeCustomFonts(local);
  const merged = new Map<string, SerializableCustomFontRecord>(
    localSerialized.map(r => [r.name, r]),
  );
  firestoreMap.forEach((rec, name) => merged.set(name, rec));

  const mergedDeserialized = deserializeCustomFonts([...merged.values()]);
  await replaceCustomFonts(mergedDeserialized);
  await registerCustomFonts();
}

async function pullGaugePointers(uid: string): Promise<void> {
  const snap = await getDocs(labCol(uid, 'gaugePointers'));
  if (snap.empty) return;

  const firestoreMap = new Map<string, CustomGaugePointerRecord>();
  snap.forEach(d => firestoreMap.set(d.id, d.data() as CustomGaugePointerRecord));

  const local = await loadCustomGaugePointers();
  const merged = new Map<string, CustomGaugePointerRecord>(local.map(r => [r.key, r]));
  firestoreMap.forEach((rec, key) => merged.set(key, rec));

  await replaceCustomGaugePointers([...merged.values()]);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Pull all lab assets from Firestore and upsert into local IDB.
 * Never clears IDB — local-only assets are preserved.
 * Silently skips if user is not signed in or on any Firestore error.
 */
export async function pullLabAssetsFromFirestore(): Promise<void> {
  const uid = getUid();
  if (!uid) return;

  try {
    await Promise.all([
      pullIcons(uid),
      pullHands(uid),
      pullFonts(uid),
      pullGaugePointers(uid),
    ]);
  } catch (err) {
    console.warn('[firestoreLabSync] pull failed — continuing with local IDB:', err);
  }
}

/**
 * Push a single lab asset record to Firestore.
 * Fire-and-forget — never blocks the IDB save. Logs on failure.
 */
export async function pushLabAssetToFirestore(
  type: LabAssetType,
  record: LabRecord,
): Promise<void> {
  const uid = getUid();
  if (!uid) return;

  try {
    let docId: string;
    let data: Record<string, unknown>;

    if (type === 'fonts') {
      const font = record as CustomFontRecord;
      docId = font.name;
      const [serialized] = serializeCustomFonts([font]);
      data = serialized as unknown as Record<string, unknown>;
    } else if (type === 'gaugePointers') {
      const gp = record as CustomGaugePointerRecord;
      docId = gp.key;
      data = gp as unknown as Record<string, unknown>;
    } else {
      const keyed = record as CustomIconRecord | CustomHandRecord;
      docId = keyed.key;
      data = keyed as unknown as Record<string, unknown>;
    }

    await setDoc(labDocRef(uid, type, docId), data);
  } catch (err) {
    console.warn(`[firestoreLabSync] push ${type} failed:`, err);
  }
}

/**
 * Delete a single lab asset from Firestore.
 * Fire-and-forget. For fonts pass the font `name` as key.
 */
export async function deleteLabAssetFromFirestore(
  type: LabAssetType,
  key: string,
): Promise<void> {
  const uid = getUid();
  if (!uid) return;

  try {
    await deleteDoc(labDocRef(uid, type, key));
  } catch (err) {
    console.warn(`[firestoreLabSync] delete ${type}/${key} failed:`, err);
  }
}
