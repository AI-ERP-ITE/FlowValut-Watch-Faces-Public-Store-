// ZPK File Builder for ZeppOS Watch Faces
import JSZip from 'jszip';
import { projectRasterNormalizationTarget } from '@/lib/projectRasterGeometry';
import type { WatchFaceConfig } from '@/types';
import { generateWatchFaceCode } from './jsCodeGenerator';
import { FONT_STYLES } from '@/lib/fontLibrary';

export interface ZPKBuildOptions {
  config: WatchFaceConfig;
  backgroundFile: File;
  aodBackgroundFile?: File | null;
  elementFiles: { src: string; file: File }[];
  /** Full canvas screenshot data URL — used as 324×324 thumbnail (anteprima.png) */
  previewDataUrl?: string | null;
}

export interface ZPKBuildResult {
  blob: Blob;
  filename: string;
  size: number;
}

function sanitizeAssetFilename(input: string): string {
  const trimmed = input.trim();
  const dot = trimmed.lastIndexOf('.');
  const hasExt = dot > 0 && dot < trimmed.length - 1;
  const rawBase = hasExt ? trimmed.slice(0, dot) : trimmed;
  const rawExt = hasExt ? trimmed.slice(dot + 1) : '';

  const safeBase = rawBase
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'asset';

  const safeExt = rawExt
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

  return safeExt ? `${safeBase}.${safeExt}` : safeBase;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read background image'));
    reader.readAsDataURL(blob);
  });
}

async function normalizeProjectRaster(
  file: File,
  targetWidth: number,
  targetHeight: number,
  outputName: string,
): Promise<File> {
  const dataUrl = await blobToDataUrl(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Unable to decode ${outputName}`));
    img.src = dataUrl;
  });
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  const normalizationTarget = projectRasterNormalizationTarget(
    { width: naturalWidth, height: naturalHeight },
    { width: targetWidth, height: targetHeight },
  );
  if (!normalizationTarget) return file;

  const canvas = document.createElement('canvas');
  canvas.width = normalizationTarget.width;
  canvas.height = normalizationTarget.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(`Unable to normalize ${outputName}: canvas context unavailable`);
  ctx.drawImage(image, 0, 0, normalizationTarget.width, normalizationTarget.height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error(`Unable to encode ${outputName}`)), 'image/png');
  });
  return new File([blob], outputName, { type: 'image/png' });
}

function normalizeElementFiles(
  elementFiles: { src: string; file: File }[]
): {
  files: { src: string; file: File }[];
  srcMap: Map<string, string>;
} {
  const used = new Set<string>();
  const srcMap = new Map<string, string>();
  const files = elementFiles.map((entry) => {
    const candidate = sanitizeAssetFilename(entry.src);
    const extDot = candidate.lastIndexOf('.');
    const base = extDot > 0 ? candidate.slice(0, extDot) : candidate;
    const ext = extDot > 0 ? candidate.slice(extDot) : '';

    let safe = candidate;
    let n = 2;
    while (used.has(safe.toLowerCase())) {
      safe = `${base}_${n}${ext}`;
      n += 1;
    }
    used.add(safe.toLowerCase());
    srcMap.set(entry.src, safe);
    return { src: safe, file: entry.file };
  });

  return { files, srcMap };
}

export async function buildZPK(options: ZPKBuildOptions): Promise<ZPKBuildResult> {
  console.log('[ZPK] Starting...');
  const { config } = options;
  let backgroundFile = options.backgroundFile;
  let aodBackgroundFile = options.aodBackgroundFile;
  
  try {
    backgroundFile = await normalizeProjectRaster(
      backgroundFile,
      config.resolution.width,
      config.resolution.height,
      'background.png',
    );
    if (aodBackgroundFile) {
      aodBackgroundFile = await normalizeProjectRaster(
        aodBackgroundFile,
        config.resolution.width,
        config.resolution.height,
        'aod_background.png',
      );
    }

    const normalizedFiles = normalizeElementFiles(options.elementFiles);
    const normalizedElementFiles = normalizedFiles.files;
    const srcMap = normalizedFiles.srcMap;

    // Build a set of asset filenames from elementFiles for restoring data URLs
    const assetFilenames = new Set(normalizedElementFiles.map(ef => ef.src));

    const remapSrc = (value?: string): string | undefined => {
      if (!value) return value;
      return srcMap.get(value) ?? sanitizeAssetFilename(value);
    };
    
    // Elements may have data URLs (from preview rendering) instead of filenames.
    // Prefer assetFilename (set by pipeline), fall back to name-based guessing.
    const fixElementSources = async (input: WatchFaceConfig['elements']) => {
      return Promise.all(input.map(async el => {
        let next = { ...el };
        if (el.src && el.src.startsWith('data:')) {
          // Prefer the deterministic assetFilename set during pipeline
          const candidate = remapSrc(el.assetFilename);
          if (candidate && assetFilenames.has(candidate)) {
            next = { ...next, src: candidate };
          } else {
            // Legacy fallback: substring matching
            const name = el.name.toLowerCase();
            for (const filename of assetFilenames) {
              const fn = filename.toLowerCase();
              if (name.includes('battery') && fn.includes('batt')) { next = { ...next, src: filename }; break; }
              if (name.includes('heart') && fn.includes('heart')) { next = { ...next, src: filename }; break; }
              if (name.includes('steps') && fn.includes('step')) { next = { ...next, src: filename }; break; }
              if (name.includes('arc') && fn.includes('arc')) { next = { ...next, src: filename }; break; }
              if (name.includes('background') && fn.includes('background')) { next = { ...next, src: filename }; break; }
            }
            if (!next.src || next.src.startsWith('data:')) {
              if (next.src && next.src.startsWith('data:')) {
                try {
                  const res = await fetch(next.src);
                  const blob = await res.blob();
                  const newFilename = `static_img_${el.id.slice(0,6)}.png`;
                  const newFile = new File([blob], newFilename, { type: 'image/png' });
                  normalizedElementFiles.push({ src: newFilename, file: newFile });
                  assetFilenames.add(newFilename);
                  next.src = newFilename;
                  console.log(`[ZPK] Extracted base64 image for ${el.name} to ${newFilename}`);
                } catch (e) {
                  console.error('[ZPK] Failed to extract base64 for element:', el.name, e);
                }
              } else {
                console.warn('[ZPK] Could not restore filename for element:', el.name);
              }
            }
          }
        } else {
          next = {
            ...next,
            src: remapSrc(next.src),
          };
        }

        return {
          ...next,
          assetFilename: remapSrc(next.assetFilename),
          hourHandSrc: remapSrc(next.hourHandSrc),
          minuteHandSrc: remapSrc(next.minuteHandSrc),
          secondHandSrc: remapSrc(next.secondHandSrc),
          coverSrc: remapSrc(next.coverSrc),
          pressSrc: remapSrc(next.pressSrc),
          normalSrc: remapSrc(next.normalSrc),
          images: Array.isArray(next.images) ? next.images.map((v) => remapSrc(v) ?? v) : next.images,
        };
      }));
    };
    const fixedElements = await fixElementSources(config.elements);
    const fixedAodElements = config.aodElements ? await fixElementSources(config.aodElements) : config.aodElements;
    
    const fixedConfig = { ...config, elements: fixedElements, aodElements: fixedAodElements };
    
    console.log('[ZPK] Step 1: Generating JS code...');
    const code = generateWatchFaceCode(fixedConfig);
    console.log('[ZPK] Step 2: JS code generated, app.json length:', code.appJson.length);
    // Extract appId from device app.json to reuse in app-side (must match)
    const parsedDeviceJson = JSON.parse(code.appJson);
    const sharedAppId: number = parsedDeviceJson?.app?.appId ?? Math.floor(1000000 + Math.random() * 9000000);
    
    // Create device.zip
    console.log('[ZPK] Step 3: Creating device.zip...');
    const deviceZip = new JSZip();
    
    console.log('[ZPK] Step 4: Adding app.json...');
    deviceZip.file('app.json', code.appJson);
    // Add preview thumbnail (anteprima.png) — resolution-matched size per Zepp OS spec.
    // Falls back to background image if no canvas screenshot is provided.
    const thumbSize = (() => {
      const w = config.resolution.width;
      const h = config.resolution.height;
      if (w === 480 && h === 480) return { w: 324, h: 324 };
      if (w === 466 && h === 466) return { w: 314, h: 314 };
      if (w === 454 && h === 454) return { w: 306, h: 306 };
      if (w === 416 && h === 416) return { w: 280, h: 280 };
      if (w === 390 && h === 450) return { w: 266, h: 306 };
      if (w === 402 && h === 476) return { w: 273, h: 316 };
      return { w: Math.round(w * 0.675), h: Math.round(h * 0.675) }; // generic ~67.5%
    })();
    // Always resize thumbnail to the exact target size, regardless of source.
    const resizeToThumb = (src: string): Promise<Blob> => new Promise<Blob>((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = thumbSize.w; c.height = thumbSize.h;
        const ctx = c.getContext('2d');
        if (!ctx) { rej(new Error('no ctx')); return; }
        ctx.drawImage(img, 0, 0, thumbSize.w, thumbSize.h);
        c.toBlob(b => b ? res(b) : rej(new Error('toBlob null')), 'image/png');
      };
      img.onerror = (e) => rej(e);
      img.src = src;
    });

    // Convert File to data URL helper
    const fileToDataUrl = (f: File | Blob): Promise<string> => new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(f);
    });

    let anteprimaFile: Blob;
    const thumbSrc = options.previewDataUrl ?? await fileToDataUrl(backgroundFile);
    try {
      anteprimaFile = await resizeToThumb(thumbSrc);
      console.log('[ZPK] anteprima.png created:', thumbSize.w, 'x', thumbSize.h, 'blob size:', anteprimaFile.size);
    } catch (e) {
      console.warn('[ZPK] Thumbnail resize failed, trying background fallback:', e);
      try {
        const bgDataUrl = await fileToDataUrl(backgroundFile);
        anteprimaFile = await resizeToThumb(bgDataUrl);
        console.log('[ZPK] anteprima.png fallback created:', anteprimaFile.size);
      } catch (e2) {
        console.warn('[ZPK] All thumbnail attempts failed, packing raw background:', e2);
        anteprimaFile = backgroundFile;
      }
    }
    deviceZip.file('anteprima.png', anteprimaFile);
    // Compatibility alias: some runtimes/tools still expect icon.png.
    deviceZip.file('icon.png', anteprimaFile);
    
    console.log('[ZPK] Step 5: Adding app.js...');
    deviceZip.file('app.js', code.appJs);
    
    console.log('[ZPK] Step 6: Adding watchface/index.js...');
    deviceZip.file('watchface/index.js', code.watchfaceIndexJs);
    
    // Add assets folder with images
    console.log('[ZPK] Step 7: Creating assets folder...');
    const assets = deviceZip.folder('assets');
    if (assets) {
      // Add background image directly from uploaded file (no conversion)
      console.log('[ZPK] Step 8: Adding background image...');
      assets.file('background.png', backgroundFile);
      // Keep a dedicated watch thumbnail inside device assets for installer/device lookup.
      assets.file('anteprima.png', anteprimaFile);
      console.log('[ZPK] Step 9: Background image added, size:', backgroundFile.size);

      if (aodBackgroundFile) {
        assets.file('aod_background.png', aodBackgroundFile);
        console.log('[ZPK] Step 9a: AOD background image added, size:', aodBackgroundFile.size);
      }
      
      // Add element images (skip background.png since we already added it directly)
      const filteredElements = normalizedElementFiles.filter(ef => ef.src !== 'background.png');
      console.log('[ZPK] Step 9b: Adding element images, count:', filteredElements.length);
      if (filteredElements.length === 0) {
        console.error('[ZPK] ERROR: No element files to add!');
      }
      
      for (const elementFile of filteredElements) {
        console.log('[ZPK] Adding element file:', elementFile.src, 'size:', elementFile.file.size);
        if (elementFile.file.size === 0) {
          console.error('[ZPK] ERROR: Element file is EMPTY:', elementFile.src);
        }
        assets.file(elementFile.src, elementFile.file);
      }
      console.log('[ZPK] Element images added, total:', normalizedElementFiles.length);

      // Pack embeddable font files for TEXT elements
      const fontFilesToPack = new Set<string>();
      for (const el of fixedConfig.elements) {
        if (el.type === 'TEXT' && el.fontStyle) {
          const fontEntry = FONT_STYLES.find(f => f.key === el.fontStyle);
          if (fontEntry?.embeddable && fontEntry.fontFile) {
            fontFilesToPack.add(fontEntry.fontFile);
          }
        }
      }
      if (fontFilesToPack.size > 0) {
        console.log('[ZPK] Packing fonts:', [...fontFilesToPack]);
        const fontsFolder = assets.folder('fonts');
        if (fontsFolder) {
          for (const fontFile of fontFilesToPack) {
            try {
              const response = await fetch(`/fonts/${fontFile}`);
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const blob = await response.blob();
              fontsFolder.file(fontFile, blob);
              console.log('[ZPK] Font packed:', fontFile, 'size:', blob.size);
            } catch (err) {
              console.warn('[ZPK] Could not fetch font, skipping:', fontFile, err);
            }
          }
        }
      }
    } else {
      console.error('[ZPK] ERROR: Failed to create assets folder!');
    }
    
    console.log('[ZPK] Step 10: Generating device.zip blob (no compression)...');
    const deviceBlob = await deviceZip.generateAsync({ 
      type: 'blob',
      compression: 'STORE' // No compression to avoid memory issues
    });
    console.log('[ZPK] Step 11: device.zip generated, size:', deviceBlob.size);
    
    // Create app-side.zip — kept minimal and reference-style (no thumbnail blobs).
    console.log('[ZPK] Step 12: Creating app-side.zip...');
    const appSideZip = new JSZip();
    const appSideJson = JSON.stringify({
      configVersion: 'v2',
      app: {
        appId: sharedAppId,
        appName: config.name,
        appType: 'watchface',
        version: { code: 1, name: '1.0.0' },
        vender: 'AI-WatchFace-Creator',
        description: `Custom watch face - ${config.name}`,
        icon: 'assets/anteprima.png',
      },
      permissions: [],
    }, null, 2);
    appSideZip.file('app.json', appSideJson);
    
    console.log('[ZPK] Step 13: Generating app-side.zip blob...');
    const appSideBlob = await appSideZip.generateAsync({ 
      type: 'blob',
      compression: 'STORE'
    });
    console.log('[ZPK] Step 14: app-side.zip generated, size:', appSideBlob.size);
    
    // Create final ZPK
    console.log('[ZPK] Step 15: Creating final ZPK...');
    const zpkZip = new JSZip();
    // Outer root: global manifest + thumbnails alongside inner archives.
    // The Zepp installer reads this root before opening any inner zip.
    // app.json here uses icon=icon.png and cover=preview_en.png per Zepp spec.
    const outerAppJson = JSON.parse(code.appJson);
    outerAppJson.app.icon = 'icon.png';
    outerAppJson.app.cover = ['preview_en.png'];
    if (outerAppJson.i18n) {
      for (const lang of Object.keys(outerAppJson.i18n)) {
        if (outerAppJson.i18n[lang]) outerAppJson.i18n[lang].icon = 'icon.png';
      }
    }
    zpkZip.file('app.json', JSON.stringify(outerAppJson, null, 2));
    zpkZip.file('anteprima.png', anteprimaFile);
    zpkZip.file('icon.png', anteprimaFile);
    zpkZip.file('preview_en.png', anteprimaFile);
    zpkZip.file('device.zip', deviceBlob);
    zpkZip.file('app-side.zip', appSideBlob);
    
    console.log('[ZPK] Step 16: Generating final ZPK blob...');
    const zpkBlob = await zpkZip.generateAsync({ 
      type: 'blob',
      compression: 'STORE'
    });
    console.log('[ZPK] Complete! Size:', zpkBlob.size);
    
    return {
      blob: zpkBlob,
      filename: `${config.name.replace(/\s+/g, '_')}.zpk`,
      size: zpkBlob.size,
    };
  } catch (error) {
    console.error('[ZPK] Error in buildZPK:', error);
    throw error;
  }
}
