import { loadCustomIcons, replaceCustomIcons, type CustomIconRecord } from '@/lib/customIconStore';
import {
  deserializeCustomFonts,
  loadCustomFonts,
  replaceCustomFonts,
  serializeCustomFonts,
  registerCustomFonts,
  type SerializableCustomFontRecord,
} from '@/lib/customFontStore';
import { replaceCustomHandStyles, type CustomHandRecord } from '@/lib/customHandStore';
import {
  fetchLabManifest,
  isBackendBridgeConfigured,
  writeLabManifest,
} from '@/lib/backendGitHubBridge';

export type LabAssetType = 'icons' | 'hands' | 'fonts';

interface LabSyncEnvelope<T> {
  schemaVersion: 1;
  type: LabAssetType;
  updatedAt: string;
  items: T[];
}

function isRecordArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

async function getEnvelope<T>(type: LabAssetType): Promise<LabSyncEnvelope<T>> {
  return (await fetchLabManifest(type)) as LabSyncEnvelope<T>;
}

async function putEnvelope<T>(type: LabAssetType, items: T[]): Promise<void> {
  const payload: LabSyncEnvelope<T> = {
    schemaVersion: 1,
    type,
    updatedAt: new Date().toISOString(),
    items,
  };

  await writeLabManifest(type, payload);
}

export function isLabCloudSyncEnabled(): boolean {
  return isBackendBridgeConfigured();
}

export async function pullAllLabAssetsFromCloud(): Promise<void> {
  const [icons, hands, fonts] = await Promise.all([
    getEnvelope<CustomIconRecord>('icons'),
    getEnvelope<CustomHandRecord>('hands'),
    getEnvelope<SerializableCustomFontRecord>('fonts'),
  ]);

  // Only replace local store if cloud has actual items — never wipe on empty/missing file.
  if (isRecordArray<CustomIconRecord>(icons.items) && icons.items.length > 0) {
    await replaceCustomIcons(icons.items);
  }
  if (isRecordArray<CustomHandRecord>(hands.items) && hands.items.length > 0) {
    await replaceCustomHandStyles(hands.items);
  }
  if (isRecordArray<SerializableCustomFontRecord>(fonts.items) && fonts.items.length > 0) {
    await replaceCustomFonts(deserializeCustomFonts(fonts.items));
    await registerCustomFonts();
  }
}

export async function pushLabAssetTypeToCloud(type: LabAssetType): Promise<void> {
  // Hands use Firestore/Storage as primary cross-device sync (pushLabAssetToFirestore).
  // The GitHub JSON bridge for hands is redundant and requires a PAT with Contents:write
  // scope that the current fine-grained token does not provide. Skip to avoid 403 noise.
  if (type === 'hands') return;

  if (type === 'icons') {
    await putEnvelope('icons', await loadCustomIcons());
    return;
  }

  await putEnvelope('fonts', serializeCustomFonts(await loadCustomFonts()));
}
