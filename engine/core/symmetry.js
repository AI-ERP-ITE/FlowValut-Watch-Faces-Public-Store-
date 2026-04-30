"use strict";

import { mirrorX } from "../symmetry/mirrorX.js";
import { mirrorY } from "../symmetry/mirrorY.js";
import { radialRepeat } from "../symmetry/radialRepeat.js";

const MODES = Object.freeze({
  none: (position) => [position],
  mirrorX: (position) => mirrorX(position),
  mirrorY: (position) => mirrorY(position),
  radialRepeat: (position, config) => radialRepeat(position, config),
});

function validateSymmetry(mode, config) {
  if ((mode === "mirrorX" || mode === "mirrorY") && Object.keys(config).length > 0) {
    return;
  }

  if (mode === "radialRepeat") {
    const count = Number(config.count);
    if (!Number.isFinite(count) || count < 1 || Math.floor(count) !== count) {
      throw new Error("radialRepeat symmetry requires integer config.count >= 1.");
    }
  }
}

function clampPosition(position) {
  return {
    x: Math.max(0, Math.min(100, Number(position.x))),
    y: Math.max(0, Math.min(100, Number(position.y))),
    rotation: Number.isFinite(Number(position.rotation)) ? Number(position.rotation) : 0,
  };
}

export function applySymmetry(element, basePosition) {
  if (!basePosition || typeof basePosition !== "object") {
    throw new Error("applySymmetry requires a basePosition object.");
  }

  const symmetry = element?.symmetry && typeof element.symmetry === "object" ? element.symmetry : { mode: "none", config: {} };
  const mode = typeof symmetry.mode === "string" ? symmetry.mode : "none";
  const config = symmetry.config && typeof symmetry.config === "object" ? symmetry.config : {};

  if (!MODES[mode]) {
    throw new Error(`Unsupported symmetry mode: ${mode}`);
  }

  validateSymmetry(mode, config);

  const positions = MODES[mode](basePosition, config);
  return positions.map((position) => clampPosition(position));
}
