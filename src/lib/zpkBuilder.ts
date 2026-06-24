// ZPK File Builder for ZeppOS Watch Faces
import JSZip from 'jszip';
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

export async function buildZPK(options: ZPKBuildOptions): Promise<ZPKBuildResult> {
  console.log('[ZPK] Starting...');
  const { config, backgroundFile, aodBackgroundFile } = options;
  
  try {
    // Build a set of asset filenames from elementFiles for restoring data URLs
    const assetFilenames = new Set(options.elementFiles.map(ef => ef.src));
    
    // Elements may have data URLs (from preview rendering) instead of filenames.
    // Prefer assetFilename (set by pipeline), fall back to name-based guessing.
    const fixElementSources = (input: WatchFaceConfig['elements']) => input.map(el => {
      if (el.src && el.src.startsWith('data:')) {
        // Prefer the deterministic assetFilename set during pipeline
        if (el.assetFilename && assetFilenames.has(el.assetFilename)) {
          return { ...el, src: el.assetFilename };
        }
        // Legacy fallback: substring matching
        const name = el.name.toLowerCase();
        for (const filename of assetFilenames) {
          const fn = filename.toLowerCase();
          if (name.includes('battery') && fn.includes('batt')) return { ...el, src: filename };
          if (name.includes('heart') && fn.includes('heart')) return { ...el, src: filename };
          if (name.includes('steps') && fn.includes('step')) return { ...el, src: filename };
          if (name.includes('arc') && fn.includes('arc')) return { ...el, src: filename };
          if (name.includes('background') && fn.includes('background')) return { ...el, src: filename };
        }
        console.warn('[ZPK] Could not restore filename for element:', el.name);
      }
      return el;
    });
    const fixedElements = fixElementSources(config.elements);
    const fixedAodElements = config.aodElements ? fixElementSources(config.aodElements) : config.aodElements;
    
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
      if (w === 454 && h === 454) return { w: 306, h: 306 };
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
      console.log('[ZPK] Step 9: Background image added, size:', backgroundFile.size);

      if (aodBackgroundFile) {
        assets.file('aod_background.png', aodBackgroundFile);
        console.log('[ZPK] Step 9a: AOD background image added, size:', aodBackgroundFile.size);
      }
      
      // Add element images (skip background.png since we already added it directly)
      const filteredElements = options.elementFiles.filter(ef => ef.src !== 'background.png');
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
      console.log('[ZPK] Element images added, total:', options.elementFiles.length);

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
    
    // Create app-side.zip - Matching working ZPK structure
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
        icon: 'anteprima.png',
        cover: ['anteprima.png'],
      },
      permissions: [],
    }, null, 2);
    appSideZip.file('app.json', appSideJson);
    // Ensure app-side metadata points to an existing thumbnail file.
    appSideZip.file('anteprima.png', anteprimaFile);
    appSideZip.file('icon.png', anteprimaFile);
    
    console.log('[ZPK] Step 13: Generating app-side.zip blob...');
    const appSideBlob = await appSideZip.generateAsync({ 
      type: 'blob',
      compression: 'STORE'
    });
    console.log('[ZPK] Step 14: app-side.zip generated, size:', appSideBlob.size);
    
    // Create final ZPK
    console.log('[ZPK] Step 15: Creating final ZPK...');
    const zpkZip = new JSZip();
    // Mirror Zepp outer-package expectations: keep a global manifest and preview
    // image at the root of the final package next to the inner archives.
    zpkZip.file('app.json', code.appJson);
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
