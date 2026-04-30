"use strict";

function clampOffset(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(-50, Math.min(50, num));
}

export function placeCenter(config = {}) {
  const offset = Array.isArray(config.offset) ? config.offset : [0, 0];
  const dx = clampOffset(offset[0]);
  const dy = clampOffset(offset[1]);
  const rotation = Number.isFinite(Number(config.rotation)) ? Number(config.rotation) : 0;

  return {
    x: 50 + dx,
    y: 50 + dy,
    rotation,
  };
}
