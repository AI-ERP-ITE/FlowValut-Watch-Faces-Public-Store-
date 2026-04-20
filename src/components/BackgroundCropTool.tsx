// Spec 011 — Background Image Crop & Position Tool
// Interactive canvas with circular mask, pan, scale, export.

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Grid3X3 } from 'lucide-react';

const SIZE = 480; // canvas and output size
const RADIUS = SIZE / 2; // 240

interface Props {
  file: File;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}

export function BackgroundCropTool({ file, onConfirm, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Pan offset (image top-left relative to canvas origin)
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  // Scale
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);

  // Drag state
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  // Grid overlay (visible canvas only — export is separate offscreen canvas)
  const [showCropGrid, setShowCropGrid] = useState(false);

  // ── T003: Load image ──────────────────────────────────────────────────────
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      imgRef.current = img;

      // T004/T005: compute min scale to fill circle, center by default
      const ms = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
      setMinScale(ms);
      setScale(ms);
      setOffset({
        x: (SIZE - img.naturalWidth * ms) / 2,
        y: (SIZE - img.naturalHeight * ms) / 2,
      });
    };
    img.src = url;
  }, [file]);

  // ── Draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, SIZE, SIZE);

    // T006: clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(RADIUS, RADIUS, RADIUS, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, offset.x, offset.y, img.naturalWidth * scale, img.naturalHeight * scale);
    ctx.restore();

    // T007: darkened overlay outside circle
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    ctx.rect(0, 0, SIZE, SIZE);
    ctx.arc(RADIUS, RADIUS, RADIUS, 0, Math.PI * 2, true); // counter-clockwise = hole
    ctx.fill('evenodd');
    ctx.restore();

    // Circle border
    ctx.save();
    ctx.strokeStyle = 'rgba(0,212,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(RADIUS, RADIUS, RADIUS - 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Alignment grid (clipped to circle, never touches export canvas)
    if (showCropGrid) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(RADIUS, RADIUS, RADIUS - 1, 0, Math.PI * 2);
      ctx.clip();
      const third = SIZE / 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(third * i, 0); ctx.lineTo(third * i, SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, third * i); ctx.lineTo(SIZE, third * i); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath(); ctx.moveTo(RADIUS, 0); ctx.lineTo(RADIUS, SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, RADIUS); ctx.lineTo(SIZE, RADIUS); ctx.stroke();
      ctx.restore();
    }
  }, [offset, scale, showCropGrid]);

  useEffect(() => { draw(); }, [draw]);

  // ── T011: Constrain offset — center when image smaller than canvas, fill-clamp when larger ──
  const constrain = useCallback((ox: number, oy: number, sc: number, img: HTMLImageElement) => {
    const iw = img.naturalWidth * sc;
    const ih = img.naturalHeight * sc;
    // When image is smaller than canvas in a dimension, center it in that dimension
    const x = iw >= SIZE ? Math.min(0, Math.max(ox, SIZE - iw)) : (SIZE - iw) / 2;
    const y = ih >= SIZE ? Math.min(0, Math.max(oy, SIZE - ih)) : (SIZE - ih) / 2;
    return { x, y };
  }, []);

  // ── T008/T009: Pan handlers ───────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
  }, [offset]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || !imgRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    // Scale factor: canvas may be CSS-smaller than 480
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = SIZE / rect.width;
    const scaleY = SIZE / rect.height;
    const newOffset = constrain(
      dragRef.current.ox + dx * scaleX,
      dragRef.current.oy + dy * scaleY,
      scale,
      imgRef.current,
    );
    setOffset(newOffset);
  }, [scale, constrain]);

  const onPointerUp = useCallback(() => { dragRef.current = null; }, []);

  // ── T012–T014: Scale slider ───────────────────────────────────────────────
  const onScaleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newScale = parseFloat(e.target.value);
    const img = imgRef.current;
    if (!img) return;
    setScale(newScale);
    setOffset(prev => constrain(prev.x, prev.y, newScale, img));
  }, [constrain]);

  // ── T019: Reset ───────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const ms = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
    setScale(ms);
    setOffset({
      x: (SIZE - img.naturalWidth * ms) / 2,
      y: (SIZE - img.naturalHeight * ms) / 2,
    });
  }, []);

  // ── T016–T018: Export ─────────────────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const off = document.createElement('canvas');
    off.width = SIZE;
    off.height = SIZE;
    const ctx = off.getContext('2d')!;
    ctx.beginPath();
    ctx.arc(RADIUS, RADIUS, RADIUS, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, offset.x, offset.y, img.naturalWidth * scale, img.naturalHeight * scale);
    onConfirm(off.toDataURL('image/png'));
  }, [offset, scale, onConfirm]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* T002: 480×480 canvas (displayed at 320px, pixel buffer 480) */}
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        style={{ width: 320, height: 320, borderRadius: '50%', cursor: 'grab', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />

      {/* T012: Scale slider + grid toggle */}
      <div className="w-full max-w-xs flex items-center gap-3">
        <span className="text-xs text-zinc-400">Zoom</span>
        <input
          type="range"
          min={0.1}
          max={minScale * 4}
          step={0.005}
          value={scale}
          onChange={onScaleChange}
          className="flex-1 accent-cyan-500"
        />
        <button
          onClick={() => setShowCropGrid(g => !g)}
          title="Toggle alignment grid"
          className={`p-1 rounded transition-colors ${showCropGrid ? 'text-cyan-400 bg-cyan-400/10' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Grid3X3 className="h-4 w-4" />
        </button>
      </div>

      {/* T019/T020: Reset + Confirm + Cancel */}
      <div className="flex gap-3 w-full max-w-xs">
        <Button variant="outline" className="flex-1 border-zinc-600 text-zinc-300" onClick={handleReset}>
          Reset
        </Button>
        <Button variant="outline" className="flex-1 border-zinc-600 text-zinc-300" onClick={onCancel}>
          Cancel
        </Button>
        <Button className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white" onClick={handleConfirm}>
          Use This
        </Button>
      </div>
    </div>
  );
}
