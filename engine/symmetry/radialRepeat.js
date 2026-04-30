"use strict";

export function radialRepeat(position, config = {}) {
  const count = Math.max(1, Math.floor(Number.isFinite(Number(config.count)) ? Number(config.count) : 1));
  const centerX = 50;
  const centerY = 50;

  const dx = position.x - centerX;
  const dy = position.y - centerY;

  const positions = [];
  const step = 360 / count;

  for (let i = 0; i < count; i += 1) {
    const angle = (step * i * Math.PI) / 180;
    const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
    const ry = dx * Math.sin(angle) + dy * Math.cos(angle);

    positions.push({
      x: centerX + rx,
      y: centerY + ry,
      rotation: position.rotation + step * i,
    });
  }

  return positions;
}
