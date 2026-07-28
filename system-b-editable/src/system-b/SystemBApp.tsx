import { useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import models from '../../models.json';
import { InteractiveCanvas } from '@/components/InteractiveCanvas';
import { ElementList } from '@/components/ElementList';
import { generateWatchFaceCode } from '@/lib/jsCodeGenerator';
import {
  parseProjectFileArtifact,
  serializeProjectFileArtifact,
  type ProjectFileArtifact,
} from '@/lib/projectFileArtifact';
import { resolveWatchModelTarget } from '@/lib/watchModelTarget';
import { buildZPK } from '@/lib/zpkBuilder';
import type { ElementImage, WatchFaceConfig, WatchFaceElement } from '@/types';

interface LoadedParityProject {
  fileName: string;
  artifact: ProjectFileArtifact;
  config: WatchFaceConfig;
  canonicalModelId: string;
  canonicalModelName: string;
  specGroup: string;
  code: ReturnType<typeof generateWatchFaceCode>;
  semanticFingerprint: string;
}

interface ZpkInspection {
  fileCount: number;
  files: string[];
  appConfigVersion: string;
  editable: number;
  watchfaceWidgetCount: number;
}

type ModelDefinition = {
  name?: string;
  specGroup?: string;
};

const modelDefinitions = models as Record<string, ModelDefinition>;

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function semanticFingerprint(config: WatchFaceConfig, code: ReturnType<typeof generateWatchFaceCode>): string {
  const normalizedAppJson = JSON.parse(code.appJson) as {
    app?: { appId?: number; version?: { code?: number } };
    packageInfo?: { timeStamp?: number };
  };
  if (normalizedAppJson.app) {
    normalizedAppJson.app.appId = 0;
    if (normalizedAppJson.app.version) normalizedAppJson.app.version.code = 0;
  }
  if (normalizedAppJson.packageInfo) normalizedAppJson.packageInfo.timeStamp = 0;
  return fnv1a(stableStringify({
    config,
    appJson: normalizedAppJson,
    appJs: code.appJs,
    watchfaceIndexJs: code.watchfaceIndexJs,
  }));
}

function extensionFromDataUrl(dataUrl: string): string {
  const mime = /^data:([^;,]+)/.exec(dataUrl)?.[1]?.toLowerCase();
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/svg+xml') return 'svg';
  if (mime === 'image/webp') return 'webp';
  return 'png';
}

async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], name, { type: blob.type || 'application/octet-stream' });
}

function safeAssetName(value: string | undefined, fallback: string, dataUrl: string): string {
  const candidate = value?.trim();
  if (candidate && !candidate.startsWith('data:')) return candidate;
  return `${fallback}.${extensionFromDataUrl(dataUrl)}`;
}

async function collectElementFiles(config: WatchFaceConfig): Promise<{ src: string; file: File }[]> {
  const found = new Map<string, string>();
  const visit = (element: WatchFaceElement, index: number) => {
    const fields: Array<[string | undefined, string]> = [
      [element.src, element.assetFilename || `element_${index}`],
      [element.hourHandSrc, `hour_${index}`],
      [element.minuteHandSrc, `minute_${index}`],
      [element.secondHandSrc, `second_${index}`],
      [element.coverSrc, `cover_${index}`],
      [element.pressSrc, `press_${index}`],
      [element.normalSrc, `normal_${index}`],
    ];
    for (const image of element.images ?? []) fields.push([image, `frame_${index}_${fields.length}`]);
    for (const font of element.fontArray ?? []) fields.push([font, `font_${index}_${fields.length}`]);
    for (const [value, fallback] of fields) {
      if (!value?.startsWith('data:')) continue;
      found.set(safeAssetName(element.assetFilename, fallback, value), value);
    }
  };
  [...config.elements, ...(config.aodElements ?? [])].forEach(visit);
  return Promise.all(
    [...found.entries()].map(async ([src, dataUrl]) => ({
      src,
      file: await dataUrlToFile(dataUrl, src),
    })),
  );
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function inspectZpk(blob: Blob): Promise<ZpkInspection> {
  const outer = await JSZip.loadAsync(blob);
  const outerNames = Object.keys(outer.files).sort();
  const deviceEntry = outer.file('device.zip');
  if (!deviceEntry) throw new Error('Generated ZPK has no device.zip');
  const device = await JSZip.loadAsync(await deviceEntry.async('uint8array'));
  const deviceNames = Object.keys(device.files).sort();
  const appJsonEntry = device.file('app.json');
  if (!appJsonEntry) throw new Error('Generated device.zip has no app.json');
  const appJson = JSON.parse(await appJsonEntry.async('string')) as {
    configVersion?: string;
    module?: { watchface?: { editable?: number } };
  };
  return {
    fileCount: outerNames.length + deviceNames.length,
    files: [...outerNames.map((name) => `outer/${name}`), ...deviceNames.map((name) => `device/${name}`)],
    appConfigVersion: appJson.configVersion ?? 'unknown',
    editable: appJson.module?.watchface?.editable ?? -1,
    watchfaceWidgetCount: deviceNames.filter((name) => name.startsWith('watchface/')).length,
  };
}

export function SystemBApp() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [project, setProject] = useState<LoadedParityProject | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Load a current FVWF V1 project to begin parity verification.');
  const [inspection, setInspection] = useState<ZpkInspection | null>(null);

  const elementImages = useMemo<ElementImage[]>(() => {
    if (!project) return [];
    return [...project.config.elements, ...(project.config.aodElements ?? [])]
      .filter((element) => element.src?.startsWith('data:'))
      .map((element) => ({
        name: element.assetFilename || element.name,
        dataUrl: element.src!,
        src: element.assetFilename,
        bounds: { ...element.bounds },
        type: element.type,
      }));
  }, [project]);

  async function loadProject(file: File): Promise<void> {
    setBusy(true);
    setInspection(null);
    try {
      const artifact = parseProjectFileArtifact(await file.text());
      const resolved = resolveWatchModelTarget(artifact.watchFaceConfig.watchModel, modelDefinitions);
      if (!resolved) {
        throw new Error(`FVWF model "${artifact.watchFaceConfig.watchModel || 'unknown'}" is not configured.`);
      }
      const canonicalModelName = modelDefinitions[resolved.modelId]?.name?.trim()
        || artifact.watchFaceConfig.watchModel;
      const config = {
        ...artifact.watchFaceConfig,
        watchModel: canonicalModelName,
      };
      const code = generateWatchFaceCode(config);
      setProject({
        fileName: file.name,
        artifact,
        config,
        canonicalModelId: resolved.modelId,
        canonicalModelName,
        specGroup: resolved.specGroup,
        code,
        semanticFingerprint: semanticFingerprint(config, code),
      });
      setSelectedElementId(null);
      setMessage(`Loaded ${file.name} through the copied current-V2 path.`);
    } catch (error) {
      setProject(null);
      setMessage(error instanceof Error ? error.message : 'FVWF load failed.');
    } finally {
      setBusy(false);
    }
  }

  async function generateNormalZpk(): Promise<void> {
    if (!project) return;
    setBusy(true);
    try {
      const backgroundDataUrl = project.artifact.backgroundImage
        || project.config.background.src;
      if (!backgroundDataUrl?.startsWith('data:')) {
        throw new Error('This parity build requires the FVWF to contain an embedded background image.');
      }
      const result = await buildZPK({
        config: project.config,
        backgroundFile: await dataUrlToFile(backgroundDataUrl, 'background.png'),
        elementFiles: await collectElementFiles(project.config),
        previewDataUrl: canvasRef.current?.toDataURL('image/png') ?? backgroundDataUrl,
      });
      const nextInspection = await inspectZpk(result.blob);
      setInspection(nextInspection);
      downloadBlob(result.blob, result.filename);
      setMessage(`Generated copied normal V2 artifact: ${result.filename}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Normal V2 generation failed.');
    } finally {
      setBusy(false);
    }
  }

  function downloadFvwf(): void {
    if (!project) return;
    downloadBlob(
      new Blob([serializeProjectFileArtifact({
        ...project.artifact,
        watchFaceConfig: project.config,
      })], { type: 'application/json' }),
      project.fileName.endsWith('.fvwf') ? project.fileName : `${project.config.name}.fvwf`,
    );
  }

  return (
    <main className="system-b-shell">
      <header className="system-b-toolbar">
        <div>
          <p className="system-b-eyebrow">FLOWVAULT · SYSTEM B</p>
          <h1>Normal V2 parity workspace</h1>
        </div>
        <div className="system-b-actions">
          <input
            ref={inputRef}
            hidden
            type="file"
            accept=".fvwf,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void loadProject(file);
              event.target.value = '';
            }}
          />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
            Load FVWF V1
          </button>
          <button type="button" onClick={downloadFvwf} disabled={!project || busy}>
            Export parity FVWF
          </button>
          <button type="button" onClick={() => void generateNormalZpk()} disabled={!project || busy}>
            Generate normal V2 ZPK
          </button>
        </div>
      </header>

      <p className="system-b-message" role="status">{busy ? 'Working…' : message}</p>

      {project ? (
        <>
          <section className="system-b-facts">
            <span><strong>Project</strong>{project.config.name}</span>
            <span><strong>Model</strong>{project.canonicalModelName}</span>
            <span><strong>Spec group</strong>{project.specGroup}</span>
            <span><strong>Resolution</strong>{project.config.resolution.width}×{project.config.resolution.height}</span>
            <span><strong>Elements</strong>{project.config.elements.length}</span>
            <span><strong>Fingerprint</strong><code>{project.semanticFingerprint}</code></span>
          </section>

          <section className="system-b-workspace">
            <aside className="system-b-layers">
              <h2>Copied layer model</h2>
              <ElementList
                elements={project.config.elements}
                selectedElementId={selectedElementId}
                onSelectElement={(id) => setSelectedElementId(id)}
                onToggleVisibility={() => undefined}
                onDeleteElement={() => undefined}
                onReorder={() => undefined}
              />
            </aside>
            <section className="system-b-canvas">
              <InteractiveCanvas
                ref={canvasRef}
                backgroundImage={project.artifact.backgroundImage || project.config.background.src}
                backgroundTransform={project.config.backgroundTransform ?? undefined}
                elements={project.config.elements}
                elementImages={elementImages}
                selectedElementId={selectedElementId}
                onSelectElement={setSelectedElementId}
                canvasW={project.config.resolution.width}
                canvasH={project.config.resolution.height}
                canvasShape={project.specGroup.includes('square') ? 'square' : 'round'}
                showGrid
              />
            </section>
          </section>

          <section className="system-b-code">
            <h2>Copied V2 semantics</h2>
            <dl>
              <div><dt>configVersion</dt><dd>v2</dd></div>
              <div><dt>normal editable flag</dt><dd>0</dd></div>
              <div><dt>app.json bytes</dt><dd>{project.code.appJson.length}</dd></div>
              <div><dt>watchface runtime bytes</dt><dd>{project.code.watchfaceIndexJs.length}</dd></div>
            </dl>
            {inspection && (
              <dl>
                <div><dt>generated config</dt><dd>{inspection.appConfigVersion}</dd></div>
                <div><dt>generated editable</dt><dd>{inspection.editable}</dd></div>
                <div><dt>archive entries</dt><dd>{inspection.fileCount}</dd></div>
                <div><dt>watchface entries</dt><dd>{inspection.watchfaceWidgetCount}</dd></div>
              </dl>
            )}
          </section>
        </>
      ) : (
        <section className="system-b-empty">
          <h2>System A remains untouched</h2>
          <p>This workspace executes only the provenance-verified System B copies.</p>
        </section>
      )}
    </main>
  );
}
