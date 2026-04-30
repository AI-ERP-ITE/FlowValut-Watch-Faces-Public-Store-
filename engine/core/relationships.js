"use strict";

function isSafeExpression(expr) {
	return /^[0-9+\-*/().\sA-Za-z_]+$/.test(expr);
}

function toFiniteNumber(value, fallback = 0) {
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
}

function getByPath(source, path) {
	if (!source || typeof source !== "object") return undefined;
	const parts = path.split(".");
	let current = source;
	for (const part of parts) {
		if (!current || typeof current !== "object" || !(part in current)) return undefined;
		current = current[part];
	}
	return current;
}

function setByPath(target, path, value) {
	const parts = path.split(".");
	let current = target;
	for (let i = 0; i < parts.length - 1; i += 1) {
		const key = parts[i];
		if (!current[key] || typeof current[key] !== "object") {
			current[key] = {};
		}
		current = current[key];
	}
	current[parts[parts.length - 1]] = value;
}

function resolveSelector(elements, selector) {
	return elements.filter((element) => {
		const role = typeof element.role === "string" ? element.role : "";
		const type = typeof element.type === "string" ? element.type : "";
		return (
			role === selector ||
			type === selector ||
			role.startsWith(selector) ||
			type.startsWith(selector)
		);
	});
}

function evaluateExpression(expression, resolver) {
	if (!isSafeExpression(expression)) {
		throw new Error(`Unsafe relationship expression: ${expression}`);
	}

	const rewritten = expression.replace(/[A-Za-z_][A-Za-z0-9_.]*/g, (token) => {
		const value = resolver(token);
		if (value === undefined) {
			throw new Error(`Unknown relationship token: ${token}`);
		}
		return String(toFiniteNumber(value));
	});

	const compute = new Function(`return (${rewritten});`);
	const result = Number(compute());
	if (!Number.isFinite(result)) {
		throw new Error(`Relationship expression did not resolve to a finite number: ${expression}`);
	}
	return result;
}

export function applyRelationships(composition) {
	if (!composition || typeof composition !== "object") return composition;

	const rel = composition.relationships;
	if (!rel || typeof rel !== "object") return composition;

	const out = {
		...composition,
		elements: Array.isArray(composition.elements)
			? composition.elements.map((element) => ({
				...element,
				params: element && typeof element.params === "object" ? { ...element.params } : {},
			}))
			: [],
	};

	const layout = out.layout && typeof out.layout === "object" ? out.layout : {};
	const scale = out.scale && typeof out.scale === "object" ? out.scale : {};

	const lookup = {
		layout,
		scale,
	};

	for (const element of out.elements) {
		const key = typeof element.role === "string" && element.role.length > 0 ? element.role : element.type;
		if (typeof key === "string" && key.length > 0) {
			lookup[key] = element.params || {};
		}
	}

	for (const [targetPath, expression] of Object.entries(rel)) {
		if (typeof targetPath !== "string" || typeof expression !== "string") continue;
		const split = targetPath.split(".");
		if (split.length < 2) continue;

		const selector = split.shift();
		const paramPath = split.join(".");
		if (!selector || !paramPath) continue;

		const value = evaluateExpression(expression, (token) => getByPath(lookup, token));
		const targets = resolveSelector(out.elements, selector);
		for (const element of targets) {
			setByPath(element.params, paramPath, value);
			const lookupKey = typeof element.role === "string" && element.role.length > 0 ? element.role : element.type;
			if (typeof lookupKey === "string") {
				lookup[lookupKey] = element.params;
			}
		}
	}

	return out;
}
