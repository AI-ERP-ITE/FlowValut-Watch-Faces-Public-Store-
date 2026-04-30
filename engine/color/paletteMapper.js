"use strict";

import { hexToRgb, normalizeHex } from "./quantizer.js";

function colorDistance(rgbA, rgbB) {
  const dr = rgbA.r - rgbB.r;
  const dg = rgbA.g - rgbB.g;
  const db = rgbA.b - rgbB.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function mapToPalette(color, palette) {
  const safeColor = normalizeHex(color);
  const paletteList = Array.isArray(palette)
    ? palette.filter((entry) => typeof entry === "string" && entry.trim().length > 0).map((entry) => normalizeHex(entry))
    : [];

  if (paletteList.length === 0) {
    return safeColor;
  }

  const sourceRgb = hexToRgb(safeColor);
  let bestColor = paletteList[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of paletteList) {
    const distance = colorDistance(sourceRgb, hexToRgb(candidate));
    if (distance < bestDistance) {
      bestDistance = distance;
      bestColor = candidate;
    }
  }

  return bestColor;
}
