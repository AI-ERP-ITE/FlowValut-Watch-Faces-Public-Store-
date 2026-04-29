import React, { useRef, useEffect, useCallback, useState, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { BackgroundTransform, WatchFaceElement } from '@/types';
import { getIconByKey } from '@/lib/iconLibrary';
import { getFontStyle } from '@/lib/fontLibrary';
import { generateWeatherSet } from '@/lib/weatherIconSets';
import type { WeatherStyle } from '@/lib/weatherIconSets';
import { generateHandSet } from '@/lib/handStyles';
import type { HandStyleKey } from '@/lib/handStyles';
import { resolveCustomHandPack, type CustomHandRecord } from '@/lib/customHandStore';
import { normalizeEngraveFrameForParity, renderEngraveFrameEffect } from '@/lib/engraveFrameRenderer';
import { hasNonDefaultPointerEffects, normalizePointerEffects } from '@/lib/pointerEffects';
import { bakeDeterministicColorAdjustments, bakeDeterministicIconEffects } from '@/lib/effectsBakeEngine';
import { normalizeDropShadowForBake, pointerShadowToDropShadow } from '@/lib/effectNormalization';
import { analyzeFlicker, isFlickerForbiddenRgb } from '@/utils/flickerEngine';
import {
  DEFAULT_GAUGE_POINTER_FILENAME,
  createDefaultGaugePointerDataUrl,
  normalizeGaugePivot,
} from '@/lib/gaugePointerDefaults';

const CANVAS_SIZE = 480;
const CX = 240;
const CY = 240;

// Mock time: 10:10:30 — visually balanced, classic watchface demo pose
const MOCK_HOUR = 10;
const MOCK_MINUTE = 10;
const MOCK_SECOND = 30;

const DEVICE_SIM_GAMMA = 0.8;
const DEVICE_SIM_CONTRAST = 1.22;
const DEVICE_SIM_DITHER = 0.75;
const DEVICE_SIM_SHARPEN_CENTER = 1.16;
const DEVICE_SIM_SHARPEN_NEIGHBOR = 0.04;

export interface InteractiveCanvasProps {
  backgroundImage?: string;
  backgroundTransform?: BackgroundTransform;
  elements: WatchFaceElement[];
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onUpdateElement?: (id: string, changes: Partial<WatchFaceElement>) => void;
  onAddElement?: (el: WatchFaceElement) => void;
  showGrid?: boolean;
  calibrationEnabled?: boolean;
  flickerAnalysisEnabled?: boolean;
  flickerOverlayEnabled?: boolean;
  refreshToken?: number;
  onElementWarningsChange?: (warnings: ElementWarningsMap) => void;
  className?: string;
  customHandStyles?: CustomHandRecord[];
}

export interface ElementWarningInfo {
  hasFlickerRisk: boolean;
  ratio: number;
  severity: 'none' | 'medium' | 'high';
  invalidPixelCount: number;
  visiblePixelCount: number;
}

export type ElementWarningsMap = Record<string, ElementWarningInfo>;

export const InteractiveCanvas = forwardRef<HTMLCanvasElement, InteractiveCanvasProps>(function InteractiveCanvas({
  backgroundImage,
  backgroundTransform,
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onAddElement: _onAddElement,
  showGrid,
  calibrationEnabled,
  flickerAnalysisEnabled,
  flickerOverlayEnabled,
  refreshToken,
  onElementWarningsChange,
  className,
  customHandStyles,
}, forwardedRef) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const elementsRef = useRef(elements);
  elementsRef.current = elements;
  const customHandStylesRef = useRef(customHandStyles ?? []);
  customHandStylesRef.current = customHandStyles ?? [];

  // Drag state (refs to avoid stale closures)
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragSnapshotRef = useRef<WatchFaceElement | null>(null);
  const resizeHandleRef = useRef<string | null>(null); // 'TL','TC','TR','ML','MR','BL','BC','BR'
  const selectedElementIdRef = useRef(selectedElementId);
  selectedElementIdRef.current = selectedElementId;
  const showGridRef = useRef(showGrid);
  showGridRef.current = showGrid;
  const iconImageCache = useRef(new Map<string, HTMLImageElement>());
  const digitImageCache = useRef(new Map<string, HTMLImageElement>());
  // handImageCache: style key → { hour, minute, second, cover } images
  const handImageCache = useRef(new Map<string, Map<string, HTMLImageElement>>());
  const lastWarningsKeyRef = useRef<string>('');
  const lastWarningPayloadRef = useRef<ElementWarningsMap>({});
  const lastComputedVersionRef = useRef<Record<string, number>>({});
  const lastFlickerAnalysisEnabledRef = useRef<boolean>(!!flickerAnalysisEnabled);
  const lastRefreshTokenRef = useRef<number>(refreshToken ?? 0);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const analysisCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  useState(0); // reserved for future forced re-renders

  // Clear custom hand cache entries when custom styles change (user created/updated a hand in IconLab)
  useEffect(() => {
    if (!customHandStyles) return;
    const builtInKeys = new Set(['white', 'silver', 'black', 'brown', 'gold', 'poedagar', 'fleming', 'montagut', 'olevs']);
    for (const key of handImageCache.current.keys()) {
      if (!builtInKeys.has(key)) handImageCache.current.delete(key);
    }
  }, [customHandStyles]);

  // Draw everything to canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.imageSmoothingEnabled = !calibrationEnabled;

    // Background
    if (bgImageRef.current) {
      drawBackground(ctx, bgImageRef.current, backgroundTransform);
    } else {
      drawBlackCircle(ctx);
    }

    // Grid overlay
    if (showGridRef.current) drawGrid(ctx);

    // Elements
    drawElements(ctx, elements, iconImageCache.current, digitImageCache.current, draw, handImageCache.current, customHandStylesRef.current);

    let sceneFlickerMask: Uint8Array | null = null;

    if (flickerAnalysisEnabled) {
      const forceRecompute =
        !lastFlickerAnalysisEnabledRef.current
        || lastRefreshTokenRef.current !== (refreshToken ?? 0);

      const warningPayload = computeElementWarningsIsolated(elements, {
        previousWarnings: lastWarningPayloadRef.current,
        lastComputedVersion: lastComputedVersionRef.current,
        iconCache: iconImageCache.current,
        digitCache: digitImageCache.current,
        handCache: handImageCache.current,
        customHands: customHandStylesRef.current,
        onAssetLoaded: draw,
        forceRecompute,
        threshold: 0.02,
        analysisCanvasRef,
        analysisCtxRef,
      });

      const warningKey = JSON.stringify(warningPayload);
      if (warningKey !== lastWarningsKeyRef.current) {
        lastWarningsKeyRef.current = warningKey;
        lastWarningPayloadRef.current = warningPayload;
        onElementWarningsChange?.(warningPayload);
      }
      if (flickerOverlayEnabled) {
        sceneFlickerMask = computeSceneFlickerMask(ctx);
      }
    } else {
      if (lastWarningsKeyRef.current !== '{}') {
        lastWarningsKeyRef.current = '{}';
        lastWarningPayloadRef.current = {};
        lastComputedVersionRef.current = {};
        onElementWarningsChange?.({});
      }
    }

    if (calibrationEnabled) {
      applyCalibrationSimulation(ctx);
    }

    if (flickerOverlayEnabled && sceneFlickerMask) {
      applyFlickerOverlayWithMask(ctx, sceneFlickerMask);
    }

    lastFlickerAnalysisEnabledRef.current = !!flickerAnalysisEnabled;
    lastRefreshTokenRef.current = refreshToken ?? 0;

    // Selection highlight (drawn after simulation so editor controls remain readable)
    if (selectedElementId) {
      const sel = elements.find((el) => el.id === selectedElementId);
      if (sel) drawSelection(ctx, sel);
    }
  }, [backgroundTransform, calibrationEnabled, elements, flickerAnalysisEnabled, flickerOverlayEnabled, onElementWarningsChange, refreshToken, selectedElementId]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Suppress click after a drag
    if (isDraggingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCanvasPos(e, canvas);

    const visible = [...elementsRef.current]
      .filter(el => el.visible)
      .sort((a, b) => b.zIndex - a.zIndex);
    const hit = hitTest(x, y, visible);
    onSelectElement?.(hit);
  }, [onSelectElement]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCanvasPos(e, canvas);

    // Check resize handles on selected rect element first
    const selId = selectedElementIdRef.current;
    if (selId) {
      const selEl = elementsRef.current.find(el => el.id === selId);
      if (selEl && selEl.type !== 'ARC_PROGRESS' && selEl.type !== 'TIME_POINTER') {
        const handle = hitTestRectHandle(x, y, selEl.bounds);
        if (handle) {
          resizeHandleRef.current = handle;
          isDraggingRef.current = false;
          dragStartRef.current = { x, y };
          dragSnapshotRef.current = { ...selEl, bounds: { ...selEl.bounds } };
          return;
        }
      }
      // Check arc handles on selected arc element
      if (selEl && selEl.type === 'ARC_PROGRESS') {
        const arcHandle = hitTestArcHandle(x, y, selEl);
        if (arcHandle) {
          resizeHandleRef.current = arcHandle;
          isDraggingRef.current = false;
          dragStartRef.current = { x, y };
          dragSnapshotRef.current = { ...selEl };
          return;
        }
      }
    }

    resizeHandleRef.current = null;
    const visible = [...elementsRef.current]
      .filter(el => el.visible)
      .sort((a, b) => b.zIndex - a.zIndex);
    const hit = hitTest(x, y, visible);
    if (!hit) return;

    const el = elementsRef.current.find(e => e.id === hit);
    if (!el) return;

    onSelectElement?.(hit);
    isDraggingRef.current = false; // will become true on first move
    dragStartRef.current = { x, y };
    dragSnapshotRef.current = { ...el, bounds: { ...el.bounds }, center: el.center ? { ...el.center } : undefined };
  }, [onSelectElement]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragStartRef.current || !dragSnapshotRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCanvasPos(e, canvas);

    const dx = x - dragStartRef.current.x;
    const dy = y - dragStartRef.current.y;
    if (!isDraggingRef.current && Math.abs(dx) < 3 && Math.abs(dy) < 3) return; // dead zone
    isDraggingRef.current = true;

    const snap = dragSnapshotRef.current;

    // Resize mode
    if (resizeHandleRef.current) {
      // Arc handles
      if (resizeHandleRef.current === 'ARC_RADIUS' || resizeHandleRef.current === 'ARC_START' || resizeHandleRef.current === 'ARC_END') {
        const cx = snap.center?.x ?? CX;
        const cy = snap.center?.y ?? CY;
        const newAngleDeg = Math.atan2(y - cy, x - cx) * (180 / Math.PI);
        if (resizeHandleRef.current === 'ARC_RADIUS') {
          const newRadius = Math.max(10, Math.min(240, Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)));
          const r = newRadius;
          onUpdateElement?.(snap.id, {
            radius: r,
            bounds: { x: cx - r, y: cy - r, width: r * 2, height: r * 2 },
          });
        } else if (resizeHandleRef.current === 'ARC_START') {
          onUpdateElement?.(snap.id, { startAngle: newAngleDeg });
        } else {
          onUpdateElement?.(snap.id, { endAngle: newAngleDeg });
        }
        return;
      }
      // Rect handles
      const nb = applyResize(snap.bounds, resizeHandleRef.current, dx, dy);
      onUpdateElement?.(snap.id, { bounds: nb });
      return;
    }

    // Drag mode
    const newBounds = {
      x: Math.max(0, Math.min(CANVAS_SIZE - snap.bounds.width, snap.bounds.x + dx)),
      y: Math.max(0, Math.min(CANVAS_SIZE - snap.bounds.height, snap.bounds.y + dy)),
      width: snap.bounds.width,
      height: snap.bounds.height,
    };
    const changes: Partial<WatchFaceElement> = { bounds: newBounds };
    if (snap.center) {
      changes.center = {
        x: Math.max(0, Math.min(CANVAS_SIZE, snap.center.x + dx)),
        y: Math.max(0, Math.min(CANVAS_SIZE, snap.center.y + dy)),
      };
    }
    onUpdateElement?.(snap.id, changes);
  }, [onUpdateElement]);

  const handleMouseUp = useCallback(() => {
    dragStartRef.current = null;
    dragSnapshotRef.current = null;
    resizeHandleRef.current = null;
    setTimeout(() => { isDraggingRef.current = false; }, 0);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length !== 1) return;
    const { x, y } = getTouchCanvasPos(e.touches[0], canvas);

    const visible = [...elementsRef.current]
      .filter(el => el.visible)
      .sort((a, b) => b.zIndex - a.zIndex);
    const hit = hitTest(x, y, visible);
    if (!hit) { onSelectElement?.(null); return; }

    const el = elementsRef.current.find(el => el.id === hit);
    if (!el) return;

    onSelectElement?.(hit);
    isDraggingRef.current = false;
    dragStartRef.current = { x, y };
    dragSnapshotRef.current = { ...el, bounds: { ...el.bounds }, center: el.center ? { ...el.center } : undefined };
  }, [onSelectElement]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!dragStartRef.current || !dragSnapshotRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length !== 1) return;
    const { x, y } = getTouchCanvasPos(e.touches[0], canvas);

    const dx = x - dragStartRef.current.x;
    const dy = y - dragStartRef.current.y;
    if (!isDraggingRef.current && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
    isDraggingRef.current = true;

    const snap = dragSnapshotRef.current;
    const newBounds = {
      x: Math.max(0, Math.min(CANVAS_SIZE - snap.bounds.width, snap.bounds.x + dx)),
      y: Math.max(0, Math.min(CANVAS_SIZE - snap.bounds.height, snap.bounds.y + dy)),
      width: snap.bounds.width,
      height: snap.bounds.height,
    };
    const changes: Partial<WatchFaceElement> = { bounds: newBounds };
    if (snap.center) {
      changes.center = {
        x: Math.max(0, Math.min(CANVAS_SIZE, snap.center.x + dx)),
        y: Math.max(0, Math.min(CANVAS_SIZE, snap.center.y + dy)),
      };
    }
    onUpdateElement?.(snap.id, changes);
  }, [onUpdateElement]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    dragStartRef.current = null;
    dragSnapshotRef.current = null;
    setTimeout(() => { isDraggingRef.current = false; }, 0);
  }, []);

  // Load background image
  useEffect(() => {
    if (backgroundImage) {
      const img = new Image();
      img.onload = () => {
        bgImageRef.current = img;
        draw();
      };
      img.src = backgroundImage;
    } else {
      bgImageRef.current = null;
      draw();
    }
  }, [backgroundImage, draw]);

  // Redraw when elements or selection changes
  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    draw();
  }, [calibrationEnabled, flickerAnalysisEnabled, flickerOverlayEnabled, draw]);

  return (
    <canvas
      ref={(node) => {
        (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className={cn('rounded-full shadow-2xl cursor-pointer select-none', className)}
      style={{
        maxWidth: '100%',
        height: 'auto',
        imageRendering: calibrationEnabled ? 'pixelated' : 'auto',
        touchAction: 'none',
        boxShadow: '0 0 60px rgba(0, 212, 255, 0.15), inset 0 0 30px rgba(0, 0, 0, 0.5)',
      }}
      onClick={handleCanvasClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
});

// ─── Hit Testing ─────────────────────────────────────────────────────────────────

function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_SIZE / rect.width;
  const scaleY = CANVAS_SIZE / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function getTouchCanvasPos(touch: React.Touch, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_SIZE / rect.width;
  const scaleY = CANVAS_SIZE / rect.height;
  return {
    x: (touch.clientX - rect.left) * scaleX,
    y: (touch.clientY - rect.top) * scaleY,
  };
}

const HANDLE_HIT = 10; // hit radius for handles

/** Returns handle name if (x,y) is over a resize handle of the given bounds, else null */
function hitTestRectHandle(
  x: number, y: number,
  b: { x: number; y: number; width: number; height: number },
): string | null {
  const handles: [string, number, number][] = [
    ['TL', b.x, b.y],
    ['TC', b.x + b.width / 2, b.y],
    ['TR', b.x + b.width, b.y],
    ['ML', b.x, b.y + b.height / 2],
    ['MR', b.x + b.width, b.y + b.height / 2],
    ['BL', b.x, b.y + b.height],
    ['BC', b.x + b.width / 2, b.y + b.height],
    ['BR', b.x + b.width, b.y + b.height],
  ];
  for (const [name, hx, hy] of handles) {
    if (Math.abs(x - hx) <= HANDLE_HIT && Math.abs(y - hy) <= HANDLE_HIT) return name;
  }
  return null;
}

/** Apply resize delta to bounds based on which handle is dragged */
function applyResize(
  snap: { x: number; y: number; width: number; height: number },
  handle: string,
  dx: number, dy: number,
) {
  let { x, y, width, height } = snap;
  const MIN = 20;
  if (handle.includes('L')) { x = Math.min(snap.x + dx, snap.x + snap.width - MIN); width = snap.width - (x - snap.x); }
  if (handle.includes('R')) { width = Math.max(MIN, snap.width + dx); }
  if (handle.includes('T')) { y = Math.min(snap.y + dy, snap.y + snap.height - MIN); height = snap.height - (y - snap.y); }
  if (handle.includes('B')) { height = Math.max(MIN, snap.height + dy); }
  return { x: Math.max(0, x), y: Math.max(0, y), width, height };
}

/** Returns arc handle name if (x,y) is over a handle of the arc element */
function hitTestArcHandle(x: number, y: number, el: WatchFaceElement): string | null {
  const cx = el.center?.x ?? CX;
  const cy = el.center?.y ?? CY;
  const r = el.radius ?? 100;
  const startDeg = el.startAngle ?? 135;
  const endDeg = el.endAngle ?? 345;
  const midDeg = (startDeg + endDeg) / 2;
  const HIT = 10;

  const pts: [string, number, number][] = [
    ['ARC_RADIUS', cx + r * Math.cos(degToRad(midDeg)), cy + r * Math.sin(degToRad(midDeg))],
    ['ARC_START',  cx + r * Math.cos(degToRad(startDeg)), cy + r * Math.sin(degToRad(startDeg))],
    ['ARC_END',    cx + r * Math.cos(degToRad(endDeg)),   cy + r * Math.sin(degToRad(endDeg))],
  ];
  for (const [name, hx, hy] of pts) {
    if (Math.sqrt((x - hx) ** 2 + (y - hy) ** 2) <= HIT) return name;
  }
  return null;
}

function hitTestOne(x: number, y: number, el: WatchFaceElement): boolean {
  if (el.type === 'ARC_PROGRESS') return hitTestArc(x, y, el);
  return hitTestRect(x, y, el.bounds);
}

function hitTest(x: number, y: number, elements: WatchFaceElement[]): string | null {
  // First pass: non-TIME_POINTER elements (sorted highest z first).
  // TIME_POINTER covers the full canvas so it would block everything beneath it.
  // If an engrave frame (FILL_RECT with engraveFrame) is hit, prefer its parent element.
  for (const el of elements) {
    if (el.type === 'TIME_POINTER') continue;
    if (hitTestOne(x, y, el)) {
      // If this is an engrave frame, redirect selection to its parent if parent is in the list
      if (el.engraveFrame) {
        const parent = elements.find(e => e.id === el.engraveFrame!.frameOf);
        return parent ? parent.id : el.id;
      }
      return el.id;
    }
  }
  // Second pass: allow TIME_POINTER only if nothing else was hit.
  for (const el of elements) {
    if (el.type !== 'TIME_POINTER') continue;
    if (hitTestOne(x, y, el)) return el.id;
  }
  return null;
}

function hitTestRect(
  x: number, y: number,
  bounds: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    x >= bounds.x &&
    x <= bounds.x + bounds.width &&
    y >= bounds.y &&
    y <= bounds.y + bounds.height
  );
}

function hitTestArc(x: number, y: number, el: WatchFaceElement): boolean {
  const cx = el.center?.x ?? CX;
  const cy = el.center?.y ?? CY;
  const radius = el.radius ?? 100;
  const lineWidth = el.lineWidth ?? 8;
  const tolerance = 8;

  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  if (Math.abs(dist - radius) > lineWidth / 2 + tolerance) return false;

  // Check angle
  const startDeg = el.startAngle ?? 135;
  const endDeg = el.endAngle ?? 345;
  let clickDeg = Math.atan2(y - cy, x - cx) * (180 / Math.PI);
  // Normalise both to same range as startDeg/endDeg
  if (endDeg > 360) {
    if (clickDeg < startDeg) clickDeg += 360;
  }
  return clickDeg >= startDeg && clickDeg <= endDeg;
}

// ─── Selection Highlight ────────────────────────────────────────────────────────

const HANDLE_SIZE = 8;
const SEL_COLOR = '#00D4FF';

function drawSelection(ctx: CanvasRenderingContext2D, el: WatchFaceElement) {
  if (el.type === 'ARC_PROGRESS') {
    drawArcSelection(ctx, el);
  } else if (el.type === 'TIME_POINTER') {
    drawPointerSelection(ctx, el);
  } else {
    drawRectSelection(ctx, el);
  }
}

function drawRectSelection(ctx: CanvasRenderingContext2D, el: WatchFaceElement) {
  const { x, y, width, height } = el.bounds;

  ctx.save();
  ctx.strokeStyle = 'rgba(0,212,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(x - 1, y - 1, width + 2, height + 2);
  ctx.setLineDash([]);

  // 8 handles: corners + edge midpoints
  const handles = [
    [x, y], [x + width / 2, y], [x + width, y],
    [x, y + height / 2],            [x + width, y + height / 2],
    [x, y + height], [x + width / 2, y + height], [x + width, y + height],
  ];
  for (const [hx, hy] of handles) {
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = SEL_COLOR;
    ctx.lineWidth = 1.5;
    ctx.fillRect(hx - HANDLE_SIZE / 2, hy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    ctx.strokeRect(hx - HANDLE_SIZE / 2, hy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
  }
  ctx.restore();
}

function drawArcSelection(ctx: CanvasRenderingContext2D, el: WatchFaceElement) {
  const cx = el.center?.x ?? CX;
  const cy = el.center?.y ?? CY;
  const radius = el.radius ?? 100;
  const lineWidth = el.lineWidth ?? 8;
  const startDeg = el.startAngle ?? 135;
  const endDeg = el.endAngle ?? 345;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, degToRad(startDeg), degToRad(endDeg));
  ctx.strokeStyle = hexToRgba(SEL_COLOR, 0.5);
  ctx.lineWidth = lineWidth + 6;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Radial handle at arc midpoint
  const midDeg = (startDeg + endDeg) / 2;
  const handles: [number, string][] = [
    [midDeg, '#FFFFFF'],    // radius handle
    [startDeg, '#00FF88'], // start angle handle
    [endDeg, '#FF8800'],   // end angle handle
  ];
  for (const [deg, color] of handles) {
    const hx = cx + radius * Math.cos(degToRad(deg));
    const hy = cy + radius * Math.sin(degToRad(deg));
    ctx.beginPath();
    ctx.arc(hx, hy, 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = SEL_COLOR;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawPointerSelection(ctx: CanvasRenderingContext2D, el: WatchFaceElement) {
  const cx = el.pointerCenter?.x ?? el.center?.x ?? CX;
  const cy = el.pointerCenter?.y ?? el.center?.y ?? CY;
  const r = 120;

  ctx.save();
  ctx.strokeStyle = SEL_COLOR;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Crosshair
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + 12, cy);
  ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy + 12);
  ctx.stroke();
  ctx.restore();
}

// ─── Universal Drop Shadow helpers ──────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) || 0,
    g: parseInt(h.substring(2, 4), 16) || 0,
    b: parseInt(h.substring(4, 6), 16) || 0,
  };
}

function applyShadow(ctx: CanvasRenderingContext2D, el: WatchFaceElement) {
  const s = el.dropShadow ? normalizeDropShadowForBake(el.dropShadow) : undefined;
  if (!s) return;
  const { r, g, b } = hexToRgb(s.color);
  ctx.shadowColor = `rgba(${r},${g},${b},${s.opacity})`;
  ctx.shadowBlur = s.blur;
  ctx.shadowOffsetX = s.offsetX;
  ctx.shadowOffsetY = s.offsetY;
}

function clearShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function drawImageWithDeterministicIconEffects(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  el: WatchFaceElement,
) {
  const { x, y, width: w, height: h } = el.bounds;
  const baked = bakeDeterministicIconEffects(img, w, h, {
    hueDeg: el.iconHue ?? 0,
    saturationPercent: el.iconSaturation ?? 100,
    colorize: el.iconColorize,
    colorizeOpacity: el.iconColorizeOpacity ?? 0.8,
  });
  ctx.drawImage(baked, x, y, w, h);
}

// ─── Background ─────────────────────────────────────────────────────────────────

function drawGrid(ctx: CanvasRenderingContext2D) {
  const STEP = 48;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  for (let i = STEP; i < CANVAS_SIZE; i += STEP) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_SIZE, i); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath(); ctx.moveTo(CX, 0); ctx.lineTo(CX, CANVAS_SIZE); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, CY); ctx.lineTo(CANVAS_SIZE, CY); ctx.stroke();
  ctx.restore();
}

function drawBlackCircle(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, CX, 0, Math.PI * 2);
  ctx.fillStyle = '#111111';
  ctx.fill();
  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, img: HTMLImageElement, transform?: BackgroundTransform) {
  const angle = transform?.angle ?? 0;
  const flipH = !!transform?.flipH;
  const flipV = !!transform?.flipV;

  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, CX, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(CX, CY);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(img, -CX, -CY, CANVAS_SIZE, CANVAS_SIZE);
  ctx.restore();
}

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function clampByte(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

function toRgb565(value: number): number {
  return Math.round((value / 255) * 31) * (255 / 31);
}

function toRgb565Green(value: number): number {
  return Math.round((value / 255) * 63) * (255 / 63);
}

function addFlickerOverlay(data: Uint8ClampedArray, invalidMask: Uint8Array): void {
  for (let i = 0; i < invalidMask.length; i += 1) {
    if (!invalidMask[i]) continue;
    const idx = i * 4;
    const alpha = data[idx + 3];
    if (alpha === 0) continue;
    // Blend a red tint while preserving underlying details.
    data[idx] = clampByte(data[idx] * 0.4 + 255 * 0.6);
    data[idx + 1] = clampByte(data[idx + 1] * 0.4);
    data[idx + 2] = clampByte(data[idx + 2] * 0.4);
  }
}

function cloneElementForLocalAnalysis(element: WatchFaceElement): WatchFaceElement {
  const offsetX = element.bounds.x;
  const offsetY = element.bounds.y;
  return {
    ...element,
    bounds: {
      x: 0,
      y: 0,
      width: Math.max(1, Math.round(element.bounds.width)),
      height: Math.max(1, Math.round(element.bounds.height)),
    },
    center: element.center
      ? {
        x: element.center.x - offsetX,
        y: element.center.y - offsetY,
      }
      : undefined,
    pointerCenter: element.pointerCenter
      ? {
        x: element.pointerCenter.x - offsetX,
        y: element.pointerCenter.y - offsetY,
      }
      : undefined,
  };
}

function analyzeElementFlickerRiskIsolated(
  element: WatchFaceElement,
  options: {
    threshold: number;
    iconCache: Map<string, HTMLImageElement>;
    digitCache: Map<string, HTMLImageElement>;
    handCache: Map<string, Map<string, HTMLImageElement>>;
    customHands: CustomHandRecord[];
    onAssetLoaded?: () => void;
    analysisCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
    analysisCtxRef: React.MutableRefObject<CanvasRenderingContext2D | null>;
  },
): ElementWarningInfo {
  const width = Math.max(1, Math.round(element.bounds.width));
  const height = Math.max(1, Math.round(element.bounds.height));

  if (!options.analysisCanvasRef.current || !options.analysisCtxRef.current) {
    const canvas = document.createElement('canvas');
    options.analysisCanvasRef.current = canvas;
    options.analysisCtxRef.current = canvas.getContext('2d');
  }

  const canvas = options.analysisCanvasRef.current;
  const ctx = options.analysisCtxRef.current;
  if (!canvas || !ctx) {
    return {
      hasFlickerRisk: false,
      ratio: 0,
      severity: 'none',
      invalidPixelCount: 0,
      visiblePixelCount: 0,
    };
  }

  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  ctx.clearRect(0, 0, width, height);
  const localElement = cloneElementForLocalAnalysis(element);
  drawElements(
    ctx,
    [localElement],
    options.iconCache,
    options.digitCache,
    options.onAssetLoaded,
    options.handCache,
    options.customHands,
  );

  const imageData = ctx.getImageData(0, 0, width, height);
  const analysis = analyzeFlicker(imageData, {
    mediumThreshold: options.threshold,
  });
  return {
    hasFlickerRisk: analysis.ratio >= options.threshold,
    ratio: analysis.ratio,
    severity: analysis.severity,
    invalidPixelCount: analysis.forbiddenCount,
    visiblePixelCount: analysis.totalCount,
  };
}

function computeElementWarningsIsolated(
  elements: WatchFaceElement[],
  options: {
    previousWarnings: ElementWarningsMap;
    lastComputedVersion: Record<string, number>;
    threshold: number;
    iconCache: Map<string, HTMLImageElement>;
    digitCache: Map<string, HTMLImageElement>;
    handCache: Map<string, Map<string, HTMLImageElement>>;
    customHands: CustomHandRecord[];
    onAssetLoaded?: () => void;
    forceRecompute?: boolean;
    analysisCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
    analysisCtxRef: React.MutableRefObject<CanvasRenderingContext2D | null>;
  },
): ElementWarningsMap {
  const warnings: ElementWarningsMap = {};
  const nextVersions: Record<string, number> = {};

  for (const element of elements) {
    const version = element.version ?? 1;
    const previousVersion = options.lastComputedVersion[element.id];
    const canReuse = !options.forceRecompute && previousVersion === version && !!options.previousWarnings[element.id];

    if (!element.visible) {
      warnings[element.id] = {
        hasFlickerRisk: false,
        ratio: 0,
        severity: 'none',
        invalidPixelCount: 0,
        visiblePixelCount: 0,
      };
      nextVersions[element.id] = version;
      continue;
    }

    if (canReuse) {
      warnings[element.id] = options.previousWarnings[element.id];
      nextVersions[element.id] = version;
      continue;
    }

    warnings[element.id] = analyzeElementFlickerRiskIsolated(element, {
      threshold: options.threshold,
      iconCache: options.iconCache,
      digitCache: options.digitCache,
      handCache: options.handCache,
      customHands: options.customHands,
      onAssetLoaded: options.onAssetLoaded,
      analysisCanvasRef: options.analysisCanvasRef,
      analysisCtxRef: options.analysisCtxRef,
    });
    nextVersions[element.id] = version;
  }

  for (const key of Object.keys(options.lastComputedVersion)) {
    delete options.lastComputedVersion[key];
  }
  Object.assign(options.lastComputedVersion, nextVersions);
  return warnings;
}

function computeSceneFlickerMask(ctx: CanvasRenderingContext2D): Uint8Array {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  return analyzeFlicker(imageData).mask;
}

function applyCalibrationSimulation(ctx: CanvasRenderingContext2D): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Pipeline order (strict): gamma -> forbidden clamp -> contrast -> quantization -> dither -> clamp -> sharpen.
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue;

    data[i] = clampByte(Math.pow(data[i] / 255, DEVICE_SIM_GAMMA) * 255);
    data[i + 1] = clampByte(Math.pow(data[i + 1] / 255, DEVICE_SIM_GAMMA) * 255);
    data[i + 2] = clampByte(Math.pow(data[i + 2] / 255, DEVICE_SIM_GAMMA) * 255);

    if (isFlickerForbiddenRgb(data[i], data[i + 1], data[i + 2])) {
      if (data[i] > 0 && data[i] < 47) data[i] = 0;
      if (data[i + 1] > 0 && data[i + 1] < 47) data[i + 1] = 0;
      if (data[i + 2] > 0 && data[i + 2] < 47) data[i + 2] = 0;
    }

    data[i] = clampByte((data[i] - 128) * DEVICE_SIM_CONTRAST + 128);
    data[i + 1] = clampByte((data[i + 1] - 128) * DEVICE_SIM_CONTRAST + 128);
    data[i + 2] = clampByte((data[i + 2] - 128) * DEVICE_SIM_CONTRAST + 128);
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] === 0) continue;

      const dither = (BAYER_4X4[y & 3][x & 3] - 7.5) * DEVICE_SIM_DITHER;
      const qr = clampByte(data[idx] + dither);
      const qg = clampByte(data[idx + 1] + dither);
      const qb = clampByte(data[idx + 2] + dither);

      data[idx] = clampByte(toRgb565(qr));
      data[idx + 1] = clampByte(toRgb565Green(qg));
      data[idx + 2] = clampByte(toRgb565(qb));

      if (data[idx] > 0 && data[idx] < 47) data[idx] = 0;
      if (data[idx + 1] > 0 && data[idx + 1] < 47) data[idx + 1] = 0;
      if (data[idx + 2] > 0 && data[idx + 2] < 47) data[idx + 2] = 0;
    }
  }

  // Light sharpen pass to mimic panel-edge crispness after quantization.
  const sharpenSource = new Uint8ClampedArray(data);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] === 0) continue;
      for (let c = 0; c < 3; c += 1) {
        const center = sharpenSource[idx + c];
        const top = sharpenSource[((y - 1) * width + x) * 4 + c];
        const bottom = sharpenSource[((y + 1) * width + x) * 4 + c];
        const left = sharpenSource[(y * width + (x - 1)) * 4 + c];
        const right = sharpenSource[(y * width + (x + 1)) * 4 + c];
        const sharpened = center * DEVICE_SIM_SHARPEN_CENTER - (top + bottom + left + right) * DEVICE_SIM_SHARPEN_NEIGHBOR;
        data[idx + c] = clampByte(sharpened);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function applyFlickerOverlayWithMask(ctx: CanvasRenderingContext2D, invalidMask: Uint8Array): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  addFlickerOverlay(data, invalidMask);

  ctx.putImageData(imageData, 0, 0);
}

// ─── Element Dispatcher ─────────────────────────────────────────────────────────

function drawElements(ctx: CanvasRenderingContext2D, elements: WatchFaceElement[], iconCache?: Map<string, HTMLImageElement>, digitCache?: Map<string, HTMLImageElement>, onIconLoaded?: () => void, handCache?: Map<string, Map<string, HTMLImageElement>>, customHands?: CustomHandRecord[]) {
  const sorted = [...elements].filter(e => e.visible).sort((a, b) => a.zIndex - b.zIndex);

  for (const el of sorted) {
    // Curved TEXT: draw directly on canvas — no async Image loading, always up to date
    if (el.type === 'TEXT' && el.curvedText) {
      const cx = el.bounds.x + el.bounds.width / 2;
      const cy = el.bounds.y + el.bounds.height / 2;
      const text = el.text || el.name;
      const fontSize = el.fontSize ?? 16;
      const color = el.color ? parseZeppColor(el.color) : '#FFFFFF';
      const { radius, startAngle: startDeg, endAngle: endDeg } = el.curvedText;

      const startAngle = (startDeg * Math.PI) / 180;
      const endAngle = (endDeg * Math.PI) / 180;
      const totalAngle = endAngle - startAngle;
      const anglePerChar = text.length > 1 ? totalAngle / (text.length - 1) : 0;

      ctx.save();
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < text.length; i++) {
        const angle = startAngle + i * anglePerChar;
        const charX = cx + radius * Math.cos(angle);
        const charY = cy + radius * Math.sin(angle);
        ctx.save();
        ctx.translate(charX, charY);
        ctx.rotate(angle + Math.PI / 2);
        ctx.fillText(text[i], 0, 0);
        ctx.restore();
      }
      ctx.restore();
      continue;
    }

    switch (el.type) {
      case 'ARC_PROGRESS':
        ctx.save();
        applyShadow(ctx, el);
        drawArc(ctx, el);
        clearShadow(ctx);
        ctx.restore();
        break;
      case 'TIME_POINTER':
        drawTimePointer(ctx, el, handCache, onIconLoaded, customHands);
        break;
      case 'GAUGE_POINTER':
        drawGaugePointer(ctx, el, iconCache, onIconLoaded);
        break;
      case 'IMG_TIME':
      case 'IMG_DATE':
      case 'IMG_WEEK':
      case 'TEXT_IMG':
        ctx.save();
        applyShadow(ctx, el);
        drawDigitElement(ctx, el, digitCache, onIconLoaded);
        clearShadow(ctx);
        ctx.restore();
        break;
      case 'TEXT': {
        const { x, y, width, height } = el.bounds;
        // If dateFormat is set, derive a preview string from today's date
        let text: string;
        if (el.dateFormat) {
          const now = new Date();
          const dd = String(now.getDate()).padStart(2, '0');
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const yyyy = String(now.getFullYear());
          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const mmm = months[now.getMonth()];
          text = el.dateFormat
            .replace('DD', dd).replace('MM', mm).replace('YYYY', yyyy).replace('MMM', mmm);
        } else {
          text = el.text || el.name;
        }
        const fontSize = el.fontSize ?? 16;
        const color = el.color ? parseZeppColor(el.color) : '#FFFFFF';
        const style = el.fontStyle ? getFontStyle(el.fontStyle) : undefined;
        const fontFamily = style?.fontFamily ?? 'Arial';
        const fontWeight = style?.fontWeight ?? 'bold';
        ctx.save();
        applyShadow(ctx, el);
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + width / 2, y + height / 2, width);
        clearShadow(ctx);
        ctx.restore();
        break;
      }
      case 'IMG_LEVEL':
        ctx.save();
        applyShadow(ctx, el);
        if ((el.dataType === 'WEATHER_CURRENT' || el.dataType === 'WEATHER_STATUS') && iconCache) {
          const wStyle = (el.weatherStyle ?? 'flat') as WeatherStyle;
          // Deterministic preview fallback until live weather code simulation is wired.
          const simulatedWeatherCode = 0;
          const configuredFrames = Array.isArray(el.images)
            ? el.images.filter((frame): frame is string => typeof frame === 'string' && frame.trim().length > 0)
            : [];
          const sourceFrame = configuredFrames.length > 0
            ? configuredFrames[Math.max(0, Math.min(configuredFrames.length - 1, simulatedWeatherCode))]
            : null;

          const cacheKey = sourceFrame
            ? `__weather_custom_${el.id}_${simulatedWeatherCode}_${sourceFrame}`
            : `__weather_builtin_${wStyle}_${simulatedWeatherCode}`;

          const cached = iconCache.get(cacheKey);
          if (cached) {
            ctx.drawImage(cached, el.bounds.x, el.bounds.y, el.bounds.width, el.bounds.height);
          } else {
            const dataUrls = generateWeatherSet(wStyle);
            const clampedIndex = Math.max(0, Math.min(dataUrls.length - 1, simulatedWeatherCode));
            const candidateSrc = sourceFrame || dataUrls[clampedIndex] || dataUrls[0];
            if (candidateSrc) {
              const img = new Image();
              img.onload = () => { iconCache.set(cacheKey, img); onIconLoaded?.(); };
              img.src = candidateSrc;
            }
            drawPlaceholder(ctx, el);
          }
        } else {
          drawPlaceholder(ctx, el);
        }
        clearShadow(ctx);
        ctx.restore();
        break;
      case 'IMG_STATUS': {
        // Render selected icon if set, otherwise draw status-type-aware placeholder
        ctx.save();
        applyShadow(ctx, el);
        if (el.src && iconCache) {
          const cacheKey = `src:${el.id}:${el.src}`;
          const cached = iconCache.get(cacheKey);
          if (cached) {
            drawImageWithDeterministicIconEffects(ctx, cached, el);
          } else {
            const img = new Image();
            img.onload = () => { iconCache.set(cacheKey, img); onIconLoaded?.(); };
            img.src = el.src;
            drawPlaceholder(ctx, el);
          }
        } else if (el.iconKey && iconCache) {
          const cached = iconCache.get(el.iconKey);
          if (cached) {
            drawImageWithDeterministicIconEffects(ctx, cached, el);
          } else {
            const entry = getIconByKey(el.iconKey);
            if (entry) {
              const img = new Image();
              img.onload = () => { iconCache.set(el.iconKey!, img); onIconLoaded?.(); };
              img.src = entry.dataUrl;
            } else if (el.iconKey.startsWith('tabler:')) {
              import('@/lib/iconLibrary').then(({ getIconByKeyAsync }) =>
                getIconByKeyAsync(el.iconKey!).then(asyncEntry => {
                  if (asyncEntry) {
                    const img = new Image();
                    img.onload = () => { iconCache.set(el.iconKey!, img); onIconLoaded?.(); };
                    img.src = asyncEntry.dataUrl;
                  }
                })
              );
            }
            drawPlaceholder(ctx, el);
          }
        } else {
          // Draw different placeholder icon depending on statusType
          const { x, y, width: w, height: h } = el.bounds;
          const st = el.statusType ?? 'DISCONNECT';
          const lw = Math.max(1.5, Math.min(w, h) * 0.07);
          ctx.lineWidth = lw;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          if (st === 'DISCONNECT') {
            // Bluetooth symbol
            ctx.strokeStyle = '#4488FF';
            ctx.beginPath();
            ctx.moveTo(x + w * 0.35, y + h * 0.2);
            ctx.lineTo(x + w * 0.65, y + h * 0.4);
            ctx.lineTo(x + w * 0.5, y + h * 0.5);
            ctx.lineTo(x + w * 0.65, y + h * 0.6);
            ctx.lineTo(x + w * 0.35, y + h * 0.8);
            ctx.moveTo(x + w * 0.5, y + h * 0.2);
            ctx.lineTo(x + w * 0.5, y + h * 0.8);
            ctx.stroke();
          } else if (st === 'CLOCK') {
            // Alarm clock
            ctx.strokeStyle = '#FFAA22';
            ctx.beginPath();
            ctx.arc(x + w * 0.5, y + h * 0.55, Math.min(w, h) * 0.3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + w * 0.5, y + h * 0.35);
            ctx.lineTo(x + w * 0.5, y + h * 0.55);
            ctx.lineTo(x + w * 0.63, y + h * 0.63);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x + w * 0.28, y + h * 0.26, Math.min(w, h) * 0.07, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x + w * 0.72, y + h * 0.26, Math.min(w, h) * 0.07, 0, Math.PI * 2);
            ctx.stroke();
          } else if (st === 'DISTURB') {
            // Moon crescent (do not disturb)
            ctx.strokeStyle = '#9966FF';
            ctx.fillStyle = 'rgba(153,102,255,0.15)';
            ctx.beginPath();
            ctx.arc(x + w * 0.5, y + h * 0.5, Math.min(w, h) * 0.35, Math.PI * 0.3, Math.PI * 1.7);
            ctx.arc(x + w * 0.38, y + h * 0.44, Math.min(w, h) * 0.24, Math.PI * 1.7, Math.PI * 0.3, true);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else if (st === 'LOCK') {
            // Padlock
            ctx.strokeStyle = '#44CC66';
            ctx.beginPath();
            ctx.arc(x + w * 0.5, y + h * 0.43, Math.min(w, h) * 0.18, Math.PI, 0);
            ctx.stroke();
            const bx = x + w * 0.22, by = y + h * 0.52, bw = w * 0.56, bh = h * 0.34;
            ctx.beginPath();
            if (typeof (ctx as CanvasRenderingContext2D).roundRect === 'function') {
              ctx.roundRect(bx, by, bw, bh, 3);
            } else {
              ctx.rect(bx, by, bw, bh);
            }
            ctx.stroke();
            ctx.fillStyle = '#44CC66';
            ctx.beginPath();
            ctx.arc(x + w * 0.5, y + h * 0.67, Math.min(w, h) * 0.05, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        clearShadow(ctx);
        ctx.restore();
        break;
      }
      case 'IMG':
        ctx.save();
        applyShadow(ctx, el);
        if (el.src && iconCache) {
          const cacheKey = `src:${el.id}:${el.src}`;
          const cached = iconCache.get(cacheKey);
          if (cached) {
            drawImageWithDeterministicIconEffects(ctx, cached, el);
          } else {
            const img = new Image();
            img.onload = () => { iconCache.set(cacheKey, img); onIconLoaded?.(); };
            img.src = el.src;
            drawPlaceholder(ctx, el);
          }
        } else if (el.iconKey && iconCache) {
          const cached = iconCache.get(el.iconKey);
          if (cached) {
            drawImageWithDeterministicIconEffects(ctx, cached, el);
          } else {
            const entry = getIconByKey(el.iconKey);
            if (entry) {
              const img = new Image();
              img.onload = () => { iconCache.set(el.iconKey!, img); onIconLoaded?.(); };
              img.src = entry.dataUrl;
            } else if (el.iconKey.startsWith('tabler:')) {
              import('@/lib/iconLibrary').then(({ getIconByKeyAsync }) =>
                getIconByKeyAsync(el.iconKey!).then(asyncEntry => {
                  if (asyncEntry) {
                    const img = new Image();
                    img.onload = () => { iconCache.set(el.iconKey!, img); onIconLoaded?.(); };
                    img.src = asyncEntry.dataUrl;
                  }
                })
              );
            }
            drawPlaceholder(ctx, el);
          }
        } else {
          drawPlaceholder(ctx, el);
        }
        clearShadow(ctx);
        ctx.restore();
        break;
      case 'CIRCLE': {
        const { x, y, width: cw, height: ch } = el.bounds;
        const color = el.color ? parseZeppColor(el.color) : 'rgba(200,200,200,0.8)';
        const stype = el.shapeType ?? 'circle';
        ctx.save();
        applyShadow(ctx, el);
        if (stype === 'circle') {
          ctx.beginPath();
          ctx.ellipse(x + cw / 2, y + ch / 2, cw / 2, ch / 2, 0, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        } else if (stype === 'fill_rect') {
          ctx.fillStyle = color;
          ctx.fillRect(x, y, cw, ch);
        } else if (stype === 'stroke_rect') {
          ctx.strokeStyle = color;
          ctx.lineWidth = el.lineWidth ?? 2;
          ctx.strokeRect(x, y, cw, ch);
        } else if (stype === 'rounded_rect') {
          const cr = el.shapeCornerRadius ?? 12;
          ctx.beginPath();
          ctx.roundRect(x, y, cw, ch, cr);
          ctx.fillStyle = color;
          ctx.fill();
        }
        clearShadow(ctx);
        ctx.restore();
        break;
      }
      case 'FILL_RECT':
        if (el.engraveFrame) {
          drawEngraveFrame(ctx, el);
        } else {
          ctx.save();
          applyShadow(ctx, el);
          ctx.fillStyle = el.color ? parseZeppColor(el.color) : 'rgba(80,80,80,0.5)';
          ctx.fillRect(el.bounds.x, el.bounds.y, el.bounds.width, el.bounds.height);
          clearShadow(ctx);
          ctx.restore();
        }
        break;
      default:
        ctx.save();
        applyShadow(ctx, el);
        drawPlaceholder(ctx, el);
        clearShadow(ctx);
        ctx.restore();
        break;
    }
  }
}

// ─── Engrave / Emboss frame ────────────────────────────────────────────────────

function drawEngraveFrame(ctx: CanvasRenderingContext2D, el: WatchFaceElement) {
  renderEngraveFrameEffect(ctx, el.bounds, normalizeEngraveFrameForParity(el.engraveFrame!));
}

// ─── Digit element: IMG_TIME, IMG_DATE, IMG_WEEK, TEXT_IMG ──────────────────────

function getCachedImage(src: string, cache: Map<string, HTMLImageElement>, onLoad: (() => void) | undefined): HTMLImageElement | null {
  if (cache.has(src)) return cache.get(src)!;
  const img = new Image();
  img.onload = () => { onLoad?.(); };
  img.src = src;
  cache.set(src, img);
  return null; // Will be ready on next frame after onLoad fires
}

function getPlaceholderText(el: WatchFaceElement): string {
  const name = el.name.toLowerCase();
  if (el.type === 'IMG_TIME') {
    if (el.subtype === 'minutes') return '28';
    if (el.subtype === 'seconds') return '36';
    return '10'; // hours or legacy single element
  }
  // Check type before name so toggling Date→Week works even if name still says "date"
  if (el.type === 'IMG_WEEK') return 'WED';
  if (el.type === 'IMG_DATE') return '24';
  if (name.includes('month')) return 'APR';
  if (name.includes('week')) return 'WED';
  if (name.includes('date')) return '24';
  if (el.dataType === 'BATTERY') return '85%';
  if (el.dataType === 'STEP') return '8432';
  if (el.dataType === 'HEART') return '72';
  if (el.dataType === 'WEATHER_CURRENT') return '24°';
  if (el.dataType === 'WEATHER_STATUS') return '☀';
  return el.dataType ?? '123';
}

function drawDigitElement(
  ctx: CanvasRenderingContext2D,
  el: WatchFaceElement,
  digitCache: Map<string, HTMLImageElement> | undefined,
  onLoad: (() => void) | undefined,
) {
  const { x, y, width: w, height: h } = el.bounds;

  // If digit images available, draw them
  const images = el.images ?? el.fontArray;
  if (images && images.length > 0 && digitCache) {
    const sampleText = getPlaceholderText(el);
    const digitCount = Math.max(1, sampleText.replace(/[^0-9A-Za-z]/g, '').length);
    const digitW = Math.floor(w / digitCount);
    let drawn = false;
    for (let i = 0; i < Math.min(digitCount, images.length); i++) {
      const imgSrc = images[i];
      if (!imgSrc) continue;
      const img = getCachedImage(imgSrc, digitCache, onLoad);
      if (img?.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x + i * digitW, y, digitW, h);
        drawn = true;
      }
    }
    if (drawn) return;
  }

  // Fallback: draw placeholder text scaled to fit bounds
  const style = el.fontStyle ? getFontStyle(el.fontStyle) : undefined;
  const fontFamily = style?.fontFamily ?? 'Arial';
  const fontWeight = style?.fontWeight ?? 'bold';
  const text = getPlaceholderText(el);
  const color = el.color ? parseZeppColor(el.color) : (style?.color ?? '#FFFFFF');
  // Fit font size to bounds height, but also ensure it doesn't overflow width
  const maxFontSize = Math.min(Math.floor(h * 0.8), Math.floor(w / (text.length * 0.6)));
  const fontSize = Math.max(10, maxFontSize);
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2, w);
  ctx.restore();
}

// ─── ARC_PROGRESS ───────────────────────────────────────────────────────────────

function drawArc(ctx: CanvasRenderingContext2D, el: WatchFaceElement) {
  const cx = el.center?.x ?? CX;
  const cy = el.center?.y ?? CY;
  const radius = el.radius ?? 100;
  const startDeg = el.startAngle ?? 135;
  const endDeg = el.endAngle ?? 345;
  const lineWidth = el.lineWidth ?? 8;
  const color = parseZeppColor(el.color ?? '0x00FF00');

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, degToRad(startDeg), degToRad(endDeg));
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.stroke();

  if (el.dataType) {
    const midDeg = (startDeg + endDeg) / 2;
    const labelR = radius + 16;
    const lx = cx + labelR * Math.cos(degToRad(midDeg));
    const ly = cy + labelR * Math.sin(degToRad(midDeg));

    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(el.dataType, lx, ly);
  }
  ctx.restore();
}

// ─── TIME_POINTER ───────────────────────────────────────────────────────────────

// Hand pivot positions — must match drawTaperedHand/drawSecondHand pivot math in handStyles.ts
// Hour: 22×140, tail=22 → pivot at (11, 118)
// Minute: 16×200, tail=28 → pivot at (8, 172)
// Second: 8×240, pivot at (4, 180) — 75% down (tail counterbalance below)
const HAND_DEFS = [
  { key: 'hour',   w: 22,  h: 140, pivotX: 11, pivotY: 118 },
  { key: 'minute', w: 16,  h: 200, pivotX: 8,  pivotY: 172 },
  { key: 'second', w: 8,   h: 240, pivotX: 4,  pivotY: 180 },
  { key: 'cover',  w: 30,  h: 30,  pivotX: 15, pivotY: 15  },
] as const;

function extractSvgFromHtmlSource(code?: string): string | null {
  if (!code) return null;
  const m = code.match(/<svg[\s\S]*<\/svg>/i);
  return m ? m[0] : null;
}

function parsePivotRatioFromSource(code?: string): { x: number; y: number } {
  const svg = extractSvgFromHtmlSource(code);
  if (!svg) return { x: 0.5, y: 0.5 };
  const tag = svg.match(/<svg\b[^>]*>/i)?.[0] ?? '';
  const vb = tag.match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1] ?? '';
  const parts = vb.trim().split(/[\s,]+/).map(Number);
  if (parts.length < 4 || parts.some(Number.isNaN) || parts[2] <= 0 || parts[3] <= 0) {
    return { x: 0.5, y: 0.5 };
  }
  const [minX, minY, w, h] = parts;
  const pxRaw = Number(tag.match(/\bdata-pivot-x\s*=\s*["']([^"']+)["']/i)?.[1]);
  const pyRaw = Number(tag.match(/\bdata-pivot-y\s*=\s*["']([^"']+)["']/i)?.[1]);
  if (Number.isNaN(pxRaw) || Number.isNaN(pyRaw)) return { x: 0.5, y: 0.5 };
  const x = Math.max(0, Math.min(1, (pxRaw - minX) / w));
  const y = Math.max(0, Math.min(1, (pyRaw - minY) / h));
  return { x, y };
}

function loadHandImages(
  style: string,
  cache: Map<string, Map<string, HTMLImageElement>>,
  onLoaded: (() => void) | undefined,
  customHands?: CustomHandRecord[],
): Map<string, HTMLImageElement> | null {
  if (cache.has(style)) return cache.get(style)!;

  // Determine image sources — custom or built-in
  let srcs: Record<string, string | null>;
  const customRecord = customHands?.find(h => h.key === style);
  if (customRecord) {
    const resolved = resolveCustomHandPack(customRecord);
    srcs = {
      hour: resolved?.sources.hour ?? customRecord.hourDataUrl ?? null,
      minute: resolved?.sources.minute ?? customRecord.minuteDataUrl ?? null,
      second: resolved?.sources.second ?? customRecord.secondDataUrl ?? null,
      cover: resolved?.sources.cover ?? customRecord.coverDataUrl ?? null,
    };
  } else {
    const set = generateHandSet(style as HandStyleKey);
    srcs = { hour: set.hourHand, minute: set.minuteHand, second: set.secondHand, cover: set.cover };
  }

  const imgMap = new Map<string, HTMLImageElement>();
  cache.set(style, imgMap); // register early to avoid duplicate loads
  const entries = Object.entries(srcs).filter(([, src]) => !!src) as Array<[string, string]>;
  let pending = entries.length;
  if (pending === 0) {
    cache.delete(style);
    return null;
  }
  for (const [name, src] of entries) {
    const img = new Image();
    img.onload = () => {
      imgMap.set(name, img);
      pending--;
      if (pending === 0) onLoaded?.();
    };
    img.src = src;
  }
  return null; // not ready yet — will redraw when all loaded
}

function drawTimePointer(
  ctx: CanvasRenderingContext2D,
  el: WatchFaceElement,
  handCache?: Map<string, Map<string, HTMLImageElement>>,
  onLoaded?: () => void,
  customHands?: CustomHandRecord[],
) {
  const cx = el.pointerCenter?.x ?? el.center?.x ?? CX;
  const cy = el.pointerCenter?.y ?? el.center?.y ?? CY;

  const hourAngle   = ((MOCK_HOUR % 12) + MOCK_MINUTE / 60) * 30 - 90;
  const minuteAngle = MOCK_MINUTE * 6 - 90;
  const secondAngle = MOCK_SECOND * 6 - 90;

  const style = el.handStyle ?? 'silver';
  const customRecord = customHands?.find(h => h.key === style);
  const resolvedPack = customRecord ? resolveCustomHandPack(customRecord) : null;
  const sourceMode = resolvedPack?.mode === 'source-based-custom';
  const sourcePivot = sourceMode && customRecord ? {
    hour: parsePivotRatioFromSource(customRecord.sourceHourHtml),
    minute: parsePivotRatioFromSource(customRecord.sourceMinuteHtml),
    second: parsePivotRatioFromSource(customRecord.sourceSecondHtml),
    cover: { x: 0.5, y: 0.5 },
  } : null;
  const imgMap = handCache ? loadHandImages(style, handCache, onLoaded, customHands) : null;

  // ── Per-hand scale: resolve length/width multipliers ───────────────────
  // "Scale whole" uses handLengthScale for all; "Scale each" uses per-hand fields
  const globalLen = el.handLengthScale ?? 1.0;
  const perScale: Record<string, { len: number; wid: number }> = {
    hour:   { len: (el.handHourLength   ?? globalLen), wid: (el.handHourWidth   ?? 1.0) },
    minute: { len: (el.handMinuteLength ?? globalLen), wid: (el.handMinuteWidth ?? 1.0) },
    second: { len: (el.handSecondLength ?? globalLen), wid: (el.handSecondWidth ?? 1.0) },
    cover:  { len: 1, wid: 1 },
  };

  // ── Effects ──────────────────────────────────────────────────────────────
  const shadowIntensity = el.handShadow ?? 0;
  const pointerShadow = pointerShadowToDropShadow(shadowIntensity);
  const glowIntensity   = el.handGlow   ?? 0;
  const trailIntensity  = el.handTrail  ?? 0;
  const tintColor       = el.handTint;  // e.g. '#4488FF' or undefined
  const pointerEffects = normalizePointerEffects(el);
  const hasPointerEffects = hasNonDefaultPointerEffects(pointerEffects);

  if (imgMap && imgMap.size === 4) {
    // Draw using real hand images
    const angles: Record<string, number> = {
      hour:   degToRad(hourAngle),
      minute: degToRad(minuteAngle),
      second: degToRad(secondAngle),
    };
    for (const def of HAND_DEFS) {
      if (def.key === 'second' && el.hideSeconds) continue;
      const img = imgMap.get(def.key);
      if (!img) continue;

      const srcW = Math.max(1, img.naturalWidth || img.width || def.w);
      const srcH = Math.max(1, img.naturalHeight || img.height || def.h);
      const baseW = sourceMode ? srcW : def.w;
      const baseH = sourceMode ? srcH : def.h;

      let pivotX: number;
      let pivotY: number;
      if (sourceMode) {
        const ratio = sourcePivot?.[def.key] ?? { x: 0.5, y: 0.5 };
        pivotX = baseW * ratio.x;
        pivotY = baseH * ratio.y;
      } else {
        pivotX = def.pivotX;
        pivotY = def.pivotY;
        if (def.key === 'hour') {
          pivotX = el.hourPos?.x ?? customRecord?.hourPosX ?? def.pivotX;
          pivotY = el.hourPos?.y ?? customRecord?.hourPosY ?? def.pivotY;
        } else if (def.key === 'minute') {
          pivotX = el.minutePos?.x ?? customRecord?.minutePosX ?? def.pivotX;
          pivotY = el.minutePos?.y ?? customRecord?.minutePosY ?? def.pivotY;
        } else if (def.key === 'second') {
          pivotX = el.secondPos?.x ?? customRecord?.secondPosX ?? def.pivotX;
          pivotY = el.secondPos?.y ?? customRecord?.secondPosY ?? def.pivotY;
        }
      }

      const sc = perScale[def.key];
      const drawW = baseW * sc.wid;
      const drawH = baseH * sc.len;
      // Pivot position scales with length (pivot is near base)
      const drawPivotX = pivotX * sc.wid;
      const drawPivotY = def.key === 'cover' ? pivotY : (pivotY / baseH) * drawH;

      const angle = def.key === 'cover' ? 0 : angles[def.key];
      const bakedBase = hasPointerEffects
        ? bakeDeterministicColorAdjustments(img, drawW, drawH, {
          brightness: pointerEffects.brightness,
          contrast: pointerEffects.contrast,
          saturation: pointerEffects.saturation,
          saturationMode: 'delta',
          opacity: pointerEffects.opacity,
        })
        : img;

      // ── Trail (speed-blur ghost) ─────────────────────────────
      if (trailIntensity > 0) {
        for (let t = 1; t <= 3; t++) {
          const trailAlpha = trailIntensity * (0.18 - t * 0.04);
          if (trailAlpha <= 0) break;
          const trailAngle = angle - degToRad(t * 3);
          ctx.save();
          ctx.globalAlpha = trailAlpha;
          ctx.translate(cx, cy);
          ctx.rotate(trailAngle);
          ctx.drawImage(bakedBase, -drawPivotX, -drawPivotY, drawW, drawH);
          ctx.restore();
        }
      }

      ctx.save();
      ctx.translate(cx, cy);
      if (def.key !== 'cover') ctx.rotate(angle);

      // ── Shadow ────────────────────────────────────────────────
      if (pointerShadow) {
        const { r, g, b } = hexToRgb(pointerShadow.color);
        ctx.shadowColor = `rgba(${r},${g},${b},${pointerShadow.opacity})`;
        ctx.shadowBlur = pointerShadow.blur;
        ctx.shadowOffsetX = pointerShadow.offsetX;
        ctx.shadowOffsetY = pointerShadow.offsetY;
      }

      ctx.globalAlpha = 1;
      ctx.drawImage(bakedBase, -drawPivotX, -drawPivotY, drawW, drawH);

      // ── Glow overlay ──────────────────────────────────────────
      if (glowIntensity > 0) {
        ctx.shadowColor = 'rgba(0,0,0,0)';
        ctx.shadowBlur = 0;
        const glowColor = tintColor ?? '#00EEFF';
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = glowIntensity * 0.55;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 12 + glowIntensity * 20;
        ctx.drawImage(bakedBase, -drawPivotX, -drawPivotY, drawW, drawH);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }

      // ── Tint overlay ──────────────────────────────────────────
      if (tintColor) {
        // Build a masked tint layer offscreen so tint cannot interact with already-drawn canvas pixels.
        const tintW = Math.max(1, Math.round(drawW));
        const tintH = Math.max(1, Math.round(drawH));
        const tintCanvas = document.createElement('canvas');
        tintCanvas.width = tintW;
        tintCanvas.height = tintH;
        const tintCtx = tintCanvas.getContext('2d');
        if (tintCtx) {
          tintCtx.drawImage(bakedBase, 0, 0, tintW, tintH);
          tintCtx.globalCompositeOperation = 'source-in';
          tintCtx.globalAlpha = 0.35;
          tintCtx.fillStyle = tintColor;
          tintCtx.fillRect(0, 0, tintW, tintH);
          ctx.drawImage(tintCanvas, -drawPivotX, -drawPivotY, drawW, drawH);
        }
      }

      ctx.restore();
    }
  } else {
    // Fallback: draw colored lines while images load
    const handColor = el.color ? parseZeppColor(el.color) : '#CCCCCC';
    drawHand(ctx, cx, cy, 65, 10, hourAngle, handColor);
    drawHand(ctx, cx, cy, 95, 7, minuteAngle, handColor);
    if (!el.hideSeconds) drawHand(ctx, cx, cy, 115, 2, secondAngle, '#FF4444');
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();
  }
}

function gaugeProgress(el: WatchFaceElement): number {
  switch (el.dataType) {
    case 'BATTERY': return 0.72;
    case 'STEP': return 0.58;
    case 'HEART': return 0.44;
    case 'SPO2': return 0.91;
    case 'STRESS': return 0.38;
    default: return 0.65;
  }
}

function drawFallbackGaugeNeedle(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const tipY = -Math.max(8, height * 0.82);
  ctx.fillStyle = '#f4f4f4';
  ctx.beginPath();
  ctx.moveTo(0, tipY);
  ctx.lineTo(-Math.max(2, width * 0.08), 0);
  ctx.lineTo(Math.max(2, width * 0.08), 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f87171';
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(3, width * 0.12), 0, Math.PI * 2);
  ctx.fill();
}

function drawGaugePointer(
  ctx: CanvasRenderingContext2D,
  el: WatchFaceElement,
  iconCache?: Map<string, HTMLImageElement>,
  onLoaded?: () => void,
) {
  const width = Math.max(8, el.bounds.width || 40);
  const height = Math.max(24, el.bounds.height || 120);
  const startAngle = el.startAngle ?? -90;
  const endAngle = el.endAngle ?? 90;
  const angleDeg = startAngle + (endAngle - startAngle) * gaugeProgress(el);
  const pivot = normalizeGaugePivot(el);
  const pivotX = width * pivot.pivotX;
  const pivotY = height * pivot.pivotY;
  const src = el.src || DEFAULT_GAUGE_POINTER_FILENAME;
  const resolvedSrc = src === DEFAULT_GAUGE_POINTER_FILENAME
    ? createDefaultGaugePointerDataUrl(width, height)
    : src;

  let image: HTMLImageElement | null = null;
  if (iconCache && resolvedSrc) {
    const cacheKey = `__gauge_${resolvedSrc}`;
    const cached = iconCache.get(cacheKey);
    if (cached) {
      image = cached;
    } else {
      const img = new Image();
      img.onload = () => {
        iconCache.set(cacheKey, img);
        onLoaded?.();
      };
      img.src = resolvedSrc;
    }
  }

  const pointerEffects = normalizePointerEffects(el);
  const hasPointerEffects = hasNonDefaultPointerEffects(pointerEffects);

  ctx.save();
  applyShadow(ctx, el);
  ctx.translate(el.bounds.x + pivotX, el.bounds.y + pivotY);
  ctx.rotate(degToRad(angleDeg));

  if (image) {
    const base = hasPointerEffects
      ? bakeDeterministicColorAdjustments(image, width, height, {
        brightness: pointerEffects.brightness,
        contrast: pointerEffects.contrast,
        saturation: pointerEffects.saturation,
        saturationMode: 'delta',
        opacity: pointerEffects.opacity,
      })
      : image;
    ctx.drawImage(base, -pivotX, -pivotY, width, height);
  } else {
    drawFallbackGaugeNeedle(ctx, width, height);
  }

  clearShadow(ctx);
  ctx.restore();
}

function drawHand(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  length: number, width: number,
  angleDeg: number,
  color: string,
) {
  const rad = degToRad(angleDeg);
  const tipX = cx + length * Math.cos(rad);
  const tipY = cy + length * Math.sin(rad);
  const tailX = cx - (length * 0.2) * Math.cos(rad);
  const tailY = cy - (length * 0.2) * Math.sin(rad);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(tipX, tipY);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

// ─── Placeholder (rectangles for IMG_TIME, TEXT, etc.) ──────────────────────────

function drawPlaceholder(ctx: CanvasRenderingContext2D, el: WatchFaceElement) {
  const { x, y, width, height } = el.bounds;

  ctx.save();

  const elColor = el.color ? parseZeppColor(el.color) : null;
  const boxFill = elColor ? hexToRgba(elColor, 0.15) : 'rgba(0, 200, 255, 0.08)';
  const boxStroke = elColor ? hexToRgba(elColor, 0.5) : 'rgba(0, 200, 255, 0.3)';

  ctx.fillStyle = boxFill;
  ctx.strokeStyle = boxStroke;
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);

  const label = formatLabel(el);
  const style = el.fontStyle ? getFontStyle(el.fontStyle) : undefined;
  const fontFamily = style?.fontFamily ?? 'Arial';
  const fontWeight = style?.fontWeight ?? 'bold';
  const color = el.color ? parseZeppColor(el.color) : (style?.color ?? 'rgba(0, 200, 255, 0.7)');
  const maxFontSize = Math.min(Math.floor(height * 0.8), Math.floor(width / (label.length * 0.6)));
  const fontSize = Math.max(10, maxFontSize);

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + width / 2, y + height / 2, width - 4);

  ctx.restore();
}

function formatLabel(el: WatchFaceElement): string {
  const name = el.name.toLowerCase();
  if (name.includes('time')) return '10:10';
  if (name.includes('date')) return '08';
  if (name.includes('month')) return 'APR';
  if (name.includes('week')) return 'TUE';
  if (name.includes('weather')) return '☀ 24°';
  if (el.dataType) return el.dataType;
  return el.name;
}

// ─── Utilities ──────────────────────────────────────────────────────────────────

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function parseZeppColor(zeppHex: string): string {
  if (zeppHex.startsWith('0x') || zeppHex.startsWith('0X')) {
    return '#' + zeppHex.slice(2).padStart(6, '0');
  }
  return zeppHex;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
