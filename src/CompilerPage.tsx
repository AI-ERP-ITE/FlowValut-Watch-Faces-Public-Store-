import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertTriangle, Hammer, Minus, Plus } from 'lucide-react';
import type { VisualEnvelope } from '@/types/visualSpec';
import type { VisualFidelityResult } from '@/pipeline/visualFidelity';
import { validateVisualEnvelope, validateVisualFidelity } from '@/pipeline/visualValidator';
import { renderVisualSpec } from '@/pipeline/visualRenderer';

const SAMPLE_ENVELOPE: VisualEnvelope = {
  inventory: {
    canvas: { width: 480, height: 480, shape: 'circle' },
    elements: [
      { id: 'el_001', kind: 'shape', bbox: { x: 0, y: 0, w: 480, h: 480 }, zOrder: 0, groupId: null },
      { id: 'el_002', kind: 'shape', bbox: { x: 40, y: 40, w: 400, h: 400 }, zOrder: 1, groupId: null },
      { id: 'el_003', kind: 'shape', bbox: { x: 230, y: 100, w: 20, h: 280 }, zOrder: 2, groupId: null },
      { id: 'el_004', kind: 'text',  bbox: { x: 200, y: 220, w: 80, h: 40 },  zOrder: 3, groupId: null },
    ],
  },
  decomposition: [
    {
      id: 'el_001',
      basePrimitiveIntent: 'full background base region',
      materialClass: 'matte',
      textureRecipe: { pattern: 'micro_noise', density: 0.35, scale: 0.25, roughness: 0.6 },
      depthRecipe: { innerShadow: false, outerShadow: false, seamBand: false, rimHighlight: false, aoBand: false },
      colorRoleSet: { base: '#0f172a', edgeDark: '#0b1220', edgeLight: '#1e293b' },
      compositionRecipe: { clipTarget: null, blendIntent: 'normal', opacityStack: [1] },
    },
    {
      id: 'el_002',
      basePrimitiveIntent: 'main circular field',
      materialClass: 'matte',
      textureRecipe: { pattern: 'none' },
      depthRecipe: { innerShadow: true, outerShadow: false, seamBand: false, rimHighlight: true, aoBand: true },
      colorRoleSet: { base: '#1e293b', edgeDark: '#0f172a', edgeLight: '#475569' },
      compositionRecipe: { clipTarget: null, blendIntent: 'normal', opacityStack: [1] },
    },
    {
      id: 'el_003',
      basePrimitiveIntent: 'central stroke-like hand',
      materialClass: 'painted',
      textureRecipe: { pattern: 'none' },
      depthRecipe: { innerShadow: false, outerShadow: false, seamBand: false, rimHighlight: false, aoBand: false },
      colorRoleSet: { base: '#e2e8f0' },
      compositionRecipe: { clipTarget: null, blendIntent: 'normal', opacityStack: [1] },
    },
    {
      id: 'el_004',
      basePrimitiveIntent: 'foreground text glyph group',
      materialClass: 'printed',
      textureRecipe: { pattern: 'none' },
      depthRecipe: { innerShadow: false, outerShadow: false, seamBand: false, rimHighlight: false, aoBand: false },
      colorRoleSet: { base: '#e2e8f0' },
      compositionRecipe: { clipTarget: null, blendIntent: 'normal', opacityStack: [1] },
    },
  ],
  geometry: [
    { id: 'el_001', shape: 'rect',   x: 0,   y: 0,   w: 480, h: 480 },
    { id: 'el_002', shape: 'circle', cx: 240, cy: 240, r: 200 },
    { id: 'el_003', shape: 'line',   x1: 240, y1: 100, x2: 240, y2: 380 },
    { id: 'el_004', shape: 'text',   x: 240, y: 250, content: 'SAMPLE', fontSize: 32, anchor: 'middle' },
  ],
  appearance: [
    { id: 'el_001', fill: { kind: 'solid', color: '#0f172a' }, stroke: 'none' },
    { id: 'el_002', fill: { kind: 'radial', cx: 240, cy: 240, r: 200, stops: [
      { offset: 0, color: '#1e293b' },
      { offset: 1, color: '#0f172a' },
    ] }, stroke: { color: '#475569', width: 4 } },
    { id: 'el_003', fill: { kind: 'none' }, stroke: { color: '#e2e8f0', width: 6, cap: 'round' } },
    { id: 'el_004', fill: { kind: 'solid', color: '#e2e8f0' }, stroke: 'none' },
  ],
};

function hashInput(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `h${(hash >>> 0).toString(16)}`;
}

export default function CompilerPage() {
  const navigate = useNavigate();
  const [envelopeText, setEnvelopeText] = useState(() => JSON.stringify(SAMPLE_ENVELOPE, null, 2));
  const [compiledSvg, setCompiledSvg] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sourceImageDataUrl, setSourceImageDataUrl] = useState<string | null>(null);
  const [sourceImageName, setSourceImageName] = useState<string | null>(null);
  const [sourceImageDims, setSourceImageDims] = useState<{ width: number; height: number } | null>(null);
  const [fidelityResult, setFidelityResult] = useState<VisualFidelityResult | null>(null);
  const [fidelityError, setFidelityError] = useState<string | null>(null);
  const [fidelityPending, setFidelityPending] = useState(false);
  const [lastCompiledInput, setLastCompiledInput] = useState<string | null>(null);
  const [lastCompiledInputHash, setLastCompiledInputHash] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewFit, setPreviewFit] = useState(true);

  const parsed = useMemo(() => {
    try {
      return { value: JSON.parse(envelopeText) as VisualEnvelope, error: null as string | null };
    } catch (error) {
      return {
        value: null as VisualEnvelope | null,
        error: error instanceof Error ? error.message : 'Invalid JSON',
      };
    }
  }, [envelopeText]);

  const inventoryElements = useMemo(() => {
    if (!parsed.value || typeof parsed.value !== 'object') return [];
    const candidate = parsed.value.inventory?.elements;
    return Array.isArray(candidate) ? candidate : [];
  }, [parsed.value]);

  const decompositionEntries = useMemo(() => {
    if (!parsed.value || typeof parsed.value !== 'object') return [];
    const candidate = parsed.value.decomposition;
    return Array.isArray(candidate) ? candidate : [];
  }, [parsed.value]);

  const report = useMemo(() => {
    if (!parsed.value) return null;
    try {
      return validateVisualEnvelope(parsed.value);
    } catch {
      return null;
    }
  }, [parsed.value]);

  useEffect(() => {
    if (lastCompiledInput !== null && envelopeText !== lastCompiledInput && compiledSvg) {
      setCompiledSvg('');
    }
  }, [envelopeText, compiledSvg, lastCompiledInput]);

  const handleCompile = async () => {
    if (!parsed.value || !report || !report.isValid) return;

    if (
      sourceImageDims &&
      (parsed.value.inventory.canvas.width !== sourceImageDims.width ||
        parsed.value.inventory.canvas.height !== sourceImageDims.height)
    ) {
      setCompiledSvg('');
      setErrorMessage(
        `Canvas mismatch: envelope is ${parsed.value.inventory.canvas.width}x${parsed.value.inventory.canvas.height}, source image is ${sourceImageDims.width}x${sourceImageDims.height}. Use native source dimensions.`,
      );
      setFidelityResult(null);
      setFidelityPending(false);
      return;
    }

    try {
      const result = renderVisualSpec(parsed.value);
      setCompiledSvg(result.svg);
      setLastCompiledInput(envelopeText);
      setLastCompiledInputHash(hashInput(envelopeText));
      setErrorMessage(null);

      if (sourceImageDataUrl) {
        setFidelityPending(true);
        setFidelityError(null);
        try {
          const fidelity = await validateVisualFidelity({
            sourceDataUrl: sourceImageDataUrl,
            renderedSvg: result.svg,
            width: parsed.value.inventory.canvas.width,
            height: parsed.value.inventory.canvas.height,
          });
          setFidelityResult(fidelity);
        } catch (fidelityErr) {
          setFidelityResult(null);
          setFidelityError(
            fidelityErr instanceof Error
              ? fidelityErr.message
              : 'Visual fidelity verification failed.',
          );
        } finally {
          setFidelityPending(false);
        }
      } else {
        setFidelityResult(null);
        setFidelityError(null);
      }
    } catch (error) {
      setCompiledSvg('');
      setErrorMessage(error instanceof Error ? error.message : 'Render failed');
      setFidelityPending(false);
    }
  };

  const handleSourceImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSourceImageDataUrl(null);
      setSourceImageName(null);
      setSourceImageDims(null);
      setFidelityResult(null);
      setFidelityError(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null;
      if (!dataUrl) {
        setSourceImageDataUrl(null);
        setSourceImageName(null);
        setSourceImageDims(null);
        setFidelityResult(null);
        setFidelityError('Could not read selected source image.');
        return;
      }

      const img = new Image();
      img.onload = () => {
        setSourceImageDataUrl(dataUrl);
        setSourceImageName(file.name);
        setSourceImageDims({ width: img.naturalWidth, height: img.naturalHeight });
        setFidelityResult(null);
        setFidelityError(null);
      };
      img.onerror = () => {
        setSourceImageDataUrl(null);
        setSourceImageName(null);
        setSourceImageDims(null);
        setFidelityResult(null);
        setFidelityError('Could not decode selected source image.');
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setSourceImageDataUrl(null);
      setSourceImageName(null);
      setSourceImageDims(null);
      setFidelityResult(null);
      setFidelityError('Could not read selected source image.');
    };
    reader.readAsDataURL(file);
  };

  const isPreviewStale = Boolean(lastCompiledInput) && envelopeText !== lastCompiledInput;

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/studio')}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/90 px-3 py-2 text-xs uppercase tracking-widest text-zinc-300 hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Studio
          </button>
          <button
            type="button"
            onClick={handleCompile}
            disabled={!parsed.value || !report || !report.isValid}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs uppercase tracking-widest text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
          >
            <Hammer className="h-4 w-4" />
            Compile Visual Envelope
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-zinc-300">
              Visual Envelope JSON
            </h2>
            <p className="mb-2 text-[11px] text-zinc-500">
              Paste output from <code className="text-cyan-400">use:speckit.compile.master.prompt.md</code>.
            </p>
            <textarea
              value={envelopeText}
              onChange={(event) => setEnvelopeText(event.target.value)}
              className="h-[520px] w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 font-mono text-xs text-zinc-100 outline-none focus:border-cyan-500"
              spellCheck={false}
            />
            {parsed.error ? <p className="mt-2 text-xs text-red-400">JSON error: {parsed.error}</p> : null}
          </section>

          <section className="space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-zinc-300">
                Inventory ({inventoryElements.length})
              </h2>
              <div className="max-h-[200px] space-y-1 overflow-y-auto text-xs text-zinc-300">
                {inventoryElements.map((el) => (
                  <div
                    key={el.id}
                    className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/40 px-2 py-1"
                  >
                    <span className="font-mono text-cyan-400">{el.id}</span>
                    <span className="text-zinc-400">{el.kind}</span>
                    <span className="text-zinc-500">z{el.zOrder}</span>
                  </div>
                ))}
                {!parsed.error && inventoryElements.length === 0 ? (
                  <p className="text-xs text-zinc-500">No inventory elements found in pasted JSON.</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-zinc-300">
                Decomposition ({decompositionEntries.length})
              </h2>
              <div className="max-h-[200px] space-y-1 overflow-y-auto text-xs text-zinc-300">
                {decompositionEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded border border-zinc-800 bg-zinc-900/40 px-2 py-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-cyan-400">{entry.id}</span>
                      <span className="text-zinc-400">{entry.materialClass}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500">{entry.basePrimitiveIntent}</p>
                  </div>
                ))}
                {!parsed.error && decompositionEntries.length === 0 ? (
                  <p className="text-xs text-zinc-500">No decomposition entries found in pasted JSON.</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-zinc-300">
                Validation Report
              </h2>
              <div className="space-y-2 text-xs">
                {report?.gates.map((gate) => (
                  <div key={gate.gateId} className="rounded border border-zinc-800 bg-zinc-900/40 p-2">
                    <div className="flex items-center gap-2 font-medium">
                      {gate.status === 'PASS' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                      )}
                      <span>
                        {gate.gateId} · {gate.title}
                      </span>
                    </div>
                    {gate.details.length > 0 ? (
                      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-zinc-400">
                        {gate.details.map((detail, idx) => (
                          <li key={idx}>{detail}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
              {report && report.failedIds.length > 0 ? (
                <div className="mt-3 rounded border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-300">
                  <div className="mb-1 font-semibold uppercase tracking-widest">Failed IDs (for patch loop)</div>
                  <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-amber-200">
                    {JSON.stringify(report.failedIds, null, 2)}
                  </pre>
                  <p className="mt-1 text-amber-400">
                    Copy this report + envelope into <code>use:speckit.compile.patch.prompt.md</code>.
                  </p>
                </div>
              ) : null}
              {errorMessage ? <p className="mt-2 text-xs text-red-400">{errorMessage}</p> : null}
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-zinc-300">
            Compiled Preview (SVG)
          </h2>
          <div className="mb-3 rounded border border-zinc-800 bg-zinc-900/40 p-2">
            <label className="block text-[11px] uppercase tracking-widest text-zinc-400">
              Source Image (for Fidelity Verification)
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/bmp,image/gif"
              onChange={handleSourceImageChange}
              className="mt-1 block w-full text-xs text-zinc-300 file:mr-3 file:rounded file:border file:border-zinc-700 file:bg-zinc-800 file:px-2 file:py-1 file:text-xs file:text-zinc-200"
            />
            {sourceImageName ? (
              <p className="mt-1 text-[11px] text-zinc-500">
                Loaded: {sourceImageName}
                {sourceImageDims ? ` (${sourceImageDims.width}x${sourceImageDims.height})` : ''}
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-zinc-500">Load source image to enable end-to-end visual scoring.</p>
            )}
          </div>
          {isPreviewStale ? (
            <p className="mb-2 text-xs text-amber-400">
              Input changed after last compile. Compile again to refresh preview.
            </p>
          ) : null}
          <div className="rounded border border-zinc-800 bg-black/30 p-3">
            <div className="mb-2 flex items-center justify-between gap-2 border-b border-zinc-800 pb-2 text-[11px] text-zinc-400">
              <span>
                Canvas: {parsed.value?.inventory?.canvas?.width ?? '-'}x{parsed.value?.inventory?.canvas?.height ?? '-'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewFit((v) => !v)}
                  className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
                >
                  {previewFit ? 'Fit: ON' : 'Fit: OFF'}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.max(0.25, +(z - 0.1).toFixed(2)))}
                  className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
                  aria-label="Zoom out"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-12 text-center text-zinc-300">{Math.round(previewZoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.min(4, +(z + 0.1).toFixed(2)))}
                  className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
                  aria-label="Zoom in"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom(1)}
                  className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
                >
                  100%
                </button>
              </div>
            </div>
            {compiledSvg ? (
              <div className="h-[70vh] min-h-[360px] overflow-auto rounded border border-zinc-700 bg-zinc-950/40">
                <div className={previewFit ? 'flex min-h-full items-center justify-center p-3' : 'p-3'}>
                  <div
                    key={lastCompiledInputHash ?? 'compiled-preview'}
                    style={{ transform: `scale(${previewZoom})`, transformOrigin: previewFit ? 'center center' : 'top left' }}
                    className={previewFit ? '[&>svg]:block [&>svg]:h-auto [&>svg]:max-h-full [&>svg]:max-w-full [&>svg]:w-auto' : '[&>svg]:block'}
                    dangerouslySetInnerHTML={{ __html: compiledSvg }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">
                Run compile to preview deterministic visual envelope output.
              </p>
            )}
          </div>
          <div className="mt-3 rounded border border-zinc-800 bg-zinc-900/40 p-2 text-xs">
            <div className="mb-1 text-[11px] uppercase tracking-widest text-zinc-400">Visual Fidelity Gate</div>
            {fidelityPending ? <p className="text-cyan-300">Computing visual similarity...</p> : null}
            {!fidelityPending && fidelityResult ? (
              <div className="space-y-1 text-zinc-300">
                <p>
                  Status: <span className={fidelityResult.pass ? 'text-emerald-400' : 'text-amber-400'}>{fidelityResult.pass ? 'PASS' : 'FAIL'}</span>
                </p>
                <p>Score: {(fidelityResult.metrics.score * 100).toFixed(2)}% (threshold {(fidelityResult.threshold * 100).toFixed(2)}%)</p>
                <p>Pixel: {(fidelityResult.metrics.pixelSimilarity * 100).toFixed(2)}%</p>
                <p>Edge: {(fidelityResult.metrics.edgeSimilarity * 100).toFixed(2)}%</p>
                <p>Color: {(fidelityResult.metrics.colorSimilarity * 100).toFixed(2)}%</p>
              </div>
            ) : null}
            {!fidelityPending && !fidelityResult && !fidelityError ? (
              <p className="text-zinc-500">Load source image, then compile to run fidelity verification.</p>
            ) : null}
            {fidelityError ? <p className="text-red-400">{fidelityError}</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
