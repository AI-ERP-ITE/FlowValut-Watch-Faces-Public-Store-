/**
 * firestoreLabSync.ts
 * Firestore-backed persistence for all lab assets (icons, hands, fonts, gaugePointers).
 * Spec 088 — Dual-layer storage: source + baked PNG in Firebase Storage; metadata only in Firestore.
 *
 * Contract:
 *  - Pull = UPSERT (Firestore metadata wins on sourceHash conflict, local-only records preserved)
 *  - Push = upload to Storage → setDoc(metadata) immediately on save (fire-and-forget, never blocks IDB)
 *  - Delete = deleteDoc + delete Storage objects
 *  - Auth not available → skip silently, IDB works standalone
 *  - Backward-compat: old docs with direct `dataUrl` field are detected and silently skipped
 *    (they will be re-pushed with Storage URLs on next explicit save from the user)
 *
 * Firestore schema (NO base64 fields anywhere):
 *  icons/{key}:          IconStorageMeta
 *  hands/{key}:          HandStorageMeta
 *  fonts/{name}:         FontStorageMeta
 *  gaugePointers/{key}:  GaugePointerStorageMeta
 */

import { getApp } from 'firebase/app';
import { getStorage, ref as storageRef, listAll, getDownloadURL } from 'firebase/storage';
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
import type { CustomIconRecord } from './customIconStore';
import type { CustomHandRecord } from './customHandStore';
import type { CustomFontRecord } from './customFontStore';
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
} from './customFontStore';
import type { CustomGaugePointerRecord } from './customGaugePointerStore';
import {
  loadCustomGaugePointers,
  replaceCustomGaugePointers,
} from './customGaugePointerStore';
import {
  uploadSourceText,
  uploadBinaryBlob,
  downloadBlob,
  downloadText,
  deleteStorageObject,
  dataUrlToBlob,
  blobToDataUrl,
  arrayBufferToBlob,
  sha256Hex,
} from './firebaseStorageClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export type LabAssetType = 'icons' | 'hands' | 'fonts' | 'gaugePointers';

export type LabRecord = CustomIconRecord | CustomHandRecord | CustomFontRecord | CustomGaugePointerRecord;

// ── Internal storage metadata interfaces ─────────────────────────────────────

interface IconStorageMeta {
  key: string;
  name: string;
  category: string;
  width: number;
  height: number;
  createdAt: number;
  updatedAt: number;
  sourceMode: 'svg' | 'html' | null;
  sourcePath: string;
  sourceURL: string;
  sourceHash: string;
  bakedPath: string;
  downloadURL: string;
  bakedVersion: number;
}

interface HandStorageMeta {
  key: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  handRenderVersion: number;
  pivotOffsets?: {
    hour: { x: number; y: number };
    minute: { x: number; y: number };
    second: { x: number; y: number };
  };
  // Pivot norm fields — SVG-viewBox-space (spec 109) + baked-PNG-space fallback.
  // All optional so old Firestore docs (without these fields) remain compatible.
  hourSvgPivotNorm?: number;
  minuteSvgPivotNorm?: number;
  secondSvgPivotNorm?: number;
  hourPivotNorm?: number;
  minutePivotNorm?: number;
  secondPivotNorm?: number;
  hourPosX?: number;
  hourPosY?: number;
  minutePosX?: number;
  minutePosY?: number;
  secondPosX?: number;
  secondPosY?: number;
  coverWidth?: number;
  coverHeight?: number;
  sourcePaths: { hour: string; minute: string; second: string; hub: string };
  sourceURLs: { hour: string; minute: string; second: string; hub: string };
  sourceHash: string;
  bakedPaths: { hour: string; minute: string; second: string; cover: string; swatch: string };
  downloadURLs: { hour: string; minute: string; second: string; cover: string; swatch: string };
  bakedVersion: number;
}

function isValidPivotOffsets(
  value: CustomHandRecord['pivotOffsets'] | undefined,
): value is NonNullable<CustomHandRecord['pivotOffsets']> {
  if (!value) return false;
  const hands: Array<'hour' | 'minute' | 'second'> = ['hour', 'minute', 'second'];
  return hands.every((hand) => {
    const point = value[hand];
    return !!point && Number.isFinite(point.x) && Number.isFinite(point.y);
  });
}

interface FontStorageMeta {
  name: string;
  fileName: string;
  createdAt: number;
  updatedAt: number;
  storagePath: string;
  downloadURL: string;
  fileHash: string;
}

interface GaugePointerStorageMeta {
  key: string;
  name: string;
  pivotX: number;
  pivotY: number;
  createdAt: number;
  updatedAt: number;
  sourcePath: string;
  sourceURL: string;
  sourceHash: string;
  bakedPath: string;
  downloadURL: string;
  bakedVersion: number;
}

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
  // 3 segments = ODD ✅ valid Firestore collection reference
  return collection(getDb(), 'users', uid, type);
}

function labDocRef(uid: string, type: LabAssetType, docId: string) {
  // 4 segments = EVEN ✅ valid Firestore document reference
  // encodeURIComponent so icon keys containing '/' (forbidden in Firestore IDs) are safe
  return doc(getDb(), 'users', uid, type, encodeURIComponent(docId));
}

// ── ICONS ─────────────────────────────────────────────────────────────────────

async function pushIcon(uid: string, record: CustomIconRecord): Promise<void> {
  const sourceContent = record.sourceCode ?? '';
  const newHash = await sha256Hex(sourceContent || record.dataUrl);

  const sourceExt = record.sourceMode === 'svg' ? 'svg' : 'html';
  const sourcePath = `users/${uid}/labAssets/icons/${record.key}/source.${sourceExt}`;
  const bakedPath  = `users/${uid}/labAssets/icons/${record.key}/baked_${record.width}x${record.height}.png`;

  // Read existing doc to check hash and grab existing URLs
  let existingHash: string | null = null;
  let bakedVersion = 0;
  let existingSourceURL = '';
  let existingDownloadURL = '';
  try {
    const snap = await getDocs(labCol(uid, 'icons'));
    snap.forEach(d => {
      if (decodeURIComponent(d.id) === record.key) {
        const data = d.data() as Partial<IconStorageMeta>;
        existingHash       = data.sourceHash ?? null;
        bakedVersion       = data.bakedVersion ?? 0;
        existingSourceURL  = data.sourceURL ?? '';
        existingDownloadURL = data.downloadURL ?? '';
      }
    });
  } catch { /* ignore — treat as first upload */ }

  const needsRebake = existingHash !== newHash;
  let sourceURL  = existingSourceURL;
  let downloadURL = existingDownloadURL;

  if (needsRebake) {
    if (sourceContent.trim()) {
      ({ downloadURL: sourceURL } = await uploadSourceText(sourcePath, sourceContent));
    }
    const pngBlob = dataUrlToBlob(record.dataUrl);
    ({ downloadURL } = await uploadBinaryBlob(bakedPath, pngBlob, 'image/png'));
    bakedVersion++;
  }

  const meta: IconStorageMeta = {
    key: record.key,
    name: record.name,
    category: record.category,
    width: record.width,
    height: record.height,
    createdAt: record.createdAt,
    updatedAt: Date.now(),
    sourceMode: record.sourceMode ?? null,
    sourcePath,
    sourceURL,
    sourceHash: newHash,
    bakedPath,
    downloadURL,
    bakedVersion,
  };

  await setDoc(labDocRef(uid, 'icons', record.key), meta);
}

async function pullIcons(uid: string): Promise<void> {
  const snap = await getDocs(labCol(uid, 'icons'));
  if (snap.empty) return;

  const local = await loadCustomIcons();
  const localMap = new Map<string, CustomIconRecord>(local.map(r => [r.key, r]));

  for (const d of snap.docs) {
    const data = d.data();

    if (data.downloadURL) {
      // New format: fetch PNG from Firebase Storage
      const meta = data as IconStorageMeta;
      const existing = localMap.get(meta.key);
      if (existing && (existing as CustomIconRecord & { sourceHash?: string }).sourceHash === meta.sourceHash) {
        continue;
      }
      try {
        const pngBlob = await downloadBlob(meta.downloadURL);
        const dataUrl = await blobToDataUrl(pngBlob);
        let sourceCode: string | undefined;
        if (meta.sourceURL) {
          sourceCode = await downloadText(meta.sourceURL).catch(() => undefined);
        }
        localMap.set(meta.key, {
          key: meta.key,
          name: meta.name,
          category: meta.category,
          dataUrl,
          width: meta.width,
          height: meta.height,
          createdAt: meta.createdAt,
          sourceMode: meta.sourceMode ?? undefined,
          sourceCode,
          sourceVersion: meta.bakedVersion,
          sourceHash: meta.sourceHash,
        });
      } catch (err) {
        console.warn(`[firestoreLabSync] pull icon ${meta.key} failed:`, err);
      }
    } else if (data.dataUrl && typeof data.dataUrl === 'string') {
      // Old format: dataUrl stored directly in Firestore doc — restore to IDB
      const key = (data.key as string) || d.id;
      if (localMap.has(key)) continue; // prefer existing local copy
      localMap.set(key, {
        key,
        name:     (data.name     as string) || key,
        category: (data.category as string) || 'system',
        dataUrl:  data.dataUrl   as string,
        width:    (data.width    as number) || 48,
        height:   (data.height   as number) || 48,
        createdAt:(data.createdAt as number) || Date.now(),
      });
    }
  }

  await replaceCustomIcons([...localMap.values()]);
}

// ── GAUGE POINTERS ────────────────────────────────────────────────────────────

async function pushGaugePointer(uid: string, record: CustomGaugePointerRecord): Promise<void> {
  const sourceContent = record.sourceHtml ?? '';
  const newHash = await sha256Hex(sourceContent || record.dataUrl);

  const sourcePath = `users/${uid}/labAssets/gaugePointers/${record.key}/source.html`;
  const bakedPath  = `users/${uid}/labAssets/gaugePointers/${record.key}/baked.png`;

  let existingHash: string | null = null;
  let bakedVersion = 0;
  let existingSourceURL = '';
  let existingDownloadURL = '';
  try {
    const snap = await getDocs(labCol(uid, 'gaugePointers'));
    snap.forEach(d => {
      if (decodeURIComponent(d.id) === record.key) {
        const data = d.data() as Partial<GaugePointerStorageMeta>;
        existingHash        = data.sourceHash ?? null;
        bakedVersion        = data.bakedVersion ?? 0;
        existingSourceURL   = data.sourceURL ?? '';
        existingDownloadURL = data.downloadURL ?? '';
      }
    });
  } catch { /* ignore */ }

  const needsRebake = existingHash !== newHash;
  let sourceURL   = existingSourceURL;
  let downloadURL  = existingDownloadURL;

  if (needsRebake) {
    if (sourceContent.trim()) {
      ({ downloadURL: sourceURL } = await uploadSourceText(sourcePath, sourceContent));
    }
    const pngBlob = dataUrlToBlob(record.dataUrl);
    ({ downloadURL } = await uploadBinaryBlob(bakedPath, pngBlob, 'image/png'));
    bakedVersion++;
  }

  const meta: GaugePointerStorageMeta = {
    key: record.key,
    name: record.name,
    pivotX: record.pivotX,
    pivotY: record.pivotY,
    createdAt: record.createdAt,
    updatedAt: Date.now(),
    sourcePath,
    sourceURL,
    sourceHash: newHash,
    bakedPath,
    downloadURL,
    bakedVersion,
  };

  await setDoc(labDocRef(uid, 'gaugePointers', record.key), meta);
}

async function syncGaugePointersFromStorage(
  uid: string,
  firestoreKeys: Set<string>,
  localMap: Map<string, CustomGaugePointerRecord>,
): Promise<void> {
  const storage = getStorage(getApp());
  const basePath = `users/${uid}/labAssets/gaugePointers`;
  let list;
  try {
    list = await listAll(storageRef(storage, basePath));
  } catch { return; }

  for (const folderRef of list.prefixes) {
    const key = decodeURIComponent(folderRef.name);
    if (firestoreKeys.has(key) || localMap.has(key)) continue;
    try {
      const bakedURL = await getDownloadURL(storageRef(storage, `${basePath}/${folderRef.name}/baked.png`));
      const srcURL   = await getDownloadURL(storageRef(storage, `${basePath}/${folderRef.name}/source.html`)).catch(() => '');
      const pngBlob  = await downloadBlob(bakedURL);
      const dataUrl  = await blobToDataUrl(pngBlob);
      const sourceHtml = srcURL ? await downloadText(srcURL).catch(() => '') : '';
      const now = Date.now();
      const newHash = await sha256Hex(sourceHtml || dataUrl);
      const meta: GaugePointerStorageMeta = {
        key, name: key, pivotX: 0, pivotY: 0,
        createdAt: now, updatedAt: now,
        sourcePath: `${basePath}/${folderRef.name}/source.html`,
        sourceURL: srcURL, sourceHash: newHash,
        bakedPath: `${basePath}/${folderRef.name}/baked.png`,
        downloadURL: bakedURL, bakedVersion: 1,
      };
      try { await setDoc(labDocRef(uid, 'gaugePointers', key), meta); } catch { /* ignore */ }
      localMap.set(key, { key, name: key, sourceHtml, dataUrl, pivotX: 0, pivotY: 0, createdAt: now, sourceHash: newHash });
    } catch (err) {
      console.warn(`[firestoreLabSync] Storage→Firestore sync gaugePointer ${key} failed:`, err);
    }
  }
}

async function pullGaugePointers(uid: string): Promise<void> {
  const snap = await getDocs(labCol(uid, 'gaugePointers'));
  const local = await loadCustomGaugePointers();
  const localMap = new Map<string, CustomGaugePointerRecord>(local.map(r => [r.key, r]));
  const firestoreKeys = new Set<string>();

  for (const d of snap.docs) {
    const data = d.data();

    if (data.downloadURL) {
      // New format: fetch PNG from Firebase Storage
      const meta = data as GaugePointerStorageMeta;
      firestoreKeys.add(meta.key);
      const existing = localMap.get(meta.key);
      if (existing && (existing as CustomGaugePointerRecord & { sourceHash?: string }).sourceHash === meta.sourceHash) {
        continue;
      }
      try {
        const pngBlob = await downloadBlob(meta.downloadURL);
        const dataUrl = await blobToDataUrl(pngBlob);
        let sourceHtml = '';
        if (meta.sourceURL) {
          sourceHtml = await downloadText(meta.sourceURL).catch(() => '');
        }
        localMap.set(meta.key, {
          key: meta.key,
          name: meta.name,
          sourceHtml,
          dataUrl,
          pivotX: meta.pivotX,
          pivotY: meta.pivotY,
          createdAt: meta.createdAt,
          sourceHash: meta.sourceHash,
        });
      } catch (err) {
        console.warn(`[firestoreLabSync] pull gaugePointer ${meta.key} failed:`, err);
      }
    } else if (data.dataUrl && typeof data.dataUrl === 'string') {
      // Old format: dataUrl stored directly in Firestore doc — restore to IDB
      const key = (data.key as string) || d.id;
      firestoreKeys.add(key);
      if (localMap.has(key)) continue;
      localMap.set(key, {
        key,
        name:      (data.name      as string) || key,
        sourceHtml: '',
        dataUrl:   data.dataUrl    as string,
        pivotX:    (data.pivotX    as number) || 0,
        pivotY:    (data.pivotY    as number) || 0,
        createdAt: (data.createdAt as number) || Date.now(),
      });
    }
  }

  // Diff: sync any Storage items not yet tracked in Firestore
  await syncGaugePointersFromStorage(uid, firestoreKeys, localMap);
  await replaceCustomGaugePointers([...localMap.values()]);
}

// ── HANDS ─────────────────────────────────────────────────────────────────────

async function syncHandsFromStorage(
  uid: string,
  firestoreKeys: Set<string>,
  localMap: Map<string, CustomHandRecord>,
): Promise<void> {
  const storage = getStorage(getApp());
  const basePath = `users/${uid}/labAssets/hands`;
  let list;
  try {
    list = await listAll(storageRef(storage, basePath));
  } catch { return; }

  for (const folderRef of list.prefixes) {
    const key = decodeURIComponent(folderRef.name);
    if (firestoreKeys.has(key) || localMap.has(key)) continue;
    try {
      const fn = folderRef.name;
      const [hourURL, minuteURL, secondURL, coverURL, swatchURL] = await Promise.all([
        getDownloadURL(storageRef(storage, `${basePath}/${fn}/baked_hour.png`)),
        getDownloadURL(storageRef(storage, `${basePath}/${fn}/baked_minute.png`)),
        getDownloadURL(storageRef(storage, `${basePath}/${fn}/baked_second.png`)),
        getDownloadURL(storageRef(storage, `${basePath}/${fn}/baked_cover.png`)),
        getDownloadURL(storageRef(storage, `${basePath}/${fn}/baked_swatch.png`)),
      ]);
      const [srcHrURL, srcMinURL, srcSecURL, srcHubURL] = await Promise.all([
        getDownloadURL(storageRef(storage, `${basePath}/${fn}/source_hour.html`)).catch(() => ''),
        getDownloadURL(storageRef(storage, `${basePath}/${fn}/source_minute.html`)).catch(() => ''),
        getDownloadURL(storageRef(storage, `${basePath}/${fn}/source_second.html`)).catch(() => ''),
        getDownloadURL(storageRef(storage, `${basePath}/${fn}/source_hub.html`)).catch(() => ''),
      ]);
      const [hourBlob, minuteBlob, secondBlob, coverBlob, swatchBlob] = await Promise.all([
        downloadBlob(hourURL), downloadBlob(minuteURL), downloadBlob(secondURL),
        downloadBlob(coverURL), downloadBlob(swatchURL),
      ]);
      const [hourDataUrl, minuteDataUrl, secondDataUrl, coverDataUrl, swatchDataUrl] = await Promise.all([
        blobToDataUrl(hourBlob), blobToDataUrl(minuteBlob), blobToDataUrl(secondBlob),
        blobToDataUrl(coverBlob), blobToDataUrl(swatchBlob),
      ]);
      const [sourceHourHtml, sourceMinuteHtml, sourceSecondHtml, sourceHubHtml] = await Promise.all([
        srcHrURL  ? downloadText(srcHrURL).catch(() => '')  : Promise.resolve(''),
        srcMinURL ? downloadText(srcMinURL).catch(() => '') : Promise.resolve(''),
        srcSecURL ? downloadText(srcSecURL).catch(() => '') : Promise.resolve(''),
        srcHubURL ? downloadText(srcHubURL).catch(() => '') : Promise.resolve(''),
      ]);
      const now = Date.now();
      const newHash = await sha256Hex(
        (sourceHourHtml + sourceMinuteHtml + sourceSecondHtml + sourceHubHtml) || hourDataUrl
      );
      const meta: HandStorageMeta = {
        key, name: key, createdAt: now, updatedAt: now, handRenderVersion: 4,
        sourcePaths: {
          hour:   `${basePath}/${fn}/source_hour.html`,
          minute: `${basePath}/${fn}/source_minute.html`,
          second: `${basePath}/${fn}/source_second.html`,
          hub:    `${basePath}/${fn}/source_hub.html`,
        },
        sourceURLs: { hour: srcHrURL, minute: srcMinURL, second: srcSecURL, hub: srcHubURL },
        sourceHash: newHash,
        bakedPaths: {
          hour:   `${basePath}/${fn}/baked_hour.png`,
          minute: `${basePath}/${fn}/baked_minute.png`,
          second: `${basePath}/${fn}/baked_second.png`,
          cover:  `${basePath}/${fn}/baked_cover.png`,
          swatch: `${basePath}/${fn}/baked_swatch.png`,
        },
        downloadURLs: { hour: hourURL, minute: minuteURL, second: secondURL, cover: coverURL, swatch: swatchURL },
        bakedVersion: 1,
      };
      try { await setDoc(labDocRef(uid, 'hands', key), meta); } catch { /* ignore */ }
      localMap.set(key, {
        key, name: key,
        hourDataUrl, minuteDataUrl, secondDataUrl, coverDataUrl, swatchDataUrl,
        sourceHourHtml, sourceMinuteHtml, sourceSecondHtml, sourceHubHtml,
        handRenderVersion: 4, sourceHash: newHash, createdAt: now,
      });
    } catch (err) {
      console.warn(`[firestoreLabSync] Storage→Firestore sync hand ${key} failed:`, err);
    }
  }
}

async function pullHands(uid: string): Promise<void> {
  const snap = await getDocs(labCol(uid, 'hands'));
  const local = await loadCustomHandStyles();
  const localMap = new Map<string, CustomHandRecord>(local.map(r => [r.key, r]));
  const firestoreKeys = new Set<string>();

  for (const d of snap.docs) {
    const meta = d.data() as HandStorageMeta;
    firestoreKeys.add(meta.key ?? decodeURIComponent(d.id));
    if (!meta.downloadURLs?.hour) continue; // no baked PNGs yet

    const existing = localMap.get(meta.key);
    if (existing && existing.sourceHash === meta.sourceHash) continue; // up to date

    try {
      const [hourBlob, minuteBlob, secondBlob, coverBlob, swatchBlob] = await Promise.all([
        downloadBlob(meta.downloadURLs.hour),
        downloadBlob(meta.downloadURLs.minute),
        downloadBlob(meta.downloadURLs.second),
        downloadBlob(meta.downloadURLs.cover),
        downloadBlob(meta.downloadURLs.swatch),
      ]);
      const [hourDataUrl, minuteDataUrl, secondDataUrl, coverDataUrl, swatchDataUrl] = await Promise.all([
        blobToDataUrl(hourBlob),
        blobToDataUrl(minuteBlob),
        blobToDataUrl(secondBlob),
        blobToDataUrl(coverBlob),
        blobToDataUrl(swatchBlob),
      ]);
      const [sourceHourHtml, sourceMinuteHtml, sourceSecondHtml, sourceHubHtml] = await Promise.all([
        meta.sourceURLs?.hour   ? downloadText(meta.sourceURLs.hour).catch(() => '')   : Promise.resolve(''),
        meta.sourceURLs?.minute ? downloadText(meta.sourceURLs.minute).catch(() => '') : Promise.resolve(''),
        meta.sourceURLs?.second ? downloadText(meta.sourceURLs.second).catch(() => '') : Promise.resolve(''),
        meta.sourceURLs?.hub    ? downloadText(meta.sourceURLs.hub).catch(() => '')    : Promise.resolve(''),
      ]);
      localMap.set(meta.key, {
        key: meta.key,
        name: meta.name,
        hourDataUrl,
        minuteDataUrl,
        secondDataUrl,
        coverDataUrl,
        swatchDataUrl,
        sourceHourHtml,
        sourceMinuteHtml,
        sourceSecondHtml,
        sourceHubHtml,
        handRenderVersion: meta.handRenderVersion,
        pivotOffsets: meta.pivotOffsets,
        // Restore all pivot norm fields so SVG-native render and tip/tail work after sync
        ...(meta.hourSvgPivotNorm !== undefined ? { hourSvgPivotNorm: meta.hourSvgPivotNorm } : {}),
        ...(meta.minuteSvgPivotNorm !== undefined ? { minuteSvgPivotNorm: meta.minuteSvgPivotNorm } : {}),
        ...(meta.secondSvgPivotNorm !== undefined ? { secondSvgPivotNorm: meta.secondSvgPivotNorm } : {}),
        ...(meta.hourPivotNorm !== undefined ? { hourPivotNorm: meta.hourPivotNorm } : {}),
        ...(meta.minutePivotNorm !== undefined ? { minutePivotNorm: meta.minutePivotNorm } : {}),
        ...(meta.secondPivotNorm !== undefined ? { secondPivotNorm: meta.secondPivotNorm } : {}),
        ...(meta.hourPosX !== undefined ? { hourPosX: meta.hourPosX } : {}),
        ...(meta.hourPosY !== undefined ? { hourPosY: meta.hourPosY } : {}),
        ...(meta.minutePosX !== undefined ? { minutePosX: meta.minutePosX } : {}),
        ...(meta.minutePosY !== undefined ? { minutePosY: meta.minutePosY } : {}),
        ...(meta.secondPosX !== undefined ? { secondPosX: meta.secondPosX } : {}),
        ...(meta.secondPosY !== undefined ? { secondPosY: meta.secondPosY } : {}),
        ...(meta.coverWidth !== undefined ? { coverWidth: meta.coverWidth } : {}),
        ...(meta.coverHeight !== undefined ? { coverHeight: meta.coverHeight } : {}),
        sourceHash: meta.sourceHash,
        createdAt: meta.createdAt,
      });
    } catch (err) {
      console.warn(`[firestoreLabSync] pull hand ${meta.key} failed:`, err);
    }
  }

  // Diff: sync any Storage items not yet tracked in Firestore
  await syncHandsFromStorage(uid, firestoreKeys, localMap);
  await replaceCustomHandStyles([...localMap.values()]);
}

async function pushHand(uid: string, record: CustomHandRecord): Promise<void> {
  const sourceHour   = record.sourceHourHtml   ?? '';
  const sourceMinute = record.sourceMinuteHtml ?? '';
  const sourceSecond = record.sourceSecondHtml ?? '';
  const sourceHub    = record.sourceHubHtml    ?? '';

  const combinedSource = sourceHour + sourceMinute + sourceSecond + sourceHub;
  const newHash = await sha256Hex(combinedSource || record.hourDataUrl);

  const base = `users/${uid}/labAssets/hands/${record.key}`;

  let existingHash: string | null = null;
  let bakedVersion = 0;
  let existingSourceURLs = { hour: '', minute: '', second: '', hub: '' };
  let existingDownloadURLs = { hour: '', minute: '', second: '', cover: '', swatch: '' };

  try {
    const snap = await getDocs(labCol(uid, 'hands'));
    snap.forEach(d => {
      if (decodeURIComponent(d.id) === record.key) {
        const data = d.data() as Partial<HandStorageMeta>;
        existingHash         = data.sourceHash ?? null;
        bakedVersion         = data.bakedVersion ?? 0;
        existingSourceURLs   = data.sourceURLs ?? existingSourceURLs;
        existingDownloadURLs = data.downloadURLs ?? existingDownloadURLs;
      }
    });
  } catch { /* ignore */ }

  const needsRebake = existingHash !== newHash;
  let sourceURLs   = existingSourceURLs;
  let downloadURLs  = existingDownloadURLs;

  if (needsRebake) {
    const sourceUploads = await Promise.all([
      sourceHour.trim()   ? uploadSourceText(`${base}/source_hour.html`,   sourceHour)   : Promise.resolve({ storagePath: '', downloadURL: '' }),
      sourceMinute.trim() ? uploadSourceText(`${base}/source_minute.html`, sourceMinute) : Promise.resolve({ storagePath: '', downloadURL: '' }),
      sourceSecond.trim() ? uploadSourceText(`${base}/source_second.html`, sourceSecond) : Promise.resolve({ storagePath: '', downloadURL: '' }),
      sourceHub.trim()    ? uploadSourceText(`${base}/source_hub.html`,    sourceHub)    : Promise.resolve({ storagePath: '', downloadURL: '' }),
    ]);
    sourceURLs = {
      hour:   sourceUploads[0].downloadURL,
      minute: sourceUploads[1].downloadURL,
      second: sourceUploads[2].downloadURL,
      hub:    sourceUploads[3].downloadURL,
    };

    const bakedUploads = await Promise.all([
      uploadBinaryBlob(`${base}/baked_hour.png`,   dataUrlToBlob(record.hourDataUrl),   'image/png'),
      uploadBinaryBlob(`${base}/baked_minute.png`, dataUrlToBlob(record.minuteDataUrl), 'image/png'),
      uploadBinaryBlob(`${base}/baked_second.png`, dataUrlToBlob(record.secondDataUrl), 'image/png'),
      uploadBinaryBlob(`${base}/baked_cover.png`,  dataUrlToBlob(record.coverDataUrl),  'image/png'),
      uploadBinaryBlob(`${base}/baked_swatch.png`, dataUrlToBlob(record.swatchDataUrl), 'image/png'),
    ]);
    downloadURLs = {
      hour:   bakedUploads[0].downloadURL,
      minute: bakedUploads[1].downloadURL,
      second: bakedUploads[2].downloadURL,
      cover:  bakedUploads[3].downloadURL,
      swatch: bakedUploads[4].downloadURL,
    };
    bakedVersion++;
  }

  const meta: HandStorageMeta = {
    key: record.key,
    name: record.name,
    createdAt: record.createdAt,
    updatedAt: Date.now(),
    handRenderVersion: record.handRenderVersion ?? 4,
    sourcePaths: {
      hour:   `${base}/source_hour.html`,
      minute: `${base}/source_minute.html`,
      second: `${base}/source_second.html`,
      hub:    `${base}/source_hub.html`,
    },
    sourceURLs,
    sourceHash: newHash,
    bakedPaths: {
      hour:   `${base}/baked_hour.png`,
      minute: `${base}/baked_minute.png`,
      second: `${base}/baked_second.png`,
      cover:  `${base}/baked_cover.png`,
      swatch: `${base}/baked_swatch.png`,
    },
    downloadURLs,
    bakedVersion,
    ...(isValidPivotOffsets(record.pivotOffsets) ? { pivotOffsets: record.pivotOffsets } : {}),
    // Persist all pivot norm fields so they survive cloud sync
    ...(record.hourSvgPivotNorm !== undefined ? { hourSvgPivotNorm: record.hourSvgPivotNorm } : {}),
    ...(record.minuteSvgPivotNorm !== undefined ? { minuteSvgPivotNorm: record.minuteSvgPivotNorm } : {}),
    ...(record.secondSvgPivotNorm !== undefined ? { secondSvgPivotNorm: record.secondSvgPivotNorm } : {}),
    ...(record.hourPivotNorm !== undefined ? { hourPivotNorm: record.hourPivotNorm } : {}),
    ...(record.minutePivotNorm !== undefined ? { minutePivotNorm: record.minutePivotNorm } : {}),
    ...(record.secondPivotNorm !== undefined ? { secondPivotNorm: record.secondPivotNorm } : {}),
    ...(record.hourPosX !== undefined ? { hourPosX: record.hourPosX } : {}),
    ...(record.hourPosY !== undefined ? { hourPosY: record.hourPosY } : {}),
    ...(record.minutePosX !== undefined ? { minutePosX: record.minutePosX } : {}),
    ...(record.minutePosY !== undefined ? { minutePosY: record.minutePosY } : {}),
    ...(record.secondPosX !== undefined ? { secondPosX: record.secondPosX } : {}),
    ...(record.secondPosY !== undefined ? { secondPosY: record.secondPosY } : {}),
    ...(record.coverWidth !== undefined ? { coverWidth: record.coverWidth } : {}),
    ...(record.coverHeight !== undefined ? { coverHeight: record.coverHeight } : {}),
  };

  await setDoc(labDocRef(uid, 'hands', record.key), meta);
}

// ── FONTS ─────────────────────────────────────────────────────────────────────

async function pushFont(uid: string, record: CustomFontRecord): Promise<void> {
  const newHash = await sha256Hex(record.buffer);
  const storagePath = `users/${uid}/labAssets/fonts/${encodeURIComponent(record.name)}/font.bin`;

  let existingHash: string | null = null;
  let existingDownloadURL = '';
  try {
    const snap = await getDocs(labCol(uid, 'fonts'));
    snap.forEach(d => {
      if (decodeURIComponent(d.id) === record.name) {
        const data = d.data() as Partial<FontStorageMeta>;
        existingHash        = data.fileHash ?? null;
        existingDownloadURL = data.downloadURL ?? '';
      }
    });
  } catch { /* ignore */ }

  let downloadURL = existingDownloadURL;
  if (existingHash !== newHash) {
    const fontBlob = arrayBufferToBlob(record.buffer, 'font/ttf');
    ({ downloadURL } = await uploadBinaryBlob(storagePath, fontBlob, 'font/ttf'));
  }

  const meta: FontStorageMeta = {
    name: record.name,
    fileName: record.fileName,
    createdAt: record.createdAt,
    updatedAt: Date.now(),
    storagePath,
    downloadURL,
    fileHash: newHash,
  };

  await setDoc(labDocRef(uid, 'fonts', record.name), meta);
}

async function pullFonts(uid: string): Promise<void> {
  const snap = await getDocs(labCol(uid, 'fonts'));
  if (snap.empty) return;

  const local = await loadCustomFonts();
  const localMap = new Map<string, CustomFontRecord>(local.map(r => [r.name, r]));

  for (const d of snap.docs) {
    const data = d.data();

    if (data.downloadURL) {
      // New format: fetch font binary from Firebase Storage
      const meta = data as FontStorageMeta;
      const existing = localMap.get(meta.name);
      if (existing && (existing as CustomFontRecord & { fileHash?: string }).fileHash === meta.fileHash) {
        continue;
      }
      try {
        const fontBlob = await downloadBlob(meta.downloadURL);
        const buffer   = await fontBlob.arrayBuffer();
        localMap.set(meta.name, {
          name: meta.name,
          fileName: meta.fileName,
          buffer,
          createdAt: meta.createdAt,
          fileHash: meta.fileHash,
        });
      } catch (err) {
        console.warn(`[firestoreLabSync] pull font ${meta.name} failed:`, err);
      }
    } else if (data.bufferBase64 && typeof data.bufferBase64 === 'string') {
      // Old format: base64-encoded buffer stored in Firestore doc — restore to IDB
      const name = (data.name as string) || d.id;
      if (localMap.has(name)) continue;
      try {
        const binary = atob(data.bufferBase64 as string);
        const buf = new ArrayBuffer(binary.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
        localMap.set(name, {
          name,
          fileName: (data.fileName as string) || name,
          buffer: buf,
          createdAt: (data.createdAt as number) || Date.now(),
        });
      } catch (err) {
        console.warn(`[firestoreLabSync] decode old-format font ${name} failed:`, err);
      }
    }
    // else: no usable data, skip
  }

  await replaceCustomFonts([...localMap.values()]);
  await registerCustomFonts();
}

// ── Public API — Pull all ─────────────────────────────────────────────────────

/**
 * Pull all lab assets from Firestore/Storage and upsert into local IDB.
 * Never clears IDB — local-only assets are preserved.
 * Silently skips if user is not signed in or on any error.
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

// ── Public API — Push single asset ───────────────────────────────────────────

/**
 * Push a single lab asset record to Storage + Firestore.
 * Fire-and-forget — never blocks the IDB save. Logs on failure.
 */
export async function pushLabAssetToFirestore(
  type: LabAssetType,
  record: LabRecord,
): Promise<void> {
  const uid = getUid();
  if (!uid) return;

  try {
    if (type === 'icons') {
      await pushIcon(uid, record as CustomIconRecord);
    } else if (type === 'gaugePointers') {
      await pushGaugePointer(uid, record as CustomGaugePointerRecord);
    } else if (type === 'hands') {
      await pushHand(uid, record as CustomHandRecord);
    } else if (type === 'fonts') {
      await pushFont(uid, record as CustomFontRecord);
    }
  } catch (err) {
    console.warn(`[firestoreLabSync] push ${type} failed:`, err);
  }
}

// ── Public API — Backfill icons ───────────────────────────────────────────────

/**
 * Push every IDB icon that is not yet in Firestore/Storage.
 * Called once on login to retroactively sync icons that were saved before
 * the storage.rules fix (icon keys contain '/' which broke the old rule).
 * Fire-and-forget — never throws; logs progress to console.
 */
export async function backfillIconsToFirestore(): Promise<void> {
  const uid = getUid();
  if (!uid) return;

  try {
    const [idbIcons, snap] = await Promise.all([
      loadCustomIcons(),
      getDocs(labCol(uid, 'icons')),
    ]);
    if (idbIcons.length === 0) return;

    const cloudKeys = new Set(snap.docs.map(d => decodeURIComponent(d.id)));
    const missing = idbIcons.filter(r => !cloudKeys.has(r.key));
    if (missing.length === 0) return;

    console.info(`[firestoreLabSync] backfilling ${missing.length} icon(s) to Storage+Firestore…`);
    for (const icon of missing) {
      try {
        await pushIcon(uid, icon);
        console.info(`[firestoreLabSync] backfilled icon: ${icon.key}`);
      } catch (err) {
        console.warn(`[firestoreLabSync] backfill icon ${icon.key} failed:`, err);
      }
    }
    console.info('[firestoreLabSync] icon backfill complete.');
  } catch (err) {
    console.warn('[firestoreLabSync] icon backfill failed:', err);
  }
}

export async function backfillGaugePointersToFirestore(): Promise<void> {
  const uid = getUid();
  if (!uid) return;
  try {
    const [idbPointers, snap] = await Promise.all([
      loadCustomGaugePointers(),
      getDocs(labCol(uid, 'gaugePointers')),
    ]);
    if (idbPointers.length === 0) return;
    const cloudKeys = new Set(snap.docs.map(d => decodeURIComponent(d.id)));
    const missing = idbPointers.filter(r => !cloudKeys.has(r.key));
    if (missing.length === 0) return;
    console.info(`[firestoreLabSync] backfilling ${missing.length} gauge pointer(s) to Storage+Firestore…`);
    for (const gp of missing) {
      try { await pushGaugePointer(uid, gp); } catch (err) {
        console.warn(`[firestoreLabSync] backfill gaugePointer ${gp.key} failed:`, err);
      }
    }
  } catch (err) {
    console.warn('[firestoreLabSync] gauge pointer backfill failed:', err);
  }
}

export async function backfillHandsToFirestore(): Promise<void> {
  const uid = getUid();
  if (!uid) return;
  try {
    const [idbHands, snap] = await Promise.all([
      loadCustomHandStyles(),
      getDocs(labCol(uid, 'hands')),
    ]);
    if (idbHands.length === 0) return;
    const cloudKeys = new Set(snap.docs.map(d => decodeURIComponent(d.id)));
    const missing = idbHands.filter(r => !cloudKeys.has(r.key));
    if (missing.length === 0) return;
    console.info(`[firestoreLabSync] backfilling ${missing.length} hand(s) to Storage+Firestore…`);
    for (const hand of missing) {
      try { await pushHand(uid, hand); } catch (err) {
        console.warn(`[firestoreLabSync] backfill hand ${hand.key} failed:`, err);
      }
    }
  } catch (err) {
    console.warn('[firestoreLabSync] hand backfill failed:', err);
  }
}

// ── Public API — Delete single asset ─────────────────────────────────────────

/**
 * Delete a single lab asset from Firestore and its Storage files.
 * Fire-and-forget. For fonts pass the font `name` as key.
 */
export async function deleteLabAssetFromFirestore(
  type: LabAssetType,
  key: string,
): Promise<void> {
  const uid = getUid();
  if (!uid) return;

  try {
    const base = `users/${uid}/labAssets/${type}/${key}`;

    // Build deterministic paths first — these are known from the key alone and don't
    // require a Firestore read. deleteStorageObject() silently ignores missing files,
    // so it's safe to over-include. This also fixes the race condition where a
    // fire-and-forget push hasn't finished writing the Firestore doc yet when
    // delete runs, leaving Storage files permanently orphaned.
    const storagePaths: string[] = [];

    if (type === 'gaugePointers') {
      storagePaths.push(`${base}/source.html`, `${base}/baked.png`);
    } else if (type === 'hands') {
      storagePaths.push(
        `${base}/source_hour.html`, `${base}/source_minute.html`,
        `${base}/source_second.html`, `${base}/source_hub.html`,
        `${base}/baked_hour.png`, `${base}/baked_minute.png`,
        `${base}/baked_second.png`, `${base}/baked_cover.png`, `${base}/baked_swatch.png`,
      );
    } else if (type === 'icons') {
      // Source extension varies — try both; one will be a no-op.
      storagePaths.push(`${base}/source.svg`, `${base}/source.html`);
      // Baked PNG has dynamic dimensions; fall through to Firestore read below.
    }
    // fonts: path is user-named; must rely on Firestore doc (see below).

    // For types with dynamic/unknown paths (icon baked PNG, font file), read the
    // Firestore doc. Best-effort: if it doesn't exist yet the deterministic paths
    // above still cover the cleanup for gaugePointers and hands.
    try {
      const docSnap = await getDoc(labDocRef(uid, type, key));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (type === 'icons') {
          const m = data as Partial<IconStorageMeta>;
          if (m.bakedPath) storagePaths.push(m.bakedPath);
        } else if (type === 'fonts') {
          const m = data as Partial<FontStorageMeta>;
          if (m.storagePath) storagePaths.push(m.storagePath);
        }
      }
    } catch { /* doc may not exist yet — that's fine, use deterministic paths */ }

    // Delete all Storage objects (no-op if a path is already missing)
    await Promise.allSettled(storagePaths.map(p => deleteStorageObject(p)));

    // Delete Firestore doc
    await deleteDoc(labDocRef(uid, type, key));
  } catch (err) {
    console.warn(`[firestoreLabSync] delete ${type}/${key} failed:`, err);
  }
}

