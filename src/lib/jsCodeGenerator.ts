// JavaScript Code Generator for ZeppOS Watch Faces
// Supports both V2 (legacy/Balance 2) and V3 (newer models) formats
// Routes based on device model selection

import type { WatchFaceConfig, WatchFaceElement, GeneratedCode } from '@/types';
import { generateWatchFaceCodeV2 } from './jsCodeGeneratorV2';
import { FONT_STYLES } from '@/lib/fontLibrary';

/** Compute shadow-bake padding (mirrors V2 helper). */
function _shadowPad(ds: NonNullable<WatchFaceElement['dropShadow']>): number {
  return ds.blur + Math.max(Math.abs(ds.offsetX), Math.abs(ds.offsetY)) + 4;
}

function _shadowImgWidgetV3(element: WatchFaceElement, label: string): string {
  const ds = element.dropShadow!;
  const pad = _shadowPad(ds);
  const safeName = element.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `shadow_${safeName}.png`;
  const x = element.bounds.x - pad;
  const y = element.bounds.y - pad;
  const w = (element.bounds.width || 50) + pad * 2;
  const h = (element.bounds.height || 50) + pad * 2;
  return `
                // ${element.name} - ${label} (shadow-baked IMG)
                hmUI.createWidget(hmUI.widget.IMG, {
                    x: px(${x}),
                    y: px(${y}),
                    w: px(${w}),
                    h: px(${h}),
                    src: 'assets/${filename}',
                    show_level: hmUI.show_level.ONLY_NORMAL
                });`;
}

// Device models using V2 format (Balance 2, Balance, Active Max, etc.)
const V2_DEVICE_MODELS = [
  'Balance 2',
  'Balance',
  'Active Max',
  'Active 3 Premium',
];

// Device models using V3 format (GTR 4, GTS 4, newer Zepp OS models)
const V3_DEVICE_MODELS = [
  'GTR 4',
  'GTS 4',
  'Active 2 Round',
  'Active 2 Square',
  'Active',
];

export function generateWatchFaceCode(config: WatchFaceConfig): GeneratedCode {
  console.log('[JSGen] Starting code generation for:', config.name, 'Model:', config.watchModel);
  
  // Route to appropriate generator based on device model
  if (V2_DEVICE_MODELS.includes(config.watchModel)) {
    console.log('[JSGen] Using V2 generator (legacy format) for model:', config.watchModel);
    return generateWatchFaceCodeV2(config);
  } else if (V3_DEVICE_MODELS.includes(config.watchModel)) {
    console.log('[JSGen] Using V3 generator (modern format) for model:', config.watchModel);
    return generateWatchFaceCodeV3(config);
  } else {
    console.log('[JSGen] Unknown model, defaulting to V2 for safety:', config.watchModel);
    return generateWatchFaceCodeV2(config);
  }
}

// V3 Generator (for newer devices)
function generateWatchFaceCodeV3(config: WatchFaceConfig): GeneratedCode {
  console.log('[JSGenV3] Starting v3 code generation for:', config.name);
  try {
    const appJson = generateAppJson(config);
    console.log('[JSGenV3] app.json generated, length:', appJson.length);
    
    const appJs = generateAppJs(config);
    console.log('[JSGenV3] app.js generated, length:', appJs.length);
    
    const watchfaceIndexJs = generateWatchfaceIndexJs(config);
    console.log('[JSGenV3] watchface/index.js generated, length:', watchfaceIndexJs.length);
    
    return { appJson, appJs, watchfaceIndexJs };
  } catch (error) {
    console.error('[JSGenV3] Error generating code:', error);
    throw error;
  }
}

// Generate app.json - Matching working ZPK structure exactly (v3 with proper targets structure)
function generateAppJson(config: WatchFaceConfig): string {
  const appId = generateAppId();
  
  // Get device source for the watch model
  const deviceSources = getDeviceSources(config.watchModel);
  
  // Increment version code based on timestamp (ensures each build has higher code)
  const versionCode = Math.floor(Date.now() / 1000);
  
  const json = {
    configVersion: 'v3',
    app: {
      appIdType: 0,
      appId: appId,
      appName: config.name,
      appType: 'watchface',
      version: {
        code: versionCode,
        name: '1.0.0',
      },
      vender: 'AI-WatchFace-Creator',
      description: `Custom watch face - ${config.name}`,
      icon: 'icon.png',
      cover: ['icon.png'],
    },
    permissions: [],
    runtime: {
      apiVersion: {
        compatible: '1.0.0',
        target: '1.0.1',
        minVersion: '1.0.0',
      },
    },
    i18n: {
      'en-US': {
        icon: 'icon.png',
        appName: config.name,
      },
    },
    defaultLanguage: 'en-US',
    debug: false,
    targets: {
      default: {
        module: {
          watchface: {
            path: 'watchface/index.js',
            main: 1,
            editable: 0,
            lockscreen: 0,
            hightCost: 0,
          },
        },
        platforms: deviceSources.map((source) => ({
          name: config.watchModel,
          deviceSource: source,
        })),
        designWidth: config.resolution.width,
      },
    },
    packageInfo: {
      mode: 'production',
      timeStamp: Math.floor(Date.now() / 1000),
      expiredTime: 172800,
      zpm: '2.8.2',
    },
  };

  return JSON.stringify(json, null, 2);
}

// Get device sources for different watch models
function getDeviceSources(watchModel: string): number[] {
  const sources: Record<string, number[]> = {
    'Balance 2': [8519936, 8519937, 8519939],
    'Balance': [8519936, 8519937, 8519939],
    'Active Max': [8519936, 8519937, 8519939],
    'Active 3 Premium': [8388608, 8388609],
    'Active 2 Round': [8388608, 8388609],
    'Active 2 Square': [8388610, 8388611],
    'Active': [8388608, 8388609],
    'Pop 3S (PIB)': [8388608, 8388609],
    'GTR4': [8388608, 8388609],
    'GTS4': [8388610, 8388611],
    'Cheetah Pro': [8388608, 8388609],
    'T-Rex 2': [8388608, 8388609],
    'Falcon': [8388608, 8388609],
  };
  
  return sources[watchModel] || [8519936, 8519937, 8519939];
}

// Generate app.js - Matching working ZPK structure (comes from Brushed_Steel_Petroleum)
function generateAppJs(config: WatchFaceConfig): string {
  return `try {
    (() => {
        const __$$app$$__ = __$$hmAppManager$$__.currentApp;
        function getApp() {
            return __$$app$$__.app;
        }
        function getCurrentPage() {
            return __$$app$$__.current && __$$app$$__.current.module;
        }
        __$$app$$__.__globals__ = {
            lang: new DeviceRuntimeCore.HmUtils.Lang(DeviceRuntimeCore.HmUtils.getLanguage()),
            px: DeviceRuntimeCore.HmUtils.getPx(${config.resolution.width})
        };
        const {px} = __$$app$$__.__globals__;
        const languageTable = {};
        __$$app$$__.__globals__.gettext = DeviceRuntimeCore.HmUtils.gettextFactory(languageTable, __$$app$$__.__globals__.lang, 'en-US');
        function getGlobal() {
            if (typeof self !== 'undefined') {
                return self;
            }
            if (typeof window !== 'undefined') {
                return window;
            }
            if (typeof global !== 'undefined') {
                return global;
            }
            if (typeof globalThis !== 'undefined') {
                return globalThis;
            }
            throw new Error('unable to locate global object');
        }
        let globalNS$2 = getGlobal();
        if (!globalNS$2.Logger) {
            if (typeof DeviceRuntimeCore !== 'undefined') {
                globalNS$2.Logger = DeviceRuntimeCore.HmLogger;
            }
        }
        let globalNS$1 = getGlobal();
        if (!globalNS$1.Buffer) {
            if (typeof Buffer !== 'undefined') {
                globalNS$1.Buffer = Buffer;
            } else {
                globalNS$1.Buffer = DeviceRuntimeCore.Buffer;
            }
        }
        function isHmTimerDefined() {
            return typeof timer !== 'undefined';
        }
        let globalNS = getGlobal();
        if (typeof setTimeout === 'undefined' && isHmTimerDefined()) {
            globalNS.setTimeout = timer.setTimeout;
        }
        if (typeof setInterval === 'undefined' && isHmTimerDefined()) {
            globalNS.setInterval = timer.setInterval;
        }
        if (typeof clearTimeout === 'undefined' && isHmTimerDefined()) {
            globalNS.clearTimeout = timer.clearTimeout;
        }
        if (typeof clearInterval === 'undefined' && isHmTimerDefined()) {
            globalNS.clearInterval = timer.clearInterval;
        }
        let __$$module$$__ = __$$app$$__.current;
    })();
} catch (e) {
    console.log(e);
}`;
}

// Generate watchface/index.js - Matching working ZPK structure with proper lifecycle
function generateWatchfaceIndexJs(config: WatchFaceConfig): string {
  const elements = config.elements.filter((el) => el.visible);
  
  let widgetsCode = '';
  
  for (const element of elements) {
    const code = generateWidgetCode(element);
    widgetsCode += code;
    console.log('[JSGen] Widget code for', element.name, ':\n', code);
  }
  
  const finalCode = `// Zepp OS Watchface generated by AI WatchFace Creator
// Fixed structure: v3 manifest, complete TIME_POINTER, proper data binding, AOD support
try {
    (() => {
        const __$$app$$__ = __$$hmAppManager$$__.currentApp;
        function getApp() {
            return __$$app$$__.app;
        }
        function getCurrentPage() {
            return __$$app$$__.current && __$$app$$__.current.module;
        }
        const __$$module$$__ = __$$app$$__.current;
        const h = new DeviceRuntimeCore.WidgetFactory(new DeviceRuntimeCore.HmDomApi(__$$app$$__, __$$module$$__));
        const {px} = __$$app$$__.__globals__;
        const logger = Logger.getLogger('WatchFaceEditor');

        __$$module$$__.module = DeviceRuntimeCore.WatchFace({
            init_view() {
                // Background image - Fill entire screen with proper asset path
                hmUI.createWidget(hmUI.widget.IMG, {
                    x: px(0),
                    y: px(0),
                    w: px(${config.resolution.width}),
                    h: px(${config.resolution.height}),
                    src: 'background.png',
                    alpha: 255,
                    show_level: hmUI.show_level.ONLY_NORMAL
                });
                
                // Widgets
${widgetsCode}
                
                // Widget delegate for lifecycle management
                const widgetDelegate = hmUI.createWidget(hmUI.widget.WIDGET_DELEGATE, {
                    resume_call() {
                        logger.log('watchface resumed');
                    },
                    pause_call() {
                        logger.log('watchface paused');
                    }
                });
            },
            onInit() {
                logger.log('Watchface initialized');
            },
            build() {
                this.init_view();
                logger.log('Watchface built and displayed');
            },
            onDestroy() {
                logger.log('Watchface destroyed, cleaning up');
            }
        });
    })();
} catch (e) {
    console.log('Watchface Error', e);
    e && e.stack && e.stack.split(/\\n/).forEach(i => console.log('error stack', i));
}`;
  
  console.log('[JSGen] Complete watchface/index.js:\n', finalCode);
  return finalCode;
}

// Generate widget code for each element (V3)
function generateWidgetCode(element: WatchFaceElement): string {
  // Skip minute/second hands - they're combined with hour hand in TIME_POINTER
  if (element.type === 'TIME_POINTER' && element.subtype && element.subtype !== 'hour') {
    return '';
  }

  // Skip background element - already handled
  if (element.name === 'Background' || (element.type === 'IMG' && element.bounds.x === 0 && element.bounds.y === 0 && element.bounds.width >= 390 && element.bounds.height >= 390)) {
    return '';
  }

  switch (element.type) {
    case 'TIME_POINTER':
      return generateTimePointerWidgetV3(element);
    case 'ARC_PROGRESS':
      return generateArcProgressWidgetV3(element);
    case 'TEXT_IMG':
      return generateTextImgWidgetV3(element);
    case 'TEXT':
      return generateTextWidgetV3(element);
    case 'BUTTON':
      return generateButtonWidgetV3(element);
    case 'IMG_STATUS':
      return generateImgStatusWidgetV3(element);
    case 'CIRCLE':
      if (element.dropShadow) return _shadowImgWidgetV3(element, 'Circle');
      return generateCircleWidgetV3(element);
    case 'IMG_LEVEL':
      return generateImgLevelWidgetV3(element);
    case 'FILL_RECT': {
      if (element.engraveFrame) {
        const safeName = element.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `frame_${safeName}.png`;
        return `
                // ${element.name} - Engrave Frame (pre-rendered IMG)
                hmUI.createWidget(hmUI.widget.IMG, {
                    x: px(${element.bounds.x}),
                    y: px(${element.bounds.y}),
                    w: px(${element.bounds.width}),
                    h: px(${element.bounds.height}),
                    src: 'assets/${filename}',
                    show_level: hmUI.show_level.ONLY_NORMAL
                });`;
      }
      if (element.dropShadow) return _shadowImgWidgetV3(element, 'Fill Rect');
      return generateFillRectWidgetV3(element);
    }
    case 'STROKE_RECT':
      if (element.dropShadow) return _shadowImgWidgetV3(element, 'Stroke Rect');
      return generateStrokeRectWidgetV3(element);
    case 'IMG_ANIM':
      return generateImgAnimWidgetV3(element);
    case 'IMG_PROGRESS':
      return generateImgProgressWidgetV3(element);
    case 'DATE_POINTER':
      return generateDatePointerWidgetV3(element);
    case 'IMG_CLICK':
      return generateImgClickWidgetV3(element);
    case 'IMG':
    default:
      break;
  }

  // Handle IMG elements (static images / icons)
  if (element.type === 'IMG' || !element.type) {
    if (element.dropShadow) return _shadowImgWidgetV3(element, 'IMG');

    const w = element.bounds.width || 50;
    const h = element.bounds.height || 50;
    const imgSrc = element.iconKey
      ? `icon_${element.iconKey.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`
      : (element.src || 'placeholder.png');
    return `
                // ${element.name}
                hmUI.createWidget(hmUI.widget.IMG, {
                    x: px(${element.bounds.x}),
                    y: px(${element.bounds.y}),
                    w: px(${w}),
                    h: px(${h}),
                    src: '${imgSrc}',
                    alpha: 255,
                    show_level: hmUI.show_level.ONLY_NORMAL
                });`;
  }

  return '';
}

// TIME_POINTER - Analog clock hands (hour/minute/second in ONE widget)
function generateTimePointerWidgetV3(element: WatchFaceElement): string {
  const centerX = element.center?.x ?? 240;
  const centerY = element.center?.y ?? 240;
  const hourPosX = element.hourPos?.x ?? 11;
  const hourPosY = element.hourPos?.y ?? 118;  // pivot at 85% of 140px hand height
  const minutePosX = element.minutePos?.x ?? 8;
  const minutePosY = element.minutePos?.y ?? 172; // pivot at 86% of 200px hand height
  const secondPosX = element.secondPos?.x ?? 4;
  const secondPosY = element.secondPos?.y ?? 180; // pivot at 75% of 240px hand height
  const hourSrc = element.hourHandSrc || 'hour_hand.png';
  const minuteSrc = element.minuteHandSrc || 'minute_hand.png';
  const secondSrc = element.secondHandSrc || 'second_hand.png';
  const coverSrc = element.coverSrc;
  const hasSeconds = !element.hideSeconds;

  let coverParams = '';
  if (coverSrc) {
    coverParams = `
                    hour_cover_path: '${coverSrc}',
                    hour_cover_x: px(${centerX - 15}),
                    hour_cover_y: px(${centerY - 15}),`;
  }

  const secondParams = hasSeconds ? `
                    second_centerX: px(${centerX}),
                    second_centerY: px(${centerY}),
                    second_posX: px(${secondPosX}),
                    second_posY: px(${secondPosY}),
                    second_path: '${secondSrc}',` : '';

  return `
                // ${element.name} - TIME_POINTER Widget (Analog Clock)
                hmUI.createWidget(hmUI.widget.TIME_POINTER, {
                    hour_centerX: px(${centerX}),
                    hour_centerY: px(${centerY}),
                    hour_posX: px(${hourPosX}),
                    hour_posY: px(${hourPosY}),
                    hour_path: '${hourSrc}',${coverParams}
                    minute_centerX: px(${centerX}),
                    minute_centerY: px(${centerY}),
                    minute_posX: px(${minutePosX}),
                    minute_posY: px(${minutePosY}),
                    minute_path: '${minuteSrc}',${secondParams}
                    show_level: hmUI.show_level.ONLY_NORMAL
                });`;
}

// ARC_PROGRESS - Arc progress indicator (battery, steps, etc.)
function generateArcProgressWidgetV3(element: WatchFaceElement): string {
  const centerX = element.center?.x ?? (element.bounds.x + (element.bounds.width || 100) / 2);
  const centerY = element.center?.y ?? (element.bounds.y + (element.bounds.height || 100) / 2);
  const radius = element.radius ?? Math.min(element.bounds.width || 100, element.bounds.height || 100) / 2;
  const startAngle = element.startAngle ?? -90;
  const endAngle = element.endAngle ?? 270;
  const lineWidth = element.lineWidth ?? 8;
  const color = element.color ?? '0x00FF00';
  const colorValue = color.startsWith('0x') ? color : `0x${color.replace('#', '')}`;
  const typeParam = element.dataType
    ? `\n                    type: hmUI.data_type.${element.dataType},`
    : '';

  return `
                // ${element.name} - ARC_PROGRESS Widget
                hmUI.createWidget(hmUI.widget.ARC_PROGRESS, {
                    center_x: px(${centerX}),
                    center_y: px(${centerY}),
                    radius: px(${radius}),
                    start_angle: ${startAngle},
                    end_angle: ${endAngle},
                    color: ${colorValue},
                    line_width: px(${lineWidth}),${typeParam}
                    show_level: hmUI.show_level.ONLY_NORMAL
                });`;
}

// TEXT_IMG - Number display using image font arrays
function generateTextImgWidgetV3(element: WatchFaceElement): string {
  const fontImages = element.fontArray || element.images || [];
  let fontArrayStr: string;

  if (fontImages.length > 0) {
    fontArrayStr = `[${fontImages.map(f => `'${f}'`).join(', ')}]`;
  } else {
    const DATA_TYPE_PREFIXES: Record<string, string> = {
      BATTERY: 'batt_digit', STEP: 'step_digit', HEART: 'heart_digit',
      SPO2: 'spo2_digit', CAL: 'cal_digit', DISTANCE: 'dist_digit',
      STRESS: 'stress_digit', PAI: 'pai_digit', PAI_WEEKLY: 'pai_digit',
      SLEEP: 'sleep_digit', STAND: 'stand_digit', FAT_BURN: 'fatburn_digit',
      UVI: 'uvi_digit', AQI: 'aqi_digit', HUMIDITY: 'humid_digit',
      WIND: 'wind_digit', ALTIMETER: 'alt_digit', VO2MAX: 'vo2_digit',
      TRAINING_LOAD: 'training_digit', WEATHER: 'weather_digit',
      SUN_RISE: 'sunrise_digit', SUN_SET: 'sunset_digit',
    };
    const prefix = (element.dataType && DATA_TYPE_PREFIXES[element.dataType])
      ? DATA_TYPE_PREFIXES[element.dataType]
      : element.name.toLowerCase().replace(/\s+/g, '_');
    const arr = [];
    for (let i = 0; i < 10; i++) {
      arr.push(`'${prefix}_${i}.png'`);
    }
    fontArrayStr = `[${arr.join(', ')}]`;
  }

  const typeParam = element.dataType
    ? `\n                    type: hmUI.data_type.${element.dataType},`
    : '';
  const hSpace = element.hSpace ?? 1;
  const alignH = element.alignH ?? 'LEFT';

  return `
                // ${element.name} - TEXT_IMG Widget
                hmUI.createWidget(hmUI.widget.TEXT_IMG, {
                    x: px(${element.bounds.x}),
                    y: px(${element.bounds.y}),
                    w: px(${element.bounds.width || 100}),
                    h: px(${element.bounds.height || 40}),
                    font_array: ${fontArrayStr},${typeParam}
                    h_space: ${hSpace},
                    align_h: hmUI.align.${alignH},
                    show_level: hmUI.show_level.ONLY_NORMAL
                });`;
}

// TEXT - Text display with curvedText → IMG and font embedding support
function generateTextWidgetV3(element: WatchFaceElement): string {
  // Curved text: emit pre-rendered PNG as IMG widget
  if (element.curvedText) {
    const radius = element.curvedText.radius;
    const fs = element.fontSize ?? 16;
    const size = (radius + fs) * 2 + 20;
    const cx = element.bounds.x + Math.floor(element.bounds.width / 2);
    const cy = element.bounds.y + Math.floor(element.bounds.height / 2);
    const imgX = Math.round(cx - size / 2);
    const imgY = Math.round(cy - size / 2);
    return `
                // ${element.name} - Arch Text (pre-rendered PNG)
                hmUI.createWidget(hmUI.widget.IMG, {
                    x: px(${imgX}),
                    y: px(${imgY}),
                    w: px(${size}),
                    h: px(${size}),
                    src: 'curved_text_${element.id}.png',
                    show_level: hmUI.show_level.ONLY_NORMAL
                });`;
  }

  const textSize = element.fontSize ?? 20;
  const colorHex = element.color ?? '0xFFFFFFFF';
  const colorValue = colorHex.startsWith('0x') ? colorHex : `0x${colorHex.replace('#', '')}`;
  const textContent = element.text ?? '';
  const charSpace = element.charSpace ?? 0;
  const lineSpace = element.lineSpace ?? 0;

  // Check if selected font is embeddable
  const fontEntry = element.fontStyle ? FONT_STYLES.find(f => f.key === element.fontStyle) : undefined;
  const fontLine = (fontEntry?.embeddable && fontEntry.fontFile)
    ? `\n                    font: 'fonts/${fontEntry.fontFile}',`
    : '';

  return `
                // ${element.name} - TEXT Widget
                hmUI.createWidget(hmUI.widget.TEXT, {
                    x: px(${element.bounds.x}),
                    y: px(${element.bounds.y}),
                    w: px(${element.bounds.width || 100}),
                    h: px(${element.bounds.height || 40}),
                    text_size: px(${textSize}),
                    char_space: ${charSpace},
                    color: ${colorValue},
                    line_space: ${lineSpace},
                    align_v: hmUI.align.CENTER_V,
                    text_style: hmUI.text_style.ELLIPSIS,
                    align_h: hmUI.align.CENTER_H,
                    text: '${textContent}',${fontLine}
                    show_level: hmUI.show_level.ONLY_NORMAL
                });`;
}

// BUTTON - Clickable shortcut button
function generateButtonWidgetV3(element: WatchFaceElement): string {
  const normalSrc = element.normalSrc || element.src || 'trasparente.png';
  const pressSrc = element.pressSrc || normalSrc;
  const clickAction = element.clickAction || '';
  const clickFunc = clickAction
    ? `() => { hmApp.startApp({ url: '${clickAction}', native: true }) }`
    : `() => {}`;

  return `
                // ${element.name} - BUTTON Widget
                hmUI.createWidget(hmUI.widget.BUTTON, {
                    x: px(${element.bounds.x}),
                    y: px(${element.bounds.y}),
                    w: px(${element.bounds.width || 100}),
                    h: px(${element.bounds.height || 35}),
                    text: '',
                    press_src: '${pressSrc}',
                    normal_src: '${normalSrc}',
                    click_func: ${clickFunc},
                    show_level: hmUI.show_level.ONLY_NORMAL
                });`;
}

const STATUS_DEFAULT_SRC_V3: Record<string, string> = {
  DISCONNECT: 'bluetooth_30x30.png',
  CLOCK:      'alarm_30x30.png',
  DISTURB:    'dnd_30x30.png',
  LOCK:       'lock_30x30.png',
};

// IMG_STATUS - System status indicators (bluetooth, DND, lock)
function generateImgStatusWidgetV3(element: WatchFaceElement): string {
  const statusType = element.statusType || 'DISCONNECT';
  const defaultSrc = STATUS_DEFAULT_SRC_V3[statusType] ?? 'bluetooth_30x30.png';
  const src = element.iconKey
    ? `icon_${element.iconKey.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`
    : (element.src || defaultSrc);

  return `
                // ${element.name} - IMG_STATUS Widget
                hmUI.createWidget(hmUI.widget.IMG_STATUS, {
                    x: px(${element.bounds.x}),
                    y: px(${element.bounds.y}),
                    src: '${src}',
                    type: hmUI.system_status.${statusType},
                    show_level: hmUI.show_level.ONLY_NORMAL
                });`;
}

// CIRCLE - Filled/stroked circle
function generateCircleWidgetV3(element: WatchFaceElement): string {
  const centerX = element.center?.x ?? (element.bounds.x + (element.bounds.width || 50) / 2);
  const centerY = element.center?.y ?? (element.bounds.y + (element.bounds.height || 50) / 2);
  const radius = element.radius ?? Math.min(element.bounds.width || 50, element.bounds.height || 50) / 2;
  const colorHex = element.color ?? '0xFFFFFF';
  const colorValue = colorHex.startsWith('0x') ? colorHex : `0x${colorHex.replace('#', '')}`;
  const alphaLine = element.alpha !== undefined ? `\n                    alpha: ${element.alpha},` : '';

  return `
                // ${element.name} - CIRCLE Widget
                hmUI.createWidget(hmUI.widget.CIRCLE, {
                    center_x: px(${centerX}),
                    center_y: px(${centerY}),
                    radius: px(${radius}),
                    color: ${colorValue},${alphaLine}
                    show_level: hmUI.show_level.ONLY_NORMAL
                });`;
}

// IMG_LEVEL - Level-based image display (weather icons, etc.)
function generateImgLevelWidgetV3(element: WatchFaceElement): string {
  const images = element.images || (element.src ? [element.src] : []);
  const imageArrayStr = `[${images.map(img => `"${img}"`).join(', ')}]`;
  const typeParam = element.dataType
    ? `\n                    type: hmUI.data_type.${element.dataType},`
    : '';

  return `
                // ${element.name} - IMG_LEVEL Widget
                hmUI.createWidget(hmUI.widget.IMG_LEVEL, {
                    x: px(${element.bounds.x}),
                    y: px(${element.bounds.y}),
                    image_array: ${imageArrayStr},
                    image_length: ${images.length},${typeParam}
                    show_level: hmUI.show_level.ONLY_NORMAL
                });`;
}

// FILL_RECT - Solid filled rectangle
function generateFillRectWidgetV3(element: WatchFaceElement): string {
  const colorHex = element.color ?? '0x333333';
  const colorValue = colorHex.startsWith('0x') ? colorHex : `0x${colorHex.replace('#', '')}`;
  const alphaLine = element.alpha !== undefined ? `\n                    alpha: ${element.alpha},` : '';
  return `
                // ${element.name} - FILL_RECT Widget
                hmUI.createWidget(hmUI.widget.FILL_RECT, {
                    x: px(${element.bounds.x}),
                    y: px(${element.bounds.y}),
                    w: px(${element.bounds.width || 100}),
                    h: px(${element.bounds.height || 10}),
                    color: ${colorValue},${alphaLine}
                    show_level: hmUI.show_level.ONLY_NORMAL
                });`;
}

// STROKE_RECT - Outlined rectangle
function generateStrokeRectWidgetV3(element: WatchFaceElement): string {
  const colorHex = element.color ?? '0xFFFFFF';
  const colorValue = colorHex.startsWith('0x') ? colorHex : `0x${colorHex.replace('#', '')}`;
  const lineWidth = element.lineWidth ?? 2;
  return `
                // ${element.name} - STROKE_RECT Widget
                hmUI.createWidget(hmUI.widget.STROKE_RECT, {
                    x: px(${element.bounds.x}),
                    y: px(${element.bounds.y}),
                    w: px(${element.bounds.width || 100}),
                    h: px(${element.bounds.height || 10}),
                    color: ${colorValue},
                    line_width: px(${lineWidth}),
                    show_level: hmUI.show_level.ONLY_NORMAL
                });`;
}

// IMG_ANIM - Animated image sequence
function generateImgAnimWidgetV3(element: WatchFaceElement): string {
  const animPath = element.animPath || 'anim/default';
  const animFps = element.animFps ?? 25;
  const repeatCount = element.repeatCount ?? 0;
  return `
                // ${element.name} - IMG_ANIM Widget
                hmUI.createWidget(hmUI.widget.IMG_ANIM, {
                    x: px(${element.bounds.x}),
                    y: px(${element.bounds.y}),
                    w: px(${element.bounds.width || 100}),
                    h: px(${element.bounds.height || 100}),
                    anim_path: '${animPath}',
                    anim_fps: ${animFps},
                    repeat_count: ${repeatCount},
                    anim_status: hmUI.anim_status.START,
                    show_level: hmUI.show_level.ONLY_NORMAL
                });`;
}

// IMG_PROGRESS - Sequential image array progress
function generateImgProgressWidgetV3(element: WatchFaceElement): string {
  const images = element.images || (element.src ? [element.src] : []);
  const imageArrayStr = `[${images.map(img => `'${img}'`).join(', ')}]`;
  const xArr = images.map((_, i) => element.bounds.x + i * (element.bounds.width || 20));
  const yArr = images.map(() => element.bounds.y);
  const xArrayStr = `[${xArr.map(v => `px(${v})`).join(', ')}]`;
  const yArrayStr = `[${yArr.map(v => `px(${v})`).join(', ')}]`;
  const typeParam = element.dataType ? `\n                    type: hmUI.data_type.${element.dataType},` : '';
  return `
                // ${element.name} - IMG_PROGRESS Widget
                hmUI.createWidget(hmUI.widget.IMG_PROGRESS, {
                    image_array: ${imageArrayStr},
                    image_length: ${images.length},
                    x_array: ${xArrayStr},
                    y_array: ${yArrayStr},${typeParam}
                    show_level: hmUI.show_level.ONLY_NORMAL
                });`;
}

// DATE_POINTER - Analog pointer driven by date values
function generateDatePointerWidgetV3(element: WatchFaceElement): string {
  const dateType = element.dateType ?? 'DAY';
  const centerX = element.center?.x ?? 240;
  const centerY = element.center?.y ?? 240;
  const posX = element.hourPos?.x ?? 10;
  const posY = element.hourPos?.y ?? 60;
  const src = element.src || 'date_hand.png';
  return `
                // ${element.name} - DATE_POINTER Widget (${dateType})
                hmUI.createWidget(hmUI.widget.DATE_POINTER, {
                    date_type: hmUI.date.${dateType},
                    center_x: px(${centerX}),
                    center_y: px(${centerY}),
                    posX: px(${posX}),
                    posY: px(${posY}),
                    path: '${src}',
                    show_level: hmUI.show_level.ONLY_NORMAL
                });`;
}

// IMG_CLICK - Interactive image area
function generateImgClickWidgetV3(element: WatchFaceElement): string {
  const src = element.src || 'moon_icon.png';
  const typeParam = element.dataType ? `\n                    type: hmUI.data_type.${element.dataType},` : '';
  return `
                // ${element.name} - IMG_CLICK Widget
                hmUI.createWidget(hmUI.widget.IMG_CLICK, {
                    x: px(${element.bounds.x}),
                    y: px(${element.bounds.y}),
                    w: px(${element.bounds.width || 50}),
                    h: px(${element.bounds.height || 50}),
                    src: '${src}',${typeParam}
                    show_level: hmUI.show_level.ONLY_NORMAL
                });`;
}

// Generate unique app ID
function generateAppId(): number {
  return Math.floor(1000000 + Math.random() * 9000000);
}
