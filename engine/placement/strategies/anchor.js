"use strict";

const ANCHORS = Object.freeze({
  center: { x: 50, y: 50 },
  top: { x: 50, y: 0 },
  bottom: { x: 50, y: 100 },
  left: { x: 0, y: 50 },
  right: { x: 100, y: 50 },
});

function clampOffset(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(-50, Math.min(50, num));
}

export function placeAnchor(config = {}) {
  const anchorKey = typeof config.anchor === "string" ? config.anchor : "center";
  const anchor = ANCHORS[anchorKey] || ANCHORS.center;
  const offset = Array.isArray(config.offset) ? config.offset : [0, 0];
  const rotation = Number.isFinite(Number(config.rotation)) ? Number(config.rotation) : 0;

  return {
    x: anchor.x + clampOffset(offset[0]),
    y: anchor.y + clampOffset(offset[1]),
    rotation,
  };
}
