export type FontCategory = 'watchface' | 'display' | 'system' | 'monospace';

export interface FontStyle {
  key: string;
  label: string;
  fontFamily: string;
  fontWeight: string;
  color: string;
  category: FontCategory;
  /** Can be embedded inside the ZPK archive (open-source / OFL licensed) */
  embeddable?: boolean;
  /** Filename in public/fonts/ e.g. 'Montserrat-Medium.ttf' */
  fontFile?: string;
}

export const FONT_STYLES: FontStyle[] = [
  // ─── WATCHFACE / FUTURISTIC (Google Fonts) ────────────────────────────────
  { key: 'orbitron',         label: 'Orbitron',          fontFamily: 'Orbitron',          fontWeight: '700', color: '#00D4FF', category: 'watchface' },
  { key: 'bebas',            label: 'Bebas Neue',        fontFamily: 'Bebas Neue',        fontWeight: '400', color: '#FFD700', category: 'watchface' },
  { key: 'oswald',           label: 'Oswald',            fontFamily: 'Oswald',            fontWeight: '700', color: '#FFFFFF', category: 'watchface' },
  { key: 'rajdhani',         label: 'Rajdhani',          fontFamily: 'Rajdhani',          fontWeight: '700', color: '#00FF88', category: 'watchface' },
  { key: 'share-tech',       label: 'Share Tech Mono',   fontFamily: 'Share Tech Mono',   fontWeight: '400', color: '#33FF33', category: 'watchface' },
  { key: 'goldman',          label: 'Goldman',           fontFamily: 'Goldman',           fontWeight: '700', color: '#FF9F43', category: 'watchface' },
  { key: 'russo',            label: 'Russo One',         fontFamily: 'Russo One',         fontWeight: '400', color: '#FFFFFF', category: 'watchface' },
  { key: 'audiowide',        label: 'Audiowide',         fontFamily: 'Audiowide',         fontWeight: '400', color: '#4A9EFF', category: 'watchface' },
  { key: 'rationale',        label: 'Rationale',         fontFamily: 'Rationale',         fontWeight: '400', color: '#C0C0C0', category: 'watchface' },
  { key: 'black-ops',        label: 'Black Ops One',     fontFamily: 'Black Ops One',     fontWeight: '400', color: '#FF4444', category: 'watchface' },
  { key: 'michroma',         label: 'Michroma',          fontFamily: 'Michroma',          fontWeight: '400', color: '#00FFCC', category: 'watchface' },
  { key: 'exo2',             label: 'Exo 2',             fontFamily: 'Exo 2',             fontWeight: '700', color: '#AADDFF', category: 'watchface' },
  { key: 'syncopate',        label: 'Syncopate',         fontFamily: 'Syncopate',         fontWeight: '700', color: '#FFFFFF', category: 'watchface' },
  { key: 'nova-mono',        label: 'Nova Mono',         fontFamily: 'Nova Mono',         fontWeight: '400', color: '#88FF88', category: 'watchface' },
  { key: 'vt323',            label: 'VT323',             fontFamily: 'VT323',             fontWeight: '400', color: '#33FF33', category: 'watchface' },
  { key: 'press-start',      label: 'Press Start 2P',    fontFamily: 'Press Start 2P',    fontWeight: '400', color: '#FF88FF', category: 'watchface' },
  { key: 'chakra-petch',     label: 'Chakra Petch',      fontFamily: 'Chakra Petch',      fontWeight: '700', color: '#FFDD00', category: 'watchface' },
  { key: 'quantico',         label: 'Quantico',          fontFamily: 'Quantico',          fontWeight: '700', color: '#44FFCC', category: 'watchface' },
  { key: 'oxanium',          label: 'Oxanium',           fontFamily: 'Oxanium',           fontWeight: '700', color: '#FF6688', category: 'watchface' },
  { key: 'wallpoet',         label: 'Wallpoet',          fontFamily: 'Wallpoet',          fontWeight: '400', color: '#AAAAAA', category: 'watchface' },

  // ─── DISPLAY / CLEAN (Google Fonts) ──────────────────────────────────────
  { key: 'roboto',           label: 'Roboto',            fontFamily: 'Roboto',            fontWeight: '700', color: '#FFFFFF',  category: 'display' },
  { key: 'open-sans',        label: 'Open Sans',         fontFamily: 'Open Sans',         fontWeight: '700', color: '#FFFFFF',  category: 'display' },
  { key: 'lato',             label: 'Lato',              fontFamily: 'Lato',              fontWeight: '700', color: '#E0E0E0',  category: 'display' },
  { key: 'montserrat',       label: 'Montserrat',        fontFamily: 'Montserrat',        fontWeight: '700', color: '#FFFFFF',  category: 'display',    embeddable: true,  fontFile: 'Montserrat-Medium.ttf' },
  { key: 'poppins',          label: 'Poppins',           fontFamily: 'Poppins',           fontWeight: '700', color: '#CCDDFF',  category: 'display' },
  { key: 'nunito',           label: 'Nunito',            fontFamily: 'Nunito',            fontWeight: '700', color: '#FFEEDD',  category: 'display' },
  { key: 'raleway',          label: 'Raleway',           fontFamily: 'Raleway',           fontWeight: '700', color: '#DDDDDD',  category: 'display' },
  { key: 'josefin-sans',     label: 'Josefin Sans',      fontFamily: 'Josefin Sans',      fontWeight: '700', color: '#FFFFFF',  category: 'display' },
  { key: 'righteous',        label: 'Righteous',         fontFamily: 'Righteous',         fontWeight: '400', color: '#FFD700',  category: 'display' },
  { key: 'ubuntu',           label: 'Ubuntu',            fontFamily: 'Ubuntu',            fontWeight: '700', color: '#FF8844',  category: 'display' },

  // ─── SYSTEM / WINDOWS (already on device — no download needed) ───────────
  { key: 'arial',            label: 'Arial',             fontFamily: 'Arial',             fontWeight: 'bold',   color: '#FFFFFF', category: 'system' },
  { key: 'arial-black',      label: 'Arial Black',       fontFamily: 'Arial Black',       fontWeight: '900',    color: '#FFFFFF', category: 'system' },
  { key: 'arial-narrow',     label: 'Arial Narrow',      fontFamily: 'Arial Narrow',      fontWeight: 'bold',   color: '#C0C0C0', category: 'system' },
  { key: 'calibri',          label: 'Calibri',           fontFamily: 'Calibri',           fontWeight: 'bold',   color: '#FFFFFF', category: 'system' },
  { key: 'calibri-light',    label: 'Calibri Light',     fontFamily: 'Calibri Light',     fontWeight: '300',    color: '#DDDDDD', category: 'system' },
  { key: 'cambria',          label: 'Cambria',           fontFamily: 'Cambria',           fontWeight: 'bold',   color: '#FFEEBB', category: 'system' },
  { key: 'candara',          label: 'Candara',           fontFamily: 'Candara',           fontWeight: 'bold',   color: '#CCFFEE', category: 'system' },
  { key: 'constantia',       label: 'Constantia',        fontFamily: 'Constantia',        fontWeight: 'bold',   color: '#FFDDA0', category: 'system' },
  { key: 'corbel',           label: 'Corbel',            fontFamily: 'Corbel',            fontWeight: 'bold',   color: '#AADDFF', category: 'system' },
  { key: 'courier-new',      label: 'Courier New',       fontFamily: 'Courier New',       fontWeight: 'bold',   color: '#00FF88', category: 'system' },
  { key: 'franklin-gothic',  label: 'Franklin Gothic',   fontFamily: 'Franklin Gothic Medium', fontWeight: 'normal', color: '#FFFFFF', category: 'system' },
  { key: 'georgia',          label: 'Georgia',           fontFamily: 'Georgia',           fontWeight: 'bold',   color: '#FFD700', category: 'system' },
  { key: 'impact',           label: 'Impact',            fontFamily: 'Impact',            fontWeight: 'normal', color: '#FF6666', category: 'system' },
  { key: 'ms-sans-serif',    label: 'MS Sans Serif',     fontFamily: 'Microsoft Sans Serif', fontWeight: 'normal', color: '#CCCCCC', category: 'system' },
  { key: 'palatino',         label: 'Palatino Linotype', fontFamily: 'Palatino Linotype', fontWeight: 'bold',   color: '#FFEECC', category: 'system' },
  { key: 'segoe-ui',         label: 'Segoe UI',          fontFamily: 'Segoe UI',          fontWeight: 'bold',   color: '#FFFFFF', category: 'system' },
  { key: 'segoe-ui-light',   label: 'Segoe UI Light',    fontFamily: 'Segoe UI Light',    fontWeight: '300',    color: '#DDDDDD', category: 'system' },
  { key: 'tahoma',           label: 'Tahoma',            fontFamily: 'Tahoma',            fontWeight: 'bold',   color: '#AAFFCC', category: 'system' },
  { key: 'times-new-roman',  label: 'Times New Roman',   fontFamily: 'Times New Roman',   fontWeight: 'bold',   color: '#FFEEAA', category: 'system' },
  { key: 'trebuchet',        label: 'Trebuchet MS',      fontFamily: 'Trebuchet MS',      fontWeight: 'bold',   color: '#88CCFF', category: 'system' },
  { key: 'verdana',          label: 'Verdana',           fontFamily: 'Verdana',           fontWeight: 'bold',   color: '#4A9EFF', category: 'system' },

  // ─── MONOSPACE ────────────────────────────────────────────────────────────
  { key: 'roboto-mono',      label: 'Roboto Mono',       fontFamily: 'Roboto Mono',       fontWeight: '400', color: '#E0E0E0', category: 'monospace' },
  { key: 'oxygen-mono',      label: 'Oxygen Mono',       fontFamily: 'Oxygen Mono',       fontWeight: '400', color: '#AAFFAA', category: 'monospace' },
  { key: 'consolas',         label: 'Consolas',          fontFamily: 'Consolas',          fontWeight: 'normal', color: '#FF4444', category: 'monospace' },
  { key: 'lucida-console',   label: 'Lucida Console',    fontFamily: 'Lucida Console',    fontWeight: 'normal', color: '#33FF33', category: 'monospace' },
  { key: 'lucida-sans',      label: 'Lucida Sans Unicode', fontFamily: 'Lucida Sans Unicode', fontWeight: 'normal', color: '#AADDFF', category: 'monospace' },
  { key: 'cascadia-code',    label: 'Cascadia Code',     fontFamily: 'Cascadia Code',     fontWeight: '400', color: '#88FFCC', category: 'monospace', embeddable: true,  fontFile: 'CascadiaCode.ttf' },
  { key: 'cascadia-mono',    label: 'Cascadia Mono',     fontFamily: 'Cascadia Mono',     fontWeight: '400', color: '#AAFFDD', category: 'monospace', embeddable: true,  fontFile: 'CascadiaMono.ttf' },

  // ─── LOCAL FILES (commercially licensed, bundled in /public/fonts/) ──────
  { key: 'tex-gyre-termes',  label: 'TeX Gyre Termes',   fontFamily: 'TeX Gyre Termes',   fontWeight: '400', color: '#FFEEBB', category: 'display' },
  { key: 'the-bold-font',    label: 'The Bold Font',     fontFamily: 'The Bold Font',     fontWeight: '700', color: '#FFFFFF',  category: 'display',    embeddable: true,  fontFile: 'THEBOLDFONT.ttf' },
];

export function getFontStyle(key: string): FontStyle {
  const builtin = FONT_STYLES.find(f => f.key === key);
  if (builtin) return builtin;
  const custom = _customFontRegistry.find(f => f.key === key);
  if (custom) return custom;
  return FONT_STYLES[0];
}

// ── Custom font registry ───────────────────────────────────────────────────────
let _customFontRegistry: FontStyle[] = [];

/** Register user-uploaded fonts so they appear in the font picker. */
export function registerCustomFontsInLibrary(names: string[]): void {
  _customFontRegistry = names.map(name => ({
    key: `custom-font:${name}`,
    label: name,
    fontFamily: name,
    fontWeight: '400',
    color: '#FFFFFF',
    category: 'display' as FontCategory,
  }));
}

/** Get all custom font styles currently registered. */
export function getCustomFontStyles(): FontStyle[] {
  return _customFontRegistry;
}

export function generateFontPreview(style: FontStyle): string {
  const w = 80, h = 28;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = style.color;
  ctx.font = `${style.fontWeight} ${Math.floor(h * 0.7)}px ${style.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('12:34', w / 2, h / 2);
  return canvas.toDataURL('image/png');
}
