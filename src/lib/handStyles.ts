/**
 * Premium 3D Clock Hand Styles
 * Five palettes: white, silver, black, brown, gold
 * Each uses gradients, highlights, and shadows to simulate depth/3D appearance.
 */

export type HandStyleKey = 'white' | 'silver' | 'black' | 'brown' | 'gold' | 'poedagar' | 'fleming' | 'montagut' | 'olevs';

export interface HandStyleDef {
  key: HandStyleKey;
  label: string;
  description: string;
  /** Hex swatch used in UI preview */
  swatch: string;
}

export const HAND_STYLES: HandStyleDef[] = [
  { key: 'white',    label: 'White Pearl',    description: 'Pearlescent white ceramic look',        swatch: '#E8EAF0' },
  { key: 'silver',   label: 'Silver Steel',   description: 'Brushed stainless steel highlight',     swatch: '#B0B8C8' },
  { key: 'black',    label: 'Midnight Black', description: 'DLC-coated matte black with edge',      swatch: '#2A2D35' },
  { key: 'brown',    label: 'Bronze Cognac',  description: 'Warm PVD bronze gradient',              swatch: '#7D5A3C' },
  { key: 'gold',     label: 'Rose Gold',      description: 'Polished rose-gold with bevel',         swatch: '#C9954C' },
  { key: 'poedagar', label: 'Poedagar Gold',  description: 'Luxury gold with blue accent diamond',  swatch: '#D4A020' },
  { key: 'fleming',  label: 'Fleming Slate',  description: 'Slim architectural steel, dark dial',   swatch: '#7A8A9A' },
  { key: 'montagut', label: 'Montagut Silver', description: 'Leaf-shaped slim silver, green dial',  swatch: '#C0CCD8' },
  { key: 'olevs',    label: 'OLEVS Chrome',   description: 'Bold chrome, Roman-numerals style',     swatch: '#D8DDE8' },
];

// ─── Canvas helper ──────────────────────────────────────────────────────────────

function createCanvasImage(
  w: number, h: number,
  drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  drawFn(ctx, w, h);
  return canvas.toDataURL('image/png');
}

// ─── Gradient palette per style ─────────────────────────────────────────────────

interface HandPalette {
  // For tapered hands (hour / minute)
  bodyGrad: [string, string, string];  // left-edge, center-highlight, right-edge
  bodyStroke: string;
  tip: string;
  tailGrad: [string, string];          // tail lozenge gradient
  shadow: string;
  // For second hand
  secondMain: string;
  secondAccent: string;
  // For center cap
  capGrad: [string, string];
  capRing: string;
}

const PALETTES: Record<HandStyleKey, HandPalette> = {
  white: {
    bodyGrad:    ['#C0C8D8', '#FFFFFF', '#D0D8E8'],
    bodyStroke:  'rgba(120,130,150,0.5)',
    tip:         '#F0F4FF',
    tailGrad:    ['#B8C0D0', '#FFFFFF'],
    shadow:      'rgba(0,0,0,0.30)',
    secondMain:  '#E8ECF8',
    secondAccent:'#FF5060',
    capGrad:     ['#D0D8E8', '#FFFFFF'],
    capRing:     '#A8B0C0',
  },
  silver: {
    bodyGrad:    ['#606878', '#D8DDE8', '#707888'],
    bodyStroke:  'rgba(60,70,90,0.6)',
    tip:         '#E8EDF5',
    tailGrad:    ['#505868', '#C0C8D8'],
    shadow:      'rgba(0,0,0,0.40)',
    secondMain:  '#C0C8D8',
    secondAccent:'#FF4444',
    capGrad:     ['#606878', '#D8DDE8'],
    capRing:     '#404858',
  },
  black: {
    bodyGrad:    ['#0A0C10', '#4A5060', '#0A0C10'],
    bodyStroke:  'rgba(180,190,210,0.25)',
    tip:         '#6A7080',
    tailGrad:    ['#050608', '#3A3D45'],
    shadow:      'rgba(0,0,0,0.60)',
    secondMain:  '#282C35',
    secondAccent:'#FF3030',
    capGrad:     ['#0A0C10', '#3A3D45'],
    capRing:     'rgba(200,210,230,0.20)',
  },
  brown: {
    bodyGrad:    ['#3D2210', '#C4855A', '#3D2210'],
    bodyStroke:  'rgba(80,40,10,0.5)',
    tip:         '#D49060',
    tailGrad:    ['#2A180A', '#A06840'],
    shadow:      'rgba(40,15,0,0.50)',
    secondMain:  '#8B5A30',
    secondAccent:'#FFB060',
    capGrad:     ['#3D2210', '#C4855A'],
    capRing:     '#5C3018',
  },
  gold: {
    bodyGrad:    ['#7A5020', '#FFD080', '#B07030'],
    bodyStroke:  'rgba(100,60,10,0.4)',
    tip:         '#FFE8A0',
    tailGrad:    ['#8A6030', '#FFD080'],
    shadow:      'rgba(60,30,0,0.45)',
    secondMain:  '#C9A050',
    secondAccent:'#FF6060',
    capGrad:     ['#9A7030', '#FFD080'],
    capRing:     '#7A5020',
  },
  // Poedagar: rich gold with deep shadow and bright highlight — matches the blue-dial luxury watch
  poedagar: {
    bodyGrad:    ['#7A5500', '#FFD54F', '#B08020'],
    bodyStroke:  'rgba(180,120,0,0.6)',
    tip:         '#FFF8D0',
    tailGrad:    ['#6A4800', '#FFD54F'],
    shadow:      'rgba(80,40,0,0.55)',
    secondMain:  '#FFD54F',
    secondAccent:'#1565C0',   // blue accent (matching the dial)
    capGrad:     ['#B08020', '#FFD54F'],
    capRing:     '#7A5500',
  },
  // Fleming: dark slate-silver, thin architectural profile — matches the Fleming Editorial watch
  fleming: {
    bodyGrad:    ['#3A4050', '#A0A8B8', '#3A4050'],
    bodyStroke:  'rgba(200,210,230,0.20)',
    tip:         '#C8D0E0',
    tailGrad:    ['#282E3A', '#7A8898'],
    shadow:      'rgba(0,0,0,0.70)',
    secondMain:  '#7A8898',
    secondAccent:'#E0E8F0',
    capGrad:     ['#3A4050', '#A0A8B8'],
    capRing:     'rgba(220,230,250,0.25)',
  },
  // Montagut: clean bright silver with subtle leaf shape — matches the green-dial Montagut
  montagut: {
    bodyGrad:    ['#909AA8', '#E8EEF8', '#909AA8'],
    bodyStroke:  'rgba(100,110,130,0.40)',
    tip:         '#F4F8FF',
    tailGrad:    ['#707880', '#D0D8E8'],
    shadow:      'rgba(0,0,0,0.35)',
    secondMain:  '#D0D8E8',
    secondAccent:'#2E7D32',   // green accent matching dial
    capGrad:     ['#808890', '#E8EEF8'],
    capRing:     '#606870',
  },
  // OLEVS: bold chrome with strong highlight stripe — matches the black-dial OLEVS
  olevs: {
    bodyGrad:    ['#505860', '#F0F4FF', '#606870'],
    bodyStroke:  'rgba(40,50,60,0.50)',
    tip:         '#FFFFFF',
    tailGrad:    ['#404850', '#D8DDE8'],
    shadow:      'rgba(0,0,0,0.55)',
    secondMain:  '#E0E8F8',
    secondAccent:'#FF2020',
    capGrad:     ['#606870', '#F0F4FF'],
    capRing:     '#303840',
  },
};

// ─── Hand drawing functions ──────────────────────────────────────────────────────

/**
 * Draw a tapered 3D premium watch hand with beveled edges + drop shadow.
 * The image is drawn tip-up (0,0 = tip, bottom = pivot base).
 * Canvas size: w × h.  Pivot is at (w/2, h).
 */
function drawTaperedHand(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  pal: HandPalette,
  baseHalfW: number,  // half-width at base
  tipHalfW: number,   // half-width at tip (~0–1)
  tailLen: number,    // length of tail lozenge below pivot
) {
  const cx = w / 2;
  const pivotY = h - tailLen;

  // ── Drop shadow ──────────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor = pal.shadow;
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // ── Body path (tip to pivot, tapered) ───────────────────────────
  const bodyPath = new Path2D();
  bodyPath.moveTo(cx - tipHalfW, 2);          // top-left near tip
  bodyPath.lineTo(cx + tipHalfW, 2);          // top-right near tip
  bodyPath.lineTo(cx + baseHalfW, pivotY);    // bottom-right wide
  bodyPath.lineTo(cx - baseHalfW, pivotY);    // bottom-left wide
  bodyPath.closePath();

  // Main body gradient (left → right for 3D bevel)
  const grad = ctx.createLinearGradient(cx - baseHalfW, 0, cx + baseHalfW, 0);
  grad.addColorStop(0,    pal.bodyGrad[0]);
  grad.addColorStop(0.5,  pal.bodyGrad[1]);
  grad.addColorStop(1,    pal.bodyGrad[2]);
  ctx.fillStyle = grad;
  ctx.fill(bodyPath);

  // Edge stroke
  ctx.strokeStyle = pal.bodyStroke;
  ctx.lineWidth = 0.75;
  ctx.stroke(bodyPath);
  ctx.restore();

  // ── Highlight stripe (center longitudinal gloss) ────────────────
  ctx.save();
  const hlGrad = ctx.createLinearGradient(cx - 1, 0, cx + 1, 0);
  hlGrad.addColorStop(0, 'rgba(255,255,255,0)');
  hlGrad.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hlGrad;
  const hlW = Math.max(baseHalfW * 0.35, 1.5);
  ctx.fillRect(cx - hlW / 2, 4, hlW, pivotY - 8);
  ctx.restore();

  // ── Tail lozenge (counter-balance below pivot) ───────────────────
  if (tailLen > 4) {
    ctx.save();
    const tailPath = new Path2D();
    const tailW = baseHalfW * 0.9;
    tailPath.moveTo(cx, h - 2);
    tailPath.lineTo(cx + tailW, pivotY);
    tailPath.lineTo(cx - tailW, pivotY);
    tailPath.closePath();

    const tailGrad = ctx.createLinearGradient(cx - tailW, pivotY, cx + tailW, h);
    tailGrad.addColorStop(0, pal.tailGrad[0]);
    tailGrad.addColorStop(1, pal.tailGrad[1]);
    ctx.fillStyle = tailGrad;
    ctx.fill(tailPath);
    ctx.restore();
  }

  // ── Tip accent (tiny bright cap at top) ─────────────────────────
  ctx.save();
  ctx.fillStyle = pal.tip;
  ctx.beginPath();
  ctx.ellipse(cx, 3, tipHalfW + 0.5, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draw a premium second hand:
 * - thin main shaft with counter-balance tail
 * - accent colored lollipop circle near tip
 */
function drawSecondHand(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  pal: HandPalette,
) {
  const cx = w / 2;
  const pivotY = h * 0.5;

  // Drop shadow
  ctx.save();
  ctx.shadowColor = pal.shadow;
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  // Main shaft
  const shaftGrad = ctx.createLinearGradient(cx - 1, 0, cx + 1, 0);
  shaftGrad.addColorStop(0, pal.secondMain);
  shaftGrad.addColorStop(0.5, 'rgba(255,255,255,0.7)');
  shaftGrad.addColorStop(1, pal.secondMain);
  ctx.fillStyle = shaftGrad;
  ctx.fillRect(cx - 1, 2, 2, h - 4);
  ctx.restore();

  // Accent lollipop ~20% from tip
  const lollY = Math.floor(h * 0.2);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, lollY, 4, 0, Math.PI * 2);
  const lollGrad = ctx.createRadialGradient(cx - 1, lollY - 1, 0, cx, lollY, 4);
  lollGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
  lollGrad.addColorStop(1, pal.secondAccent);
  ctx.fillStyle = lollGrad;
  ctx.fill();
  ctx.restore();

  // Tail counter-balance (fat pill)
  const tailW = 2.5;
  const tailTop = pivotY + 8;
  const tailBot = h - 4;
  ctx.save();
  const tailGrad = ctx.createLinearGradient(cx - tailW, tailTop, cx + tailW, tailBot);
  tailGrad.addColorStop(0, pal.bodyGrad[0]);
  tailGrad.addColorStop(1, pal.bodyGrad[1]);
  ctx.fillStyle = tailGrad;
  ctx.beginPath();
  ctx.roundRect(cx - tailW, tailTop, tailW * 2, tailBot - tailTop, tailW);
  ctx.fill();
  ctx.restore();
}

/**
 * Draw a premium center cap (covers hand pivot).
 * 30×30 canvas, center at (15,15).
 */
function drawCenterCap(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  pal: HandPalette,
) {
  const cx = w / 2;
  const cy = h / 2;
  const r = 10;

  // Drop shadow ring
  ctx.save();
  ctx.shadowColor = pal.shadow;
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;

  // Outer disk
  const grad = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, r);
  grad.addColorStop(0, pal.capGrad[1]);
  grad.addColorStop(0.6, pal.capGrad[0]);
  grad.addColorStop(1, pal.shadow);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  // Outer ring stroke
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = pal.capRing;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Inner gloss spot
  ctx.save();
  const gloss = ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, 5);
  gloss.addColorStop(0, 'rgba(255,255,255,0.55)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fillStyle = gloss;
  ctx.fill();
  ctx.restore();

  // Center dot
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fillStyle = pal.capGrad[1];
  ctx.fill();
  ctx.restore();
}

// ─── Public API: generate all 4 hand PNGs for a given style ────────────────────

export interface GeneratedHandSet {
  hourHand:   string;  // data URL
  minuteHand: string;  // data URL
  secondHand: string;  // data URL
  cover:      string;  // data URL
}

export function generateHandSet(style: HandStyleKey): GeneratedHandSet {
  const pal = PALETTES[style];

  // Per-style geometry overrides: [hourBase, hourTip, minuteBase, minuteTip, tailMult]
  // Defaults: hour baseHalfW=5, tip=1, tail=22; minute baseHalfW=3.5, tip=0.8, tail=28
  type Geom = { hBase: number; hTip: number; hTail: number; mBase: number; mTip: number; mTail: number };
  const GEOM: Partial<Record<HandStyleKey, Geom>> = {
    poedagar: { hBase: 6, hTip: 1.5, hTail: 24, mBase: 4.5, mTip: 1.2, mTail: 30 },   // wider faceted gold
    fleming:  { hBase: 3, hTip: 0.6, hTail: 18, mBase: 2.2, mTip: 0.5, mTail: 22 },   // ultra-slim
    montagut: { hBase: 4, hTip: 0.7, hTail: 20, mBase: 2.8, mTip: 0.6, mTail: 26 },   // slim leaf
    olevs:    { hBase: 7, hTip: 1.8, hTail: 26, mBase: 5.5, mTip: 1.4, mTail: 32 },   // wide chrome
  };
  const g = GEOM[style] ?? { hBase: 5, hTip: 1, hTail: 22, mBase: 3.5, mTip: 0.8, mTail: 28 };

  // Hour hand: 22×140, pivot at (11, 118)
  const hourHand = createCanvasImage(22, 140, (ctx, w, h) => {
    drawTaperedHand(ctx, w, h, pal, g.hBase, g.hTip, g.hTail);
  });

  // Minute hand: 16×200, pivot at (8, 172)
  const minuteHand = createCanvasImage(16, 200, (ctx, w, h) => {
    drawTaperedHand(ctx, w, h, pal, g.mBase, g.mTip, g.mTail);
  });

  // Second hand: 8×240, pivot at (4, 180)
  const secondHand = createCanvasImage(8, 240, (ctx, w, h) => {
    drawSecondHand(ctx, w, h, pal);
  });

  // Center cap: 30×30
  const cover = createCanvasImage(30, 30, (ctx, w, h) => {
    drawCenterCap(ctx, w, h, pal);
  });

  return { hourHand, minuteHand, secondHand, cover };
}
