/**
 * imageSwitcherSync.ts — Spec 088 Phase B
 * Firebase Storage + Firestore sync for ImageSwitcherDefinitions.
 *
 * Storage path: users/{uid}/imageSwitchers/{definitionId}/slot_{i}.png
 * Firestore:    users/{uid}/imageSwitchers/{definitionId}
 */

import { getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { getCurrentAuthUser } from './firebaseAuthClient';
import type { ImageSwitcherDefinition, RangeSlot } from '@/types/imageSwitcher';
import {
  saveSwitcherDefinition,
} from './imageSwitcherStore';
import {
  uploadBinaryBlob,
  uploadSourceText,
  downloadBlob,
  downloadText,
  deleteStorageObject,
  dataUrlToBlob,
  blobToDataUrl,
  sha256Hex,
} from './firebaseStorageClient';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Remove keys with undefined values — Firestore rejects undefined fields. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
}

// ── Firestore helpers ─────────────────────────────────────────────────────────

function getDb() {
  return getFirestore(getApp());
}

function getUid(): string | null {
  return getCurrentAuthUser()?.uid ?? null;
}

function switcherCol(uid: string) {
  return collection(getDb(), 'users', uid, 'imageSwitchers');
}

function switcherDocRef(uid: string, definitionId: string) {
  return doc(getDb(), 'users', uid, 'imageSwitchers', definitionId);
}

// ── Metadata interface (stored in Firestore, no base64) ───────────────────────

interface SlotMeta {
  slotIndex: number;
  label: string;
  code?: number;
  min?: number;
  max?: number;
  // Baked PNG (Spec 088)
  bakedPath?: string;
  bakedDownloadURL?: string;
  bakedHash?: string;
  bakedVersion?: number;
  // Source HTML (Spec 089) — uploaded as Storage file, refs only in Firestore
  sourcePath?: string;
  sourceURL?: string;
  sourceHash?: string;
}

interface SwitcherMeta {
  id: string;
  name: string;
  dataType: string;
  policyType: string;
  slotCount: number;
  slots: SlotMeta[];
  userProfile?: ImageSwitcherDefinition['userProfile'];
  createdAt: number;
  updatedAt: number;
}

// ── Pull all ──────────────────────────────────────────────────────────────────

/**
 * Pull all switcher definitions from Firestore/Storage and upsert local IDB.
 * Silently skips if not signed in.
 */
export async function pullSwitcherDefinitions(): Promise<void> {
  const uid = getUid();
  if (!uid) return;

  try {
    const snap = await getDocs(switcherCol(uid));
    if (snap.empty) return;

    for (const d of snap.docs) {
      const meta = d.data() as SwitcherMeta;

      // Build ranges with downloaded slot PNGs
      const ranges: RangeSlot[] = await Promise.all(
        meta.slots.map(async (slot): Promise<RangeSlot> => {
          let dataUrl: string | undefined;
          if (slot.bakedDownloadURL) {
            try {
              const blob = await downloadBlob(slot.bakedDownloadURL);
              dataUrl = await blobToDataUrl(blob);
            } catch {
              // non-critical — slot will render blank until re-uploaded
            }
          }
          // Spec 089 — hydrate source HTML if present
          let sourceHtml: string | undefined;
          if (slot.sourceURL) {
            try {
              sourceHtml = await downloadText(slot.sourceURL);
            } catch {
              // non-critical — user may re-paste source
            }
          }
          return {
            slotIndex: slot.slotIndex,
            label: slot.label,
            code: slot.code,
            min: slot.min,
            max: slot.max,
            dataUrl,
            sourceHtml,
            sourceHash: slot.sourceHash,
            baked: slot.bakedDownloadURL
              ? {
                  storagePath: slot.bakedPath ?? '',
                  downloadURL: slot.bakedDownloadURL,
                  fileHash: slot.bakedHash ?? '',
                  bakedVersion: slot.bakedVersion ?? 0,
                }
              : undefined,
          };
        }),
      );

      const def: ImageSwitcherDefinition = {
        id: meta.id,
        name: meta.name,
        dataType: meta.dataType,
        policyType: meta.policyType as ImageSwitcherDefinition['policyType'],
        slotCount: meta.slotCount,
        ranges,
        userProfile: meta.userProfile,
        createdAt: meta.createdAt,
        updatedAt: meta.updatedAt,
      };

      await saveSwitcherDefinition(def);
    }
  } catch (err) {
    console.warn('[imageSwitcherSync] pull failed:', err);
  }
}

// ── Push single definition ────────────────────────────────────────────────────

/**
 * Push a single switcher definition to Firestore + Storage.
 * Only uploads a slot PNG if its hash has changed.
 * Fire-and-forget safe.
 */
export async function pushSwitcherDefinition(def: ImageSwitcherDefinition): Promise<void> {
  const uid = getUid();
  if (!uid) return;

  try {
    // Read existing meta from Firestore to compare hashes
    const existingSnap = await getDoc(switcherDocRef(uid, def.id));
    let existingSlotMetas: SlotMeta[] = [];
    if (existingSnap.exists()) {
      existingSlotMetas = (existingSnap.data() as SwitcherMeta).slots ?? [];
    }
    const existingByIndex = new Map<number, SlotMeta>(
      existingSlotMetas.map(s => [s.slotIndex, s]),
    );

    const updatedSlots: SlotMeta[] = await Promise.all(
      def.ranges.map(async (slot): Promise<SlotMeta> => {
        const existing = existingByIndex.get(slot.slotIndex);
        const slotMeta: SlotMeta = {
          slotIndex: slot.slotIndex,
          label: slot.label,
          code: slot.code,
          min: slot.min,
          max: slot.max,
          bakedPath: existing?.bakedPath,
          bakedDownloadURL: existing?.bakedDownloadURL,
          bakedHash: existing?.bakedHash,
          bakedVersion: existing?.bakedVersion ?? 0,
          // Carry existing source refs forward; will be replaced below if HTML changed.
          sourcePath: existing?.sourcePath,
          sourceURL: existing?.sourceURL,
          sourceHash: existing?.sourceHash,
        };

        // Spec 089 — upload source HTML if present and changed (or never uploaded).
        if (slot.sourceHtml && slot.sourceHtml.trim()) {
          const newSourceHash = slot.sourceHash ?? (await sha256Hex(slot.sourceHtml));
          if (existing?.sourceHash !== newSourceHash) {
            const sourceStoragePath = `users/${uid}/imageSwitchers/${def.id}/slot_${slot.slotIndex}.html`;
            try {
              const { downloadURL } = await uploadSourceText(sourceStoragePath, slot.sourceHtml);
              slotMeta.sourcePath = sourceStoragePath;
              slotMeta.sourceURL = downloadURL;
              slotMeta.sourceHash = newSourceHash;
            } catch (err) {
              console.warn(`[imageSwitcherSync] upload source slot ${slot.slotIndex} failed:`, err);
            }
          }
        } else if (existing?.sourcePath && !slot.sourceHtml) {
          // Source HTML was cleared by user — drop the Storage file and refs.
          try { await deleteStorageObject(existing.sourcePath); } catch { /* best-effort */ }
          slotMeta.sourcePath = undefined;
          slotMeta.sourceURL = undefined;
          slotMeta.sourceHash = undefined;
        }

        if (!slot.dataUrl) return slotMeta;

        const newHash = await sha256Hex(slot.dataUrl);
        if (existing?.bakedHash === newHash) return slotMeta; // unchanged

        const storagePath = `users/${uid}/imageSwitchers/${def.id}/slot_${slot.slotIndex}.png`;
        try {
          const pngBlob = dataUrlToBlob(slot.dataUrl);
          const { downloadURL } = await uploadBinaryBlob(storagePath, pngBlob, 'image/png');
          slotMeta.bakedPath = storagePath;
          slotMeta.bakedDownloadURL = downloadURL;
          slotMeta.bakedHash = newHash;
          slotMeta.bakedVersion = (slotMeta.bakedVersion ?? 0) + 1;
          return slotMeta;
        } catch (err) {
          console.warn(`[imageSwitcherSync] upload slot ${slot.slotIndex} failed:`, err);
          return slotMeta;
        }
      }),
    );

    const firestoreMeta: SwitcherMeta = {
      id: def.id,
      name: def.name,
      dataType: def.dataType,
      policyType: def.policyType,
      slotCount: def.slotCount,
      slots: updatedSlots.map(s => stripUndefined(s as unknown as Record<string, unknown>) as unknown as SlotMeta),
      userProfile: def.userProfile,
      createdAt: def.createdAt,
      updatedAt: Date.now(),
    };

    await setDoc(switcherDocRef(uid, def.id), stripUndefined(firestoreMeta as unknown as Record<string, unknown>));
  } catch (err) {
    console.warn('[imageSwitcherSync] push failed:', err);
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

/**
 * Delete a switcher definition from Firestore and its Storage slot files.
 * Pass knownSlotCount (from IDB before it's deleted) to guarantee cleanup even
 * when the Firestore push hasn't completed yet (race condition fix).
 */
export async function deleteSwitcherFromCloud(id: string, knownSlotCount = 0): Promise<void> {
  const uid = getUid();
  if (!uid) return;

  try {
    const base = `users/${uid}/imageSwitchers/${id}`;

    // Build deterministic paths from knownSlotCount — these are guaranteed correct
    // regardless of whether the Firestore push has completed yet.
    const storagePaths: string[] = [];
    for (let i = 0; i < knownSlotCount; i++) {
      storagePaths.push(`${base}/slot_${i}.png`);
      storagePaths.push(`${base}/slot_${i}.html`);  // Spec 089 — also clear source HTML
    }

    // Also read the Firestore doc for any extra paths (e.g. if slot count grew
    // in a previous edit). Best-effort: no-op if doc doesn't exist.
    try {
      const docSnap = await getDoc(switcherDocRef(uid, id));
      if (docSnap.exists()) {
        const meta = docSnap.data() as SwitcherMeta;
        for (const slot of meta.slots) {
          if (slot.bakedPath && !storagePaths.includes(slot.bakedPath)) {
            storagePaths.push(slot.bakedPath);
          }
          if (slot.sourcePath && !storagePaths.includes(slot.sourcePath)) {
            storagePaths.push(slot.sourcePath);
          }
        }
      }
    } catch { /* doc may not exist yet — deterministic paths above cover it */ }

    await Promise.allSettled(storagePaths.map(p => deleteStorageObject(p)));
    await deleteDoc(switcherDocRef(uid, id));
  } catch (err) {
    console.warn('[imageSwitcherSync] delete failed:', err);
  }
}
