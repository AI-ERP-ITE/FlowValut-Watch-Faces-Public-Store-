// Pipeline Asset Generator — Creates Canvas-drawn PNG images for all widgets.
// Produces the same images that the V2 code generator references.
// No AI. Deterministic. Reuses drawing patterns from the legacy assetGenerator.

import type { ElementImage } from '@/types';
import type { ResolvedElement } from '@/types/pipeline';
import { TIME_DIGIT, DATE_DIGIT, MONTH_LABEL, WEEK_LABEL, WEATHER_ICON, TEXT_IMG_DIGIT } from './constants';
import { getIconByKey, getIconLibrary } from '@/lib/iconLibrary';
import { generateWeatherSet } from '@/lib/weatherIconSets';
import type { WeatherStyle } from '@/lib/weatherIconSets';
import { generateHandSet } from '@/lib/handStyles';
import type { HandStyleKey } from '@/lib/handStyles';

// ─── Canvas Utility ─────────────────────────────────────────────────────────────

function createCanvasImage(
  width: number,
  height: number,
  drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, width, height);
  drawFn(ctx, width, height);
  return canvas.toDataURL('image/png');
}

// ─── Curved Text Generator ──────────────────────────────────────────────────────

export function generateCurvedTextImage(
  text: string,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
  fontSize: number,
  color: string,
): string {
  const size = (radius + fontSize) * 2 + 20;
  return createCanvasImage(size, size, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const startAngle = (startAngleDeg * Math.PI) / 180;
    const endAngle = (endAngleDeg * Math.PI) / 180;
    const totalAngle = endAngle - startAngle;
    const anglePerChar = totalAngle / Math.max(text.length - 1, 1);

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
  });
}

// ─── Digit Generator ────────────────────────────────────────────────────────────

export function generateDigitImages(
  prefix: string,
  width: number,
  height: number,
  color: string,
  style?: { fontFamily: string; fontWeight: string },
): ElementImage[] {
  const fontFamily = style?.fontFamily ?? 'Arial';
  const fontWeight = style?.fontWeight ?? 'bold';
  const images: ElementImage[] = [];
  for (let i = 0; i < 10; i++) {
    const name = `${prefix}_${i}.png`;
    const dataUrl = createCanvasImage(width, height, (ctx, w, h) => {
      ctx.fillStyle = color;
      ctx.font = `${fontWeight} ${Math.floor(h * 0.75)}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i), w / 2, h / 2);
    });
    images.push({ name, dataUrl, bounds: { x: 0, y: 0, width, height }, type: 'IMG' });
  }
  return images;
}

// ─── Text Label Generator ───────────────────────────────────────────────────────

function generateTextImages(
  prefix: string,
  labels: string[],
  width: number,
  height: number,
  color: string,
): ElementImage[] {
  return labels.map((label, i) => ({
    name: `${prefix}_${i}.png`,
    dataUrl: createCanvasImage(width, height, (ctx, w, h) => {
      ctx.fillStyle = color;
      ctx.font = `bold ${Math.floor(h * 0.6)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, w / 2, h / 2);
    }),
    bounds: { x: 0, y: 0, width, height },
    type: 'IMG' as const,
  }));
}

// ─── Clock Hand Generator ───────────────────────────────────────────────────────

function generateClockHands(style: HandStyleKey = 'silver'): ElementImage[] {
  const set = generateHandSet(style);
  return [
    { name: 'hour_hand.png',  dataUrl: set.hourHand,   bounds: { x: 0, y: 0, width: 22, height: 140 }, type: 'TIME_POINTER' },
    { name: 'minute_hand.png',dataUrl: set.minuteHand, bounds: { x: 0, y: 0, width: 16, height: 200 }, type: 'TIME_POINTER' },
    { name: 'second_hand.png',dataUrl: set.secondHand, bounds: { x: 0, y: 0, width: 8,  height: 240 }, type: 'TIME_POINTER' },
    { name: 'hand_cover.png', dataUrl: set.cover,      bounds: { x: 0, y: 0, width: 30, height: 30  }, type: 'TIME_POINTER' },
  ];
}

// ─── Weather Icons ──────────────────────────────────────────────────────────────

function generateWeatherIcons(style: WeatherStyle = 'flat'): ElementImage[] {
  const dataUrls = generateWeatherSet(style);
  return dataUrls.map((dataUrl, i) => ({
    name: `weather_${i}.png`,
    dataUrl,
    bounds: { x: 0, y: 0, width: WEATHER_ICON.w, height: WEATHER_ICON.h },
    type: 'IMG_LEVEL' as const,
  }));
}

// ─── Status Icons ───────────────────────────────────────────────────────────────

function generateStatusIcons(): ElementImage[] {
  return [
    {
      name: 'bluetooth_5_b_30x30.png',
      dataUrl: createCanvasImage(30, 30, (ctx, w) => {
        ctx.strokeStyle = '#4A9EFF'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.3, w * 0.25); ctx.lineTo(w * 0.65, w * 0.5);
        ctx.lineTo(w * 0.3, w * 0.75);
        ctx.moveTo(w * 0.65, w * 0.5); ctx.lineTo(w * 0.4, w * 0.7);
        ctx.lineTo(w * 0.6, w * 0.85); ctx.lineTo(w * 0.6, w * 0.15);
        ctx.lineTo(w * 0.4, w * 0.3); ctx.lineTo(w * 0.65, w * 0.5);
        ctx.stroke();
      }),
      bounds: { x: 0, y: 0, width: 30, height: 30 },
      type: 'IMG_STATUS',
    },
  ];
}

// ─── Transparent Button Image ───────────────────────────────────────────────────

function generateTransparentImage(): ElementImage {
  return {
    name: 'trasparente.png',
    dataUrl: createCanvasImage(1, 1, () => {}),
    bounds: { x: 0, y: 0, width: 1, height: 1 },
    type: 'BUTTON' as const,
  };
}

// ─── Data Type → Fallback Color (used when AI didn't provide color) ─────────────

const DATA_TYPE_COLORS: Record<string, string> = {
  BATTERY:  '#00CC88',
  HEART:    '#FF6B6B',
  STEP:     '#FFD93D',
  CAL:      '#FF9F43',
  DISTANCE: '#54A0FF',
  SPO2:     '#EE5A24',
  WEATHER_CURRENT: '#FFD700',
  STRESS:   '#9B59B6',
  PAI:      '#E74C3C',
  PAI_WEEKLY: '#E74C3C',
  ALTIMETER:  '#5DADE2',
  VO2MAX:     '#1E8BC3',
  TRAINING_LOAD: '#F39C12',
  SLEEP:    '#3498DB',
  STAND:    '#1ABC9C',
  FAT_BURN: '#F39C12',
  UVI:      '#F1C40F',
  AQI:      '#27AE60',
  HUMIDITY: '#2980B9',
  SUN_RISE: '#F5AB35',
  SUN_SET:  '#E55039',
  WIND:     '#7F8C8D',
  ALARM:    '#D35400',
  NOTIFICATION: '#8E44AD',
  MOON:     '#BDC3C7',
};

/** Get the color for an element: prefer AI-extracted color, fallback to data type palette. */
function getElementColor(el: ResolvedElement): string {
  if (el.color) return el.color;
  if (el.dataType && DATA_TYPE_COLORS[el.dataType]) return DATA_TYPE_COLORS[el.dataType];
  return '#FFFFFF';
}

const DATA_TYPE_PREFIXES: Record<string, string> = {
  BATTERY:  'batt_digit',
  STEP:     'step_digit',
  HEART:    'heart_digit',
  SPO2:     'spo2_digit',
  CAL:      'cal_digit',
  DISTANCE: 'dist_digit',
  STRESS:   'stress_digit',
  PAI:      'pai_digit',
  PAI_WEEKLY: 'pai_digit',
  ALTIMETER:  'alt_digit',
  VO2MAX:     'vo2_digit',
  TRAINING_LOAD: 'training_digit',
  SLEEP:    'sleep_digit',
  STAND:    'stand_digit',
  FAT_BURN: 'fatburn_digit',
  UVI:      'uvi_digit',
  AQI:      'aqi_digit',
  HUMIDITY: 'humid_digit',
  SUN_RISE: 'sunrise_digit',
  SUN_SET:  'sunset_digit',
  WIND:     'wind_digit',
  ALARM:    'alarm_digit',
  NOTIFICATION: 'notif_digit',
  MOON:     'moon_digit',
};

// ─── Main: Generate All Assets for Pipeline Elements ────────────────────────────

export function generatePipelineAssets(elements: ResolvedElement[]): ElementImage[] {
  const images: ElementImage[] = [];
  const generatedSets = new Set<string>();

  for (const el of elements) {
    switch (el.widget) {
      case 'TIME_POINTER': {
        if (!generatedSets.has('clock_hands')) {
          images.push(...generateClockHands('silver'));
          generatedSets.add('clock_hands');
        }
        break;
      }

      case 'IMG_TIME': {
        if (!generatedSets.has('time_digits')) {
          const color = getElementColor(el);
          // Hours element: width covers 2 digits, so digit width = width/2
          // Legacy single element: width covers 4 digits + gap = ~5 slots
          const isHoursEl = (el as unknown as { subtype?: string }).subtype === 'hours';
          const timeDigitW = el.w
            ? (isHoursEl ? Math.floor(el.w / 2) : Math.floor(el.w / 5))
            : TIME_DIGIT.w;
          const timeDigitH = el.h ?? TIME_DIGIT.h;
          images.push(...generateDigitImages('time_digit', timeDigitW, timeDigitH, color));
          generatedSets.add('time_digits');
        }
        break;
      }

      case 'IMG_DATE': {
        if (el.sourceType === 'month') {
          if (!generatedSets.has('month_images')) {
            const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                            'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            const monthColor = getElementColor(el);
            images.push(...generateTextImages('month', months, MONTH_LABEL.w, MONTH_LABEL.h, monthColor));
            generatedSets.add('month_images');
          }
        } else {
          if (!generatedSets.has('date_digits')) {
            const dateColor = getElementColor(el);
            // Derive digit size from element bounds (2 digits)
            const dateDigitW = el.w ? Math.floor(el.w / 2) : DATE_DIGIT.w;
            const dateDigitH = el.h ?? DATE_DIGIT.h;
            images.push(...generateDigitImages('date_digit', dateDigitW, dateDigitH, dateColor));
            generatedSets.add('date_digits');
          }
        }
        break;
      }

      case 'IMG_WEEK': {
        if (!generatedSets.has('week_images')) {
          const WEEK_FULL    = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          const WEEK_SHORT   = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
          const WEEK_INITIAL = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
          const fmt = (el as unknown as { weekFormat?: string }).weekFormat ?? 'short';
          const days = fmt === 'full' ? WEEK_FULL : fmt === 'initial' ? WEEK_INITIAL : WEEK_SHORT;
          const weekColor = getElementColor(el);
          const weekW = el.w ?? WEEK_LABEL.w;
          const weekH = el.h ?? WEEK_LABEL.h;
          images.push(...generateTextImages('week', days, weekW, weekH, weekColor));
          generatedSets.add('week_images');
        }
        break;
      }

      case 'ARC_PROGRESS': {
        // ARC_PROGRESS uses color only — no image assets needed
        break;
      }

      case 'TEXT_IMG': {
        const prefix = el.dataType ? DATA_TYPE_PREFIXES[el.dataType] || 'digit' : 'digit';
        if (!generatedSets.has(`textimg_${prefix}`)) {
          const color = getElementColor(el);
          // Derive digit size from element bounds (estimate ~4 chars)
          const txtDigitW = el.w ? Math.floor(el.w / 4) : TEXT_IMG_DIGIT.w;
          const txtDigitH = el.h ?? TEXT_IMG_DIGIT.h;
          images.push(...generateDigitImages(prefix, txtDigitW, txtDigitH, color));
          generatedSets.add(`textimg_${prefix}`);
        }
        break;
      }

      case 'IMG_LEVEL': {
        if (el.sourceType === 'weather') {
          const wStyle = ((el as unknown as { weatherStyle?: string }).weatherStyle ?? 'flat') as WeatherStyle;
          const setKey = `weather_icons_${wStyle}`;
          if (!generatedSets.has(setKey)) {
            images.push(...generateWeatherIcons(wStyle));
            generatedSets.add(setKey);
          }
        }
        break;
      }

      case 'IMG_STATUS': {
        if (!generatedSets.has('status_icons')) {
          images.push(...generateStatusIcons());
          generatedSets.add('status_icons');
        }
        break;
      }

      case 'TEXT':
        // No image assets needed for plain text
        break;

      case 'IMG': {
        // Generate icon PNG if element has an icon src assigned by assetResolver
        const iconSrc = el.assets?.src;
        if (iconSrc && iconSrc.startsWith('icon_') && iconSrc.endsWith('.png')) {
          if (!generatedSets.has(iconSrc)) {
            // Reverse-map filename back to original iconKey (handles sanitized keys)
            const safeKey = iconSrc.replace('icon_', '').replace('.png', '');
            // Try direct key first, then scan library for sanitized key match
            const iconEntry = getIconByKey(safeKey) ??
              getIconLibrary().find(i => i.key.replace(/[^a-zA-Z0-9_-]/g, '_') === safeKey);
            if (iconEntry) {
              // Render icon at element's geometry size (w/h from pipeline), fallback 48x48
              const targetW = el.w ?? 48;
              const targetH = el.h ?? 48;
              const dataUrl = createCanvasImage(targetW, targetH, (ctx, w, h) => {
                const img = new Image();
                img.src = iconEntry.dataUrl;
                // Draw synchronously — icon dataUrl is already loaded as data URL
                ctx.drawImage(img, 0, 0, w, h);
              });
              images.push({
                name: iconSrc,
                dataUrl,
                bounds: { x: 0, y: 0, width: targetW, height: targetH },
                type: 'IMG',
              });
              generatedSets.add(iconSrc);
            }
          }
        }
        break;
      }
    }
  }

  // Always include transparent image (used for buttons, backgrounds)
  if (!generatedSets.has('transparent')) {
    images.push(generateTransparentImage());
    generatedSets.add('transparent');
  }

  return images;
}
