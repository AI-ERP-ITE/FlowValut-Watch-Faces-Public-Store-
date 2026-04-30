"use strict";

import { analyze } from "./analyzer.js";
import { clampLuminance } from "./luminance.js";
import { mapToPalette } from "./paletteMapper.js";
import { normalizeHex, quantizeColor } from "./quantizer.js";

export const DEFAULT_COLOR_CONTROL_CONFIG = Object.freeze({
  colorControl: {
    mode: "off",
    quantization: "rgb565",
    palette: [],
    luminanceClamp: {
      enabled: false,
      min: 0.2,
      max: 0.8,
    },
    tolerance: 2.0,
  },
});

const enforceCache = new Map();
const simulationCache = new Map();
const warningCache = new Set();

function resolveColorConfig(config = {}) {
  const fromRoot = config?.colorControl && typeof config.colorControl === "object" ? config.colorControl : config;
  const defaults = DEFAULT_COLOR_CONTROL_CONFIG.colorControl;
  const luminanceDefaults = defaults.luminanceClamp;

  return {
    mode: ["off", "warning", "enforce"].includes(fromRoot.mode) ? fromRoot.mode : defaults.mode,
    quantization: typeof fromRoot.quantization === "string" ? fromRoot.quantization : defaults.quantization,
    palette: Array.isArray(fromRoot.palette) ? fromRoot.palette : defaults.palette,
    luminanceClamp: {
      enabled: Boolean(fromRoot?.luminanceClamp?.enabled ?? luminanceDefaults.enabled),
      min: Number.isFinite(Number(fromRoot?.luminanceClamp?.min)) ? Number(fromRoot.luminanceClamp.min) : luminanceDefaults.min,
      max: Number.isFinite(Number(fromRoot?.luminanceClamp?.max)) ? Number(fromRoot.luminanceClamp.max) : luminanceDefaults.max,
    },
    tolerance: Number.isFinite(Number(fromRoot.tolerance)) ? Number(fromRoot.tolerance) : defaults.tolerance,
  };
}

function applyQuantization(color, config) {
  return quantizeColor(color, config.quantization);
}

function applyPalette(color, config) {
  return mapToPalette(color, config.palette);
}

function applyLuminanceClamp(color, config) {
  if (!config.luminanceClamp.enabled) return color;
  return clampLuminance(color, config.luminanceClamp.min, config.luminanceClamp.max);
}

function simulate(color, config) {
  const safeColor = normalizeHex(color);
  const key = JSON.stringify({
    color: safeColor,
    quantization: config.quantization,
    palette: config.palette,
    clamp: config.luminanceClamp,
  });

  if (simulationCache.has(key)) {
    return simulationCache.get(key);
  }

  let output = safeColor;
  output = applyQuantization(output, config);
  output = applyPalette(output, config);
  output = applyLuminanceClamp(output, config);

  simulationCache.set(key, output);
  return output;
}

function emitWarnings(lines = []) {
  for (const line of lines) {
    const message = `[WARNING] ${line}`;
    if (warningCache.has(message)) continue;
    warningCache.add(message);
    console.warn(message);
  }
}

export function processColor(color, config = DEFAULT_COLOR_CONTROL_CONFIG) {
  let safeColor;
  try {
    safeColor = normalizeHex(color);
  } catch {
    return color;
  }

  const resolved = resolveColorConfig(config);
  if (resolved.mode === "off") {
    return safeColor;
  }

  if (resolved.mode === "warning") {
    const simulated = simulate(safeColor, resolved);
    const result = analyze(safeColor, simulated, resolved);
    emitWarnings(result.warnings);
    return safeColor;
  }

  const cacheKey = JSON.stringify({ color: safeColor, config: resolved });
  if (enforceCache.has(cacheKey)) {
    return enforceCache.get(cacheKey);
  }

  let output = safeColor;
  output = applyQuantization(output, resolved);
  output = applyPalette(output, resolved);
  output = applyLuminanceClamp(output, resolved);

  enforceCache.set(cacheKey, output);
  return output;
}

export function analyzeGradient(stops, config = DEFAULT_COLOR_CONTROL_CONFIG) {
  const resolved = resolveColorConfig(config);
  if (!Array.isArray(stops) || stops.length === 0) return;

  const original = stops.map((stop) => normalizeHex(stop));
  const simulated = original.map((stop) => {
    let next = stop;
    next = applyQuantization(next, resolved);
    next = applyPalette(next, resolved);
    next = applyLuminanceClamp(next, resolved);
    return next;
  });

  const result = analyze(original, simulated, resolved);
  emitWarnings(result.warnings);
}

export function clearColorCaches() {
  enforceCache.clear();
  simulationCache.clear();
  warningCache.clear();
}
