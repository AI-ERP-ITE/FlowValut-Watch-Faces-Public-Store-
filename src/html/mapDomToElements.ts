// Spec 013 — Multi-signal classifier: data-widget → class keywords → text → tag → fallback

import type { WatchFaceElement } from '@/types';
import type { DomElement } from './parseDom';
import { generateId } from '@/lib/utils';

const CANVAS = 480;
const CENTER = CANVAS / 2;

// ── Class keyword lookup ──────────────────────────────────────────────────────
const CLASS_KEYWORDS: Array<{
  pattern: RegExp;
  type: WatchFaceElement['type'];
  name: string;
  dataType?: string;
}> = [
  { pattern: /\b(time|clock|hour|minute|second)\b/i,   type: 'IMG_TIME',      name: 'Digital Time' },
  { pattern: /\b(date|day|month|calendar)\b/i,          type: 'IMG_DATE',      name: 'Date' },
  { pattern: /\b(week|weekday)\b/i,                     type: 'IMG_WEEK',      name: 'Weekday' },
  { pattern: /\b(battery|batt|charge)\b/i,              type: 'TEXT_IMG',      name: 'Battery',      dataType: 'BATTERY' },
  { pattern: /\b(step|walk|pedometer)\b/i,              type: 'TEXT_IMG',      name: 'Steps',        dataType: 'STEP' },
  { pattern: /\b(heart|hr|bpm|pulse)\b/i,               type: 'TEXT_IMG',      name: 'Heart Rate',   dataType: 'HEART' },
  { pattern: /\b(weather|temp|temperature)\b/i,         type: 'TEXT_IMG',      name: 'Weather',      dataType: 'WEATHER_CURRENT' },
  { pattern: /\b(spo2|oxygen|o2)\b/i,                   type: 'TEXT_IMG',      name: 'SpO2',         dataType: 'SPO2' },
  { pattern: /\b(cal|calories|kcal)\b/i,                type: 'TEXT_IMG',      name: 'Calories',     dataType: 'CAL' },
  { pattern: /\b(stress)\b/i,                           type: 'TEXT_IMG',      name: 'Stress',       dataType: 'STRESS' },
  { pattern: /\b(sleep)\b/i,                            type: 'TEXT_IMG',      name: 'Sleep',        dataType: 'SLEEP' },
  { pattern: /\b(distance|dist)\b/i,                    type: 'TEXT_IMG',      name: 'Distance',     dataType: 'DISTANCE' },
  { pattern: /\b(humidity|humid)\b/i,                   type: 'TEXT_IMG',      name: 'Humidity',     dataType: 'HUMIDITY' },
  { pattern: /\b(uvi|uv-index|uv)\b/i,                  type: 'TEXT_IMG',      name: 'UVI',          dataType: 'UVI' },
  { pattern: /\b(aqi|air-quality|air)\b/i,              type: 'TEXT_IMG',      name: 'AQI',          dataType: 'AQI' },
  { pattern: /\b(bluetooth|bt-status|bt)\b/i,           type: 'IMG_STATUS',    name: 'Bluetooth Status' },
  { pattern: /\b(arc|ring|progress|gauge)\b/i,          type: 'ARC_PROGRESS',  name: 'Progress' },
  { pattern: /\b(hand|pointer|analog)\b/i,              type: 'TIME_POINTER',  name: 'Analog Clock' },
];

// ── Text pattern classifier ───────────────────────────────────────────────────
function classifyByText(t: string): { type: WatchFaceElement['type']; name: string; dataType?: string } | null {
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(t))                              return { type: 'IMG_TIME',  name: 'Digital Time' };
  if (/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/i.test(t)) return { type: 'IMG_DATE',  name: 'Month' };
  if (/^(MON|TUE|WED|THU|FRI|SAT|SUN)$/i.test(t))                      return { type: 'IMG_WEEK',  name: 'Weekday' };
  if (/battery|batt|⚡/i.test(t) || (/\d+%/.test(t) && t.length < 8))  return { type: 'TEXT_IMG',  name: 'Battery',      dataType: 'BATTERY' };
  if (/spo2|spO2|血氧/i.test(t))                                        return { type: 'TEXT_IMG',  name: 'SpO2',         dataType: 'SPO2' };
  if (/stress|压力/i.test(t))                                           return { type: 'TEXT_IMG',  name: 'Stress',       dataType: 'STRESS' };
  if (/sleep|睡眠/i.test(t))                                            return { type: 'TEXT_IMG',  name: 'Sleep',        dataType: 'SLEEP' };
  if (/cal(ories)?|kcal|卡路里/i.test(t))                               return { type: 'TEXT_IMG',  name: 'Calories',     dataType: 'CAL' };
  if (/dist(ance)?|km|mi\b|公里/i.test(t))                             return { type: 'TEXT_IMG',  name: 'Distance',     dataType: 'DISTANCE' };
  if (/humid(ity)?|湿度/i.test(t))                                      return { type: 'TEXT_IMG',  name: 'Humidity',     dataType: 'HUMIDITY' };
  if (/uv[-\s]?index|uvi?\b/i.test(t))                                 return { type: 'TEXT_IMG',  name: 'UVI',          dataType: 'UVI' };
  if (/aqi|air quality|空气/i.test(t))                                  return { type: 'TEXT_IMG',  name: 'AQI',          dataType: 'AQI' };
  if (/step|walk|步数|👟/i.test(t) || /^\d{4,}$/.test(t))             return { type: 'TEXT_IMG',  name: 'Steps',        dataType: 'STEP' };
  if (/heart|bpm|❤|♥|心率/i.test(t))                                   return { type: 'TEXT_IMG',  name: 'Heart Rate',   dataType: 'HEART' };
  if (/weather|☁|🌤|°C|°F/.test(t))                                    return { type: 'TEXT_IMG',  name: 'Weather',      dataType: 'WEATHER_CURRENT' };
  if (/^\d{1,2}$/.test(t))                                              return { type: 'IMG_DATE',  name: 'Date' };
  if (/^\d+$/.test(t))                                                  return { type: 'TEXT_IMG',  name: 'Value' };
  return null;
}

function clampBounds(x: number, y: number, w: number, h: number) {
  const cx = Math.max(0, Math.min(x, CANVAS - 1));
  const cy = Math.max(0, Math.min(y, CANVAS - 1));
  return { x: cx, y: cy, width: Math.max(1, Math.min(w, CANVAS - cx)), height: Math.max(1, Math.min(h, CANVAS - cy)) };
}

/** Convert rgb(r, g, b) string to #rrggbb hex */
function rgbToHex(rgb: string): string {
  const match = rgb.match(/\d+/g);
  if (!match || match.length < 3) return '#FFFFFF';
  return '#' + match.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
}

/** Infer a Zepp data-type string from a data-value placeholder like "%BATTERY%" */
function inferDataTypeFromValue(val: string): string {
  if (!val) return '';
  const v = val.toUpperCase();
  const MAP: Record<string, string> = {
    BATTERY: 'BATTERY', BATT: 'BATTERY',
    STEP: 'STEP', STEPS: 'STEP',
    HEART: 'HEART', HR: 'HEART', BPM: 'HEART',
    SPO2: 'SPO2', OXYGEN: 'SPO2',
    CAL: 'CAL', CALORIES: 'CAL',
    DISTANCE: 'DISTANCE', DIST: 'DISTANCE',
    STRESS: 'STRESS',
    SLEEP: 'SLEEP',
    STAND: 'STAND',
    HUMIDITY: 'HUMIDITY',
    UVI: 'UVI', UV: 'UVI',
    AQI: 'AQI',
    WEATHER: 'WEATHER_CURRENT', WEATHER_CURRENT: 'WEATHER_CURRENT', TEMP: 'WEATHER_CURRENT',
    PAI: 'PAI_DAILY',
    MOON: 'MOON',
    WIND: 'WIND',
    ALARM: 'ALARM',
    NOTIFICATION: 'NOTIFICATION',
  };
  // Match %BATTERY% or BATTERY
  const key = v.replace(/%/g, '').trim();
  return MAP[key] ?? '';
}

/** Split a combined HH:MM bounds into separate Hours and Minutes elements */
function splitImgTime(
  bounds: WatchFaceElement['bounds'],
  color: string | undefined,
  baseZIndex: number,
): WatchFaceElement[] {
  // Digits are roughly 2/5 of total width each; leave ~1/5 as colon gap
  const digitPairW = Math.max(20, Math.floor(bounds.width * 2 / 5));
  const gap = Math.max(4, bounds.width - digitPairW * 2);
  const hoursEl: WatchFaceElement = {
    id: generateId(), type: 'IMG_TIME', subtype: 'hours', name: 'Hours',
    bounds: { x: bounds.x, y: bounds.y, width: digitPairW, height: bounds.height },
    visible: true, zIndex: baseZIndex,
    ...(color ? { color } : {}),
  };
  const minutesEl: WatchFaceElement = {
    id: generateId(), type: 'IMG_TIME', subtype: 'minutes', name: 'Minutes',
    bounds: { x: bounds.x + digitPairW + gap, y: bounds.y, width: digitPairW, height: bounds.height },
    visible: true, zIndex: baseZIndex + 1,
    ...(color ? { color } : {}),
  };
  return [hoursEl, minutesEl];
}

export function mapDomToElements(domEls: DomElement[]): WatchFaceElement[] {
  const result: WatchFaceElement[] = [];
  let zIndex = 1;
  let hasTimePointer = false;
  let hasImgTime = false;

  for (const el of domEls) {
    if (result.length >= 20) break;

    const bounds = clampBounds(el.x, el.y, el.width, el.height);
    const text = el.textContent.trim();
    const cls = (typeof el.className === 'string' ? el.className : '') + ' ' + el.tagName;

    // ── Priority 1: data-widget attribute ──────────────────────────────────
    if (el.dataWidget) {
      const type = el.dataWidget.toUpperCase() as WatchFaceElement['type'];
      // Infer data-type from data-value if missing (e.g. data-value="%BATTERY%" → BATTERY)
      const inferredDataType = el.dataType || inferDataTypeFromValue(el.dataValue);
      if (type === 'TIME_POINTER' && !hasTimePointer) {
        hasTimePointer = true;
        result.push({ id: generateId(), type, name: 'Analog Clock', bounds: { x: 0, y: 0, width: CANVAS, height: CANVAS }, center: { x: CENTER, y: CENTER }, visible: true, zIndex: zIndex++ });
      } else if (type === 'IMG_TIME' && !hasImgTime) {
        hasImgTime = true;
        const color = el.style.color ? rgbToHex(el.style.color) : undefined;
        // Support data-subtype="hours"/"minutes" for an explicit single half
        if (el.dataSubtype === 'hours' || el.dataSubtype === 'minutes') {
          result.push({ id: generateId(), type: 'IMG_TIME', subtype: el.dataSubtype, name: el.dataSubtype === 'hours' ? 'Hours' : 'Minutes', bounds, visible: true, zIndex: zIndex++, ...(color ? { color } : {}) });
        } else {
          const split = splitImgTime(bounds, color, zIndex);
          result.push(...split);
          zIndex += 2;
        }
      } else if (type !== 'TIME_POINTER' && type !== 'IMG_TIME') {
        const watchEl: WatchFaceElement = { id: generateId(), type, name: inferredDataType || el.dataWidget, bounds, visible: true, zIndex: zIndex++ };
        if (inferredDataType) watchEl.dataType = inferredDataType;
        if (el.style.color) watchEl.color = rgbToHex(el.style.color);
        if (el.iconKey) watchEl.iconKey = el.iconKey;
        result.push(watchEl);
      }
      continue;
    }

    // ── Priority 2: CSS class keywords ─────────────────────────────────────
    let classMatch: typeof CLASS_KEYWORDS[0] | undefined;
    for (const kw of CLASS_KEYWORDS) {
      if (kw.pattern.test(cls)) { classMatch = kw; break; }
    }
    if (classMatch) {
      if (classMatch.type === 'TIME_POINTER') {
        if (!hasTimePointer) {
          hasTimePointer = true;
          result.push({ id: generateId(), type: 'TIME_POINTER', name: 'Analog Clock', bounds: { x: 0, y: 0, width: CANVAS, height: CANVAS }, center: { x: CENTER, y: CENTER }, visible: true, zIndex: zIndex++ });
        }
        continue;
      }
      if (classMatch.type === 'IMG_TIME' && !hasImgTime) {
        hasImgTime = true;
        const color = el.style.color ? rgbToHex(el.style.color) : undefined;
        const split = splitImgTime(bounds, color, zIndex);
        result.push(...split);
        zIndex += 2;
        continue;
      }
      if (classMatch.type === 'IMG_TIME') continue; // duplicate, skip
      const watchEl: WatchFaceElement = { id: generateId(), type: classMatch.type, name: classMatch.name, bounds, visible: true, zIndex: zIndex++ };
      if (classMatch.dataType) watchEl.dataType = classMatch.dataType;
      if (el.style.color) watchEl.color = rgbToHex(el.style.color);
      result.push(watchEl);
      continue;
    }

    // If matched by class in parseDom but no keyword hit here, skip — don't fall through
    if (el.matchedByClass) continue;

    // ── Priority 3: text content pattern ───────────────────────────────────
    if (text) {
      const textMatch = classifyByText(text);
      if (textMatch) {
        if (textMatch.type === 'IMG_TIME' && !hasImgTime) {
          hasImgTime = true;
          const color = el.style.color ? rgbToHex(el.style.color) : undefined;
          const split = splitImgTime(bounds, color, zIndex);
          result.push(...split);
          zIndex += 2;
        } else if (textMatch.type !== 'IMG_TIME') {
          const watchEl: WatchFaceElement = { id: generateId(), type: textMatch.type, name: textMatch.name, bounds, visible: true, zIndex: zIndex++ };
          if (textMatch.dataType) watchEl.dataType = textMatch.dataType;
          if (el.style.color) watchEl.color = rgbToHex(el.style.color);
          result.push(watchEl);
        }
        continue;
      }
    }

    // ── Priority 4: tag type ────────────────────────────────────────────────
    if (el.tagName === 'img') {
      const imgEl: WatchFaceElement = { id: generateId(), type: 'IMG', name: 'Image', bounds, src: 'asset.png', visible: true, zIndex: zIndex++ };
      if (el.iconKey) imgEl.iconKey = el.iconKey;
      result.push(imgEl);
      continue;
    }
    if (el.tagName === 'svg' || el.tagName === 'circle' || el.tagName === 'path') {
      result.push({ id: generateId(), type: 'ARC_PROGRESS', name: 'Progress', bounds, visible: true, zIndex: zIndex++ });
      continue;
    }

    // ── Priority 5: fallback — any element with text ────────────────────────
    if (text) {
      const watchEl: WatchFaceElement = { id: generateId(), type: 'TEXT', name: text.slice(0, 20), bounds, text, visible: true, zIndex: zIndex++ };
      if (el.style.color) watchEl.color = rgbToHex(el.style.color);
      if (el.style.fontSize) watchEl.fontSize = parseInt(el.style.fontSize);
      result.push(watchEl);
    }
  }

  return result;
}

