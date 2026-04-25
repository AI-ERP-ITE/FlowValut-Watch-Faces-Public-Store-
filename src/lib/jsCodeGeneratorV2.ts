// V2 Code Generator for ZeppOS Watch Faces (Balance 2 & Legacy Devices)
// Generates v2 manifest structure with flat organization
// Compatible with Amazfit Balance 2, Balance, Active Max (older Zepp OS)

import type { WatchFaceConfig, WatchFaceElement, GeneratedCode } from '@/types';
import { FONT_STYLES } from '@/lib/fontLibrary';
import { gaugePointerAssetName, normalizeGaugePivot } from '@/lib/gaugePointerDefaults';

/** Compute extra canvas padding required to contain a drop shadow (mirrors StudioApp helper). */
function _shadowPad(ds: NonNullable<WatchFaceElement['dropShadow']>): number {
  return ds.blur + Math.max(Math.abs(ds.offsetX), Math.abs(ds.offsetY)) + 4;
}

/** Emit an IMG widget that references a pre-baked shadow PNG with padded bounds. */
function _shadowImgWidget(
  element: WatchFaceElement,
  widgetIndex: number,
  showLevel: string,
  label: string,
): string {
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
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.IMG, {
                    x: px(${x}),
                    y: px(${y}),
                    w: px(${w}),
                    h: px(${h}),
                  src: '${filename}',
                    show_level: hmUI.show_level.${showLevel}
                });`;
}

export function generateWatchFaceCodeV2(config: WatchFaceConfig): GeneratedCode {
  console.log('[JSGenV2] Starting v2 code generation for:', config.name);
  try {
    const appJson = generateAppJsonV2(config);
    console.log('[JSGenV2] app.json v2 generated, length:', appJson.length);
    
    const appJs = generateAppJsV2(config);
    console.log('[JSGenV2] app.js v2 generated, length:', appJs.length);
    
    const watchfaceIndexJs = generateWatchfaceIndexJsV2(config);
    console.log('[JSGenV2] watchface/index.js v2 generated, length:', watchfaceIndexJs.length);
    
    return { appJson, appJs, watchfaceIndexJs };
  } catch (error) {
    console.error('[JSGenV2] Error generating code:', error);
    throw error;
  }
}

// Generate app.json - V2 format (EXACTLY matching reference structure)
function generateAppJsonV2(config: WatchFaceConfig): string {
  const appId = generateAppId();
  const deviceSources = getDeviceSourcesV2(config.watchModel);
  const versionCode = Math.floor(Date.now() / 1000);
  
  // Build JSON as plain object with exact structure from reference
  const json: any = {
    configVersion: 'v2',
    app: {
      appIdType: 0,
      appId: appId,
      appName: config.name,
      appType: 'watchface',
      version: {
        code: versionCode,
        name: '1.0.1',
      },
      vender: 'zepp',
      description: '',
      icon: 'anteprima.png',
      cover: ['anteprima.png'],
      extraInfo: {
        madeBy: 1,
        fromZoom: false,
      },
    },
    permissions: ['gps'],
    runtime: {
      apiVersion: {
        compatible: '1.0.0',
        target: '1.0.1',
        minVersion: '1.0.0',
      },
    },
    i18n: {
      enUS: {
        icon: 'anteprima.png',
        appName: config.name,
      },
    },
    defaultLanguage: 'en-US',
    debug: false,
    module: {
      watchface: {
        path: 'watchface/index',
        main: 1,
        editable: 0,
        lockscreen: 1,
        hightCost: 0,
      },
    },
    platforms: deviceSources.map((source) => ({
      name: 'Amazfit Balance',  // EXACT name from reference
      deviceSource: source,
    })),
    designWidth: config.resolution.width,
    packageInfo: {
      mode: 'production',
      timeStamp: versionCode,
      expiredTime: 172800,
      zpm: '2.8.2',
    },
  };

  return JSON.stringify(json, null, 2);
}

// Get device sources for v2 (Balance 2 & related models)
function getDeviceSourcesV2(watchModel: string): number[] {
  const sources: Record<string, number[]> = {
    'Balance 2': [8519936, 8519937, 8519939],
    'Balance': [8519936, 8519937, 8519939],
    'Active Max': [8519936, 8519937, 8519939],
  };
  
  return sources[watchModel] || [8519936, 8519937, 8519939];
}

// Generate app.js - V2 format (EXACT copy of working reference app.js)
function generateAppJsV2(config: WatchFaceConfig): string {
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
            globalNS.clearTimeout = function clearTimeout(timerRef) {
                timerRef && timer.stopTimer(timerRef);
            };
            globalNS.setTimeout = function setTimeout2(func, ns) {
                const timer1 = timer.createTimer(ns || 1, Number.MAX_SAFE_INTEGER, function () {
                    globalNS.clearTimeout(timer1);
                    func && func();
                }, {});
                return timer1;
            };
            globalNS.clearImmediate = function clearImmediate(timerRef) {
                timerRef && timer.stopTimer(timerRef);
            };
            globalNS.setImmediate = function setImmediate(func) {
                const timer1 = timer.createTimer(1, Number.MAX_SAFE_INTEGER, function () {
                    globalNS.clearImmediate(timer1);
                    func && func();
                }, {});
                return timer1;
            };
            globalNS.clearInterval = function clearInterval(timerRef) {
                timerRef && timer.stopTimer(timerRef);
            };
            globalNS.setInterval = function setInterval(func, ms) {
                const timer1 = timer.createTimer(1, ms, function () {
                    func && func();
                }, {});
                return timer1;
            };
        }
        __$$app$$__.app = DeviceRuntimeCore.App({
            globalData: {},
            onCreate(options) {
            },
            onDestroy(options) {
            },
            onError(error) {
            },
            onPageNotFound(obj) {
            },
            onUnhandledRejection(obj) {
            }
        });
        ;
    })();
} catch (e) {
    console.log('Mini Program Error', e);
    e && e.stack && e.stack.split(/\\n/).forEach(i => console.log('error stack', i));
    ;
}`;
}

// Generate watchface/index.js - V2 format with IMG_TIME, IMG_DATE, IMG_WEEK, and AOD mode
function generateWatchfaceIndexJsV2(config: WatchFaceConfig): string {
  const visibleElements = config.elements.filter((el) => el.visible);
  const zById = new Map(visibleElements.map(el => [el.id, el.zIndex]));
  const elements = [...visibleElements].sort((a, b) => {
    const az = a.engraveFrame
      ? (zById.get(a.engraveFrame.frameOf) ?? a.zIndex) + 0.5
      : a.zIndex;
    const bz = b.engraveFrame
      ? (zById.get(b.engraveFrame.frameOf) ?? b.zIndex) + 0.5
      : b.zIndex;
    return az - bz;
  });
  
  console.log('[JSGenV2] Total elements in config:', config.elements.length);
  console.log('[JSGenV2] Visible elements after filter:', elements.length);
  
  const backgroundSrc = 'background.png';
  
  // Generate NORMAL mode widgets
  let normalWidgetsCode = '';
  let normalWidgetCounter = 2;
  // Find time elements by type (supports split hours/minutes or legacy single element)
  const hoursElement = elements.find(e => e.type === 'IMG_TIME' && e.subtype === 'hours')
    ?? elements.find(e => e.type === 'IMG_TIME' && !e.subtype);
  const minutesElement = elements.find(e => e.type === 'IMG_TIME' && e.subtype === 'minutes');
  const secondsElement = elements.find(e => e.type === 'IMG_TIME' && e.subtype === 'seconds');
  const hasTimeWidget = !!(hoursElement || minutesElement || secondsElement);
  const dateElement = elements.find(e => e.type === 'IMG_DATE' && e.subtype !== 'month') 
    ?? elements.find(e => e.name.toLowerCase().includes('date') && !e.name.toLowerCase().includes('month'));
  const monthElement = elements.find(e => e.type === 'IMG_DATE' && e.subtype === 'month')
    ?? elements.find(e => e.name.toLowerCase().includes('month'));
  const weekElement = elements.find(e => e.type === 'IMG_WEEK')
    ?? elements.find(e => e.name.toLowerCase().includes('week'));
  
  // Add IMG_TIME widget if time element exists
  if (hasTimeWidget) {
    normalWidgetsCode += generateIMGTimeWidget(hoursElement, minutesElement, secondsElement, normalWidgetCounter++, 'ONLY_NORMAL');
  }
  
  // Add IMG_DATE widget if date element exists
  if (dateElement) {
    normalWidgetsCode += generateIMGDateWidget(dateElement, normalWidgetCounter++, 'ONLY_NORMAL');
  }

  // Add IMG_DATE (month) widget if month element exists
  if (monthElement) {
    normalWidgetsCode += generateIMGMonthWidget(monthElement, normalWidgetCounter++, 'ONLY_NORMAL');
  }
  
  // Add IMG_WEEK widget if week element exists
  if (weekElement) {
    normalWidgetsCode += generateIMGWeekWidget(weekElement, normalWidgetCounter++, 'ONLY_NORMAL');
  }
  
  // Add other static elements for NORMAL mode
  for (const element of elements) {
    if (element.type === 'IMG_TIME' || element.type === 'IMG_DATE' || element.type === 'IMG_WEEK') {
      continue; // Skip, already handled above
    }
    if (element.name.toLowerCase().includes('month')) {
      continue; // Skip month, handled above
    }
    const code = generateWidgetCodeV2(element, normalWidgetCounter);
    if (code) {
      normalWidgetsCode += code;
      normalWidgetCounter++;
    }
  }
  
  // Generate AOD mode widgets (complete duplicate for always-on display)
  let aodWidgetsCode = '';
  let aodWidgetCounter = 100;
  
  if (hasTimeWidget) {
    aodWidgetsCode += generateIMGTimeWidget(hoursElement, minutesElement, secondsElement, aodWidgetCounter++, 'ONLY_AOD');
  }
  
  if (dateElement) {
    aodWidgetsCode += generateIMGDateWidget(dateElement, aodWidgetCounter++, 'ONLY_AOD');
  }

  if (monthElement) {
    aodWidgetsCode += generateIMGMonthWidget(monthElement, aodWidgetCounter++, 'ONLY_AOD');
  }
  
  if (weekElement) {
    aodWidgetsCode += generateIMGWeekWidget(weekElement, aodWidgetCounter++, 'ONLY_AOD');
  }
  
  // Add other static elements for AOD mode
  for (const element of elements) {
    if (element.type === 'IMG_TIME' || element.type === 'IMG_DATE' || element.type === 'IMG_WEEK') {
      continue;
    }
    if (element.name.toLowerCase().includes('month')) {
      continue;
    }
    // Skip BUTTON in AOD mode - no touch interaction on AOD screen
    if (element.type === 'BUTTON') {
      continue;
    }
    const code = generateWidgetCodeV2(element, aodWidgetCounter, true);
    if (code) {
      aodWidgetsCode += code;
      aodWidgetCounter++;
    }
  }
  
  const finalCode = `// Zepp OS Watchface generated by AI WatchFace Creator (V2 Format)
// V2 Manifest: Full A OD support with dynamic widgets
// Compatible with Amazfit Balance 2, Balance, Active Max
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
        
        // Sensor for weather and system info
        let weatherSensor = null;

        __$$module$$__.module = DeviceRuntimeCore.WatchFace({
            init_view() {
                // Initialize sensors
                try {
                    weatherSensor = hmSensor.createSensor(hmSensor.id.WEATHER);
                } catch (e) {
                    logger.log('Weather sensor init failed:', e);
                }
                
                // ========== NORMAL MODE BACKGROUND ==========
                let widget_1 = hmUI.createWidget(hmUI.widget.IMG, {
                    x: px(0),
                    y: px(0),
                    w: px(${config.resolution.width}),
                    h: px(${config.resolution.height}),
                    src: '${backgroundSrc}',
                    alpha: 255,
                    show_level: hmUI.show_level.ONLY_NORMAL
                });
                
                // ========== NORMAL MODE WIDGETS ==========
${normalWidgetsCode}
                
                // ========== AOD MODE BACKGROUND ==========
                let widget_aod_bg = hmUI.createWidget(hmUI.widget.IMG, {
                    x: px(0),
                    y: px(0),
                    w: px(${config.resolution.width}),
                    h: px(${config.resolution.height}),
                    src: '${backgroundSrc}',
                    alpha: 255,
                    show_level: hmUI.show_level.ONLY_AOD
                });
                
                // ========== AOD MODE WIDGETS ==========
${aodWidgetsCode}

                // Widget delegate for lifecycle management (matches working reference)
                const widgetDelegate = hmUI.createWidget(hmUI.widget.WIDGET_DELEGATE, {
                    resume_call() {
                        console.log('resume_call()');
                        let tipoSchermo = hmSetting.getScreenType();
                        if (tipoSchermo === hmSetting.screen_type.WATCHFACE) {
                            // NORMAL MODE updates
                        } else if (tipoSchermo === hmSetting.screen_type.AOD) {
                            // AOD MODE updates
                        }
                    },
                    pause_call() {
                        console.log('pause_call()');
                    }
                });
            },
            onInit() {
                logger.log('index page.js on init invoke');
            },
            build() {
                this.init_view();
                logger.log('index page.js on ready invoke');
            },
            onDestroy() {
                logger.log('index page.js on destroy invoke');
            }
        });
        ;
    })();
} catch (e) {
    console.log('Mini Program Error', e);
    e && e.stack && e.stack.split(/\\n/).forEach(i => console.log('error stack', i));
    ;
}`;
  
  return finalCode;
}

// Generate IMG_TIME widget with separate hour, minute and optional second elements
// hoursEl defines hour position/size; minutesEl defines minute position (or derived from hoursEl)
function generateIMGTimeWidget(hoursEl: WatchFaceElement | undefined, minutesEl: WatchFaceElement | undefined, secondsEl: WatchFaceElement | undefined, widgetIndex: number, showLevel: string): string {
  const refEl = hoursEl ?? minutesEl ?? secondsEl;
  if (!refEl) return '';

  // Hour position: from hoursEl, or fallback
  const hx = hoursEl ? hoursEl.bounds.x : (refEl.bounds.x);
  const hy = hoursEl ? hoursEl.bounds.y : (refEl.bounds.y);
  // Digit width derived from hours element (2 digits fill the width)
  const hW = hoursEl ? hoursEl.bounds.width : Math.floor(refEl.bounds.width * 2 / 5);
  const digitW = Math.floor(hW / 2);

  // Minute position: from minutesEl if available, else derive from hoursEl
  const mx = minutesEl ? minutesEl.bounds.x : (hx + hW + Math.max(4, digitW));
  const my = minutesEl ? minutesEl.bounds.y : hy;

  // Second position: from secondsEl if present
  const hasSeconds = !!secondsEl;
  const sx = secondsEl ? secondsEl.bounds.x : 0;
  const sy = secondsEl ? secondsEl.bounds.y : 0;

  // Use time_digit_N.png naming — must match what assetImageGenerator generates
  const digitArray = [];
  for (let i = 0; i < 10; i++) {
    digitArray.push(`'time_digit_${i}.png'`);
  }
  const digitArrayStr = `[${digitArray.join(', ')}]`;
  
  const secondParams = hasSeconds ? `
                    second_zero: 1,
                    second_startX: px(${sx}),
                    second_startY: px(${sy}),
                    second_array: ${digitArrayStr},
                    second_space: 0,
                    second_align: hmUI.align.LEFT,` : '';

  return `
                // IMG_TIME Widget (Hours @ ${hx},${hy} | Minutes @ ${mx},${my}${hasSeconds ? ` | Seconds @ ${sx},${sy}` : ''})
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.IMG_TIME, {
                    hour_zero: 1,
                    hour_startX: px(${hx}),
                    hour_startY: px(${hy}),
                    hour_array: ${digitArrayStr},
                    hour_space: 0,
                    hour_align: hmUI.align.LEFT,
                    minute_zero: 1,
                    minute_startX: px(${mx}),
                    minute_startY: px(${my}),
                    minute_array: ${digitArrayStr},
                    minute_space: 0,
                    minute_align: hmUI.align.LEFT,
                    minute_follow: 0,${secondParams}
                    show_level: hmUI.show_level.${showLevel}
                });`;
}

// Generate IMG_DATE widget with day arrays
function generateIMGDateWidget(element: WatchFaceElement, widgetIndex: number, showLevel: string): string {
  const x = element.bounds.x || 92;
  const y = element.bounds.y || 198;
  
  // Use date_digit_N.png naming — must match what mockKimiAnalysis generates
  const digitArray = [];
  for (let i = 0; i < 10; i++) {
    digitArray.push(`'date_digit_${i}.png'`);
  }
  const digitArrayStr = `[${digitArray.join(', ')}]`;
  
  return `
                // ${element.name} - IMG_DATE Widget
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.IMG_DATE, {
                    day_startX: px(${x}),
                    day_startY: px(${y}),
                    day_sc_array: ${digitArrayStr},
                    day_tc_array: ${digitArrayStr},
                    day_en_array: ${digitArrayStr},
                    day_zero: 1,
                    day_space: 0,
                    day_align: hmUI.align.LEFT,
                    day_is_character: false,
                    show_level: hmUI.show_level.${showLevel}
                });`;
}

// Generate IMG_DATE (month) widget with month arrays (12 images)
// Pattern from working Brushed Steel reference: month_startX/Y, month_sc/tc/en_array, month_is_character
function generateIMGMonthWidget(element: WatchFaceElement, widgetIndex: number, showLevel: string): string {
  const x = element.bounds.x || 105;
  const y = element.bounds.y || 198;
  
  // Use month_N.png naming — 12 images for Jan-Dec (0-indexed)
  const monthArray = [];
  for (let i = 0; i < 12; i++) {
    monthArray.push(`'month_${i}.png'`);
  }
  const monthArrayStr = `[${monthArray.join(', ')}]`;
  
  return `
                // ${element.name} - IMG_DATE Month Widget
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.IMG_DATE, {
                    month_startX: px(${x}),
                    month_startY: px(${y}),
                    month_sc_array: ${monthArrayStr},
                    month_tc_array: ${monthArrayStr},
                    month_en_array: ${monthArrayStr},
                    month_zero: 0,
                    month_space: 0,
                    month_is_character: true,
                    month_align: hmUI.align.LEFT,
                    show_level: hmUI.show_level.${showLevel}
                });`;
}

// Generate IMG_WEEK widget with weekday arrays
function generateIMGWeekWidget(element: WatchFaceElement, widgetIndex: number, showLevel: string): string {
  const x = element.bounds.x || 33;
  const y = element.bounds.y || 198;
  
  // Use week_N.png naming — must match what mockKimiAnalysis generates
  const weekArray = [];
  for (let i = 0; i < 7; i++) {
    weekArray.push(`'week_${i}.png'`);
  }
  const weekArrayStr = `[${weekArray.join(', ')}]`;
  
  return `
                // ${element.name} - IMG_WEEK Widget
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.IMG_WEEK, {
                    x: px(${x}),
                    y: px(${y}),
                    week_en: ${weekArrayStr},
                    week_sc: ${weekArrayStr},
                    week_tc: ${weekArrayStr},
                    show_level: hmUI.show_level.${showLevel}
                });`;
}

// Generate widget code for each element (V2 format)
function generateWidgetCodeV2(element: WatchFaceElement, widgetIndex: number, isAod: boolean = false): string {
  console.log(`[JSGenV2] generateWidgetCodeV2: element=${element.name}, type=${element.type}, src=${element.src}`);
  
  // Skip background element - already handled
  if (element.name === 'Background' || element.type === 'IMG' && element.bounds.x === 0 && element.bounds.y === 0 && element.bounds.width === 480 && element.bounds.height === 480) {
    return '';
  }
  
  // Skip dynamic widget types - they're handled separately (as dedicated top-level widgets).
  // IMPORTANT: use TYPE check, not name check — name-based matching wrongly kills
  // TIME_POINTER (name='TIME_POINTER' contains 'time') and engrave FILL_RECT frames
  // named e.g. "Time Display Frame" (parent name has 'time').
  if (element.type === 'IMG_TIME' || element.type === 'IMG_DATE' || element.type === 'IMG_WEEK') {
    return '';
  }
  
  const showLevel = isAod ? 'ONLY_AOD' : 'ONLY_NORMAL';
  
  // Dispatch by element type
  switch (element.type) {
    case 'ARC_PROGRESS':
      return generateArcProgressWidget(element, widgetIndex, showLevel);
    case 'TEXT_IMG':
      return generateTextImgWidget(element, widgetIndex, showLevel);
    case 'TIME_POINTER':
      return generateTimePointerWidget(element, widgetIndex, showLevel);
    case 'GAUGE_POINTER':
      return generateGaugePointerWidget(element, widgetIndex, showLevel);
    case 'TEXT':
      return generateTextWidget(element, widgetIndex, showLevel);
    case 'BUTTON':
      return generateButtonWidget(element, widgetIndex, showLevel);
    case 'IMG_STATUS':
      return generateImgStatusWidget(element, widgetIndex, showLevel);
    case 'CIRCLE':
      if (element.dropShadow) return _shadowImgWidget(element, widgetIndex, showLevel, 'Circle');
      if (element.shapeType === 'fill_rect') return generateFillRectWidget(element, widgetIndex, showLevel);
      if (element.shapeType === 'stroke_rect') return generateStrokeRectWidget(element, widgetIndex, showLevel);
      if (element.shapeType === 'rounded_rect') return generateFillRectWidget(element, widgetIndex, showLevel); // baked as PNG
      return generateCircleWidget(element, widgetIndex, showLevel);
    case 'IMG_LEVEL':
      return generateImgLevelWidget(element, widgetIndex, showLevel);
    case 'FILL_RECT': {
      // If this is an engrave/emboss frame element, bake it as a pre-rendered PNG (IMG widget)
      if (element.engraveFrame) {
        const safeName = element.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `frame_${safeName}.png`;
        return `
                // ${element.name} - Engrave Frame (pre-rendered IMG)
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.IMG, {
                    x: px(${element.bounds.x}),
                    y: px(${element.bounds.y}),
                    w: px(${element.bounds.width}),
                    h: px(${element.bounds.height}),
                  src: '${filename}',
                    show_level: hmUI.show_level.${showLevel}
                });`;
      }
      if (element.dropShadow) return _shadowImgWidget(element, widgetIndex, showLevel, 'Fill Rect');
      return generateFillRectWidget(element, widgetIndex, showLevel);
    }
    case 'STROKE_RECT':
      if (element.dropShadow) return _shadowImgWidget(element, widgetIndex, showLevel, 'Stroke Rect');
      return generateStrokeRectWidget(element, widgetIndex, showLevel);
    case 'IMG_ANIM':
      return generateImgAnimWidget(element, widgetIndex, showLevel);
    case 'IMG_PROGRESS':
      return generateImgProgressWidget(element, widgetIndex, showLevel);
    case 'DATE_POINTER':
      return generateDatePointerWidget(element, widgetIndex, showLevel);
    case 'IMG_CLICK':
      return generateImgClickWidget(element, widgetIndex, showLevel);
    case 'IMG':
    default:
      break;
  }
  
  // Handle IMG elements (static images)
  // GAUGE_POINTER - Data-driven rotating needle (IMG_POINTER)
  function generateGaugePointerWidget(element: WatchFaceElement, widgetIndex: number, showLevel: string): string {
    const width = element.bounds.width || 40;
    const height = element.bounds.height || 120;
    const pivot = normalizeGaugePivot(element);
    const pivotX = Math.round(width * pivot.pivotX);
    const pivotY = Math.round(height * pivot.pivotY);
    const centerX = Math.round(element.bounds.x + pivotX);
    const centerY = Math.round(element.bounds.y + pivotY);
    const startAngle = element.startAngle ?? -90;
    const endAngle = element.endAngle ?? 90;
    const src = gaugePointerAssetName(element);
    const dataType = element.dataType || 'BATTERY';

    return `
                  // ${element.name} - IMG_POINTER Widget (Gauge Pointer)
                  let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.IMG_POINTER, {
                      src: '${src}',
                      center_x: px(${centerX}),
                      center_y: px(${centerY}),
                      x: px(${pivotX}),
                      y: px(${pivotY}),
                      start_angle: ${startAngle},
                      end_angle: ${endAngle},
                      type: hmUI.data_type.${dataType},
                      invalid_visible: true,
                      show_level: hmUI.show_level.${showLevel}
                  });`;
  }

  if (element.type === 'IMG') {
    // Drop-shadow baked → padded shadow PNG
    if (element.dropShadow) return _shadowImgWidget(element, widgetIndex, showLevel, 'IMG');

    const w = element.bounds.width || 50;
    const h = element.bounds.height || 50;
    const imgSrc = element.iconKey ? `icon_${element.iconKey.replace(/[^a-zA-Z0-9_-]/g, '_')}.png` : (element.src || 'placeholder.png');
    
    // Regular IMG elements (icons, indicators) - raw coordinates matching reference
    return `
                // ${element.name}
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.IMG, {
                    x: px(${element.bounds.x}),
                    y: px(${element.bounds.y}),
                    w: px(${w}),
                    h: px(${h}),
                    src: '${imgSrc}',
                    alpha: 255,
                    show_level: hmUI.show_level.${showLevel}
                });`;
  }
  
  console.log(`[JSGenV2] No widget code generated for ${element.name} (type: ${element.type})`);
  return ''; // Skip unsupported types
}

// ============================================================
// ARC_PROGRESS - Arc progress indicator (battery, steps, etc.)
// Pattern from Zepp OS v1.0 docs + ZeppPlayer engine
// ============================================================
function generateArcProgressWidget(element: WatchFaceElement, widgetIndex: number, showLevel: string): string {
  const centerX = element.center?.x ?? (element.bounds.x + (element.bounds.width || 100) / 2);
  const centerY = element.center?.y ?? (element.bounds.y + (element.bounds.height || 100) / 2);
  const radius = element.radius ?? Math.min(element.bounds.width || 100, element.bounds.height || 100) / 2;
  const startAngle = element.startAngle ?? -90;
  const endAngle = element.endAngle ?? 270;
  const lineWidth = element.lineWidth ?? 8;
  const color = element.color ?? '0x00FF00';
  const colorValue = color.startsWith('0x') ? color : `0x${color.replace('#', '')}`;

  // If dataType is specified, use type for auto-binding
  const typeParam = element.dataType
    ? `\n                    type: hmUI.data_type.${element.dataType},`
    : '';

  return `
                // ${element.name} - ARC_PROGRESS Widget
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.ARC_PROGRESS, {
                    center_x: px(${centerX}),
                    center_y: px(${centerY}),
                    radius: px(${radius}),
                    start_angle: ${startAngle},
                    end_angle: ${endAngle},
                    color: ${colorValue},
                    line_width: px(${lineWidth}),${typeParam}
                    show_level: hmUI.show_level.${showLevel}
                });`;
}

// ============================================================
// TEXT_IMG - Number display using image font arrays
// Pattern from Zepp OS v1.0 docs + ZeppPlayer engine
// ============================================================
function generateTextImgWidget(element: WatchFaceElement, widgetIndex: number, showLevel: string): string {
  // Build font_array from element.fontArray or element.images
  const fontImages = element.fontArray || element.images || [];
  let fontArrayStr: string;

  if (fontImages.length > 0) {
    fontArrayStr = `[${fontImages.map(f => `'${f}'`).join(', ')}]`;
  } else {
    // Use same prefix convention as assetImageGenerator DATA_TYPE_PREFIXES
    const DATA_TYPE_PREFIXES: Record<string, string> = {
      BATTERY: 'batt_digit', STEP: 'step_digit', HEART: 'heart_digit',
      SPO2: 'spo2_digit', CAL: 'cal_digit', DISTANCE: 'dist_digit',
      STRESS: 'stress_digit', PAI: 'pai_digit', PAI_WEEKLY: 'pai_digit',
      SLEEP: 'sleep_digit', STAND: 'stand_digit', FAT_BURN: 'fatburn_digit',
      UVI: 'uvi_digit', AQI: 'aqi_digit', HUMIDITY: 'humid_digit',
      WIND: 'wind_digit', ALTIMETER: 'alt_digit', VO2MAX: 'vo2_digit',
      TRAINING_LOAD: 'training_digit', WEATHER: 'weather', WEATHER_CURRENT: 'weather',
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

  // If dataType is specified, use type for auto-binding (e.g., BATTERY, STEP, HEART)
  const typeParam = element.dataType
    ? `\n                    type: hmUI.data_type.${element.dataType},`
    : '';

  const hSpace = element.hSpace ?? 1;
  const alignH = element.alignH ?? 'LEFT';

  return `
                // ${element.name} - TEXT_IMG Widget
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.TEXT_IMG, {
                    x: px(${element.bounds.x}),
                    y: px(${element.bounds.y}),
                    w: px(${element.bounds.width || 100}),
                    h: px(${element.bounds.height || 40}),
                    font_array: ${fontArrayStr},${typeParam}
                    h_space: ${hSpace},
                    align_h: hmUI.align.${alignH},
                    show_level: hmUI.show_level.${showLevel}
                });`;
}

// ============================================================
// TIME_POINTER - Analog clock hands (hour/minute/second in ONE widget)
// Pattern from Zepp OS watchface docs + reference watchfaces
// ============================================================
function generateTimePointerWidget(element: WatchFaceElement, widgetIndex: number, showLevel: string): string {
  const centerX = element.center?.x ?? 240;
  const centerY = element.center?.y ?? 240;
  const hourPosX = element.hourPos?.x ?? 11;
  const hourPosY = element.hourPos?.y ?? 118;  // pivot at 85% of 140px hand height
  const minutePosX = element.minutePos?.x ?? 8;
  const minutePosY = element.minutePos?.y ?? 172; // pivot at 86% of 200px hand height
  const secondPosX = element.secondPos?.x ?? 4;
  const secondPosY = element.secondPos?.y ?? 180; // pivot at 75% of 240px hand height
    const toHandPath = (src?: string): string | undefined => {
      if (!src) return undefined;
      const clean = src.replace(/^assets\//, '').trim();
      if (!clean) return undefined;
      // Balance-class V2 runtime resolves hand assets by filename in watchface config.
      return clean;
    };
    const hourSrc = toHandPath(element.hourHandSrc || 'hour_hand.png')!;
    const minuteSrc = toHandPath(element.minuteHandSrc || 'minute_hand.png')!;
    const secondSrc = toHandPath(element.secondHandSrc || 'second_hand.png')!;
    const coverSrc = toHandPath(element.coverSrc);
  const hasSeconds = !element.hideSeconds;

  const secondParams = hasSeconds ? `
                    second_centerX: px(${centerX}),
                    second_centerY: px(${centerY}),
                    second_posX: px(${secondPosX}),
                    second_posY: px(${secondPosY}),
                    second_path: '${secondSrc}',` : '';

  const coverOverlay = coverSrc ? `
                // ${element.name} - Hub overlay (kept above hands)
                let widget_${widgetIndex}_cover = hmUI.createWidget(hmUI.widget.IMG, {
                    x: px(${centerX - 15}),
                    y: px(${centerY - 15}),
            w: px(30),
            h: px(30),
                    src: '${coverSrc}',
                    show_level: hmUI.show_level.${showLevel}
                });` : '';

  return `
                // ${element.name} - TIME_POINTER Widget (Analog Clock)
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.TIME_POINTER, {
                    hour_centerX: px(${centerX}),
                    hour_centerY: px(${centerY}),
                    hour_posX: px(${hourPosX}),
                    hour_posY: px(${hourPosY}),
                  hour_path: '${hourSrc}',
                    minute_centerX: px(${centerX}),
                    minute_centerY: px(${centerY}),
                    minute_posX: px(${minutePosX}),
                    minute_posY: px(${minutePosY}),
                    minute_path: '${minuteSrc}',${secondParams}
                    show_level: hmUI.show_level.${showLevel}
                });${coverOverlay}`;
}

// ============================================================
// TEXT - Dynamic text display (e.g., city name, sensor values)
// Pattern from working Brushed Steel reference
// ============================================================
function generateTextWidget(element: WatchFaceElement, widgetIndex: number, showLevel: string): string {
  const textSize = element.fontSize ?? 20;
  const colorHex = element.color ?? '0xFFFFFFFF';
  const colorValue = colorHex.startsWith('0x') ? colorHex : `0x${colorHex.replace('#', '')}`;
  const charSpace = element.charSpace ?? 0;
  const lineSpace = element.lineSpace ?? 0;

  // Check if selected font is embeddable
  const fontEntry = element.fontStyle ? FONT_STYLES.find(f => f.key === element.fontStyle) : undefined;
  const fontLine = (fontEntry?.embeddable && fontEntry.fontFile)
    ? `\n                    font: 'fonts/${fontEntry.fontFile}',`
    : '';

  // Date format mode: build a getText callback from the format string
  if (element.dateFormat) {
    const fmt = element.dateFormat;
    // Map format tokens to gettext_by_id / manual date construction
    let textExpr: string;
    if (fmt === 'DD/MM') {
      textExpr = '`${String(hmSensor.time.day).padStart(2,"0")}/${String(hmSensor.time.month).padStart(2,"0")}`';
    } else if (fmt === 'MM/DD') {
      textExpr = '`${String(hmSensor.time.month).padStart(2,"0")}/${String(hmSensor.time.day).padStart(2,"0")}`';
    } else if (fmt === 'DD/MM/YYYY') {
      textExpr = '`${String(hmSensor.time.day).padStart(2,"0")}/${String(hmSensor.time.month).padStart(2,"0")}/${hmSensor.time.year}`';
    } else if (fmt === 'MM/DD/YYYY') {
      textExpr = '`${String(hmSensor.time.month).padStart(2,"0")}/${String(hmSensor.time.day).padStart(2,"0")}/${hmSensor.time.year}`';
    } else if (fmt === 'DD-MM-YYYY') {
      textExpr = '`${String(hmSensor.time.day).padStart(2,"0")}-${String(hmSensor.time.month).padStart(2,"0")}-${hmSensor.time.year}`';
    } else if (fmt === 'DD MMM') {
      textExpr = '`${String(hmSensor.time.day).padStart(2,"0")} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][hmSensor.time.month-1]}`';
    } else if (fmt === 'MMM DD') {
      textExpr = '`${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][hmSensor.time.month-1]} ${String(hmSensor.time.day).padStart(2,"0")}`';
    } else {
      textExpr = '`${hmSensor.time.day}/${hmSensor.time.month}`';
    }
    return `
                // ${element.name} - TEXT Widget (date format: ${fmt})
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.TEXT, {
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
                    text: ${textExpr},${fontLine}
                    show_level: hmUI.show_level.${showLevel}
                });`;
  }

  const textContent = element.text ?? '';
  return `
                // ${element.name} - TEXT Widget
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.TEXT, {
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
                    show_level: hmUI.show_level.${showLevel}
                });`;
}

// ============================================================
// BUTTON - Clickable shortcut button (launches app)
// Pattern from working Brushed Steel reference
// ============================================================
function generateButtonWidget(element: WatchFaceElement, widgetIndex: number, showLevel: string): string {
  const normalSrc = element.normalSrc || element.src || 'trasparente.png';
  const pressSrc = element.pressSrc || normalSrc;
  const clickAction = element.clickAction || '';

  // Build click_func - either launch a native app or empty
  let clickFunc: string;
  if (clickAction) {
    clickFunc = `() => {
                hmApp.startApp({ url: '${clickAction}', native: true })
                              }`;
  } else {
    clickFunc = `() => {}`;
  }

  return `
                // ${element.name} - BUTTON Widget
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.BUTTON, {
                    x: px(${element.bounds.x}),
                    y: px(${element.bounds.y}),
                    w: px(${element.bounds.width || 100}),
                    h: px(${element.bounds.height || 35}),
                    text: '',
                    press_src: '${pressSrc}',
                    normal_src: '${normalSrc}',
                    click_func: ${clickFunc},
                    show_level: hmUI.show_level.${showLevel}
                });`;
}

// ============================================================
// IMG_STATUS - System status indicators (bluetooth, DND, lock)
// Pattern from working Brushed Steel reference
// ============================================================
// Per-statusType default image filenames (match StudioApp.tsx buildAssetImages)
const STATUS_DEFAULT_SRC: Record<string, string> = {
  DISCONNECT: 'bluetooth_30x30.png',
  CLOCK:      'alarm_30x30.png',
  DISTURB:    'dnd_30x30.png',
  LOCK:       'lock_30x30.png',
};

function generateImgStatusWidget(element: WatchFaceElement, widgetIndex: number, showLevel: string): string {
  const statusType = element.statusType || 'DISCONNECT';
  const defaultSrc = STATUS_DEFAULT_SRC[statusType] ?? 'bluetooth_30x30.png';
  // If user picked a custom icon via iconKey, use that PNG; else use per-statusType default
  const src = element.iconKey
    ? `icon_${element.iconKey.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`
    : (element.src || defaultSrc);

  return `
                // ${element.name} - IMG_STATUS Widget
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.IMG_STATUS, {
                    x: px(${element.bounds.x}),
                    y: px(${element.bounds.y}),
                    src: '${src}',
                    type: hmUI.system_status.${statusType},
                    show_level: hmUI.show_level.${showLevel}
                });`;
}

// ============================================================
// CIRCLE - Simple filled/stroked circle
// Pattern from Zepp OS v1.0 docs
// ============================================================
function generateCircleWidget(element: WatchFaceElement, widgetIndex: number, showLevel: string): string {
  const centerX = element.center?.x ?? (element.bounds.x + (element.bounds.width || 50) / 2);
  const centerY = element.center?.y ?? (element.bounds.y + (element.bounds.height || 50) / 2);
  const radius = element.radius ?? Math.min(element.bounds.width || 50, element.bounds.height || 50) / 2;
  const colorHex = element.color ?? '0xFFFFFF';
  const colorValue = colorHex.startsWith('0x') ? colorHex : `0x${colorHex.replace('#', '')}`;
  const alphaLine = element.alpha !== undefined ? `\n                    alpha: ${element.alpha},` : '';

  return `
                // ${element.name} - CIRCLE Widget
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.CIRCLE, {
                    center_x: px(${centerX}),
                    center_y: px(${centerY}),
                    radius: px(${radius}),
                    color: ${colorValue},${alphaLine}
                    show_level: hmUI.show_level.${showLevel}
                });`;
}

// ============================================================
// IMG_LEVEL - Level-based image display (weather icons, etc.)
// Pattern from working Brushed Steel reference (with data_type)
// ============================================================
function generateImgLevelWidget(element: WatchFaceElement, widgetIndex: number, showLevel: string): string {
  // Build image_array from element.images or single element.src
  const images = element.images || (element.src ? [element.src] : []);
  const imageArrayStr = `[${images.map(img => `"${img}"`).join(', ')}]`;

  // If dataType is specified, use type for auto-binding
  const resolvedImgLevelType =
    element.dataType === 'WEATHER_CURRENT' || element.dataType === 'WEATHER_STATUS'
      ? 'WEATHER'
      : element.dataType;
  const typeParam = resolvedImgLevelType
    ? `\n                    type: hmUI.data_type.${resolvedImgLevelType},`
    : '';

  return `
                // ${element.name} - IMG_LEVEL Widget
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.IMG_LEVEL, {
                    x: px(${element.bounds.x}),
                    y: px(${element.bounds.y}),
                    image_array: ${imageArrayStr},
                    image_length: ${images.length},${typeParam}
                    show_level: hmUI.show_level.${showLevel}
                });`;
}

// ============================================================
// FILL_RECT - Solid filled rectangle
// ============================================================
function generateFillRectWidget(element: WatchFaceElement, widgetIndex: number, showLevel: string): string {
  const colorHex = element.color ?? '0x333333';
  const colorValue = colorHex.startsWith('0x') ? colorHex : `0x${colorHex.replace('#', '')}`;
  const alphaLine = element.alpha !== undefined ? `\n                    alpha: ${element.alpha},` : '';
  return `
                // ${element.name} - FILL_RECT Widget
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.FILL_RECT, {
                    x: px(${element.bounds.x}),
                    y: px(${element.bounds.y}),
                    w: px(${element.bounds.width || 100}),
                    h: px(${element.bounds.height || 10}),
                    color: ${colorValue},${alphaLine}
                    show_level: hmUI.show_level.${showLevel}
                });`;
}

// ============================================================
// STROKE_RECT - Outlined rectangle
// ============================================================
function generateStrokeRectWidget(element: WatchFaceElement, widgetIndex: number, showLevel: string): string {
  const colorHex = element.color ?? '0xFFFFFF';
  const colorValue = colorHex.startsWith('0x') ? colorHex : `0x${colorHex.replace('#', '')}`;
  const lineWidth = element.lineWidth ?? 2;
  return `
                // ${element.name} - STROKE_RECT Widget
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.STROKE_RECT, {
                    x: px(${element.bounds.x}),
                    y: px(${element.bounds.y}),
                    w: px(${element.bounds.width || 100}),
                    h: px(${element.bounds.height || 10}),
                    color: ${colorValue},
                    line_width: px(${lineWidth}),
                    show_level: hmUI.show_level.${showLevel}
                });`;
}

// ============================================================
// IMG_ANIM - Animated image sequence (folder-based frames)
// anim_path: folder containing sequentially-named frames
// anim_fps: playback speed, repeat_count: 0=infinite 1=once
// ============================================================
function generateImgAnimWidget(element: WatchFaceElement, widgetIndex: number, showLevel: string): string {
  const animPath = element.animPath || 'anim/default';
  const animFps = element.animFps ?? 25;
  const repeatCount = element.repeatCount ?? 0;
  return `
                // ${element.name} - IMG_ANIM Widget
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.IMG_ANIM, {
                    x: px(${element.bounds.x}),
                    y: px(${element.bounds.y}),
                    w: px(${element.bounds.width || 100}),
                    h: px(${element.bounds.height || 100}),
                    anim_path: '${animPath}',
                    anim_fps: ${animFps},
                    repeat_count: ${repeatCount},
                    anim_status: hmUI.anim_status.START,
                    show_level: hmUI.show_level.${showLevel}
                });`;
}

// ============================================================
// IMG_PROGRESS - Sequential image array progress display
// image_array: array of images, image_length: count
// x_array / y_array: per-image positions (same length as images)
// ============================================================
function generateImgProgressWidget(element: WatchFaceElement, widgetIndex: number, showLevel: string): string {
  const images = element.images || (element.src ? [element.src] : []);
  const imageArrayStr = `[${images.map(img => `'${img}'`).join(', ')}]`;
  const xArr = images.map((_, i) => element.bounds.x + i * (element.bounds.width || 20));
  const yArr = images.map(() => element.bounds.y);
  const xArrayStr = `[${xArr.map(v => `px(${v})`).join(', ')}]`;
  const yArrayStr = `[${yArr.map(v => `px(${v})`).join(', ')}]`;
  const typeParam = element.dataType ? `\n                    type: hmUI.data_type.${element.dataType},` : '';
  return `
                // ${element.name} - IMG_PROGRESS Widget
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.IMG_PROGRESS, {
                    image_array: ${imageArrayStr},
                    image_length: ${images.length},
                    x_array: ${xArrayStr},
                    y_array: ${yArrayStr},${typeParam}
                    show_level: hmUI.show_level.${showLevel}
                });`;
}

// ============================================================
// DATE_POINTER - Analog pointer driven by date values
// dateType: MONTH | DAY | WEEK → maps to hmUI.date constant
// ============================================================
function generateDatePointerWidget(element: WatchFaceElement, widgetIndex: number, showLevel: string): string {
  const dateType = element.dateType ?? 'DAY';
  const centerX = element.center?.x ?? 240;
  const centerY = element.center?.y ?? 240;
  const posX = element.hourPos?.x ?? 10;
  const posY = element.hourPos?.y ?? 60;
  return `
                // ${element.name} - DATE_POINTER Widget (${dateType})
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.DATE_POINTER, {
                    date_type: hmUI.date.${dateType},
                    center_x: px(${centerX}),
                    center_y: px(${centerY}),
                    posX: px(${posX}),
                    posY: px(${posY}),
                    show_level: hmUI.show_level.${showLevel}
                });`;
}

// ============================================================
// IMG_CLICK - Interactive image area (used for MOON data type)
// Tapping triggers data_type action (e.g., MOON phase toggle)
// ============================================================
function generateImgClickWidget(element: WatchFaceElement, widgetIndex: number, showLevel: string): string {
  const src = element.src || 'moon_icon.png';
  const typeParam = element.dataType ? `\n                    type: hmUI.data_type.${element.dataType},` : '';
  return `
                // ${element.name} - IMG_CLICK Widget
                let widget_${widgetIndex} = hmUI.createWidget(hmUI.widget.IMG_CLICK, {
                    x: px(${element.bounds.x}),
                    y: px(${element.bounds.y}),
                    w: px(${element.bounds.width || 50}),
                    h: px(${element.bounds.height || 50}),
                    src: '${src}',${typeParam}
                    show_level: hmUI.show_level.${showLevel}
                });`;
}

// Generate unique app ID
function generateAppId(): number {
  return Math.floor(Math.random() * (9999999 - 1000000 + 1)) + 1000000;
}
