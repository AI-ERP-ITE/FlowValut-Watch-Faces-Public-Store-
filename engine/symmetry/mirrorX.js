"use strict";

export function mirrorX(position) {
  return [
    position,
    {
      ...position,
      x: 100 - position.x,
      rotation: -position.rotation,
    },
  ];
}
