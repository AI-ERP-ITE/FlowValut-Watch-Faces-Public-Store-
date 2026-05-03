"use strict";

import { analyze } from "./analyzer.js";
import { clampLuminance } from "./luminance.js";
import { mapToPalette } from "./paletteMapper.js";
import { hexToRgb, normalizeHex, quantizeColor, rgbToHex } from "./quantizer.js";

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
    amazfit: {
      enabled: true,
      grayscaleExclusion: {
        enabled: true,
        min: 1,
        max: 46,
        safeMin: 47,
      },
      backgroundKeys: ["background", "backgroundcolor", "bg", "canvas", "layout.fill"],
      absoluteBlack: "#000000",
      state: "normal",
      stateBrightness: {
        tappedZepp3: 0.714,
        tappedZepp1: 0.6,
        disabled: 0.6,
      },
      disabledToGrayscale: true,
      contrast: {
        enabled: true,
        minRatio: 3,
        background: "#000000",
      },
      aod: {
        enabled: false,
        forcePointerWhite: true,
        pointerHints: ["pointer", "hand"],
        maxLitPixelRatio: 0.1,
      },
    },
  },
});

const enforceCache = new Map();
const simulationCache = new Map();
const warningCache = new Set();

function resolveColorConfig(config = {}) {
  const fromRoot = config?.colorControl && typeof config.colorControl === "object" ? config.colorControl : config;
  const defaults = DEFAULT_COLOR_CONTROL_CONFIG.colorControl;
  const luminanceDefaults = defaults.luminanceClamp;
  const amazfitDefaults = defaults.amazfit;
  const stateBrightnessDefaults = amazfitDefaults.stateBrightness;
  const contrastDefaults = amazfitDefaults.contrast;
  const aodDefaults = amazfitDefaults.aod;
  const grayscaleDefaults = amazfitDefaults.grayscaleExclusion;
  const safeBackgroundKeys = Array.isArray(fromRoot?.amazfit?.backgroundKeys)
    ? fromRoot.amazfit.backgroundKeys
    : amazfitDefaults.backgroundKeys;
  const safePointerHints = Array.isArray(fromRoot?.amazfit?.aod?.pointerHints)
    ? fromRoot.amazfit.aod.pointerHints
    : aodDefaults.pointerHints;

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
    amazfit: {
      enabled: Boolean(fromRoot?.amazfit?.enabled ?? amazfitDefaults.enabled),
      grayscaleExclusion: {
        enabled: Boolean(fromRoot?.amazfit?.grayscaleExclusion?.enabled ?? grayscaleDefaults.enabled),
        min: Number.isFinite(Number(fromRoot?.amazfit?.grayscaleExclusion?.min))
          ? Number(fromRoot.amazfit.grayscaleExclusion.min)
          : grayscaleDefaults.min,
        max: Number.isFinite(Number(fromRoot?.amazfit?.grayscaleExclusion?.max))
          ? Number(fromRoot.amazfit.grayscaleExclusion.max)
          : grayscaleDefaults.max,
        safeMin: Number.isFinite(Number(fromRoot?.amazfit?.grayscaleExclusion?.safeMin))
          ? Number(fromRoot.amazfit.grayscaleExclusion.safeMin)
          : grayscaleDefaults.safeMin,
      },
      backgroundKeys: safeBackgroundKeys.map((entry) => String(entry).toLowerCase()),
      absoluteBlack: typeof fromRoot?.amazfit?.absoluteBlack === "string"
        ? normalizeHex(fromRoot.amazfit.absoluteBlack)
        : amazfitDefaults.absoluteBlack,
      state: ["normal", "tapped_zepp3", "tapped_zepp1", "disabled"].includes(fromRoot?.amazfit?.state)
        ? fromRoot.amazfit.state
        : amazfitDefaults.state,
      stateBrightness: {
        tappedZepp3: Number.isFinite(Number(fromRoot?.amazfit?.stateBrightness?.tappedZepp3))
          ? Number(fromRoot.amazfit.stateBrightness.tappedZepp3)
          : stateBrightnessDefaults.tappedZepp3,
        tappedZepp1: Number.isFinite(Number(fromRoot?.amazfit?.stateBrightness?.tappedZepp1))
          ? Number(fromRoot.amazfit.stateBrightness.tappedZepp1)
          : stateBrightnessDefaults.tappedZepp1,
        disabled: Number.isFinite(Number(fromRoot?.amazfit?.stateBrightness?.disabled))
          ? Number(fromRoot.amazfit.stateBrightness.disabled)
          : stateBrightnessDefaults.disabled,
      },
      disabledToGrayscale: Boolean(fromRoot?.amazfit?.disabledToGrayscale ?? amazfitDefaults.disabledToGrayscale),
      contrast: {
        enabled: Boolean(fromRoot?.amazfit?.contrast?.enabled ?? contrastDefaults.enabled),
        minRatio: Number.isFinite(Number(fromRoot?.amazfit?.contrast?.minRatio))
          ? Number(fromRoot.amazfit.contrast.minRatio)
          : contrastDefaults.minRatio,
        background: typeof fromRoot?.amazfit?.contrast?.background === "string"
          ? normalizeHex(fromRoot.amazfit.contrast.background)
          : contrastDefaults.background,
      },
      aod: {
        enabled: Boolean(fromRoot?.amazfit?.aod?.enabled ?? aodDefaults.enabled),
        forcePointerWhite: Boolean(fromRoot?.amazfit?.aod?.forcePointerWhite ?? aodDefaults.forcePointerWhite),
        pointerHints: safePointerHints.map((entry) => String(entry).toLowerCase()),
        maxLitPixelRatio: Number.isFinite(Number(fromRoot?.amazfit?.aod?.maxLitPixelRatio))
          ? Number(fromRoot.amazfit.aod.maxLitPixelRatio)
          : aodDefaults.maxLitPixelRatio,
      },
    },
  };
}

function clampByte(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(255, Math.round(n)));
}

function applyBrightness(color, factor) {
  const rgb = hexToRgb(color);
  return rgbToHex({
    r: clampByte(rgb.r * factor),
    g: clampByte(rgb.g * factor),
    b: clampByte(rgb.b * factor),
  });
}

function toGrayscale(color) {
  const rgb = hexToRgb(color);
  const gray = clampByte((rgb.r * 0.299) + (rgb.g * 0.587) + (rgb.b * 0.114));
  return rgbToHex({ r: gray, g: gray, b: gray });
}

function isPureBlack(color) {
  const rgb = hexToRgb(color);
  return rgb.r === 0 && rgb.g === 0 && rgb.b === 0;
}

function inForbiddenBand(rgb, min, max) {
  return (rgb.r >= min && rgb.r <= max) || (rgb.g >= min && rgb.g <= max) || (rgb.b >= min && rgb.b <= max);
}

function toNearestAllowedGrayscaleChannel(value, rule) {
  const n = clampByte(value);
  if (n === 0) return 0;
  if (n < rule.min || n > rule.max) return n;
  const toBlack = n;
  const toSafeMin = Math.abs(rule.safeMin - n);
  return toBlack <= toSafeMin ? 0 : rule.safeMin;
}

function applyGrayscaleExclusion(color, config) {
  const rule = config.amazfit.grayscaleExclusion;
  if (!rule.enabled) return color;
  if (isPureBlack(color)) return color;
  const rgb = hexToRgb(color);
  const next = {
    r: toNearestAllowedGrayscaleChannel(rgb.r, rule),
    g: toNearestAllowedGrayscaleChannel(rgb.g, rule),
    b: toNearestAllowedGrayscaleChannel(rgb.b, rule),
  };
  return rgbToHex(next);
}

function normalizedKeyPath(metadata = {}) {
  return typeof metadata.keyPath === "string" ? metadata.keyPath.toLowerCase() : "";
}

function isReadabilityKeyPath(metadata = {}) {
  const key = normalizedKeyPath(metadata);
  if (!key) return false;
  return (
    key.includes("text") ||
    key.includes("label") ||
    key.includes("digit") ||
    key.includes("number") ||
    key.includes("time") ||
    key.includes("date") ||
    key.includes("status") ||
    key.includes("value") ||
    key.includes("pointer") ||
    key.includes("hand")
  );
}

function isShadowLikeKeyPath(metadata = {}) {
  const key = normalizedKeyPath(metadata);
  if (!key) return false;
  return (
    key.includes("shadow") ||
    key.includes("shadows") ||
    key.includes("ambient") ||
    key.includes("occlusion") ||
    key.includes("depth")
  );
}

function applyAmazfitState(color, config) {
  const state = config.amazfit.state;
  if (state === "tapped_zepp3") return applyBrightness(color, config.amazfit.stateBrightness.tappedZepp3);
  if (state === "tapped_zepp1") return applyBrightness(color, config.amazfit.stateBrightness.tappedZepp1);
  if (state === "disabled") {
    const dimmed = applyBrightness(color, config.amazfit.stateBrightness.disabled);
    return config.amazfit.disabledToGrayscale ? toGrayscale(dimmed) : dimmed;
  }
  return color;
}

function enforceAbsoluteBlackForBackground(color, config, metadata = {}) {
  const key = normalizedKeyPath(metadata);
  if (!key) return color;
  const isBackground = config.amazfit.backgroundKeys.some((hint) => key === hint || key.endsWith(`.${hint}`));
  if (!isBackground) return color;
  return config.amazfit.absoluteBlack;
}

function relativeLuminance(color) {
  const rgb = hexToRgb(color);
  const channels = [rgb.r, rgb.g, rgb.b].map((v) => {
    const normalized = v / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

function contrastRatio(colorA, colorB) {
  const l1 = relativeLuminance(colorA);
  const l2 = relativeLuminance(colorB);
  const bright = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (bright + 0.05) / (dark + 0.05);
}

function ensureContrast(color, config, metadata = {}) {
  if (!config.amazfit.contrast.enabled) return color;
  if (isShadowLikeKeyPath(metadata)) return color;
  if (!isReadabilityKeyPath(metadata)) return color;
  const key = normalizedKeyPath(metadata);
  const isBackground = config.amazfit.backgroundKeys.some((hint) => key === hint || key.endsWith(`.${hint}`));
  if (isBackground) return color;

  const background = config.amazfit.contrast.background;
  if (contrastRatio(color, background) >= config.amazfit.contrast.minRatio) return color;

  let rgb = hexToRgb(color);
  for (let i = 0; i < 18; i += 1) {
    rgb = {
      r: clampByte(rgb.r + ((255 - rgb.r) * 0.18)),
      g: clampByte(rgb.g + ((255 - rgb.g) * 0.18)),
      b: clampByte(rgb.b + ((255 - rgb.b) * 0.18)),
    };
    const next = rgbToHex(rgb);
    if (contrastRatio(next, background) >= config.amazfit.contrast.minRatio) return next;
  }

  return rgbToHex(rgb);
}

function enforceAodPointerWhite(color, config, metadata = {}) {
  if (!config.amazfit.aod.enabled || !config.amazfit.aod.forcePointerWhite) return color;
  const key = normalizedKeyPath(metadata);
  if (!key) return color;
  const isPointer = config.amazfit.aod.pointerHints.some((hint) => key.includes(hint));
  return isPointer ? "#ffffff" : color;
}

function analyzeAmazfitRules(original, simulated, config, metadata = {}) {
  if (!config.amazfit.enabled) return [];
  const warnings = [];
  const key = normalizedKeyPath(metadata);
  const safeOriginal = normalizeHex(original);
  const safeSimulated = normalizeHex(simulated);
  const originalRgb = hexToRgb(safeOriginal);

  const exclusion = config.amazfit.grayscaleExclusion;
  if (exclusion.enabled && !isPureBlack(safeOriginal) && inForbiddenBand(originalRgb, exclusion.min, exclusion.max)) {
    warnings.push(`Amazfit grayscale exclusion violation at ${key || "(unknown key)"}: avoid RGB ${exclusion.min}-${exclusion.max}.`);
  }

  const isBackground = config.amazfit.backgroundKeys.some((hint) => key === hint || key.endsWith(`.${hint}`));
  if (isBackground && safeOriginal !== config.amazfit.absoluteBlack) {
    warnings.push(`Amazfit background rule: ${key || "background"} must be ${config.amazfit.absoluteBlack}.`);
  }

  if (config.amazfit.contrast.enabled && isReadabilityKeyPath(metadata)) {
    const ratio = contrastRatio(safeSimulated, config.amazfit.contrast.background);
    if (!isBackground && ratio < config.amazfit.contrast.minRatio) {
      warnings.push(
        `Contrast warning at ${key || "(unknown key)"}: ${ratio.toFixed(2)}:1 < ${config.amazfit.contrast.minRatio}:1.`,
      );
    }
  }

  if (config.amazfit.aod.enabled && config.amazfit.aod.forcePointerWhite) {
    const isPointer = config.amazfit.aod.pointerHints.some((hint) => key.includes(hint));
    if (isPointer && safeSimulated !== "#ffffff") {
      warnings.push(`AOD pointer rule at ${key || "pointer"}: main color should be #ffffff.`);
    }
  }

  if (config.amazfit.aod.enabled) {
    warnings.push(`AOD illuminated-pixel cap reminder: keep lit area <= ${(config.amazfit.aod.maxLitPixelRatio * 100).toFixed(0)}% of screen.`);
  }

  return warnings;
}

function applyAmazfitRules(color, config, metadata = {}) {
  if (!config.amazfit.enabled) return color;
  let next = color;
  next = applyAmazfitState(next, config);
  next = applyGrayscaleExclusion(next, config);
  next = enforceAbsoluteBlackForBackground(next, config, metadata);
  next = enforceAodPointerWhite(next, config, metadata);
  next = ensureContrast(next, config, metadata);
  return next;
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

function simulate(color, config, metadata = {}) {
  const safeColor = normalizeHex(color);
  const key = JSON.stringify({
    color: safeColor,
    quantization: config.quantization,
    palette: config.palette,
    clamp: config.luminanceClamp,
    amazfit: config.amazfit,
    keyPath: normalizedKeyPath(metadata),
  });

  if (simulationCache.has(key)) {
    return simulationCache.get(key);
  }

  let output = safeColor;
  output = applyQuantization(output, config);
  output = applyPalette(output, config);
  output = applyLuminanceClamp(output, config);
  output = applyAmazfitRules(output, config, metadata);

  simulationCache.set(key, output);
  return output;
}

function emitWarnings(lines = []) {
  const emitted = [];
  for (const line of lines) {
    const message = `[WARNING] ${line}`;
    if (warningCache.has(message)) continue;
    warningCache.add(message);
    console.warn(message);
    emitted.push(message);
  }

  if (emitted.length > 0 && typeof globalThis !== "undefined" && globalThis?.dispatchEvent) {
    try {
      globalThis.dispatchEvent(new CustomEvent("engine-color-warning", { detail: emitted }));
    } catch {
      // Ignore environments without CustomEvent support.
    }
  }
}

export function processColor(color, config = DEFAULT_COLOR_CONTROL_CONFIG, metadata = {}) {
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
    const simulated = simulate(safeColor, resolved, metadata);
    const result = analyze(safeColor, simulated, resolved);
    const extraWarnings = analyzeAmazfitRules(safeColor, simulated, resolved, metadata);
    const remapWarnings = [];
    if (simulated !== safeColor) {
      const key = normalizedKeyPath(metadata) || "(unknown key)";
      remapWarnings.push(`Color remap at ${key}: ${safeColor} -> ${simulated}`);
    }
    emitWarnings([...result.warnings, ...extraWarnings, ...remapWarnings]);
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
  output = applyAmazfitRules(output, resolved, metadata);

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
  const amazfitWarnings = [];
  for (let i = 0; i < original.length; i += 1) {
    amazfitWarnings.push(
      ...analyzeAmazfitRules(original[i], simulated[i], resolved, { keyPath: `gradient.stops.${i}.color` }),
    );
  }
  emitWarnings([...result.warnings, ...amazfitWarnings]);
}

export function clearColorCaches() {
  enforceCache.clear();
  simulationCache.clear();
  warningCache.clear();
}
