"use strict";

function clampByte(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(255, Math.round(num)));
}

function normalizeHex(hex) {
  if (typeof hex !== "string") {
    throw new Error("Color must be a hex string.");
  }
  const raw = hex.trim().replace(/^#/, "");
  const expanded = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return `#${expanded.toLowerCase()}`;
}

function hexToRgb(hex) {
  const safeHex = normalizeHex(hex).slice(1);
  return {
    r: clampByte(parseInt(safeHex.slice(0, 2), 16)),
    g: clampByte(parseInt(safeHex.slice(2, 4), 16)),
    b: clampByte(parseInt(safeHex.slice(4, 6), 16)),
  };
}

function rgbToHex(rgb) {
  const r = clampByte(rgb.r).toString(16).padStart(2, "0");
  const g = clampByte(rgb.g).toString(16).padStart(2, "0");
  const b = clampByte(rgb.b).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

// Quantize to 565, then expand back to 8-bit RGB for render output.
export function toRGB565(hex) {
  const rgb = hexToRgb(hex);

  const r5 = (rgb.r >> 3) & 0x1f;
  const g6 = (rgb.g >> 2) & 0x3f;
  const b5 = (rgb.b >> 3) & 0x1f;

  const r8 = Math.round((r5 / 31) * 255);
  const g8 = Math.round((g6 / 63) * 255);
  const b8 = Math.round((b5 / 31) * 255);

  return rgbToHex({ r: r8, g: g8, b: b8 });
}

export function quantizeColor(hex, quantizationMode) {
  if (quantizationMode !== "rgb565") {
    return normalizeHex(hex);
  }
  return toRGB565(hex);
}

export { normalizeHex, hexToRgb, rgbToHex };
