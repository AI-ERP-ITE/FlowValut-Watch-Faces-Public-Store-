import { ZEP_WEATHER_CONDITION_CODES } from './dataRepresentationAuthority';

export type WeatherStyle = 'neon' | 'flat' | 'outline';

export const WEATHER_STYLES: { key: WeatherStyle; label: string }[] = [
  { key: 'flat', label: 'Flat' },
  { key: 'neon', label: 'Neon' },
  { key: 'outline', label: 'Outline' },
];

export type WeatherIconKind =
  | 'cloud' | 'rain' | 'snow' | 'sun' | 'sand' | 'rain-snow'
  | 'fog' | 'haze' | 'thunder' | 'dust' | 'rain-hail' | 'thunder-hail'
  | 'unknown' | 'cloud-night' | 'rain-night' | 'clear-night';

export interface WeatherIconRecipe {
  code: number;
  label: string;
  kind: WeatherIconKind;
  intensity?: 1 | 2 | 3 | 4;
}

const RECIPE_DETAILS: readonly Pick<WeatherIconRecipe, 'kind' | 'intensity'>[] = [
  { kind: 'cloud' }, { kind: 'rain', intensity: 2 }, { kind: 'snow', intensity: 2 },
  { kind: 'sun' }, { kind: 'cloud', intensity: 2 }, { kind: 'rain', intensity: 1 },
  { kind: 'snow', intensity: 1 }, { kind: 'rain', intensity: 2 }, { kind: 'snow', intensity: 2 },
  { kind: 'snow', intensity: 3 }, { kind: 'rain', intensity: 3 }, { kind: 'sand', intensity: 2 },
  { kind: 'rain-snow' }, { kind: 'fog' }, { kind: 'haze' }, { kind: 'thunder' },
  { kind: 'snow', intensity: 4 }, { kind: 'dust', intensity: 1 }, { kind: 'rain', intensity: 4 },
  { kind: 'rain-hail' }, { kind: 'thunder-hail' }, { kind: 'rain', intensity: 4 },
  { kind: 'dust', intensity: 2 }, { kind: 'sand', intensity: 3 }, { kind: 'rain', intensity: 3 },
  { kind: 'unknown' }, { kind: 'cloud-night' }, { kind: 'rain-night', intensity: 2 },
  { kind: 'clear-night' },
];

export const WEATHER_ICON_RECIPE_BY_CODE: readonly WeatherIconRecipe[] = Object.freeze(
  ZEP_WEATHER_CONDITION_CODES.map((condition, index) => ({
    ...condition,
    ...RECIPE_DETAILS[index],
  } as WeatherIconRecipe)),
);

interface Palette {
  sun: string; cloud: string; rain: string; snow: string;
  thunder: string; wind: string; special: string;
}

const PALETTES: Record<WeatherStyle, Palette> = {
  flat: { sun: '#FFD700', cloud: '#90A4AE', rain: '#5B9BD5', snow: '#D9F2FF', thunder: '#FF9800', wind: '#78909C', special: '#C2A56B' },
  neon: { sun: '#FFE600', cloud: '#00E5FF', rain: '#00B0FF', snow: '#E040FB', thunder: '#FF6D00', wind: '#00E5FF', special: '#69FF47' },
  outline: { sun: '#FFFFFF', cloud: '#FFFFFF', rain: '#FFFFFF', snow: '#FFFFFF', thunder: '#FFFFFF', wind: '#FFFFFF', special: '#FFFFFF' },
};

function isFilled(style: WeatherStyle) { return style !== 'outline'; }

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, style: WeatherStyle) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (isFilled(style)) { ctx.fillStyle = color; ctx.fill(); }
  else { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); }
}

function drawSun(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, style: WeatherStyle) {
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(angle) * 13, y + Math.sin(angle) * 13);
    ctx.lineTo(x + Math.cos(angle) * 19, y + Math.sin(angle) * 19); ctx.stroke();
  }
  circle(ctx, x, y, 10, color, style);
}

function drawMoon(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, style: WeatherStyle) {
  circle(ctx, x, y, 11, color, style);
  if (isFilled(style)) {
    ctx.globalCompositeOperation = 'destination-out';
    circle(ctx, x + 5, y - 4, 10, '#000', 'flat');
    ctx.globalCompositeOperation = 'source-over';
  }
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, style: WeatherStyle, overcast = false) {
  const cloud = (dx: number, dy: number) => {
    ctx.beginPath(); ctx.arc(x - 10 + dx, y + dy, 8, Math.PI, 0);
    ctx.arc(x + dx, y - 5 + dy, 11, Math.PI, 0);
    ctx.arc(x + 11 + dx, y + dy, 8, Math.PI, 0); ctx.lineTo(x + 19 + dx, y + 8 + dy);
    ctx.lineTo(x - 18 + dx, y + 8 + dy); ctx.closePath();
    if (isFilled(style)) { ctx.fillStyle = color; ctx.fill(); }
    else { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); }
  };
  if (overcast) { ctx.globalAlpha = 0.55; cloud(-4, -7); ctx.globalAlpha = 1; }
  cloud(0, 0);
}

function drawPrecipitation(ctx: CanvasRenderingContext2D, count: number, color: string, snow = false, hail = false) {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
  const start = 30 - (count - 1) * 4;
  for (let i = 0; i < count; i++) {
    const x = start + i * 8; const y = 43 + (i % 2) * 3;
    if (hail) { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill(); }
    else if (snow) { ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('*', x, y + 4); }
    else { ctx.beginPath(); ctx.moveTo(x + 2, y - 3); ctx.lineTo(x - 2, y + 6); ctx.stroke(); }
  }
}

function drawAtmosphere(ctx: CanvasRenderingContext2D, color: string, count: number, dots: boolean) {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const y = 20 + i * 7;
    if (dots) for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.arc(15 + j * 8 + (i % 2) * 2, y, 1.5, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(12 + (i % 2) * 4, y); ctx.lineTo(48 - (i % 2) * 4, y); ctx.stroke(); }
  }
}

function drawThunder(ctx: CanvasRenderingContext2D, color: string, x = 30) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x + 3, 36); ctx.lineTo(x - 4, 46);
  ctx.lineTo(x, 46); ctx.lineTo(x - 4, 56); ctx.lineTo(x + 7, 43); ctx.lineTo(x + 2, 43); ctx.closePath(); ctx.fill();
}

function drawCode(ctx: CanvasRenderingContext2D, recipe: WeatherIconRecipe, style: WeatherStyle) {
  const p = PALETTES[style]; const count = Math.min(5, (recipe.intensity ?? 2) + 1);
  ctx.clearRect(0, 0, 60, 60);
  if (style === 'neon') { ctx.shadowBlur = 5; ctx.shadowColor = p.cloud; }
  switch (recipe.kind) {
    case 'sun': drawSun(ctx, 30, 30, p.sun, style); break;
    case 'cloud': drawCloud(ctx, 30, 29, p.cloud, style, recipe.intensity === 2); break;
    case 'rain': drawCloud(ctx, 30, 23, p.cloud, style); drawPrecipitation(ctx, count, p.rain); break;
    case 'snow': drawCloud(ctx, 30, 23, p.cloud, style); drawPrecipitation(ctx, count, p.snow, true); break;
    case 'rain-snow': drawCloud(ctx, 30, 23, p.cloud, style); drawPrecipitation(ctx, 2, p.rain); drawPrecipitation(ctx, 3, p.snow, true); break;
    case 'sand': drawAtmosphere(ctx, p.special, recipe.intensity === 3 ? 5 : 4, true); break;
    case 'dust': drawAtmosphere(ctx, p.special, recipe.intensity === 2 ? 4 : 3, true); break;
    case 'fog': drawAtmosphere(ctx, p.wind, 4, false); break;
    case 'haze': drawSun(ctx, 30, 21, p.sun, style); drawAtmosphere(ctx, p.wind, 3, false); break;
    case 'thunder': drawCloud(ctx, 30, 22, p.cloud, style); drawThunder(ctx, p.thunder); break;
    case 'rain-hail': drawCloud(ctx, 30, 22, p.cloud, style); drawPrecipitation(ctx, 2, p.rain); drawPrecipitation(ctx, 3, p.snow, false, true); break;
    case 'thunder-hail': drawCloud(ctx, 30, 20, p.cloud, style); drawThunder(ctx, p.thunder, 24); drawPrecipitation(ctx, 3, p.snow, false, true); break;
    case 'cloud-night': drawMoon(ctx, 21, 20, p.sun, style); drawCloud(ctx, 34, 31, p.cloud, style); break;
    case 'rain-night': drawMoon(ctx, 19, 18, p.sun, style); drawCloud(ctx, 34, 25, p.cloud, style); drawPrecipitation(ctx, count, p.rain); break;
    case 'clear-night': drawMoon(ctx, 30, 30, p.sun, style); break;
    case 'unknown': ctx.fillStyle = p.special; ctx.font = 'bold 25px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 30, 30); break;
  }
  ctx.shadowBlur = 0;
}

/** Returns one 60x60 PNG data URL for every official Zepp weather condition code (0-28). */
export function generateWeatherSet(style: WeatherStyle): string[] {
  return WEATHER_ICON_RECIPE_BY_CODE.map(recipe => {
    const canvas = document.createElement('canvas'); canvas.width = 60; canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to create weather icon canvas context.');
    drawCode(ctx, recipe, style);
    return canvas.toDataURL('image/png');
  });
}
