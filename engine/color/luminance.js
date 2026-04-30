"use strict";

import { hexToRgb, rgbToHex, normalizeHex } from "./quantizer.js";

function clamp01(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(1, num));
}

function computeLuminance(rgb) {
  return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
}

export function clampLuminance(color, min, max) {
  const safeColor = normalizeHex(color);
  const rgb = hexToRgb(safeColor);

  const minLum = clamp01(min, 0);
  const maxLum = clamp01(max, 1);
  const rangeMin = Math.min(minLum, maxLum);
  const rangeMax = Math.max(minLum, maxLum);

  const currentLum = computeLuminance(rgb);
  if (currentLum >= rangeMin && currentLum <= rangeMax) {
    return safeColor;
  }

  const targetLum = currentLum < rangeMin ? rangeMin : rangeMax;
  const scale = currentLum === 0 ? 0 : targetLum / currentLum;

  return rgbToHex({
    r: Math.max(0, Math.min(255, Math.round(rgb.r * scale))),
    g: Math.max(0, Math.min(255, Math.round(rgb.g * scale))),
    b: Math.max(0, Math.min(255, Math.round(rgb.b * scale))),
  });
}

export function luminance(color) {
  return computeLuminance(hexToRgb(normalizeHex(color)));
}
