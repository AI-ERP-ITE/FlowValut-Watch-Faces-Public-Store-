"use strict";

import { hexToRgb, normalizeHex } from "./quantizer.js";

const MAX_RGB_DISTANCE = Math.sqrt(255 * 255 * 3);

function rgbDistance(original, simulated) {
  const a = hexToRgb(original);
  const b = hexToRgb(simulated);
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  const distance = Math.sqrt(dr * dr + dg * dg + db * db);
  return {
    distance,
    normalized255: (distance / MAX_RGB_DISTANCE) * 255,
  };
}

function safeTolerance(config) {
  const value = Number(config?.tolerance);
  return Number.isFinite(value) ? Math.max(0, value) : 2;
}

export function analyze(original, simulated, config = {}) {
  const tolerance = safeTolerance(config);
  const warnings = [];

  if (Array.isArray(original) && Array.isArray(simulated)) {
    const originalStops = original.map((entry) => normalizeHex(entry));
    const simulatedStops = simulated.map((entry) => normalizeHex(entry));
    const distinct = new Set(simulatedStops);

    if (distinct.size < 4) {
      warnings.push("Gradient banding risk: only " + distinct.size + " colors after quantization");
    }

    const originalDistinct = new Set(originalStops).size;
    if (distinct.size < originalDistinct) {
      warnings.push("Palette collapse detected: gradient stop variety reduced after simulation");
    }

    return {
      warnings,
      metrics: {
        originalDistinct,
        simulatedDistinct: distinct.size,
      },
    };
  }

  const safeOriginal = normalizeHex(original);
  const safeSimulated = normalizeHex(simulated);
  const { normalized255 } = rgbDistance(safeOriginal, safeSimulated);

  if (normalized255 > tolerance) {
    warnings.push(`Color deviation high: ${safeOriginal} -> ${safeSimulated} (Delta=${normalized255.toFixed(1)})`);
  }

  if (Array.isArray(config?.palette) && config.palette.length > 0 && safeOriginal !== safeSimulated) {
    const uniquePalette = new Set(config.palette.map((entry) => normalizeHex(entry))).size;
    if (uniquePalette <= 3) {
      warnings.push("Palette collapse risk: palette has very low color diversity");
    }
  }

  return {
    warnings,
    metrics: {
      delta255: normalized255,
      tolerance,
    },
  };
}
