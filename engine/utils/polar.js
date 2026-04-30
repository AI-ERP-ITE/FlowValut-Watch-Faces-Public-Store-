"use strict";

export function degToRad(angleDeg) {
	return (Number(angleDeg) * Math.PI) / 180;
}

export function radToDeg(angleRad) {
	return (Number(angleRad) * 180) / Math.PI;
}

export function polarToCartesian(cx, cy, radius, angleDeg) {
	const angle = degToRad(angleDeg);
	return {
		x: Number(cx) + Number(radius) * Math.cos(angle),
		y: Number(cy) + Number(radius) * Math.sin(angle),
	};
}

export function cartesianToPolar(cx, cy, x, y) {
	const dx = Number(x) - Number(cx);
	const dy = Number(y) - Number(cy);
	const radius = Math.sqrt(dx * dx + dy * dy);
	const angleDeg = radToDeg(Math.atan2(dy, dx));
	return {
		radius,
		angleDeg,
	};
}
