import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type StyleKey = 'gold_dark' | 'steel_night';
type ColorMode = 'off' | 'warning' | 'enforce';

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
  const [svgMarkup, setSvgMarkup] = useState('');
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renderPreview = async () => {
    setIsRendering(true);
    setError(null);

    try {
      // Runtime module sits outside src and is bundled by Vite; TS lacks direct type metadata here.
      // @ts-expect-error runtime import is validated by integration build and smoke render.
      const engineModule = (await import('../engine/index.js')) as {
        runEngine: (args?: {
          activeStyle?: StyleKey;
          paramOverrides?: Record<string, Record<string, number>>;
          colorControl?: typeof DEFAULT_COLOR_CONTROL;
        }) => string;
      };

      const svg = engineModule.runEngine({
        activeStyle,
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
              {isRendering ? 'Rendering...' : 'Render Preview'}
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
          </div>
        </div>
      </section>
    </main>
  );
}
