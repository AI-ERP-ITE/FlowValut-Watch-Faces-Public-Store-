import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertTriangle, Hammer } from 'lucide-react';
import type { VisualEnvelope } from '@/types/visualSpec';
import { validateVisualEnvelope } from '@/pipeline/visualValidator';
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
  const [lastCompiledInput, setLastCompiledInput] = useState<string | null>(null);
  const [lastCompiledInputHash, setLastCompiledInputHash] = useState<string | null>(null);

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

  const handleCompile = () => {
    if (!parsed.value || !report || !report.isValid) return;
    try {
      const result = renderVisualSpec(parsed.value);
      setCompiledSvg(result.svg);
      setLastCompiledInput(envelopeText);
      setLastCompiledInputHash(hashInput(envelopeText));
      setErrorMessage(null);
    } catch (error) {
      setCompiledSvg('');
      setErrorMessage(error instanceof Error ? error.message : 'Render failed');
    }
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
          {isPreviewStale ? (
            <p className="mb-2 text-xs text-amber-400">
              Input changed after last compile. Compile again to refresh preview.
            </p>
          ) : null}
          <div className="rounded border border-zinc-800 bg-black/30 p-3">
            {compiledSvg ? (
              <div
                key={lastCompiledInputHash ?? 'compiled-preview'}
                className="mx-auto aspect-square w-full max-w-[600px] overflow-hidden rounded border border-zinc-700 [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: compiledSvg }}
              />
            ) : (
              <p className="text-xs text-zinc-500">
                Run compile to preview deterministic visual envelope output.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
