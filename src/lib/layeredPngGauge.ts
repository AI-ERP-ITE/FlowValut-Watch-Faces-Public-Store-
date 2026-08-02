import type { WatchFaceElement } from '@/types';

export interface LayeredPngGaugeComposition {
  pointerChanges: Partial<WatchFaceElement>;
  siblings: Array<Omit<WatchFaceElement, 'id'>>;
  staleAssetPrefixes: string[];
}

export function composeLayeredPngGauge(element: WatchFaceElement): LayeredPngGaugeComposition {
  if (element.type !== 'GAUGE_POINTER') throw new Error('Layered PNG composition requires a Gauge Pointer');
  if (!element.src?.startsWith('data:image/png')) throw new Error('Upload a PNG needle before building the gauge set');

  const gaugePairId = `gauge_png_group_${element.id}`;
  const needleZ = Math.max(2, element.zIndex ?? 2);
  const backgroundZ = Math.max(0, needleZ - 2);
  const switcherZ = Math.max(backgroundZ + 1, needleZ - 1);
  const foregroundZ = needleZ + 1;
  const common = {
    bounds: { ...element.bounds },
    visible: element.visible,
    gaugePairId,
  };
  const siblings: Array<Omit<WatchFaceElement, 'id'>> = [];

  if (element.gaugePngBackgroundSrc) {
    siblings.push({
      ...common,
      type: 'IMG',
      name: `Gauge PNG Background (${element.name})`,
      zIndex: backgroundZ,
      src: element.gaugePngBackgroundSrc,
      assetFilename: `gauge_png_bg_${element.id}.png`,
    });
  }

  if (element.gaugePngSwitcherFrames?.length) {
    siblings.push({
      ...common,
      type: 'IMG_LEVEL',
      name: `Gauge PNG Switcher (${element.name})`,
      zIndex: switcherZ,
      images: [...element.gaugePngSwitcherFrames],
      imageSwitcherFrameCount: element.gaugePngSwitcherFrames.length,
      assetFilename: `gauge_png_switch_${element.id}_frame`,
      dataType: element.dataType,
    });
  }

  if (element.gaugePngForegroundSrc) {
    siblings.push({
      ...common,
      type: 'IMG',
      name: `Gauge PNG Foreground (${element.name})`,
      zIndex: foregroundZ,
      src: element.gaugePngForegroundSrc,
      assetFilename: `gauge_png_fg_${element.id}.png`,
    });
  }

  return {
    pointerChanges: {
      gaugePairId,
      zIndex: needleZ,
      assetFilename: `gauge_png_needle_${element.id}.png`,
    },
    siblings,
    staleAssetPrefixes: [
      `gauge_png_bg_${element.id}.png`,
      `gauge_png_switch_${element.id}_frame`,
      `gauge_png_fg_${element.id}.png`,
    ],
  };
}
