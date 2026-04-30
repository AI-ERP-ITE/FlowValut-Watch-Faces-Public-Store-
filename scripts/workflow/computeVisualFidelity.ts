import fs from "node:fs";
import path from "node:path";
import { createCanvas, loadImage } from "canvas";
import { mergeVisualEnvelope } from "../../src/pipeline/visualRenderer";

const rootDir = process.cwd();
const workflowFlagsPath = path.join(rootDir, "scripts", "workflow", "workflowFlags.json");

interface VisualFidelityMetrics {
  pixelSimilarity: number;
  edgeSimilarity: number;
  colorSimilarity: number;
  score: number;
}

interface VisualFidelityResult {
  pass: boolean;
  threshold: number;
  width: number;
  height: number;
  metrics: VisualFidelityMetrics;
  positionalFailures: PositionalFailure[];
  sizeFailures: SizeFailure[];
  probabilities: FidelityProbability[];
  deviations: ReprocessDeviation[];
}

interface PositionalFailure {
  id: string;
  index: number;
  dx: number;
  dy: number;
  direction: string;
  magnitude: number;
  edgeSupport: number;
}

interface SizeFailure {
  id: string;
  index: number;
  widthDeviation: number;
  heightDeviation: number;
  direction: string;
  magnitude: number;
}

interface FidelityProbability {
  name: string;
  probability: number;
  threshold: number;
  pass: boolean;
  deviation: number;
}

interface ReprocessDeviation {
  dimension: string;
  probability: number;
  threshold: number;
  deviation: number;
  message: string;
  topElements?: Array<Record<string, unknown>>;
}

interface CliArgs {
  envelopePath: string;
  sourcePath: string;
  outPath: string;
  threshold: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    envelopePath: "exports/compiler/visual_envelope_full.json",
    sourcePath: "exports/compiler/reference_source.png",
    outPath: "exports/compiler/fidelity-report.json",
    threshold: 0.94,
  };

  const positional: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--envelope=")) args.envelopePath = token.slice("--envelope=".length);
    else if (token.startsWith("--source=")) args.sourcePath = token.slice("--source=".length);
    else if (token.startsWith("--out=")) args.outPath = token.slice("--out=".length);
    else if (token.startsWith("--threshold=")) {
      const parsed = Number(token.slice("--threshold=".length));
      if (Number.isFinite(parsed)) args.threshold = parsed;
    } else if (token === "--envelope" && argv[i + 1]) args.envelopePath = argv[i + 1];
    else if (token === "--source" && argv[i + 1]) args.sourcePath = argv[i + 1];
    else if (token === "--out" && argv[i + 1]) args.outPath = argv[i + 1];
    else if (token === "--threshold" && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed)) args.threshold = parsed;
    } else if (!token.startsWith("--")) {
      positional.push(token);
    }
  }

  if (positional.length > 0) args.sourcePath = positional[0];
  if (positional.length > 1) args.envelopePath = positional[1];
  if (positional.length > 2) args.outPath = positional[2];
  if (positional.length > 3) {
    const parsed = Number(positional[3]);
    if (Number.isFinite(parsed)) args.threshold = parsed;
  }

  return args;
}

function ensureCompilerEnabled(): void {
  if (!fs.existsSync(workflowFlagsPath)) return;
  const flags = JSON.parse(fs.readFileSync(workflowFlagsPath, "utf8")) as { compilerEnabled?: boolean; reason?: string };
  if (flags.compilerEnabled === false) {
    const reason = typeof flags.reason === "string" && flags.reason.trim().length > 0
      ? flags.reason.trim()
      : "Compiler workflow disabled";
    throw new Error(`Compiler workflow is deactivated: ${reason}`);
  }
}

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function grayscale(r: number, g: number, b: number): number {
  return r * 0.299 + g * 0.587 + b * 0.114;
}

function computePixelSimilarity(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let total = 0;
  const pxCount = a.length / 4;
  for (let i = 0; i < a.length; i += 4) {
    total += Math.abs(a[i] - b[i]);
    total += Math.abs(a[i + 1] - b[i + 1]);
    total += Math.abs(a[i + 2] - b[i + 2]);
  }
  const max = pxCount * 255 * 3;
  return clamp01(1 - total / max);
}

function computeGrayscaleBuffer(data: Uint8ClampedArray): Float32Array {
  const out = new Float32Array(data.length / 4);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
    out[j] = grayscale(data[i], data[i + 1], data[i + 2]);
  }
  return out;
}

function computeEdgeMagnitude(gray: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(gray.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const gx =
        -gray[i - width - 1] + gray[i - width + 1] +
        -2 * gray[i - 1] + 2 * gray[i + 1] +
        -gray[i + width - 1] + gray[i + width + 1];
      const gy =
        -gray[i - width - 1] - 2 * gray[i - width] - gray[i - width + 1] +
        gray[i + width - 1] + 2 * gray[i + width] + gray[i + width + 1];
      out[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return out;
}

function computeEdgeSimilarity(a: Uint8ClampedArray, b: Uint8ClampedArray, width: number, height: number): number {
  const edgeA = computeEdgeMagnitude(computeGrayscaleBuffer(a), width, height);
  const edgeB = computeEdgeMagnitude(computeGrayscaleBuffer(b), width, height);
  let diff = 0;
  let max = 0;
  for (let i = 0; i < edgeA.length; i += 1) {
    diff += Math.abs(edgeA[i] - edgeB[i]);
    max += Math.max(edgeA[i], edgeB[i]);
  }
  if (max <= 1e-6) return 1;
  return clamp01(1 - diff / max);
}

function computeColorSimilarity(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  const bins = 16;
  const histA = new Float32Array(bins * 3);
  const histB = new Float32Array(bins * 3);
  for (let i = 0; i < a.length; i += 4) {
    const ra = Math.min(bins - 1, Math.floor((a[i] / 256) * bins));
    const ga = Math.min(bins - 1, Math.floor((a[i + 1] / 256) * bins));
    const ba = Math.min(bins - 1, Math.floor((a[i + 2] / 256) * bins));
    const rb = Math.min(bins - 1, Math.floor((b[i] / 256) * bins));
    const gb = Math.min(bins - 1, Math.floor((b[i + 1] / 256) * bins));
    const bb = Math.min(bins - 1, Math.floor((b[i + 2] / 256) * bins));
    histA[ra] += 1;
    histA[bins + ga] += 1;
    histA[bins * 2 + ba] += 1;
    histB[rb] += 1;
    histB[bins + gb] += 1;
    histB[bins * 2 + bb] += 1;
  }

  let l1 = 0;
  let total = 0;
  for (let i = 0; i < histA.length; i += 1) {
    l1 += Math.abs(histA[i] - histB[i]);
    total += Math.max(histA[i], histB[i]);
  }
  if (total <= 1e-6) return 1;
  return clamp01(1 - l1 / total);
}

function computeLumaStats(data: Uint8ClampedArray): { mean: number; std: number } {
  const n = data.length / 4;
  if (n <= 1) return { mean: 0, std: 0 };
  let sum = 0;
  let sum2 = 0;
  for (let i = 0; i < data.length; i += 4) {
    const y = grayscale(data[i], data[i + 1], data[i + 2]);
    sum += y;
    sum2 += y * y;
  }
  const mean = sum / n;
  const variance = Math.max(0, sum2 / n - mean * mean);
  return { mean, std: Math.sqrt(variance) };
}

function computeArrayStats(data: Float32Array): { mean: number; std: number; max: number } {
  const n = data.length;
  if (n <= 1) return { mean: 0, std: 0, max: 0 };
  let sum = 0;
  let sum2 = 0;
  let max = 0;
  for (let i = 0; i < n; i += 1) {
    const v = data[i];
    sum += v;
    sum2 += v * v;
    if (v > max) max = v;
  }
  const mean = sum / n;
  const variance = Math.max(0, sum2 / n - mean * mean);
  return { mean, std: Math.sqrt(variance), max };
}

function computeEdgeMap(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  return computeEdgeMagnitude(computeGrayscaleBuffer(data), width, height);
}

function clampInt(v: number, lo: number, hi: number): number {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

function directionLabel(dx: number, dy: number): string {
  const parts: string[] = [];
  if (dy < -1) parts.push("north");
  if (dy > 1) parts.push("south");
  if (dx < -1) parts.push("west");
  if (dx > 1) parts.push("east");
  return parts.length > 0 ? parts.join("-") : "centered";
}

function sizeDirectionLabel(dw: number, dh: number): string {
  const parts: string[] = [];
  if (dh < -0.03) parts.push("shorter-height");
  if (dh > 0.03) parts.push("taller-height");
  if (dw < -0.03) parts.push("narrower-width");
  if (dw > 0.03) parts.push("wider-width");
  return parts.length > 0 ? parts.join("+") : "size-match";
}

function getGeometryBBox(geom: Record<string, unknown>): { x: number; y: number; w: number; h: number } | null {
  const shape = String(geom.shape ?? "");
  if (shape === "rect") {
    return {
      x: Number(geom.x ?? 0),
      y: Number(geom.y ?? 0),
      w: Number(geom.w ?? 0),
      h: Number(geom.h ?? 0),
    };
  }
  if (shape === "circle") {
    const cx = Number(geom.cx ?? 0);
    const cy = Number(geom.cy ?? 0);
    const r = Math.max(0, Number(geom.r ?? 0));
    return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
  }
  if (shape === "line") {
    const x1 = Number(geom.x1 ?? 0);
    const y1 = Number(geom.y1 ?? 0);
    const x2 = Number(geom.x2 ?? 0);
    const y2 = Number(geom.y2 ?? 0);
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      w: Math.abs(x2 - x1) + 1,
      h: Math.abs(y2 - y1) + 1,
    };
  }
  if (shape === "text") {
    const x = Number(geom.x ?? 0);
    const y = Number(geom.y ?? 0);
    const size = Math.max(8, Number(geom.fontSize ?? 12));
    const w = Math.max(size * 1.2, 8);
    const h = Math.max(size * 1.1, 8);
    return { x: x - w / 2, y: y - h / 2, w, h };
  }
  if (shape === "polygon" && Array.isArray(geom.points) && geom.points.length > 0) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const p of geom.points as Array<[number, number]>) {
      const px = Number(p[0] ?? 0);
      const py = Number(p[1] ?? 0);
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }
  if (shape === "arc") {
    const cx = Number(geom.cx ?? 0);
    const cy = Number(geom.cy ?? 0);
    const r = Math.max(0, Number(geom.rOuter ?? 0));
    return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
  }
  return null;
}

function analyzePositionalFailures(
  envelope: unknown,
  sourceEdge: Float32Array,
  width: number,
  height: number
): PositionalFailure[] {
  const merged = mergeVisualEnvelope(envelope as never);
  const failures: PositionalFailure[] = [];

  for (let i = 0; i < merged.elements.length; i += 1) {
    const el = merged.elements[i];
    const geom = el.geometry as unknown as Record<string, unknown>;
    const bbox = getGeometryBBox(geom);
    if (!bbox) continue;
    if (!Number.isFinite(bbox.w) || !Number.isFinite(bbox.h) || bbox.w <= 2 || bbox.h <= 2) continue;

    const pad = Math.max(6, Math.round(Math.min(bbox.w, bbox.h) * 0.25));
    const x0 = clampInt(Math.floor(bbox.x - pad), 0, width - 1);
    const y0 = clampInt(Math.floor(bbox.y - pad), 0, height - 1);
    const x1 = clampInt(Math.ceil(bbox.x + bbox.w + pad), 0, width - 1);
    const y1 = clampInt(Math.ceil(bbox.y + bbox.h + pad), 0, height - 1);
    if (x1 <= x0 || y1 <= y0) continue;

    let sum = 0;
    let sumX = 0;
    let sumY = 0;
    for (let y = y0; y <= y1; y += 1) {
      const row = y * width;
      for (let x = x0; x <= x1; x += 1) {
        const e = sourceEdge[row + x];
        if (e <= 0.1) continue;
        sum += e;
        sumX += x * e;
        sumY += y * e;
      }
    }

    if (sum <= 1e-3) continue;

    const srcCx = sumX / sum;
    const srcCy = sumY / sum;
    const geomCx = bbox.x + bbox.w / 2;
    const geomCy = bbox.y + bbox.h / 2;

    const dx = srcCx - geomCx;
    const dy = srcCy - geomCy;
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    const threshold = Math.max(2.5, Math.min(16, Math.min(bbox.w, bbox.h) * 0.12));
    if (magnitude < threshold) continue;

    failures.push({
      id: el.inventory.id,
      index: i,
      dx: Number(dx.toFixed(2)),
      dy: Number(dy.toFixed(2)),
      direction: directionLabel(dx, dy),
      magnitude: Number(magnitude.toFixed(2)),
      edgeSupport: Number(sum.toFixed(2)),
    });
  }

  failures.sort((a, b) => b.magnitude - a.magnitude);
  return failures.slice(0, 15);
}

function analyzeSizeFailures(envelope: unknown): SizeFailure[] {
  const merged = mergeVisualEnvelope(envelope as never);
  const failures: SizeFailure[] = [];

  for (let i = 0; i < merged.elements.length; i += 1) {
    const el = merged.elements[i];
    const geom = el.geometry as unknown as Record<string, unknown>;
    const gbox = getGeometryBBox(geom);
    const ibox = el.inventory?.bbox;
    if (!gbox || !ibox) continue;

    const iw = Math.max(1, Number(ibox.w ?? 0));
    const ih = Math.max(1, Number(ibox.h ?? 0));
    const gw = Math.max(1, Number(gbox.w ?? 0));
    const gh = Math.max(1, Number(gbox.h ?? 0));
    if (iw < 4 || ih < 4) continue;

    const dw = (gw - iw) / iw;
    const dh = (gh - ih) / ih;
    const magnitude = Math.sqrt(dw * dw + dh * dh);
    if (magnitude < 0.2) continue;

    failures.push({
      id: el.inventory.id,
      index: i,
      widthDeviation: Number(dw.toFixed(3)),
      heightDeviation: Number(dh.toFixed(3)),
      direction: sizeDirectionLabel(dw, dh),
      magnitude: Number(magnitude.toFixed(3)),
    });
  }

  failures.sort((a, b) => b.magnitude - a.magnitude);
  return failures.slice(0, 15);
}

function computePositionProbability(positionalFailures: PositionalFailure[], width: number, height: number): number {
  if (positionalFailures.length === 0) return 1;
  const diag = Math.max(1, Math.sqrt(width * width + height * height));
  const sample = positionalFailures.slice(0, 10);
  const avgNorm = sample.reduce((acc, f) => acc + f.magnitude / diag, 0) / sample.length;
  return clamp01(1 - avgNorm * 3.5);
}

function computeSizeProbability(sizeFailures: SizeFailure[]): number {
  if (sizeFailures.length === 0) return 1;
  const sample = sizeFailures.slice(0, 10);
  const avg = sample.reduce((acc, f) => acc + f.magnitude, 0) / sample.length;
  return clamp01(1 - avg * 1.7);
}

function computeTextureProbability(sourceEdge: Float32Array, renderEdge: Float32Array): number {
  const a = computeArrayStats(sourceEdge);
  const b = computeArrayStats(renderEdge);
  const meanDen = Math.max(a.mean, b.mean, 1e-6);
  const stdDen = Math.max(a.std, b.std, 1e-6);
  const meanDiff = Math.abs(a.mean - b.mean) / meanDen;
  const stdDiff = Math.abs(a.std - b.std) / stdDen;
  const maxDen = Math.max(a.max, b.max, 1e-6);
  const maxDiff = Math.abs(a.max - b.max) / maxDen;
  return clamp01(1 - (meanDiff * 0.45 + stdDiff * 0.4 + maxDiff * 0.15));
}

function computeEffectProbability(sourceData: Uint8ClampedArray, renderData: Uint8ClampedArray): number {
  const a = computeLumaStats(sourceData);
  const b = computeLumaStats(renderData);
  const meanSimilarity = clamp01(1 - Math.abs(a.mean - b.mean) / 255);
  const contrastSimilarity = clamp01(1 - Math.abs(a.std - b.std) / Math.max(a.std, b.std, 1));
  return clamp01(meanSimilarity * 0.5 + contrastSimilarity * 0.5);
}

function buildProbabilities(values: {
  position: number;
  size: number;
  color: number;
  texture: number;
  effect: number;
  shape: number;
}): FidelityProbability[] {
  const thresholds = {
    position: 0.9,
    size: 0.88,
    color: 0.92,
    texture: 0.88,
    effect: 0.9,
    shape: 0.9,
  };

  return [
    { name: "position", probability: values.position, threshold: thresholds.position, pass: values.position >= thresholds.position, deviation: Number((thresholds.position - values.position).toFixed(6)) },
    { name: "size", probability: values.size, threshold: thresholds.size, pass: values.size >= thresholds.size, deviation: Number((thresholds.size - values.size).toFixed(6)) },
    { name: "color", probability: values.color, threshold: thresholds.color, pass: values.color >= thresholds.color, deviation: Number((thresholds.color - values.color).toFixed(6)) },
    { name: "texture", probability: values.texture, threshold: thresholds.texture, pass: values.texture >= thresholds.texture, deviation: Number((thresholds.texture - values.texture).toFixed(6)) },
    { name: "effect", probability: values.effect, threshold: thresholds.effect, pass: values.effect >= thresholds.effect, deviation: Number((thresholds.effect - values.effect).toFixed(6)) },
    { name: "shape", probability: values.shape, threshold: thresholds.shape, pass: values.shape >= thresholds.shape, deviation: Number((thresholds.shape - values.shape).toFixed(6)) },
  ];
}

function buildDeviationReport(
  probabilities: FidelityProbability[],
  positionalFailures: PositionalFailure[],
  sizeFailures: SizeFailure[]
): ReprocessDeviation[] {
  const out: ReprocessDeviation[] = [];
  for (const p of probabilities) {
    if (p.pass) continue;
    if (p.name === "position") {
      out.push({
        dimension: p.name,
        probability: Number(p.probability.toFixed(4)),
        threshold: p.threshold,
        deviation: Number(Math.max(0, p.deviation).toFixed(4)),
        message: "Geometry centers drift from source edge centroids. Shift elements by dx/dy toward indicated direction.",
        topElements: positionalFailures.slice(0, 8),
      });
      continue;
    }
    if (p.name === "size") {
      out.push({
        dimension: p.name,
        probability: Number(p.probability.toFixed(4)),
        threshold: p.threshold,
        deviation: Number(Math.max(0, p.deviation).toFixed(4)),
        message: "Element size mismatch detected. Resize by widthDeviation/heightDeviation ratios.",
        topElements: sizeFailures.slice(0, 8),
      });
      continue;
    }

    out.push({
      dimension: p.name,
      probability: Number(p.probability.toFixed(4)),
      threshold: p.threshold,
      deviation: Number(Math.max(0, p.deviation).toFixed(4)),
      message: `${p.name} similarity below threshold; reprocess ${p.name} choices in appearance and geometry generation.`,
    });
  }
  return out;
}

async function drawToImageData(src: string, width: number, height: number) {
  const img = await loadImage(src);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

function fillColor(fill: unknown): string {
  if (!fill || typeof fill !== "object") return "#888888";
  const f = fill as Record<string, unknown>;
  if (f.kind === "solid" && typeof f.color === "string") return f.color;
  if (Array.isArray(f.stops) && f.stops.length > 0) {
    const first = f.stops[0] as Record<string, unknown>;
    if (typeof first?.color === "string") return first.color;
  }
  return "#888888";
}

function applyStroke(ctx: CanvasRenderingContext2D, stroke: unknown) {
  if (!stroke || stroke === "none") {
    ctx.strokeStyle = "rgba(0,0,0,0)";
    ctx.lineWidth = 0;
    return;
  }
  if (typeof stroke === "object") {
    const s = stroke as Record<string, unknown>;
    ctx.strokeStyle = typeof s.color === "string" ? s.color : "#000000";
    ctx.lineWidth = typeof s.width === "number" ? s.width : 1;
    return;
  }
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1;
}

function applyTransform(ctx: CanvasRenderingContext2D, geom: Record<string, unknown>) {
  const rotation = typeof geom.rotation === "number" ? geom.rotation : 0;
  const scaleX = typeof geom.scaleX === "number" ? geom.scaleX : 1;
  const scaleY = typeof geom.scaleY === "number" ? geom.scaleY : 1;
  if (rotation === 0 && scaleX === 1 && scaleY === 1) return;
  const pivotX = typeof geom.pivotX === "number" ? geom.pivotX : 0;
  const pivotY = typeof geom.pivotY === "number" ? geom.pivotY : 0;
  ctx.translate(pivotX, pivotY);
  if (rotation !== 0) ctx.rotate((rotation * Math.PI) / 180);
  if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);
  ctx.translate(-pivotX, -pivotY);
}

function drawEnvelopeImageData(envelope: unknown, width: number, height: number): ImageData {
  const merged = mergeVisualEnvelope(envelope as never);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);

  for (const el of merged.elements) {
    const geom = el.geometry as unknown as Record<string, unknown>;
    const shape = String(geom.shape ?? "");
    if (!shape || shape === "group") continue;

    const app = el.appearance as unknown as Record<string, unknown>;
    const fill = app?.inherit ? { kind: "solid", color: "#888888" } : app?.fill;
    const stroke = app?.inherit ? "none" : app?.stroke;
    const opacity = typeof app?.opacity === "number" ? app.opacity : 1;

    ctx.save();
    ctx.globalAlpha = opacity;
    applyTransform(ctx, geom);
    ctx.fillStyle = fillColor(fill);
    applyStroke(ctx, stroke);

    if (shape === "rect") {
      const x = Number(geom.x ?? 0);
      const y = Number(geom.y ?? 0);
      const w = Number(geom.w ?? 0);
      const h = Number(geom.h ?? 0);
      if (w > 0 && h > 0) {
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.fill();
        if (ctx.lineWidth > 0) ctx.stroke();
      }
    } else if (shape === "line") {
      ctx.beginPath();
      ctx.moveTo(Number(geom.x1 ?? 0), Number(geom.y1 ?? 0));
      ctx.lineTo(Number(geom.x2 ?? 0), Number(geom.y2 ?? 0));
      if (ctx.lineWidth > 0) ctx.stroke();
    } else if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(Number(geom.cx ?? 0), Number(geom.cy ?? 0), Math.max(0, Number(geom.r ?? 0)), 0, Math.PI * 2);
      ctx.fill();
      if (ctx.lineWidth > 0) ctx.stroke();
    } else if (shape === "polygon") {
      const points = Array.isArray(geom.points) ? geom.points : [];
      if (points.length > 1) {
        ctx.beginPath();
        const first = points[0] as [number, number];
        ctx.moveTo(Number(first[0] ?? 0), Number(first[1] ?? 0));
        for (let i = 1; i < points.length; i += 1) {
          const p = points[i] as [number, number];
          ctx.lineTo(Number(p[0] ?? 0), Number(p[1] ?? 0));
        }
        ctx.closePath();
        ctx.fill();
        if (ctx.lineWidth > 0) ctx.stroke();
      }
    } else if (shape === "path" && typeof geom.d === "string") {
      const p = new Path2D(geom.d);
      ctx.fill(p);
      if (ctx.lineWidth > 0) ctx.stroke(p);
    } else if (shape === "text") {
      const fontSize = Math.max(8, Number(geom.fontSize ?? 12));
      ctx.font = `${fontSize}px sans-serif`;
      const content = String(geom.content ?? "");
      const x = Number(geom.x ?? 0);
      const y = Number(geom.y ?? 0);
      if (String(geom.anchor ?? "start") === "middle") {
        ctx.textAlign = "center";
      } else if (String(geom.anchor ?? "start") === "end") {
        ctx.textAlign = "right";
      } else {
        ctx.textAlign = "left";
      }
      ctx.textBaseline = "middle";
      ctx.fillText(content, x, y);
    } else if (shape === "arc") {
      const cx = Number(geom.cx ?? 0);
      const cy = Number(geom.cy ?? 0);
      const rOuter = Math.max(0, Number(geom.rOuter ?? 0));
      const rInner = Math.max(0, Number(geom.rInner ?? 0));
      const start = (Number(geom.startDeg ?? 0) * Math.PI) / 180;
      const sweep = (Number(geom.sweepDeg ?? 0) * Math.PI) / 180;
      const end = start + sweep;
      ctx.beginPath();
      ctx.arc(cx, cy, rOuter, start, end, sweep < 0);
      ctx.arc(cx, cy, rInner, end, start, sweep >= 0);
      ctx.closePath();
      ctx.fill();
      if (ctx.lineWidth > 0) ctx.stroke();
    }

    ctx.restore();
  }

  return ctx.getImageData(0, 0, width, height);
}

async function evaluateVisualFidelity(sourcePath: string, envelope: unknown, threshold: number): Promise<VisualFidelityResult> {
  const source = await loadImage(path.resolve(sourcePath));
  const width = Math.max(16, Math.floor(source.width));
  const height = Math.max(16, Math.floor(source.height));

  const [sourceData, renderData] = await Promise.all([
    drawToImageData(path.resolve(sourcePath), width, height),
    Promise.resolve(drawEnvelopeImageData(envelope, width, height)),
  ]);

  const sourceEdge = computeEdgeMap(sourceData.data, width, height);
  const renderEdge = computeEdgeMap(renderData.data, width, height);

  const pixelSimilarity = computePixelSimilarity(sourceData.data, renderData.data);
  const edgeSimilarity = computeEdgeSimilarity(sourceData.data, renderData.data, width, height);
  const colorSimilarity = computeColorSimilarity(sourceData.data, renderData.data);
  const score = clamp01(pixelSimilarity * 0.6 + edgeSimilarity * 0.25 + colorSimilarity * 0.15);
  const positionalFailures = analyzePositionalFailures(envelope, sourceEdge, width, height);
  const sizeFailures = analyzeSizeFailures(envelope);

  const probabilities = buildProbabilities({
    position: computePositionProbability(positionalFailures, width, height),
    size: computeSizeProbability(sizeFailures),
    color: colorSimilarity,
    texture: computeTextureProbability(sourceEdge, renderEdge),
    effect: computeEffectProbability(sourceData.data, renderData.data),
    shape: edgeSimilarity,
  });
  const deviations = buildDeviationReport(probabilities, positionalFailures, sizeFailures);

  return {
    pass: score >= threshold,
    threshold,
    width,
    height,
    metrics: {
      pixelSimilarity,
      edgeSimilarity,
      colorSimilarity,
      score,
    },
    positionalFailures,
    sizeFailures,
    probabilities,
    deviations,
  };
}

async function main() {
  ensureCompilerEnabled();
  const args = parseArgs(process.argv.slice(2));
  const envelopePath = path.resolve(args.envelopePath);
  const sourcePath = path.resolve(args.sourcePath);
  const outPath = path.resolve(args.outPath);

  if (!fs.existsSync(envelopePath)) {
    throw new Error(`Missing envelope file: ${envelopePath}`);
  }
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing source image: ${sourcePath}`);
  }

  const envelope = JSON.parse(fs.readFileSync(envelopePath, "utf8"));
  const result = await evaluateVisualFidelity(sourcePath, envelope, args.threshold);

  const payload = {
    generatedAt: new Date().toISOString(),
    envelopePath: args.envelopePath,
    sourcePath: args.sourcePath,
    ...result,
  };

  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  // Keep logs deterministic and compact for runner usage.
  process.stdout.write(`fidelity score=${result.metrics.score.toFixed(4)} threshold=${result.threshold.toFixed(4)} pass=${result.pass}\n`);

  if (!result.pass) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
