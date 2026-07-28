import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, Image } from 'canvas';
import JSZip from 'jszip';
import {
  addSourceBuild,
  addVariantToSlot,
  createComponentGroup,
  createFvwcProject,
  createSlotFromGroup,
  serializeFvwc,
  sha256Text,
  type ComposerSourceBuild,
} from '../src/system-b/composerDomain';
import { parseProjectFileArtifact } from '../src/lib/projectFileArtifact';
import { resolveWatchModelTarget } from '../src/lib/watchModelTarget';
import { buildEditableV2Zpk } from '../src/system-b/editableZpkBuilder';
import models from '../models.json' with { type: 'json' };

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const systemBRoot = path.resolve(scriptDir, '..');
const workspaceRoot = path.resolve(systemBRoot, '..', '..');
const outputDir = path.join(systemBRoot, 'artifacts', 'real-two-source-v2');
const inputs = [
  path.join(workspaceRoot, 'ZPK for tests', '20.fvwf'),
  path.join(workspaceRoot, 'ZPK for tests', 'good dgts', 'test ddgs spacng.fvwf'),
];

class NodeFileReader {
  result: string | ArrayBuffer | null = null;
  error: Error | null = null;
  onload: ((event: { target: NodeFileReader }) => void) | null = null;
  onerror: ((event: { target: NodeFileReader }) => void) | null = null;

  readAsDataURL(blob: Blob) {
    void blob.arrayBuffer()
      .then((buffer) => {
        const mime = blob.type || 'application/octet-stream';
        this.result = `data:${mime};base64,${Buffer.from(buffer).toString('base64')}`;
        this.onload?.({ target: this });
      })
      .catch((error: Error) => {
        this.error = error;
        this.onerror?.({ target: this });
      });
  }

  readAsArrayBuffer(blob: Blob) {
    void blob.arrayBuffer()
      .then((buffer) => {
        this.result = buffer;
        this.onload?.({ target: this });
      })
      .catch((error: Error) => {
        this.error = error;
        this.onerror?.({ target: this });
      });
  }
}

function createNodeCanvas() {
  const canvas = createCanvas(1, 1) as ReturnType<typeof createCanvas> & {
    toBlob?: (callback: (value: Blob | null) => void, type?: string) => void;
  };
  canvas.toBlob = (callback, type = 'image/png') => {
    try {
      callback(new Blob([canvas.toBuffer('image/png')], { type }));
    } catch {
      callback(null);
    }
  };
  return canvas;
}

Object.assign(globalThis, {
  Image,
  FileReader: NodeFileReader,
  document: {
    createElement(name: string) {
      if (name !== 'canvas') throw new Error(`Unsupported fixture DOM element: ${name}`);
      return createNodeCanvas();
    },
  },
});

async function sourceFromFile(filePath: string): Promise<ComposerSourceBuild> {
  const text = await readFile(filePath, 'utf8');
  const artifact = parseProjectFileArtifact(text);
  const target = resolveWatchModelTarget(
    artifact.watchFaceConfig.watchModel,
    models as Record<string, { name?: string; specGroup?: string }>,
  );
  if (!target) throw new Error(`Unresolved watch model: ${artifact.watchFaceConfig.watchModel}`);
  const canonicalModelName = models[target.modelId as keyof typeof models]?.name
    || artifact.watchFaceConfig.watchModel;
  const normalized = {
    ...artifact,
    watchFaceConfig: { ...artifact.watchFaceConfig, watchModel: canonicalModelName },
  };
  const hash = await sha256Text(JSON.stringify(normalized));
  return {
    id: `source_${hash.slice(0, 20)}`,
    fileName: path.basename(filePath),
    sha256: hash,
    importedAt: new Date().toISOString(),
    canonicalModelId: target.modelId,
    canonicalModelName,
    specGroup: target.specGroup,
    artifact: normalized,
  };
}

const [heartSource, dateSource] = await Promise.all(inputs.map(sourceFromFile));
let project = createFvwcProject('FlowVault Real Heart Date');
project = addSourceBuild(project, heartSource);
project = addSourceBuild(project, dateSource);
project = createComponentGroup(project, {
  name: 'Heart Numeric',
  sourceBuildId: heartSource.id,
  layerIds: ['bzgvfs4annd'],
});
project = createComponentGroup(project, {
  name: 'Date Numeric',
  sourceBuildId: dateSource.id,
  layerIds: ['zanq5rxkqz'],
});
project = createSlotFromGroup(project, project.componentGroups[0].id, 'Right Numeric Window', 'STYLE_AND_DATA');
project = addVariantToSlot(
  project,
  project.slots[0].id,
  project.componentGroups[1].id,
  'STYLE_AND_DATA',
);

await mkdir(outputDir, { recursive: true });
const fvwcText = serializeFvwc(project);
const fvwcPath = path.join(outputDir, 'flowvault-real-heart-date.fvwc');
await writeFile(fvwcPath, fvwcText, 'utf8');

const result = await buildEditableV2Zpk(project, heartSource.artifact.backgroundImage);
const zpkPath = path.join(outputDir, result.filename);
await writeFile(zpkPath, Buffer.from(await result.blob.arrayBuffer()));

const outer = await JSZip.loadAsync(result.blob);
const deviceEntry = outer.file('device.zip');
if (!deviceEntry) throw new Error('Generated ZPK has no device.zip');
const device = await JSZip.loadAsync(await deviceEntry.async('uint8array'));
const appJson = JSON.parse(await device.file('app.json')!.async('string'));
const runtime = await device.file('watchface/index.js')!.async('string');
const deviceFiles = Object.keys(device.files).sort();
const report = {
  generatedAt: new Date().toISOString(),
  inputs,
  sourceModels: [heartSource.canonicalModelName, dateSource.canonicalModelName],
  specGroups: [heartSource.specGroup, dateSource.specGroup],
  fvwcPath,
  zpkPath,
  zpkBytes: result.size,
  configVersion: appJson.configVersion,
  editable: appJson.module?.watchface?.editable,
  editId: result.plan.slot.editId,
  variantTypes: result.plan.slot.variants.map((variant) => variant.typeId),
  variantTitles: result.plan.slot.variants.map((variant) => variant.title),
  runtimeChecks: {
    editGroup: runtime.includes('WATCHFACE_EDIT_GROUP'),
    currentType: runtime.includes('CURRENT_TYPE'),
    editMask: runtime.includes('WATCHFACE_EDIT_MASK'),
    onlyEdit: runtime.includes('ONLY_EDIT'),
  },
  requiredAssets: [
    result.plan.slot.maskPath,
    ...result.plan.slot.variants.map((variant) => variant.previewPath),
  ],
  deviceFileCount: deviceFiles.length,
  deviceFiles,
};
const reportPath = path.join(outputDir, 'inspection-report.json');
await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log(JSON.stringify(report, null, 2));
