"use strict";

export function mirrorY(position) {
  return [
    position,
    {
      ...position,
      y: 100 - position.y,
      rotation: 180 - position.rotation,
    },
  ];
}
