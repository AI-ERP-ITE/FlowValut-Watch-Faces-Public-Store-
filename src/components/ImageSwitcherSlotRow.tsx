/**
 * ImageSwitcherSlotRow.tsx — Spec 088 Phase B + Spec 089 (HTML source roundtrip)
 * Single row in the ImageSwitcherLab slot table.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import type { RangeSlot } from '@/types/imageSwitcher';
import { renderHtmlToDataUrl } from '@/lib/customIconStore';
import { sha256Hex } from '@/lib/firebaseStorageClient';

interface Props {
  slot: RangeSlot;
  policyType: string;
  isFixed: boolean;   // FIXED_CODES — no add/remove, no min/max
  onUpdate: (patch: Partial<RangeSlot>) => void;
  onRemove?: () => void;
}

const BAKE_SIZE = 128;

/** Extract just the <svg>...</svg> tag from a full HTML document string. */
function extractSvg(html: string): string | null {
  const m = html.match(/<svg[\s\S]*?<\/svg>/i);
  return m ? m[0] : null;
}

export default function ImageSwitcherSlotRow({ slot, policyType, isFixed, onUpdate, onRemove }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [baking, setBaking] = useState(false);
  const [bakeError, setBakeError] = useState<string | null>(null);
  const [liveHash, setLiveHash] = useState<string | null>(null);

  // Recompute hash of current sourceHtml whenever it changes — used for stale-bake detection
  useEffect(() => {
    let cancelled = false;
    const html = slot.sourceHtml ?? '';
    if (!html) { setLiveHash(null); return; }
    sha256Hex(html).then((h) => { if (!cancelled) setLiveHash(h); }).catch(() => {});
    return () => { cancelled = true; };
  }, [slot.sourceHtml]);

  const stale = useMemo(() => {
    if (!slot.sourceHtml || !slot.sourceHash || !liveHash) return false;
    return liveHash !== slot.sourceHash;
  }, [slot.sourceHtml, slot.sourceHash, liveHash]);

  // Extract SVG for live preview (avoids body-size conflicts from full HTML pages)
  const previewSvg = useMemo(() => extractSvg(slot.sourceHtml ?? ''), [slot.sourceHtml]);

  const previewSrcDoc = useMemo(() => {
    const content = previewSvg ?? (slot.sourceHtml ?? '');
    return `<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent;width:100%;height:100%;display:flex;align-items:center;justify-content:center;}svg,img{max-width:100%;max-height:100%;display:block;}</style></head><body>${content}</body></html>`;
  }, [previewSvg, slot.sourceHtml]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) onUpdate({ dataUrl });
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleBake = async () => {
    const html = slot.sourceHtml ?? '';
    if (!html.trim()) { setBakeError('source empty'); return; }
    setBaking(true);
    setBakeError(null);
    try {
      const dataUrl = await renderHtmlToDataUrl(html, BAKE_SIZE);
      if (!dataUrl) throw new Error('render returned empty');
      const hash = await sha256Hex(html);
      onUpdate({ dataUrl, sourceHtml: html, sourceHash: hash });
    } catch (err) {
      setBakeError(err instanceof Error ? err.message : 'bake failed');
    } finally {
      setBaking(false);
    }
  };

  return (
    <>
    <tr className="border-b border-white/5 hover:bg-white/3 transition-colors">
      {/* Slot # */}
      <td className="py-1.5 px-2 text-[10px] text-white/40 w-8 text-center">
        {slot.slotIndex}
      </td>

      {/* Label */}
      <td className="py-1 px-1.5">
        {isFixed ? (
          <span className="text-[11px] text-white/70">{slot.label}</span>
        ) : (
          <Input
            value={slot.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="h-6 text-[11px] bg-white/5 border-white/10 text-white px-1.5 w-full"
          />
        )}
      </td>

      {/* Code (FIXED_CODES only) */}
      {policyType === 'FIXED_CODES' && (
        <td className="py-1 px-1.5 text-[10px] text-white/40 w-12 text-center">
          {slot.code ?? '—'}
        </td>
      )}

      {/* Min / Max (ranges) */}
      {policyType !== 'FIXED_CODES' && (
        <>
          <td className="py-1 px-1 w-16">
            <Input
              type="number"
              value={slot.min ?? ''}
              onChange={(e) => onUpdate({ min: Number(e.target.value) })}
              className="h-6 text-[11px] bg-white/5 border-white/10 text-white px-1.5"
            />
          </td>
          <td className="py-1 px-1 w-16">
            <Input
              type="number"
              value={slot.max ?? ''}
              onChange={(e) => onUpdate({ max: Number(e.target.value) })}
              className="h-6 text-[11px] bg-white/5 border-white/10 text-white px-1.5"
            />
          </td>
        </>
      )}

      {/* Image */}
      <td className="py-1 px-1.5 w-28">
        <div className="flex items-center gap-1.5">
          {slot.dataUrl ? (
            <img
              src={slot.dataUrl}
              alt={`slot ${slot.slotIndex}`}
              className="w-8 h-8 rounded object-contain bg-black/30 border border-white/10"
            />
          ) : (
            <div className="w-8 h-8 rounded border border-dashed border-white/20 bg-black/20 flex items-center justify-center">
              <span className="text-[8px] text-white/25">PNG</span>
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[10px] px-1.5 py-0.5 rounded border border-white/20 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            {slot.dataUrl ? 'Replace' : 'Upload'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => setExpanded((v) => !v)}
            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
              expanded
                ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200'
                : 'border-white/20 bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="Edit HTML/SVG source for this slot"
          >
            HTML
          </button>
          {stale && (
            <span
              className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-200"
              title="source HTML changed — rebake to refresh PNG"
            >
              rebake
            </span>
          )}
        </div>
      </td>

      {/* Remove */}
      <td className="py-1 px-1 w-7">
        {!isFixed && onRemove && (
          <button
            onClick={onRemove}
            className="text-white/30 hover:text-red-400 transition-colors text-[11px] w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/10"
            title="Remove slot"
          >
            ✕
          </button>
        )}
      </td>
    </tr>

    {expanded && (
      <tr className="border-b border-white/5 bg-black/20">
        <td colSpan={8} className="py-2 px-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* HTML / SVG editor */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wide text-white/40">
                HTML / SVG source (slot {slot.slotIndex})
              </label>
              <textarea
                value={slot.sourceHtml ?? ''}
                onChange={(e) => onUpdate({ sourceHtml: e.target.value })}
                spellCheck={false}
                placeholder="<svg viewBox='0 0 64 64'>...</svg>  or  <div style='...'>...</div>"
                className="font-mono text-[11px] leading-snug bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white/85 min-h-[140px] resize-y focus:outline-none focus:border-cyan-400/50"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBake}
                  disabled={baking || !(slot.sourceHtml ?? '').trim()}
                  className="text-[10px] px-2 py-1 rounded border border-cyan-400/40 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {baking ? 'Baking…' : 'Bake to PNG'}
                </button>
                {bakeError && (
                  <span className="text-[10px] text-red-300">⚠ {bakeError}</span>
                )}
                {!bakeError && slot.sourceHash && !stale && (
                  <span className="text-[10px] text-emerald-300/80">✓ baked</span>
                )}
              </div>
            </div>

            {/* Live iframe preview */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wide text-white/40">
                Live preview
              </label>
              <div className="bg-black/40 border border-white/10 rounded p-2 flex items-center justify-center min-h-[140px]">
                <iframe
                  title={`slot-${slot.slotIndex}-preview`}
                  sandbox=""
                  srcDoc={previewSrcDoc}
                  style={{ width: 128, height: 128, border: 'none', background: 'transparent' }}
                />
              </div>
              <p className="text-[9px] text-white/35">
                Preview rasterized at {BAKE_SIZE}×{BAKE_SIZE} on bake. Sandboxed (no script execution).
              </p>
            </div>
          </div>
        </td>
      </tr>
    )}
    </>
  );
}
