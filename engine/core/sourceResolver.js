/**
 * Pure source resolver. Plain JS so engine/.js renderer can import natively.
 * Mirrors the Phase-1 contract documented in spec 085.
 *
 * STRICT RULES:
 *  - The resolver consumes ONLY explicit metadata:
 *      - renderState.renderSourceMode
 *      - renderState.maskEmbeddedInSnapshot
 *      - renderState.snapshot
 *      - element.mask (current live mask)
 *  - The resolver MUST NOT consult original geometry history, previous
 *    silhouette caches, source ancestry, snapshot rectangle bounds, or any
 *    pre-mask fallback.
 *  - The resolver MUST NOT mutate the element.
 *
 * @typedef {'procedural' | 'baked-live-mask' | 'baked-baked-mask'} RenderSourceMode
 */

const VALID_MODES = new Set(['procedural', 'baked-live-mask', 'baked-baked-mask']);

function isRenderSourceMode(value) {
	return typeof value === 'string' && VALID_MODES.has(value);
}

function readRenderState(element) {
	const rs = element && typeof element === 'object' ? element.renderState : null;
	return rs && typeof rs === 'object' ? rs : {};
}

function readSnapshot(renderState) {
	const snap = renderState.snapshot;
	if (!snap || typeof snap !== 'object') return null;
	return snap;
}

function readLiveMask(element) {
	const mask = element && typeof element === 'object' ? element.mask : null;
	return mask && typeof mask === 'object' ? mask : null;
}

function readMaskKey(mask) {
	if (!mask) return null;
	if (mask.enabled === false) return null;
	const candidates = ['id', 'kind', 'shape', 'mode', 'imageDataUrl'];
	for (const key of candidates) {
		const value = mask[key];
		if (typeof value === 'string' && value.length > 0) return value;
	}
	return 'live';
}

function readElementId(element) {
	const id = element && typeof element === 'object' ? element.id : null;
	return typeof id === 'string' && id.length > 0 ? id : '';
}

export function resolveRenderSourceMode(element) {
	if (!element || typeof element !== 'object') return 'procedural';
	const rs = readRenderState(element);
	const mode = rs.renderSourceMode;
	return isRenderSourceMode(mode) ? mode : 'procedural';
}

export function resolveSurfaceSource(element) {
	if (!element || typeof element !== 'object') {
		return { kind: 'procedural', elementId: '' };
	}
	const mode = resolveRenderSourceMode(element);
	const elementId = readElementId(element);

	if (mode === 'procedural') {
		return { kind: 'procedural', elementId };
	}

	const snapshot = readSnapshot(readRenderState(element));
	if (!snapshot || typeof snapshot.imageDataUrl !== 'string' || snapshot.imageDataUrl.length === 0) {
		return { kind: 'procedural', elementId };
	}

	return {
		kind: 'baked-image',
		imageDataUrl: snapshot.imageDataUrl,
		width: Math.max(1, Number(snapshot.width) || 1),
		height: Math.max(1, Number(snapshot.height) || 1),
	};
}

export function resolveSilhouetteSource(element) {
	if (!element || typeof element !== 'object') {
		return { kind: 'procedural-vector', elementId: '', liveMaskKey: null };
	}
	const mode = resolveRenderSourceMode(element);
	const elementId = readElementId(element);
	const liveMask = readLiveMask(element);
	const maskKey = readMaskKey(liveMask);

	if (mode === 'procedural') {
		return { kind: 'procedural-vector', elementId, liveMaskKey: maskKey };
	}

	const snapshot = readSnapshot(readRenderState(element));
	if (!snapshot || typeof snapshot.imageDataUrl !== 'string' || snapshot.imageDataUrl.length === 0) {
		return { kind: 'procedural-vector', elementId, liveMaskKey: maskKey };
	}

	// baked-live-mask and baked-baked-mask both project alpha from snapshot;
	// difference is whether maskKey is "the" mask or "an additional" mask, but
	// the resolver result shape is identical.
	return {
		kind: 'baked-alpha',
		imageDataUrl: snapshot.imageDataUrl,
		width: Math.max(1, Number(snapshot.width) || 1),
		height: Math.max(1, Number(snapshot.height) || 1),
		additionalLiveMaskKey: maskKey,
	};
}
