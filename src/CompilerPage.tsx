import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertTriangle, Hammer } from 'lucide-react';
import type { WatchfaceAnalysisContract } from '@/types/analysisCompiler';
import { validateAnalysisCompliance } from '@/pipeline/complianceValidator';
import { compileValidatedAnalysis } from '@/pipeline/deterministicCompiler';

const SAMPLE_ANALYSIS: WatchfaceAnalysisContract = {
  requirementsModel: {
    requiredElements: [
      { elementType: 'background', minCount: 1, maxCount: 1 },
      { elementType: 'time_pointer', minCount: 1 },
    ],
    watchResolution: { width: 480, height: 480 },
  },
  geometryModel: {
    canvas: { width: 480, height: 480 },
    elements: [
      { id: 'bg-1', type: 'background', x: 0, y: 0, width: 480, height: 480 },
      { id: 'hands-1', type: 'time_pointer', x: 120, y: 120, width: 240, height: 240, centerX: 240, centerY: 240 },
    ],
  },
  layerModel: {
    layerStack: [
      { id: 'layer-bg', role: 'background', zIndex: 1, dependsOn: [], clipRefs: [], mustContain: [{ elementType: 'background', minCount: 1 }], elements: [{ id: 'bg-1', type: 'background' }] },
      { id: 'layer-texture', role: 'texture_base', zIndex: 2, dependsOn: ['layer-bg'], clipRefs: [], mustContain: [], elements: [] },
      { id: 'layer-decor', role: 'decorative_base', zIndex: 3, dependsOn: ['layer-texture'], clipRefs: [], mustContain: [], elements: [] },
      { id: 'layer-markers', role: 'dial_markers', zIndex: 4, dependsOn: ['layer-decor'], clipRefs: [], mustContain: [], elements: [] },
      { id: 'layer-comp', role: 'complications', zIndex: 5, dependsOn: ['layer-markers'], clipRefs: [], mustContain: [], elements: [] },
      { id: 'layer-hands', role: 'hands', zIndex: 6, dependsOn: ['layer-comp'], clipRefs: [], mustContain: [{ elementType: 'time_pointer', minCount: 1 }], elements: [{ id: 'hands-1', type: 'time_pointer' }] },
      { id: 'layer-cover', role: 'hand_cover', zIndex: 7, dependsOn: ['layer-hands'], clipRefs: [], mustContain: [], elements: [] },
      { id: 'layer-fx', role: 'foreground_fx', zIndex: 8, dependsOn: ['layer-cover'], clipRefs: [], mustContain: [], elements: [] },
    ],
  },
  lightingModel: {
    globalLightDirectionDeg: 135,
    highlights: [{ elementId: 'hands-1', intensity: 0.7 }],
    shadows: [{ elementId: 'hands-1', intensity: 0.5 }],
  },
  colorModel: {
    palette: ['#0f172a', '#1d4ed8', '#0ea5e9', '#e5e7eb'],
    dominantColor: '#0f172a',
    contrastPairs: [{ fg: '#e5e7eb', bg: '#0f172a', ratio: 8.4 }],
  },
  textureModel: {
    materials: [{ id: 'mat-1', elementId: 'bg-1', materialType: 'brushed-metal', roughness: 0.6, metallic: 0.8 }],
  },
  complianceHints: {
    notes: ['Sample payload for compiler route bootstrap'],
    riskyZones: [],
  },
};

export default function CompilerPage() {
  const navigate = useNavigate();
  const [analysisText, setAnalysisText] = useState(() => JSON.stringify(SAMPLE_ANALYSIS, null, 2));
  const [compiledSvg, setCompiledSvg] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parsed = useMemo(() => {
    try {
      return { value: JSON.parse(analysisText) as unknown as WatchfaceAnalysisContract, error: null };
    } catch (error) {
      return {
        value: null,
        error: error instanceof Error ? error.message : 'Invalid JSON',
      };
    }
  }, [analysisText]);

  const layerStack = useMemo(() => {
    if (!parsed.value || typeof parsed.value !== 'object') return [];
    const candidate = (parsed.value as { layerModel?: { layerStack?: unknown } }).layerModel?.layerStack;
    return Array.isArray(candidate)
      ? candidate as Array<{ id: string; role: string; zIndex: number }>
      : [];
  }, [parsed.value]);

  const compliance = useMemo(() => {
    if (!parsed.value) return null;
    try {
      return validateAnalysisCompliance(parsed.value);
    } catch {
      return null;
    }
  }, [parsed.value]);

  const handleCompile = () => {
    if (!parsed.value || !compliance) return;
    try {
      const result = compileValidatedAnalysis(parsed.value, compliance);
      setCompiledSvg(result.svg);
      setErrorMessage(null);
    } catch (error) {
      setCompiledSvg('');
      setErrorMessage(error instanceof Error ? error.message : 'Compilation failed');
    }
  };

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
            disabled={!parsed.value || !compliance || !compliance.isCompliant}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs uppercase tracking-widest text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
          >
            <Hammer className="h-4 w-4" />
            Compile Analysis
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-zinc-300">Analysis JSON</h2>
            <textarea
              value={analysisText}
              onChange={(event) => setAnalysisText(event.target.value)}
              className="h-[520px] w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 font-mono text-xs text-zinc-100 outline-none focus:border-cyan-500"
              spellCheck={false}
            />
            {parsed.error ? <p className="mt-2 text-xs text-red-400">JSON error: {parsed.error}</p> : null}
          </section>

          <section className="space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-zinc-300">Layer Sequence</h2>
              <div className="space-y-1 text-xs text-zinc-300">
                {layerStack.map((layer) => (
                  <div key={layer.id} className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/40 px-2 py-1">
                    <span>{layer.role}</span>
                    <span className="text-zinc-500">z{layer.zIndex}</span>
                  </div>
                ))}
                {!parsed.error && layerStack.length === 0 ? (
                  <p className="text-xs text-zinc-500">No valid layerStack found in pasted JSON.</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-zinc-300">Validation Report</h2>
              <div className="space-y-2 text-xs">
                {compliance?.gates.map((gate) => (
                  <div key={gate.gateId} className="rounded border border-zinc-800 bg-zinc-900/40 p-2">
                    <div className="flex items-center gap-2 font-medium">
                      {gate.status === 'PASS' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                      )}
                      <span>{gate.title}</span>
                    </div>
                    <div className="mt-1 text-zinc-400">{gate.details.join(' | ')}</div>
                  </div>
                ))}
              </div>
              {errorMessage ? <p className="mt-2 text-xs text-red-400">{errorMessage}</p> : null}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-zinc-300">Compiled Preview (SVG)</h2>
              <div className="rounded border border-zinc-800 bg-black/30 p-2">
                {compiledSvg ? (
                  <div
                    className="mx-auto h-[320px] w-[320px] overflow-hidden rounded border border-zinc-700"
                    dangerouslySetInnerHTML={{ __html: compiledSvg }}
                  />
                ) : (
                  <p className="text-xs text-zinc-500">Run compile to preview deterministic output (v2 renderer).</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
