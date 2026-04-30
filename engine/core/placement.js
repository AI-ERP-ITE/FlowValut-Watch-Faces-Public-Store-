"use strict";

import { placeAnchor } from "../placement/strategies/anchor.js";
import { placeCenter } from "../placement/strategies/center.js";
import { placePolar } from "../placement/strategies/polar.js";

const STRATEGIES = Object.freeze({
  center: placeCenter,
  polar: placePolar,
  anchor: placeAnchor,
});

function hasRawCoordinates(element) {
  const params = element && typeof element.params === "object" ? element.params : {};
  return ["x", "y", "cx", "cy"].some((key) => Object.prototype.hasOwnProperty.call(params, key));
}

function assertNormalizedPosition(position) {
  if (position.x < 0 || position.x > 100 || position.y < 0 || position.y > 100) {
    throw new Error(`Resolved placement out of normalized range 0..100: (${position.x}, ${position.y}).`);
  }
}

function validatePlacementConfig(mode, config) {
  if (mode === "center") {
    if (config.offset !== undefined) {
      if (!Array.isArray(config.offset) || config.offset.length < 2) {
        throw new Error("center placement offset must be a [dx, dy] array.");
      }
      const [dx, dy] = config.offset.map((value) => Number(value));
      if (!Number.isFinite(dx) || !Number.isFinite(dy) || dx < -50 || dx > 50 || dy < -50 || dy > 50) {
        throw new Error("center placement offset values must be normalized to -50..50.");
      }
    }
  }

  if (mode === "polar") {
    const radius = Number(config.radius);
    if (!Number.isFinite(radius) || radius < 0 || radius > 1) {
      throw new Error("polar placement requires radius in normalized range 0..1.");
    }
    if (config.angle !== undefined && !Number.isFinite(Number(config.angle))) {
      throw new Error("polar placement angle must be numeric degrees.");
    }
  }

  if (mode === "anchor") {
    const allowedAnchors = new Set(["center", "top", "bottom", "left", "right"]);
    if (config.anchor !== undefined && !allowedAnchors.has(config.anchor)) {
      throw new Error("anchor placement anchor must be one of center/top/bottom/left/right.");
    }
    if (config.offset !== undefined) {
      if (!Array.isArray(config.offset) || config.offset.length < 2) {
        throw new Error("anchor placement offset must be a [dx, dy] array.");
      }
      const [dx, dy] = config.offset.map((value) => Number(value));
      if (!Number.isFinite(dx) || !Number.isFinite(dy) || dx < -50 || dx > 50 || dy < -50 || dy > 50) {
        throw new Error("anchor placement offset values must be normalized to -50..50.");
      }
    }
  }
}

export function resolvePlacement(element, context = {}) {
  if (!element || typeof element !== "object") {
    throw new Error("resolvePlacement requires an element object.");
  }

  if (hasRawCoordinates(element)) {
    throw new Error(`Element type \"${element.type}\" contains forbidden raw x/y/cx/cy params.`);
  }

  const placement = element.placement;
  if (!placement || typeof placement !== "object") {
    throw new Error(`Element type \"${element.type}\" is missing placement configuration.`);
  }

  const mode = placement.mode;
  if (typeof mode !== "string" || !STRATEGIES[mode]) {
    throw new Error(`Unsupported placement mode: ${mode}`);
  }

  const config = placement.config && typeof placement.config === "object" ? placement.config : {};
  validatePlacementConfig(mode, config);

  const position = STRATEGIES[mode](config, context);
  const safePosition = {
    x: Number(position.x),
    y: Number(position.y),
    rotation: Number.isFinite(Number(position.rotation)) ? Number(position.rotation) : 0,
  };

  assertNormalizedPosition(safePosition);
  return safePosition;
}
