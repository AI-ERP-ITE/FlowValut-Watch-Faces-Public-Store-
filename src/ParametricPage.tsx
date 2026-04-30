import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type StyleKey = 'gold_dark' | 'steel_night';
type ColorMode = 'off' | 'warning' | 'enforce';
type TemplateElement = Record<string, unknown> & {
  name?: string;
};
type TemplateModel = {
  layout?: Record<string, unknown>;
  scale?: Record<string, unknown>;
  relationships?: Record<string, unknown>;
  effects3d?: Record<string, unknown>;
  styleAdjust?: Record<string, unknown>;
  texture?: Record<string, unknown>;
  elements: Array<TemplateElement>;
};

const SAMPLE_ELEMENTS: Array<{ name: string; element: TemplateElement }> = [
  {
    name: 'Base Bezel Ring',
    element: {
      type: 'bezel',
      role: 'bezel',
      name: 'Base Bezel Ring',
      params: { radius: 0.48, thickness: 0.02, stroke: '#d2b879' },
      placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
    },
  },
  {
    name: 'Main Radial Ticks',
    element: {
      type: 'ticks_radial',
      role: 'ticks',
      name: 'Main Radial Ticks',
      params: { count: 60, radius: 0.42, length: 0.02, width: 0.003, majorEvery: 5, majorLength: 0.035 },
      placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
    },
  },
  {
    name: 'Free Circle Marker',
    element: {
      type: 'free_circle',
      role: 'free_circle',
      name: 'Free Circle Marker',
      placement: { mode: 'anchor', config: { anchor: 'top', offset: [0, 16], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
      params: { radius: 0.06, thickness: 0.008, fill: '#4b5a78', stroke: '#d9e4ff' },
    },
  },
  {
    name: 'Free Bottom Card',
    element: {
      type: 'free_rect',
      role: 'free_rect',
      name: 'Free Bottom Card',
      placement: { mode: 'anchor', config: { anchor: 'bottom', offset: [0, -20], rotation: 18 } },
      symmetry: { mode: 'none', config: {} },
      params: { width: 0.28, height: 0.11, cornerRadius: 0.03, thickness: 0.008, fill: '#5f536e', stroke: '#e5dcf1' },
    },
  },
  {
    name: 'Outline Ring',
    element: {
      type: 'outline_ring',
      role: 'outline_ring',
      name: 'Outline Ring',
      placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
      params: { radius: 0.44, thickness: 0.016, stroke: '#d6bb6a' },
    },
  },
  {
    name: 'Outline Frame',
    element: {
      type: 'outline_rect',
      role: 'outline_rect',
      name: 'Outline Frame',
      placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
      params: { width: 0.75, height: 0.9, cornerRadius: 0.06, thickness: 0.01, stroke: '#8ca0bf' },
    },
  },
  {
    name: 'Texture Grain Layer',
    element: {
      type: 'texture_layer',
      role: 'grain_top',
      name: 'Texture Grain Layer',
      placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
      symmetry: { mode: 'none', config: {} },
      params: {
        shape: 'ring',
        radius: 0.44,
        thickness: 0.03,
        opacity: 0.35,
        gradient: {
          from: [0, 0],
          to: [100, 100],
          stops: [
            { offset: 0, color: '#f5e6b0', opacity: 0.3 },
            { offset: 0.5, color: '#8b7a4e', opacity: 0.22 },
            { offset: 1, color: '#1b150b', opacity: 0.36 },
          ],
        },
        noise: { density: 0.72, effectRadius: 14 },
      },
    },
  },
];

const PARAMETRIC_TEMPLATE_STORAGE_KEY = 'parametric-template-elements-v1';

const DEFAULT_COLOR_CONTROL = {
  colorControl: {
    mode: 'off' as ColorMode,
    quantization: 'rgb565',
    palette: [],
    luminanceClamp: {
      enabled: false,
      min: 0.2,
      max: 0.8,
    },
    tolerance: 2,
  },
};

export default function ParametricPage() {
  const navigate = useNavigate();
  const [activeStyle, setActiveStyle] = useState<StyleKey>('gold_dark');
  const [colorMode, setColorMode] = useState<ColorMode>('off');
  const [ringRadius, setRingRadius] = useState(44);
  const [tickWidth, setTickWidth] = useState(0.8);
  const [workingTemplate, setWorkingTemplate] = useState<TemplateModel | null>(null);
  const [draftJson, setDraftJson] = useState(
    JSON.stringify(
      {
        type: 'circle',
        role: 'new_marker',
        materialRef: 'brushed_steel',
        params: { r: 2.5, strokeWidth: 1 },
        placement: { mode: 'anchor', config: { anchor: 'top', offset: [0, 10], rotation: 0 } },
        symmetry: { mode: 'none', config: {} },
      },
      null,
      2,
    ),
  );
  const [draftError, setDraftError] = useState<string | null>(null);
  const [previewCandidate, setPreviewCandidate] = useState<TemplateElement | null>(null);
  const [editingNameIndex, setEditingNameIndex] = useState<number | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [svgMarkup, setSvgMarkup] = useState('');
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStoredTemplate = (): TemplateModel | null => {
    try {
      const raw = window.localStorage.getItem(PARAMETRIC_TEMPLATE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as TemplateModel;
      if (!parsed || !Array.isArray(parsed.elements)) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const saveStoredTemplate = (template: TemplateModel) => {
    try {
      window.localStorage.setItem(PARAMETRIC_TEMPLATE_STORAGE_KEY, JSON.stringify(template));
    } catch {
      // Ignore storage write failures and keep in-memory state.
    }
  };

  const ensureElementName = (element: TemplateElement, fallbackIndex = 0): TemplateElement => {
    const role = typeof element.role === 'string' ? element.role : 'element';
    const type = typeof element.type === 'string' ? element.type : 'item';
    const existing = typeof element.name === 'string' ? element.name.trim() : '';
    return {
      ...element,
      name: existing.length > 0 ? existing : `${type}-${role}-${fallbackIndex + 1}`,
    };
  };

  const parseDraftElement = (): TemplateElement | null => {
    if (!draftJson.trim()) {
      setDraftError('JSON field is empty. Paste an element object first.');
      return null;
    }

    try {
      const parsed = JSON.parse(draftJson) as TemplateElement;
      if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') {
        throw new Error('Element JSON must be an object with string field: type');
      }
      setDraftError(null);
      return ensureElementName(parsed);
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : 'Invalid element JSON.');
      return null;
    }
  };

  const parseDraftTemplate = (): TemplateModel | null => {
    if (!draftJson.trim()) return null;

    try {
      const parsed = JSON.parse(draftJson) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object') return null;
      if (!Array.isArray(parsed.elements)) return null;

      const normalizedElements = parsed.elements
        .filter((entry) => entry && typeof entry === 'object')
        .map((entry, index) => ensureElementName(entry as TemplateElement, index));

      const normalized: TemplateModel = {
        elements: normalizedElements,
      };
      if (parsed.layout && typeof parsed.layout === 'object') normalized.layout = parsed.layout as Record<string, unknown>;
      if (parsed.scale && typeof parsed.scale === 'object') normalized.scale = parsed.scale as Record<string, unknown>;
      if (parsed.relationships && typeof parsed.relationships === 'object') {
        normalized.relationships = parsed.relationships as Record<string, unknown>;
      }
      if (parsed.effects3d && typeof parsed.effects3d === 'object') {
        normalized.effects3d = parsed.effects3d as Record<string, unknown>;
      }
      if (parsed.styleAdjust && typeof parsed.styleAdjust === 'object') {
        normalized.styleAdjust = parsed.styleAdjust as Record<string, unknown>;
      }
      if (parsed.texture && typeof parsed.texture === 'object') {
        normalized.texture = parsed.texture as Record<string, unknown>;
      }
      return normalized;
    } catch {
      return null;
    }
  };

  const renderPreview = async () => {
    setIsRendering(true);
    setError(null);

    try {
      // Runtime module sits outside src and is bundled by Vite; TS lacks direct type metadata here.
      // @ts-expect-error runtime import is validated by integration build and smoke render.
      const engineModule = (await import('../engine/index.js')) as {
        getTemplateSnapshot: () => TemplateModel;
        runEngine: (args?: {
          activeStyle?: StyleKey;
          paramOverrides?: Record<string, Record<string, number>>;
          templateInput?: TemplateModel;
          colorControl?: typeof DEFAULT_COLOR_CONTROL;
        }) => string;
      };

      const storedTemplate = loadStoredTemplate();
      const snapshot = workingTemplate ?? storedTemplate ?? engineModule.getTemplateSnapshot();
      if (!workingTemplate && snapshot) {
        setWorkingTemplate(snapshot);
      }

      const fullTemplate = parseDraftTemplate();
      if (fullTemplate) {
        setPreviewCandidate(null);
        const svg = engineModule.runEngine({
          activeStyle,
          templateInput: fullTemplate,
          paramOverrides: {
            ring: { radius: ringRadius },
            tick: { width: tickWidth },
          },
          colorControl: {
            ...DEFAULT_COLOR_CONTROL,
            colorControl: {
              ...DEFAULT_COLOR_CONTROL.colorControl,
              mode: colorMode,
            },
          },
        });
        setSvgMarkup(svg);
        setDraftError(null);
        return;
      }

      const candidate = parseDraftElement();
      if (!candidate) {
        setIsRendering(false);
        return;
      }
      setPreviewCandidate(candidate);

      const previewTemplate: TemplateModel = {
        ...snapshot,
        elements: [...(snapshot.elements ?? []), candidate],
      };

      const svg = engineModule.runEngine({
        activeStyle,
        templateInput: previewTemplate,
        paramOverrides: {
          ring: { radius: ringRadius },
          tick: { width: tickWidth },
        },
        colorControl: {
          ...DEFAULT_COLOR_CONTROL,
          colorControl: {
            ...DEFAULT_COLOR_CONTROL.colorControl,
            mode: colorMode,
          },
        },
      });

      setSvgMarkup(svg);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to render parametric preview.');
    } finally {
      setIsRendering(false);
    }
  };

  const handleSaveCandidate = () => {
    if (!previewCandidate) {
      setDraftError('Preview an element first, then click Save Element.');
      return;
    }

    setWorkingTemplate((prev) => {
      const base = prev ?? { elements: [] };
      const next = { ...base, elements: [...base.elements, ensureElementName(previewCandidate, base.elements.length)] };
      saveStoredTemplate(next);
      return next;
    });
  };

  const injectAllSampleElements = () => {
    setWorkingTemplate((prev) => {
      const base = prev ?? { elements: [] };
      const startIndex = base.elements.length;
      const injected = SAMPLE_ELEMENTS.map((sample, i) => ensureElementName(sample.element, startIndex + i));
      const next = { ...base, elements: [...base.elements, ...injected] };
      saveStoredTemplate(next);
      return next;
    });
  };

  const loadSampleToDraft = (sample: TemplateElement) => {
    setDraftJson(JSON.stringify(sample, null, 2));
    setDraftError(null);
  };

  const beginRenameElement = (index: number) => {
    const element = workingTemplate?.elements[index];
    if (!element) return;
    setEditingNameIndex(index);
    setEditingNameValue(typeof element.name === 'string' ? element.name : '');
  };

  const saveRenameElement = (index: number) => {
    const nextName = editingNameValue.trim();
    setWorkingTemplate((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        elements: prev.elements.map((element, i) =>
          i === index
            ? {
                ...element,
                name: nextName.length > 0 ? nextName : ensureElementName(element, index).name,
              }
            : element,
        ),
      };
      saveStoredTemplate(next);
      return next;
    });
    setEditingNameIndex(null);
    setEditingNameValue('');
  };

  const cancelRenameElement = () => {
    setEditingNameIndex(null);
    setEditingNameValue('');
  };

  const removeElementAt = (index: number) => {
    setWorkingTemplate((prev) => {
      if (!prev) return prev;
      const next = { ...prev, elements: prev.elements.filter((_, i) => i !== index) };
      saveStoredTemplate(next);
      return next;
    });
  };

  useEffect(() => {
    void renderPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_8%_12%,#1e293b_0%,#0b1020_35%,#08090c_100%)] text-white p-6">
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-zinc-800/80 bg-zinc-950/90 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-amber-300">Deterministic Engine</p>
            <h1 className="mt-2 text-2xl font-semibold">Parametric Watchface Designer</h1>
            <p className="mt-2 text-sm text-zinc-300">
              Build repeatable geometry with placement and symmetry rules, then preview exact SVG output before export.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            onClick={() => navigate('/studio')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Studio
          </Button>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-100">Controls</h2>

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-wide text-zinc-400">Style</span>
              <select
                value={activeStyle}
                onChange={(e) => setActiveStyle(e.target.value as StyleKey)}
                className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm"
              >
                <option value="gold_dark">gold_dark</option>
                <option value="steel_night">steel_night</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-wide text-zinc-400">Color Mode</span>
              <select
                value={colorMode}
                onChange={(e) => setColorMode(e.target.value as ColorMode)}
                className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm"
              >
                <option value="off">off</option>
                <option value="warning">warning</option>
                <option value="enforce">enforce</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-wide text-zinc-400">Bezel Radius: {ringRadius.toFixed(1)}</span>
              <input
                type="range"
                min={20}
                max={48}
                step={0.5}
                value={ringRadius}
                onChange={(e) => setRingRadius(Number(e.target.value))}
                className="w-full"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-wide text-zinc-400">Tick Width: {tickWidth.toFixed(2)}</span>
              <input
                type="range"
                min={0.2}
                max={3}
                step={0.05}
                value={tickWidth}
                onChange={(e) => setTickWidth(Number(e.target.value))}
                className="w-full"
              />
            </label>

            <Button
              type="button"
              className="h-10 w-full bg-amber-500 text-black hover:bg-amber-400"
              onClick={() => void renderPreview()}
              disabled={isRendering}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRendering ? 'animate-spin' : ''}`} />
              {isRendering ? 'Rendering...' : 'Apply To Preview'}
            </Button>

            {error ? <p className="text-xs text-red-400">{error}</p> : null}
          </aside>

          <div className="space-y-4">
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <h2 className="text-sm font-semibold text-zinc-100">Live Preview</h2>
              <div className="mt-3 grid place-items-center rounded-lg border border-zinc-800 bg-black/60 p-4 min-h-[360px]">
                {svgMarkup ? (
                  <div
                    className="w-full max-w-[420px]"
                    dangerouslySetInnerHTML={{ __html: svgMarkup }}
                  />
                ) : (
                  <p className="text-sm text-zinc-500">No preview generated yet.</p>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <h2 className="text-sm font-semibold text-zinc-100">SVG Output</h2>
              <textarea
                value={svgMarkup}
                readOnly
                className="mt-3 h-52 w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] leading-5 text-zinc-300"
              />
            </section>

            <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-100">Elements</h2>
                <span className="text-xs text-zinc-400">
                  {(workingTemplate?.elements ?? []).length} item(s)
                </span>
              </div>

              <div className="mt-3 max-h-56 overflow-auto rounded-md border border-zinc-800 bg-zinc-950/70">
                {(workingTemplate?.elements ?? []).map((element, index) => {
                  const name = typeof element.name === 'string' ? element.name : `element-${index + 1}`;
                  const role = typeof element.role === 'string' ? element.role : 'no-role';
                  const type = typeof element.type === 'string' ? element.type : 'unknown';
                  const placement =
                    element.placement && typeof element.placement === 'object' && 'mode' in element.placement
                      ? String((element.placement as { mode?: unknown }).mode ?? 'none')
                      : 'none';
                  const symmetry =
                    element.symmetry && typeof element.symmetry === 'object' && 'mode' in element.symmetry
                      ? String((element.symmetry as { mode?: unknown }).mode ?? 'none')
                      : 'none';

                  return (
                    <div key={`${type}-${role}-${index}`} className="flex items-center justify-between border-b border-zinc-800 px-3 py-2 text-xs gap-2">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        {editingNameIndex === index ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={editingNameValue}
                              onChange={(e) => setEditingNameValue(e.target.value)}
                              className="h-7 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                              placeholder="Element name"
                            />
                            <button
                              type="button"
                              onClick={() => saveRenameElement(index)}
                              className="rounded border border-emerald-700 px-2 py-1 text-emerald-300 hover:bg-emerald-900/30"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelRenameElement}
                              className="rounded border border-zinc-700 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <p className="font-medium text-zinc-200 truncate">{name} · {type} · {role}</p>
                        )}
                        <p className="text-zinc-500">placement: {placement} · symmetry: {symmetry}</p>
                      </div>
                      {editingNameIndex !== index ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => beginRenameElement(index)}
                            className="rounded border border-zinc-700 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeElementAt(index)}
                            className="rounded border border-zinc-700 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {(workingTemplate?.elements ?? []).length === 0 ? (
                  <p className="px-3 py-4 text-xs text-zinc-500">No elements loaded yet.</p>
                ) : null}
              </div>

              <h3 className="mt-4 text-xs uppercase tracking-wide text-zinc-400">Draft Element JSON</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                  onClick={injectAllSampleElements}
                >
                  Inject All Samples
                </Button>
                {SAMPLE_ELEMENTS.map((sample) => (
                  <Button
                    key={sample.name}
                    type="button"
                    variant="outline"
                    className="h-8 border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                    onClick={() => loadSampleToDraft(sample.element)}
                  >
                    {sample.name}
                  </Button>
                ))}
              </div>
              <textarea
                value={draftJson}
                onChange={(e) => setDraftJson(e.target.value)}
                className="mt-2 h-40 w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] leading-5 text-zinc-300"
              />
              {draftError ? <p className="mt-2 text-xs text-red-400">{draftError}</p> : null}
              {previewCandidate ? <p className="mt-2 text-xs text-emerald-400">Preview ready. Click Save Element to add it to the Elements list.</p> : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                  onClick={() => void renderPreview()}
                >
                  Apply To Preview
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                  onClick={handleSaveCandidate}
                >
                  Save Element
                </Button>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
