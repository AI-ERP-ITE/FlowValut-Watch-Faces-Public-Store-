"use strict";

const DEFAULTS = {
	count: 60,
	radius: 0.42,
	length: 0.02,
	width: 0.003,
	majorEvery: 5,
	majorLength: 0.035,
	rotation: 0,
	stroke: "#ffffff",
	tickShape: "line",
	rectAlign: "screen",
};

const TOKEN_DEFAULTS = {
	mode: "line",
	every: 5,
	offset: 0.012,
	locale: "en",
	numberingSystem: "",
	icon: {
		key: "dot",
		glyph: "",
	},
	number: {
		start: 12,
		step: 1,
		pad: 0,
	},
	text: {
		value: "",
		values: "",
	},
	font: {
		family: "Segoe UI Symbol, Arial",
		weight: "bold",
		size: 0.06,
		fill: "#ffffff",
	},
};

const ICON_GLYPHS = Object.freeze({
	dot: "•",
	circle: "○",
	bullet: "●",
	square: "■",
	diamond: "◆",
	triangle: "▲",
	star: "★",
	heart: "❤",
	plus: "+",
	cross: "✕",
	bolt: "⚡",
	sun: "☀",
	moon: "☾",
});

function clamp01(value, fallback) {
	const n = Number(value);
	if (!Number.isFinite(n)) return fallback;
	return Math.max(0, Math.min(1, n));
}

function getBaseRadius(context) {
	const r = Number(context?.layoutMetrics?.baseRadius);
	if (!Number.isFinite(r) || r <= 0) return 50;
	return r;
}

function getScale(context) {
	const s = Number(context?.layoutMetrics?.globalScale);
	if (!Number.isFinite(s) || s <= 0) return 1;
	return s;
}

function polarToCartesian(cx, cy, radius, angleDeg) {
	const rad = (angleDeg * Math.PI) / 180;
	return {
		x: cx + radius * Math.cos(rad),
		y: cy + radius * Math.sin(rad),
	};
}

function escapeXml(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function safeObject(value) {
	return value && typeof value === "object" ? value : {};
}

function resolveTokenConfig(rawToken, majorEvery) {
	const token = safeObject(rawToken);
	const font = safeObject(token.font);
	const number = safeObject(token.number);
	const text = safeObject(token.text);
	const icon = safeObject(token.icon);
	const mode = typeof token.mode === "string" ? token.mode : TOKEN_DEFAULTS.mode;
	const every = Math.max(1, Math.floor(Number.isFinite(Number(token.every)) ? Number(token.every) : majorEvery));
	const offset = clamp01(token.offset, TOKEN_DEFAULTS.offset);
	const locale = typeof token.locale === "string" && token.locale.trim().length > 0 ? token.locale.trim() : TOKEN_DEFAULTS.locale;
	const numberingSystem = typeof token.numberingSystem === "string" ? token.numberingSystem.trim() : TOKEN_DEFAULTS.numberingSystem;

	return {
		mode,
		every,
		offset,
		locale,
		numberingSystem,
		number: {
			start: Number.isFinite(Number(number.start)) ? Number(number.start) : TOKEN_DEFAULTS.number.start,
			step: Number.isFinite(Number(number.step)) ? Number(number.step) : TOKEN_DEFAULTS.number.step,
			pad: Math.max(0, Math.floor(Number.isFinite(Number(number.pad)) ? Number(number.pad) : TOKEN_DEFAULTS.number.pad)),
		},
		text: {
			value: typeof text.value === "string" ? text.value : TOKEN_DEFAULTS.text.value,
			values: typeof text.values === "string" ? text.values : TOKEN_DEFAULTS.text.values,
		},
		icon: {
			key: typeof icon.key === "string" ? icon.key : TOKEN_DEFAULTS.icon.key,
			glyph: typeof icon.glyph === "string" ? icon.glyph : TOKEN_DEFAULTS.icon.glyph,
		},
		font: {
			family: typeof font.family === "string" && font.family.trim().length > 0 ? font.family.trim() : TOKEN_DEFAULTS.font.family,
			weight: typeof font.weight === "string" && font.weight.trim().length > 0 ? font.weight.trim() : TOKEN_DEFAULTS.font.weight,
			size: clamp01(font.size, TOKEN_DEFAULTS.font.size),
			fill: typeof font.fill === "string" && font.fill.trim().length > 0 ? font.fill : TOKEN_DEFAULTS.font.fill,
		},
	};
}

function resolveIconLabel(iconConfig) {
	if (typeof iconConfig.glyph === "string" && iconConfig.glyph.trim().length > 0) {
		return iconConfig.glyph.trim();
	}
	const key = typeof iconConfig.key === "string" ? iconConfig.key.trim().toLowerCase() : "";
	if (!key) return "";
	if (Object.prototype.hasOwnProperty.call(ICON_GLYPHS, key)) {
		return ICON_GLYPHS[key];
	}
	if (key.length <= 2) return key;
	return "";
}

function parseTextTokenList(textConfig) {
	if (Array.isArray(textConfig.values)) {
		return textConfig.values.map((entry) => String(entry).trim()).filter((entry) => entry.length > 0);
	}
	if (typeof textConfig.values === "string" && textConfig.values.trim().length > 0) {
		return textConfig.values
			.split(/\||,|\n/g)
			.map((entry) => entry.trim())
			.filter((entry) => entry.length > 0);
	}
	if (typeof textConfig.value === "string" && textConfig.value.trim().length > 0) {
		return [textConfig.value.trim()];
	}
	return [];
}

function formatNumberLabel(value, token) {
	const localeOptions = {
		useGrouping: false,
		minimumIntegerDigits: Math.max(1, token.number.pad || 0),
	};
	if (token.numberingSystem) {
		localeOptions.numberingSystem = token.numberingSystem;
	}
	try {
		return new Intl.NumberFormat(token.locale || "en", localeOptions).format(value);
	} catch {
		const abs = Math.abs(value);
		const base = String(Math.floor(abs));
		const padded = token.number.pad > 0 ? base.padStart(token.number.pad, "0") : base;
		return value < 0 ? `-${padded}` : padded;
	}
}

export function renderTicksRadial(params = {}, position = {}, context = {}) {
	const p = { ...DEFAULTS, ...params };
	const baseRadius = getBaseRadius(context);
	const scale = getScale(context);

	const count = Math.max(1, Math.floor(Number.isFinite(Number(p.count)) ? Number(p.count) : DEFAULTS.count));
	const radius = clamp01(p.radius, DEFAULTS.radius) * baseRadius * scale;
	const lengthMinor = clamp01(p.length, DEFAULTS.length) * baseRadius * scale;
	const lengthMajor = clamp01(p.majorLength, DEFAULTS.majorLength) * baseRadius * scale;
	const width = Math.max(0.1, clamp01(p.width, DEFAULTS.width) * baseRadius * scale);
	const majorEvery = Math.max(1, Math.floor(Number.isFinite(Number(p.majorEvery)) ? Number(p.majorEvery) : DEFAULTS.majorEvery));
	const rotation = Number.isFinite(Number(p.rotation)) ? Number(p.rotation) : DEFAULTS.rotation;
	const rawTickShape = typeof p.tickShape === "string" ? p.tickShape.toLowerCase().trim() : "line";
	const tickShape = ["line", "rect", "triangle", "round"].includes(rawTickShape) ? rawTickShape : "line";
	const rawAlign = typeof p.shapeAlign === "string"
		? p.shapeAlign.toLowerCase().trim()
		: (typeof p.rectAlign === "string" ? p.rectAlign.toLowerCase().trim() : "screen");
	const shapeAlign = rawAlign === "radial" ? "radial" : "screen";
	const token = resolveTokenConfig(p.token, majorEvery);
	const tokenCount = Math.max(1, Math.floor(count / token.every));
	const useClassicClockWrap = token.mode === "number"
		&& tokenCount === 12
		&& token.number.start === 12
		&& token.number.step === 1;
	const textTokens = parseTextTokenList(token.text);
	const isLineMode = token.mode === "line";
	const supportsTextTokens = token.mode === "number" || token.mode === "text";
	const tokenFontSize = Math.max(3, token.font.size * baseRadius * scale);
	const tokenOffset = token.offset * baseRadius * scale;

	let svg = "<g>";
	for (let i = 0; i < count; i += 1) {
		const angle = rotation + (360 * i) / count - 90;
		const tickLength = i % majorEvery === 0 ? lengthMajor : lengthMinor;

		if (isLineMode) {
			if (i % token.every !== 0) {
				continue;
			}
			if (tickShape === "rect") {
				const center = polarToCartesian(0, 0, Math.max(0, radius - lengthMinor / 2), angle);
				if (shapeAlign === "screen") {
					const x = center.x - width / 2;
					const y = center.y - lengthMinor / 2;
					svg += `<rect x="${x}" y="${y}" width="${width}" height="${lengthMinor}" fill="${escapeXml(p.stroke)}" />`;
				} else {
					const x = -width / 2;
					const y = -lengthMinor / 2;
					svg += `<rect x="${x}" y="${y}" width="${width}" height="${lengthMinor}" fill="${escapeXml(p.stroke)}" transform="translate(${center.x} ${center.y}) rotate(${angle + 90})" />`;
				}
			} else if (tickShape === "triangle") {
				const center = polarToCartesian(0, 0, Math.max(0, radius - lengthMinor / 2), angle);
				if (shapeAlign === "screen") {
					const points = [
						`${center.x} ${center.y - lengthMinor / 2}`,
						`${center.x + width / 2} ${center.y + lengthMinor / 2}`,
						`${center.x - width / 2} ${center.y + lengthMinor / 2}`,
					].join(" ");
					svg += `<polygon points="${points}" fill="${escapeXml(p.stroke)}" />`;
				} else {
					const points = [
						`0 ${-lengthMinor / 2}`,
						`${width / 2} ${lengthMinor / 2}`,
						`${-width / 2} ${lengthMinor / 2}`,
					].join(" ");
					svg += `<polygon points="${points}" fill="${escapeXml(p.stroke)}" transform="translate(${center.x} ${center.y}) rotate(${angle + 90})" />`;
				}
			} else if (tickShape === "round") {
				const center = polarToCartesian(0, 0, Math.max(0, radius - lengthMinor / 2), angle);
				if (shapeAlign === "screen") {
					const x = center.x - width / 2;
					const y = center.y - lengthMinor / 2;
					const corner = Math.min(width, lengthMinor) / 2;
					svg += `<rect x="${x}" y="${y}" width="${width}" height="${lengthMinor}" rx="${corner}" ry="${corner}" fill="${escapeXml(p.stroke)}" />`;
				} else {
					const x = -width / 2;
					const y = -lengthMinor / 2;
					const corner = Math.min(width, lengthMinor) / 2;
					svg += `<rect x="${x}" y="${y}" width="${width}" height="${lengthMinor}" rx="${corner}" ry="${corner}" fill="${escapeXml(p.stroke)}" transform="translate(${center.x} ${center.y}) rotate(${angle + 90})" />`;
				}
			} else {
				// In line mode, keep the visible tick length controlled by the Length slider.
				const start = polarToCartesian(0, 0, Math.max(0, radius - lengthMinor), angle);
				const end = polarToCartesian(0, 0, radius, angle);
				svg += `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${escapeXml(p.stroke)}" stroke-width="${width}" stroke-linecap="round" />`;
			}
			continue;
		}

		if (token.mode === "icon") {
			if (i % token.every === 0) {
				const glyph = resolveIconLabel(token.icon);
				if (glyph.length > 0) {
					const iconPoint = polarToCartesian(0, 0, Math.max(0, radius - tickLength - tokenOffset), angle);
					svg += `<text x="${iconPoint.x}" y="${iconPoint.y}" fill="${escapeXml(token.font.fill)}" font-family="${escapeXml(token.font.family)}" font-weight="${escapeXml(token.font.weight)}" font-size="${tokenFontSize}" text-anchor="middle" dominant-baseline="middle">${escapeXml(glyph)}</text>`;
				}
			}
			continue;
		}

		if (supportsTextTokens && i % token.every === 0) {
			let label = "";
			if (token.mode === "number") {
				const numericValueRaw = token.number.start + (i / token.every) * token.number.step;
				const numericValue = useClassicClockWrap
					? (((numericValueRaw - 1) % 12) + 12) % 12 + 1
					: numericValueRaw;
				label = formatNumberLabel(numericValue, token);
			} else if (token.mode === "text") {
				if (textTokens.length > 0) {
					label = textTokens[(i / token.every) % textTokens.length];
				}
			}

			if (label.length > 0) {
				const textPoint = polarToCartesian(0, 0, Math.max(0, radius - tickLength - tokenOffset), angle);
				svg += `<text x="${textPoint.x}" y="${textPoint.y}" fill="${escapeXml(token.font.fill)}" font-family="${escapeXml(token.font.family)}" font-weight="${escapeXml(token.font.weight)}" font-size="${tokenFontSize}" text-anchor="middle" dominant-baseline="middle">${escapeXml(label)}</text>`;
			}
		}
	}
	svg += "</g>";
	return svg;
}

export const ticksRadialElement = {
	id: "ticks_radial",
	geometry: { type: "radial" },
	defaultParams: { ...DEFAULTS },
	render: renderTicksRadial,
};
