// Spec 020 — Weather Icon Sets
// 3 styles × 29 weather conditions = 87 canvas-drawn icons
// Each icon: 60×60px canvas PNG (data URL)

export type WeatherStyle = 'neon' | 'flat' | 'outline';

export const WEATHER_STYLES: { key: WeatherStyle; label: string }[] = [
  { key: 'flat',    label: 'Flat'    },
  { key: 'neon',    label: 'Neon'    },
  { key: 'outline', label: 'Outline' },
];

// ─── Style palettes ──────────────────────────────────────────────────────────────

interface Palette {
  sun: string;
  cloud: string;
  rain: string;
  snow: string;
  thunder: string;
  wind: string;
  special: string;
  bg: string;
  stroke: string;
}

const PALETTES: Record<WeatherStyle, Palette> = {
  flat: {
    sun:      '#FFD700',
    cloud:    '#90A4AE',
    rain:     '#5B9BD5',
    snow:     '#B0C4DE',
    thunder:  '#FF9800',
    wind:     '#78909C',
    special:  '#A5D6A7',
    bg:       'transparent',
    stroke:   'transparent',
  },
  neon: {
    sun:      '#FFE600',
    cloud:    '#00E5FF',
    rain:     '#00B0FF',
    snow:     '#E040FB',
    thunder:  '#FF6D00',
    wind:     '#00E5FF',
    special:  '#69FF47',
    bg:       'transparent',
    stroke:   'transparent',
  },
  outline: {
    sun:      '#FFFFFF',
    cloud:    '#FFFFFF',
    rain:     '#FFFFFF',
    snow:     '#FFFFFF',
    thunder:  '#FFFFFF',
    wind:     '#FFFFFF',
    special:  '#FFFFFF',
    bg:       'transparent',
    stroke:   '#FFFFFF',
  },
};

// ─── Primitive drawers ───────────────────────────────────────────────────────────

function filled(style: WeatherStyle): boolean { return style !== 'outline'; }

function drawSun(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string, style: WeatherStyle) {
  // Rays
  const rays = 8;
  ctx.strokeStyle = col; ctx.lineWidth = style === 'neon' ? 2 : 1.5;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * (r + 3);
    const y1 = cy + Math.sin(a) * (r + 3);
    const x2 = cx + Math.cos(a) * (r + 7);
    const y2 = cy + Math.sin(a) * (r + 7);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  // Disc
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  if (filled(style)) { ctx.fillStyle = col; ctx.fill(); }
  else { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke(); }
  if (style === 'neon') {
    ctx.shadowColor = col; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function drawCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, col: string, style: WeatherStyle) {
  const x = cx - w / 2; const y = cy - h / 2;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.25, y + h);
  ctx.lineTo(x + w * 0.75, y + h);
  ctx.arc(x + w * 0.75, y + h * 0.6, h * 0.4, Math.PI * 0.5, -Math.PI * 0.1, true);
  ctx.arc(x + w * 0.5,  y + h * 0.3, h * 0.38, -Math.PI * 0.05, Math.PI * 1.05, true);
  ctx.arc(x + w * 0.25, y + h * 0.55, h * 0.33, -Math.PI * 1.1, Math.PI * 0.5, false);
  ctx.closePath();
  if (filled(style)) { ctx.fillStyle = col; ctx.fill(); }
  else { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke(); }
  if (style === 'neon') { ctx.shadowColor = col; ctx.shadowBlur = 6; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke(); ctx.shadowBlur = 0; }
}

function drawRainDrops(ctx: CanvasRenderingContext2D, cx: number, top: number, count: number, col: string, style: WeatherStyle) {
  const spacing = 8; const startX = cx - ((count - 1) * spacing) / 2;
  ctx.strokeStyle = col; ctx.lineWidth = style === 'neon' ? 2 : 1.5;
  if (style === 'neon') { ctx.shadowColor = col; ctx.shadowBlur = 5; }
  for (let i = 0; i < count; i++) {
    const x = startX + i * spacing;
    const yOff = (i % 2) * 4;
    ctx.beginPath(); ctx.moveTo(x, top + yOff); ctx.lineTo(x - 2, top + 9 + yOff); ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

function drawSnowFlakes(ctx: CanvasRenderingContext2D, cx: number, top: number, count: number, col: string, style: WeatherStyle) {
  const spacing = 9; const startX = cx - ((count - 1) * spacing) / 2;
  ctx.fillStyle = col; ctx.font = style === 'neon' ? 'bold 10px sans-serif' : '9px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  if (style === 'neon') { ctx.shadowColor = col; ctx.shadowBlur = 5; }
  for (let i = 0; i < count; i++) {
    const x = startX + i * spacing;
    const yOff = (i % 2) * 4;
    ctx.fillText('*', x, top + yOff);
  }
  ctx.shadowBlur = 0;
}

function drawThunderBolt(ctx: CanvasRenderingContext2D, cx: number, cy: number, col: string, style: WeatherStyle) {
  ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2;
  if (style === 'neon') { ctx.shadowColor = col; ctx.shadowBlur = 8; }
  ctx.beginPath();
  ctx.moveTo(cx + 3, cy - 10);
  ctx.lineTo(cx - 3, cy);
  ctx.lineTo(cx + 1, cy);
  ctx.lineTo(cx - 3, cy + 10);
  ctx.lineTo(cx + 3, cy);
  ctx.lineTo(cx - 1, cy);
  ctx.closePath();
  if (filled(style)) ctx.fill(); else ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawWindLines(ctx: CanvasRenderingContext2D, cx: number, cy: number, col: string, style: WeatherStyle) {
  ctx.strokeStyle = col; ctx.lineWidth = style === 'neon' ? 2.5 : 1.5;
  ctx.lineCap = 'round';
  if (style === 'neon') { ctx.shadowColor = col; ctx.shadowBlur = 6; }
  const lines = [{ y: -8, w: 18 }, { y: 0, w: 22 }, { y: 8, w: 14 }];
  for (const l of lines) {
    ctx.beginPath(); ctx.moveTo(cx - l.w / 2, cy + l.y); ctx.lineTo(cx + l.w / 2, cy + l.y); ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

// ─── Per-code draw dispatcher ─────────────────────────────────────────────────────

function drawCode(ctx: CanvasRenderingContext2D, code: number, style: WeatherStyle) {
  const p = PALETTES[style];
  const W = 60; const H = 60;
  const cx = W / 2; const cy = H / 2;

  ctx.clearRect(0, 0, W, H);

  switch (code) {
    case 0: // Sunny
      drawSun(ctx, cx, cy, 14, p.sun, style); break;

    case 1: // Mostly Sunny
      drawSun(ctx, cx - 6, cy - 4, 11, p.sun, style);
      drawCloud(ctx, cx + 8, cy + 6, 26, 14, p.cloud, style); break;

    case 2: // Partly Cloudy
      drawSun(ctx, cx - 8, cy - 6, 10, p.sun, style);
      drawCloud(ctx, cx + 6, cy + 5, 28, 16, p.cloud, style); break;

    case 3: // Mostly Cloudy
      drawSun(ctx, cx - 12, cy - 8, 8, p.sun, style);
      drawCloud(ctx, cx + 4, cy + 4, 30, 18, p.cloud, style); break;

    case 4: // Cloudy
      drawCloud(ctx, cx, cy, 34, 20, p.cloud, style); break;

    case 5: // Light Showers
      drawCloud(ctx, cx, cy - 8, 30, 16, p.cloud, style);
      drawRainDrops(ctx, cx, cy + 10, 3, p.rain, style); break;

    case 6: // Showers
      drawCloud(ctx, cx, cy - 8, 32, 17, p.cloud, style);
      drawRainDrops(ctx, cx, cy + 10, 4, p.rain, style); break;

    case 7: // Heavy Showers
      drawCloud(ctx, cx, cy - 8, 34, 18, p.cloud, style);
      drawRainDrops(ctx, cx, cy + 10, 5, p.rain, style); break;

    case 8: // Thunderstorm
      drawCloud(ctx, cx, cy - 10, 32, 16, p.cloud, style);
      drawThunderBolt(ctx, cx, cy + 10, p.thunder, style); break;

    case 9: // Heavy Thunder
      drawCloud(ctx, cx, cy - 10, 34, 18, p.cloud, style);
      drawThunderBolt(ctx, cx - 5, cy + 8, p.thunder, style);
      drawThunderBolt(ctx, cx + 5, cy + 12, p.thunder, style); break;

    case 10: // Sleet — rain + snow mix
      drawCloud(ctx, cx, cy - 8, 30, 16, p.cloud, style);
      drawRainDrops(ctx, cx - 5, cy + 10, 2, p.rain, style);
      drawSnowFlakes(ctx, cx + 5, cy + 10, 2, p.snow, style); break;

    case 11: // Light Snow
      drawCloud(ctx, cx, cy - 8, 30, 16, p.cloud, style);
      drawSnowFlakes(ctx, cx, cy + 10, 3, p.snow, style); break;

    case 12: // Snow
      drawCloud(ctx, cx, cy - 8, 32, 17, p.cloud, style);
      drawSnowFlakes(ctx, cx, cy + 10, 4, p.snow, style); break;

    case 13: // Heavy Snow
      drawCloud(ctx, cx, cy - 8, 34, 18, p.cloud, style);
      drawSnowFlakes(ctx, cx, cy + 10, 5, p.snow, style); break;

    case 14: // Blizzard — snow + wind
      drawCloud(ctx, cx, cy - 8, 32, 16, p.cloud, style);
      drawSnowFlakes(ctx, cx, cy + 10, 4, p.snow, style);
      drawWindLines(ctx, cx, cy + 22, p.wind, style); break;

    case 15: { // Fog
      ctx.strokeStyle = p.special; ctx.lineWidth = style === 'neon' ? 2 : 1.5; ctx.lineCap = 'round';
      if (style === 'neon') { ctx.shadowColor = p.special; ctx.shadowBlur = 6; }
      for (let i = 0; i < 4; i++) {
        const y = cy - 10 + i * 7;
        const xOff = (i % 2) * 3;
        ctx.beginPath(); ctx.moveTo(cx - 18 + xOff, y); ctx.lineTo(cx + 18 + xOff, y); ctx.stroke();
      }
      ctx.shadowBlur = 0; break;
    }

    case 16: // Freezing Rain — rain + ice
      drawCloud(ctx, cx, cy - 8, 30, 16, p.cloud, style);
      drawRainDrops(ctx, cx, cy + 10, 4, p.rain, style);
      ctx.fillStyle = p.snow; ctx.font = '9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('❄', cx, cy + 22); break;

    case 17: { // Sandstorm
      ctx.fillStyle = p.special; ctx.strokeStyle = p.special;
      if (style === 'neon') { ctx.shadowColor = p.special; ctx.shadowBlur = 6; }
      for (let i = 0; i < 3; i++) {
        const y = cy - 6 + i * 8;
        ctx.beginPath(); ctx.ellipse(cx, y, 16 - i * 3, 3, 0, 0, Math.PI * 2);
        if (filled(style)) ctx.fill(); else { ctx.lineWidth = 1.5; ctx.stroke(); }
      }
      ctx.shadowBlur = 0; break;
    }

    case 18: // Overcast — double cloud layer
      drawCloud(ctx, cx, cy + 5, 36, 20, p.cloud, style);
      if (filled(style)) {
        ctx.globalAlpha = 0.5;
        drawCloud(ctx, cx - 4, cy - 8, 28, 14, p.cloud, style);
        ctx.globalAlpha = 1;
      } else {
        drawCloud(ctx, cx - 4, cy - 8, 28, 14, p.cloud, style);
      } break;

    case 19: { // Hail
      drawCloud(ctx, cx, cy - 8, 30, 16, p.cloud, style);
      const hailCol = p.snow;
      ctx.fillStyle = hailCol; ctx.strokeStyle = hailCol; ctx.lineWidth = 1.5;
      if (style === 'neon') { ctx.shadowColor = hailCol; ctx.shadowBlur = 5; }
      const hailX = [cx - 10, cx, cx + 10];
      for (const hx of hailX) {
        ctx.beginPath(); ctx.arc(hx, cy + 12, 3, 0, Math.PI * 2);
        if (filled(style)) ctx.fill(); else ctx.stroke();
      }
      ctx.shadowBlur = 0; break;
    }

    case 20: // Windy
      drawWindLines(ctx, cx, cy, p.wind, style); break;

    case 21: { // Hurricane — spiral-ish
      ctx.strokeStyle = p.wind; ctx.lineWidth = style === 'neon' ? 2.5 : 2; ctx.lineCap = 'round';
      if (style === 'neon') { ctx.shadowColor = p.wind; ctx.shadowBlur = 8; }
      ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 1.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + 4, cy + 2, 8, Math.PI * 0.3, Math.PI * 1.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + 2, cy + 1, 3, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0; break;
    }

    case 22: { // Tornado — funnel
      ctx.strokeStyle = p.wind; ctx.lineWidth = style === 'neon' ? 2 : 1.5;
      if (style === 'neon') { ctx.shadowColor = p.wind; ctx.shadowBlur = 6; }
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy - 14); ctx.lineTo(cx + 16, cy - 14);
      ctx.moveTo(cx - 10, cy - 6); ctx.lineTo(cx + 10, cy - 6);
      ctx.moveTo(cx - 5, cy + 2); ctx.lineTo(cx + 5, cy + 2);
      ctx.moveTo(cx - 2, cy + 8); ctx.lineTo(cx + 2, cy + 8);
      ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy + 16);
      ctx.stroke(); ctx.shadowBlur = 0; break;
    }

    case 23: { // Extreme Cold — snowflake + thermometer
      ctx.fillStyle = p.snow; ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (style === 'neon') { ctx.shadowColor = p.snow; ctx.shadowBlur = 8; }
      ctx.fillText('❄', cx - 6, cy);
      ctx.fillStyle = p.rain; ctx.font = '16px sans-serif';
      ctx.fillText('🌡', cx + 10, cy + 2);
      ctx.shadowBlur = 0; break;
    }

    case 24: { // Extreme Heat — big sun + wavy lines
      drawSun(ctx, cx, cy - 6, 13, p.sun, style);
      ctx.strokeStyle = p.sun; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      if (style === 'neon') { ctx.shadowColor = p.sun; ctx.shadowBlur = 6; }
      for (let i = 0; i < 3; i++) {
        const wx = cx - 12 + i * 12;
        ctx.beginPath(); ctx.moveTo(wx - 3, cy + 12); ctx.quadraticCurveTo(wx, cy + 16, wx + 3, cy + 12); ctx.stroke();
      }
      ctx.shadowBlur = 0; break;
    }

    case 25: { // Icy Roads — snowflake + horizontal lines
      ctx.fillStyle = p.snow; ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (style === 'neon') { ctx.shadowColor = p.snow; ctx.shadowBlur = 6; }
      ctx.fillText('❄', cx, cy - 8);
      ctx.strokeStyle = p.rain; ctx.lineWidth = style === 'neon' ? 2 : 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - 18, cy + 8); ctx.lineTo(cx + 18, cy + 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 14, cy + 14); ctx.lineTo(cx + 14, cy + 14); ctx.stroke();
      ctx.shadowBlur = 0; break;
    }

    case 26: // Light Freezing Rain
      drawCloud(ctx, cx, cy - 8, 28, 14, p.cloud, style);
      drawRainDrops(ctx, cx, cy + 10, 2, p.rain, style);
      ctx.fillStyle = p.snow; ctx.font = '8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('❄', cx + 8, cy + 18); break;

    case 27: // Moderate Snow
      drawCloud(ctx, cx, cy - 8, 32, 16, p.cloud, style);
      drawSnowFlakes(ctx, cx, cy + 10, 4, p.snow, style); break;

    case 28: { // Unknown / Clear Night — crescent moon + stars
      ctx.fillStyle = p.sun; ctx.strokeStyle = p.sun;
      if (style === 'neon') { ctx.shadowColor = p.sun; ctx.shadowBlur = 8; }
      // Moon crescent
      ctx.beginPath(); ctx.arc(cx - 2, cy, 12, 0, Math.PI * 2);
      if (filled(style)) { ctx.fill(); } else { ctx.lineWidth = 2; ctx.stroke(); }
      // Cutout (only for flat/neon, not outline)
      if (filled(style)) {
        ctx.fillStyle = '#000000';
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath(); ctx.arc(cx + 4, cy - 3, 10, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      // Stars
      ctx.fillStyle = p.sun; ctx.font = '6px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('★', cx + 14, cy - 10);
      ctx.fillText('★', cx + 18, cy + 4);
      ctx.shadowBlur = 0; break;
    }

    default:
      // Fallback: question mark
      ctx.fillStyle = PALETTES[style].special;
      ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', cx, cy);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────────

/** Returns an array of 29 data URLs, one per weather code (0–28). */
export function generateWeatherSet(style: WeatherStyle): string[] {
  return Array.from({ length: 29 }, (_, code) => {
    const canvas = document.createElement('canvas');
    canvas.width = 60; canvas.height = 60;
    const ctx = canvas.getContext('2d')!;
    drawCode(ctx, code, style);
    return canvas.toDataURL('image/png');
  });
}
