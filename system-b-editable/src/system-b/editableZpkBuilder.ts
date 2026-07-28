import JSZip from 'jszip';
import { buildZPK, type ZPKBuildResult } from '@/lib/zpkBuilder';
import type { FvwcProjectV1 } from './composerDomain';
import { compileEditableV2Plan, type EditableV2Plan } from './editableV2';
import { renderGeneratedDigitAssets } from './digitAssetPreparation';

export interface EditableZpkBuildResult extends ZPKBuildResult {
  plan: EditableV2Plan;
}

async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], name, { type: blob.type || 'application/octet-stream' });
}

async function createMaskPngFile(
  width: number,
  height: number,
  bounds: EditableV2Plan['slot']['bounds'],
  name: string,
): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create editable mask canvas.');
  context.fillStyle = 'rgba(0, 0, 0, 0.7)';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = '#ffffff';
  context.lineWidth = 4;
  context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Unable to encode editable mask.')), 'image/png');
  });
  return new File([blob], name, { type: 'image/png' });
}

async function patchEditableArchive(
  normalBlob: Blob,
  plan: EditableV2Plan,
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
  assets.file(
    plan.slot.maskPath,
    await createMaskPngFile(
      plan.baseConfig.resolution.width,
      plan.baseConfig.resolution.height,
      plan.slot.bounds,
      'edit_mask.png',
    ),
  );
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
  const plan = compileEditableV2Plan(project, variantPreviewDataUrls);
  const baseSource = project.sourceBuilds.find((source) => source.id === project.baseBuildId)!;
  const backgroundDataUrl = baseSource.artifact.backgroundImage;
  if (!backgroundDataUrl?.startsWith('data:')) {
    throw new Error('The base FVWF requires an embedded background.');
  }
  const generatedAssets = renderGeneratedDigitAssets([
    ...plan.packagingConfig.elements,
    ...(plan.packagingConfig.aodElements ?? []),
  ]);
  const allAssets = [...plan.assets, ...generatedAssets];
  const elementFiles = await Promise.all(allAssets
    .filter((asset) => asset.path !== plan.slot.maskPath)
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
  const blob = await patchEditableArchive(normal.blob, plan);
  return {
    blob,
    size: blob.size,
    filename: `${plan.name.replace(/\s+/g, '_')}.zpk`,
    plan,
  };
}
