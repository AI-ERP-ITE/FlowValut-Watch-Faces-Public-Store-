// Watch Face Creator Types

export interface WatchFaceElement {
  id: string;
  version?: number;
  type: 'TIME_POINTER' | 'GAUGE_POINTER' | 'IMG_LEVEL' | 'TEXT' | 'IMG' | 'ARC_PROGRESS' | 'CIRCLE' | 'TEXT_IMG' | 'BUTTON' | 'IMG_STATUS' | 'IMG_TIME' | 'IMG_DATE' | 'IMG_WEEK' | 'FILL_RECT' | 'STROKE_RECT' | 'IMG_ANIM' | 'IMG_PROGRESS' | 'DATE_POINTER' | 'IMG_CLICK';
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
  // IMG_LEVEL count policy metadata (038)
  imageSwitcherFrameCount?: number;
  imageSwitcherStrict?: boolean;
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
  // GAUGE_POINTER normalized pivot (0..1 in local element bounds)
  pivotX?: number;
  pivotY?: number;
  // Optional logical pairing metadata for gauge composition (ARC_PROGRESS + GAUGE_POINTER)
  gaugePairId?: string;

  // BUTTON specific
  clickAction?: string;
  pressSrc?: string;
  normalSrc?: string;

  // IMG / CIRCLE specific
  alpha?: number;

  // CIRCLE / Shape specific
  shapeType?: 'circle' | 'fill_rect' | 'stroke_rect' | 'rounded_rect';
  shapeCornerRadius?: number; // px, for rounded_rect, default 12

  // IMG_ANIM specific
  animPath?: string;    // folder path for animation frames (e.g. 'anim/rain')
  animFps?: number;     // frames per second
  repeatCount?: number; // 0=infinite, 1=once

  // DATE_POINTER specific
  dateType?: 'MONTH' | 'DAY' | 'WEEK';

  // IMG_STATUS specific
  statusType?: string;

  // IMG_WEEK specific
  weekFormat?: 'full' | 'short' | 'initial';

  // TEXT date-format mode (TEXT elements bound to date)
  dateFormat?: string; // e.g. 'DD/MM', 'MM/DD', 'DD/MM/YYYY', 'DD MMM', 'MMM DD'

  // TEXT_IMG specific
  fontArray?: string[];
  hSpace?: number;
  alignH?: string;

  // Icon library
  iconKey?: string;

  // Icon color effects (preview + ZPK bake)
  iconHue?: number;           // hue-rotate degrees
  iconSaturation?: number;    // saturation % (100 = normal)
  iconColorize?: string;      // CSS color overlay (source-in blend)
  iconColorizeOpacity?: number; // 0–1 opacity for colorize layer

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
  handShadow?: number;   // 0–1: shadow intensity/size
  handGlow?: number;     // 0–1: neon glow brightness
  handTrail?: number;    // 0–1: speed-blur ghost opacity
  handTint?: string;     // CSS color — accent tint blended on hands (e.g. '#4488FF')

  // ── Pointer image effects (031) ─────────────────────────────────────────
  // Values are intentionally symmetric around neutral defaults for deterministic normalization.
  pointerBrightness?: number; // -100..100, default 0
  pointerContrast?: number;   // -100..100, default 0
  pointerSaturation?: number; // -100..100, default 0
  pointerOpacity?: number;    // 0..1, default 1

  // Font library
  fontStyle?: string;

  // TEXT character and line spacing (Zepp OS char_space / line_space)
  charSpace?: number;   // default 0
  lineSpace?: number;   // default 0

  // Curved text
  curvedText?: {
    radius: number;      // Arc radius for text path
    startAngle: number;  // Start angle in degrees
    endAngle: number;    // End angle in degrees
  };

  // ── Engrave / Emboss frame ────────────────────────────────────────────────
  // Set on the PARENT element — holds the ID of its linked FILL_RECT frame
  frameElementId?: string;

  // Set on the FILL_RECT frame element itself
  engraveFrame?: {
    frameOf: string;              // ID of the parent element
    mode: 'inner' | 'outer';     // inner = engrave/inset, outer = emboss/raised
    depth: number;                // 1–20, default 6
    lightAngle: number;           // degrees 0–360, default 135 (top-left)
    highlightColor: string;       // CSS hex, default '#FFFFFF'
    highlightOpacity: number;     // 0–1, default 0.6
    shadowColor: string;          // CSS hex, default '#000000'
    shadowOpacity: number;        // 0–1, default 0.6
    shape: 'rect' | 'circle' | 'rounded'; // default 'rect'
    cornerRadius: number;         // px for rounded shape, default 12
    fillMode: 'none' | 'color';
    fillColor: string;            // CSS hex e.g. '#1A1A2E'
    padding: number;              // px — positive expands frame beyond parent bounds
    linked?: boolean;             // true (default) = auto-sync to parent bounds; false = independent
  };

  // Universal drop shadow (canvas preview + ZPK PNG baking for simple elements)
  dropShadow?: {
    color: string;      // CSS hex e.g. '#000000'
    opacity: number;    // 0–1
    blur: number;       // px 0–40
    offsetX: number;    // px -30 to +30
    offsetY: number;    // px -30 to +30
  };
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
  /** Optional AOD-specific editor/export layout, independent from main elements. */
  aodElements?: WatchFaceElement[] | null;
  /** AOD background strategy selector. */
  aodBackgroundMode?: 'USE_MAIN_BACKGROUND' | 'UPLOAD_AOD_BACKGROUND' | 'SOLID_COLOR' | 'NONE_BLACK';
  /** Asset filename used when AOD background mode is upload/solid. */
  aodBackgroundSrc?: string | null;
  /** Hex color used when AOD background mode is solid color. */
  aodSolidColor?: string | null;
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

// ── Pointer parity types (031) ──────────────────────────────────────────────
export type PointerParityStage = 'composer-preview' | 'adjustment-preview' | 'baked-export';

export interface PointerParityMismatch {
  leftStage: PointerParityStage;
  rightStage: PointerParityStage;
  mismatchRatio: number; // 0..1
  maxChannelDelta: number; // 0..255
  reason?: string;
}

export interface PointerParityResult {
  pass: boolean;
  tolerance: number;
  mismatches: PointerParityMismatch[];
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
  githubRepo: string;
  undoStack: WatchFaceElement[][];
  redoStack: WatchFaceElement[][];
}
