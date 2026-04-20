// Watch Face Creator Types

export interface WatchFaceElement {
  id: string;
  type: 'TIME_POINTER' | 'IMG_LEVEL' | 'TEXT' | 'IMG' | 'ARC_PROGRESS' | 'CIRCLE' | 'TEXT_IMG' | 'BUTTON' | 'IMG_STATUS' | 'IMG_TIME' | 'IMG_DATE' | 'IMG_WEEK' | 'FILL_RECT' | 'STROKE_RECT' | 'IMG_ANIM' | 'IMG_PROGRESS' | 'DATE_POINTER' | 'IMG_CLICK';
  subtype?: string;
  name: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  center?: {
    x: number;
    y: number;
  };
  color?: string;
  src?: string;
  /** Original asset filename — preserved even when src is overwritten with data URL for preview */
  assetFilename?: string;
  dataType?: string;
  images?: string[];
  text?: string;
  fontSize?: number;
  font?: string;
  visible: boolean;
  zIndex: number;

  // ARC_PROGRESS specific
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  lineWidth?: number;

  // TIME_POINTER specific
  hourHandSrc?: string;
  minuteHandSrc?: string;
  secondHandSrc?: string;
  coverSrc?: string;
  pointerCenter?: { x: number; y: number };
  hourPos?: { x: number; y: number };
  minutePos?: { x: number; y: number };
  secondPos?: { x: number; y: number };

  // BUTTON specific
  clickAction?: string;
  pressSrc?: string;
  normalSrc?: string;

  // IMG / CIRCLE specific
  alpha?: number;

  // IMG_ANIM specific
  animPath?: string;    // folder path for animation frames (e.g. 'anim/rain')
  animFps?: number;     // frames per second
  repeatCount?: number; // 0=infinite, 1=once

  // DATE_POINTER specific
  dateType?: 'MONTH' | 'DAY' | 'WEEK';

  // IMG_STATUS specific
  statusType?: string;

  // TEXT_IMG specific
  fontArray?: string[];
  hSpace?: number;
  alignH?: string;

  // Icon library
  iconKey?: string;

  // ── Icon appearance (IMG elements with iconKey) ──────────────────────────
  iconHue?: number;           // 0–360°: hue rotation shift
  iconSaturation?: number;    // 0–200%: 100 = normal, 0 = greyscale, 200 = vivid
  iconColorize?: string;      // hex color overlay (e.g. '#FF4444') for solid-color tint
  iconColorizeOpacity?: number; // 0–1: strength of colorize overlay, default 0.7
  iconShadow?: number;        // 0–1: master shadow on/off
  iconShadowOpacity?: number; // 0–1: darkness
  iconShadowBlur?: number;    // 0–30px
  iconShadowDistance?: number;// 0–30px
  iconShadowAngle?: number;   // 0–360°

  // Weather IMG_LEVEL style
  weatherStyle?: string;

  // Clock hand style (TIME_POINTER) — 'white' | 'silver' | 'black' | 'brown' | 'gold' | 'poedagar' | 'fleming' | 'montagut' | 'olevs'
  handStyle?: string;

  // Hide seconds hand (TIME_POINTER)
  hideSeconds?: boolean;

  // ── Hand scaling ──────────────────────────────────────────────────────────
  // "Scale Whole" mode: one multiplier for all hands (length only)
  handLengthScale?: number;   // 0.5–2.0, default 1.0
  // "Scale Each" mode: per-hand length + width multipliers
  handHourLength?: number;    // 0.5–2.0
  handHourWidth?: number;     // 0.5–2.0
  handMinuteLength?: number;
  handMinuteWidth?: number;
  handSecondLength?: number;
  handSecondWidth?: number;

  // ── Hand effects (preview only — visual on canvas) ───────────────────────
  handShadow?: number;   // 0–1: master on/off + quick intensity
  handShadowOpacity?: number;  // 0–1: darkness/density (overrides auto when set)
  handShadowBlur?: number;     // 0–30px: spread / softness
  handShadowDistance?: number; // 0–30px: distance from hand
  handShadowAngle?: number;    // 0–360°: direction (0=right, 90=down, 180=left, 270=up)
  handGlow?: number;     // 0–1: neon glow brightness
  handTrail?: number;    // 0–1: speed-blur ghost opacity
  handTint?: string;     // CSS color — accent tint blended on hands (e.g. '#4488FF')

  // Font library
  fontStyle?: string;

  // Curved text
  curvedText?: {
    radius: number;      // Arc radius for text path
    startAngle: number;  // Start angle in degrees
    endAngle: number;    // End angle in degrees
  };

  // ── Decorative Frame (FILL_RECT with 3D engraving/emboss effect) ─────────
  isFrame?: boolean;                               // marks this rect as a styled frame
  frameStyle?: 'engraved' | 'embossed' | 'flat';  // default 'engraved'
  frameIntensity?: number;                         // 0–1, bevel depth, default 0.6
  frameCornerRadius?: number;                      // 0–40 px, default 6
  frameFill?: string;                              // hex color, or undefined = transparent
}

export interface WatchFaceConfig {
  name: string;
  resolution: {
    width: number;
    height: number;
  };
  background: {
    src: string;
    format: 'TGA-P' | 'TGA-RLP' | 'TGA-16' | 'TGA-32';
  };
  elements: WatchFaceElement[];
  watchModel: string;
}

export interface GeneratedCode {
  appJson: string;
  appJs: string;
  watchfaceIndexJs: string;
}

export interface KimiResponse {
  config: WatchFaceConfig;
  elements: ElementImage[];
  code: GeneratedCode;
  metadata: {
    resolution: string;
    estimatedFileSize: string;
    compatibility: string[];
  };
}

export interface ElementImage {
  name: string;
  dataUrl: string;
  file?: File;
  src?: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  type: string;
}

export interface GitHubUploadResult {
  success: boolean;
  url?: string;
  downloadUrl?: string;
  watchfaceId?: string;  // For folder-based organization
  qrUrl?: string;        // URL to access QR code from GitHub Pages
  error?: string;
}

export type AppStep = 'upload' | 'analyzing' | 'preview' | 'generating' | 'success';

export interface AppState {
  currentStep: AppStep;
  backgroundImage: string | null;
  backgroundFile: File | null;
  fullDesignImage: string | null;
  fullDesignFile: File | null;
  watchFaceConfig: WatchFaceConfig | null;
  elementImages: ElementImage[];
  generatedCode: GeneratedCode | null;
  zpkBlob: Blob | null;
  githubUrl: string | null;
  qrCodeDataUrl: string | null;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  githubToken: string;
  githubRepo: string;
  undoStack: WatchFaceElement[][];
  redoStack: WatchFaceElement[][];
}
