import JSZip from 'jszip';
import { buildZPK, type ZPKBuildResult } from '@/lib/zpkBuilder';
import type { FvwcProjectV1 } from './composerDomain';
import { compileEditableV2Plan, type EditableV2Plan } from './editableV2';
import { renderGeneratedDigitAssets } from './digitAssetPreparation';
import { prepareConfigPointersLikeSystemA } from './systemAPointerExport';

export interface EditableZpkBuildResult extends ZPKBuildResult {
  plan: EditableV2Plan;
}

async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], name, { type: blob.type || 'application/octet-stream' });
}

async function createSelectionBackgroundFile(
  dataUrl: string,
  bounds: EditableV2Plan['slot']['bounds'],
): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const next = new Image();
    next.onload = () => resolve(next);
    next.onerror = () => reject(new Error('Unable to load editable selection background.'));
    next.src = dataUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bounds.width));
  canvas.height = Math.max(1, Math.round(bounds.height));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to crop editable selection background.');
  context.drawImage(
    image,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => value ? resolve(value) : reject(new Error('Unable to encode editable selection background.')),
      'image/png',
    );
  });
  return new File([blob], 'selection.png', { type: 'image/png' });
}

async function patchEditableArchive(
  normalBlob: Blob,
  plan: EditableV2Plan,
  selectionBackgroundDataUrl: string,
): Promise<Blob> {
  const outer = await JSZip.loadAsync(normalBlob);
  const deviceEntry = outer.file('device.zip');
  if (!deviceEntry) throw new Error('Normal V2 package has no device.zip.');
  const device = await JSZip.loadAsync(await deviceEntry.async('uint8array'));
  device.file('app.json', plan.generatedCode.appJson);
  device.file('watchface/index.js', plan.generatedCode.watchfaceIndexJs);
  const assets = device.folder('assets');
  if (!assets) throw new Error('Normal V2 package has no assets folder.');
  for (const asset of plan.assets) {
    assets.file(asset.path, await dataUrlToFile(asset.dataUrl, asset.path.split('/').at(-1) || 'asset.png'));
  }
  const selectionImage = await createSelectionBackgroundFile(selectionBackgroundDataUrl, plan.slot.bounds);
  assets.file(plan.slot.selectImagePath, selectionImage);
  assets.file(plan.slot.unselectImagePath, selectionImage);
  const deviceBlob = await device.generateAsync({ type: 'blob', compression: 'STORE' });
  outer.file('device.zip', deviceBlob);
  outer.file('app.json', plan.generatedCode.appJson);
  return outer.generateAsync({ type: 'blob', compression: 'STORE' });
}

export async function buildEditableV2Zpk(
  project: FvwcProjectV1,
  previewDataUrl?: string | null,
  variantPreviewDataUrls: Record<string, string> = {},
): Promise<EditableZpkBuildResult> {
  const preparedProject: FvwcProjectV1 = {
    ...project,
    sourceBuilds: await Promise.all(project.sourceBuilds.map(async (source) => ({
      ...source,
      artifact: {
        ...source.artifact,
        watchFaceConfig: await prepareConfigPointersLikeSystemA(
          source.artifact.watchFaceConfig,
          project.customHandStyles ?? [],
        ),
      },
    }))),
  };
  const plan = compileEditableV2Plan(preparedProject, variantPreviewDataUrls);
  const baseSource = preparedProject.sourceBuilds.find((source) => source.id === preparedProject.baseBuildId)!;
  const backgroundDataUrl = baseSource.artifact.backgroundImage;
  if (!backgroundDataUrl?.startsWith('data:')) {
    throw new Error('The base FVWF requires an embedded background.');
  }
  const selectedSlot = preparedProject.slots[0];
  const defaultVariant = selectedSlot?.variants.find((variant) => variant.id === selectedSlot.defaultVariantId)
    ?? selectedSlot?.variants[0];
  const selectionSource = preparedProject.sourceBuilds.find(
    (source) => source.id === defaultVariant?.sourceBuildId,
  ) ?? baseSource;
  const selectionBackgroundDataUrl = selectionSource.artifact.backgroundImage ?? backgroundDataUrl;
  const generatedAssets = renderGeneratedDigitAssets([
    ...plan.packagingConfig.elements,
    ...(plan.packagingConfig.aodElements ?? []),
  ]);
  const allAssets = [...plan.assets, ...generatedAssets];
  const elementFiles = await Promise.all(allAssets
    .map(async (asset) => ({
      src: asset.path,
      file: await dataUrlToFile(asset.dataUrl, asset.path.split('/').at(-1) || 'asset.png'),
    })));
  const normal = await buildZPK({
    config: plan.packagingConfig,
    backgroundFile: await dataUrlToFile(backgroundDataUrl, 'background.png'),
    elementFiles,
    previewDataUrl: previewDataUrl ?? backgroundDataUrl,
  });
  plan.assets.push(...generatedAssets);
  const blob = await patchEditableArchive(normal.blob, plan, selectionBackgroundDataUrl);
  return {
    blob,
    size: blob.size,
    filename: `${plan.name.replace(/\s+/g, '_')}.zpk`,
    plan,
  };
}
