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
  downloadBlob,
  deleteStorageObject,
  dataUrlToBlob,
  blobToDataUrl,
  sha256Hex,
} from './firebaseStorageClient';

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
  bakedPath?: string;
  bakedDownloadURL?: string;
  bakedHash?: string;
  bakedVersion?: number;
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
          return {
            slotIndex: slot.slotIndex,
            label: slot.label,
            code: slot.code,
            min: slot.min,
            max: slot.max,
            dataUrl,
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
    const existingSnap = await getDocs(switcherCol(uid));
    let existingSlotMetas: SlotMeta[] = [];
    existingSnap.forEach(d => {
      if (d.id === def.id) {
        existingSlotMetas = (d.data() as SwitcherMeta).slots ?? [];
      }
    });
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
        };

        if (!slot.dataUrl) return slotMeta;

        const newHash = await sha256Hex(slot.dataUrl);
        if (existing?.bakedHash === newHash) return slotMeta; // unchanged

        const storagePath = `users/${uid}/imageSwitchers/${def.id}/slot_${slot.slotIndex}.png`;
        try {
          const pngBlob = dataUrlToBlob(slot.dataUrl);
          const { downloadURL } = await uploadBinaryBlob(storagePath, pngBlob, 'image/png');
          return {
            ...slotMeta,
            bakedPath: storagePath,
            bakedDownloadURL: downloadURL,
            bakedHash: newHash,
            bakedVersion: (slotMeta.bakedVersion ?? 0) + 1,
          };
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
      slots: updatedSlots,
      userProfile: def.userProfile,
      createdAt: def.createdAt,
      updatedAt: Date.now(),
    };

    await setDoc(switcherDocRef(uid, def.id), firestoreMeta);
  } catch (err) {
    console.warn('[imageSwitcherSync] push failed:', err);
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

/**
 * Delete a switcher definition from Firestore and its Storage slot files.
 */
export async function deleteSwitcherFromCloud(id: string): Promise<void> {
  const uid = getUid();
  if (!uid) return;

  try {
    // Read slots to get storage paths
    const snap = await getDocs(switcherCol(uid));
    const storagePaths: string[] = [];
    snap.forEach(d => {
      if (d.id === id) {
        const meta = d.data() as SwitcherMeta;
        for (const slot of meta.slots) {
          if (slot.bakedPath) storagePaths.push(slot.bakedPath);
        }
      }
    });

    await Promise.allSettled(storagePaths.map(p => deleteStorageObject(p)));
    await deleteDoc(switcherDocRef(uid, id));
  } catch (err) {
    console.warn('[imageSwitcherSync] delete failed:', err);
  }
}
