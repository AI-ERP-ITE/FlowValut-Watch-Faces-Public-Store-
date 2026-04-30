"use strict";

function clampRadius(radius) {
  const num = Number(radius);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(1, num));
}

export function placePolar(config = {}) {
  const radius = clampRadius(config.radius);
  const angle = Number.isFinite(Number(config.angle)) ? Number(config.angle) : 0;
  const rotation = Number.isFinite(Number(config.rotation)) ? Number(config.rotation) : angle;

  const rad = (angle * Math.PI) / 180;
  const r = radius * 50;

  return {
    x: 50 + r * Math.cos(rad),
    y: 50 + r * Math.sin(rad),
    rotation,
  };
}
